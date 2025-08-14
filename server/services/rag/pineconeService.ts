import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

export interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    type: string;
    location: string;
    category: string;
    lastUpdated: string;
    source: string;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
}

export class PineconeRAGService {
  private pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || 'default-key',
    });
    
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
    });
    
    this.indexName = process.env.PINECONE_INDEX_NAME || 'sisa-travel-knowledge';
  }

  async searchSimilar(query: string, topK: number = 5, filter?: any): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Get the index
      const index = this.pinecone.index(this.indexName);
      
      // Search for similar vectors
      const searchResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      // Transform results
      return searchResponse.matches?.map(match => ({
        id: match.id,
        content: match.metadata?.content as string || '',
        metadata: match.metadata || {},
        score: match.score || 0,
      })) || [];
    } catch (error) {
      console.error('Pinecone search error:', error);
      // Return fallback results for development
      return this.getFallbackResults(query, topK);
    }
  }

  async upsertDocuments(documents: VectorDocument[]): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Generate embeddings for all documents
      const vectors = await Promise.all(
        documents.map(async (doc) => {
          const embedding = await this.embeddings.embedQuery(doc.content);
          return {
            id: doc.id,
            values: embedding,
            metadata: {
              ...doc.metadata,
              content: doc.content,
            },
          };
        })
      );

      // Upsert to Pinecone
      await index.upsert(vectors);
    } catch (error) {
      console.error('Pinecone upsert error:', error);
      throw error;
    }
  }

  async getDestinationInfo(location: string): Promise<SearchResult[]> {
    return await this.searchSimilar(`destination information for ${location}`, 3, {
      type: 'destination'
    });
  }

  async getTravelTips(category: string): Promise<SearchResult[]> {
    return await this.searchSimilar(`travel tips for ${category}`, 3, {
      type: 'advice'
    });
  }

  async getSeasonalAdvice(destination: string, timeOfYear: string): Promise<SearchResult[]> {
    return await this.searchSimilar(`${destination} travel advice for ${timeOfYear}`, 3, {
      type: 'seasonal'
    });
  }

  private getFallbackResults(query: string, topK: number): SearchResult[] {
    // Fallback results for development when Pinecone is not configured
    const fallbackResults: SearchResult[] = [];
    
    if (query.toLowerCase().includes('japan') || query.toLowerCase().includes('japón')) {
      fallbackResults.push({
        id: 'japan-info',
        content: 'Japón es famoso por su temporada de cerezos en flor (sakura) que típicamente ocurre de finales de marzo a principios de mayo. Los mejores lugares incluyen el Parque Ueno de Tokio, el Sendero del Filósofo de Kioto y la Pagoda Chureito del Monte Fuji.',
        metadata: {
          type: 'destination',
          location: 'Japan',
          category: 'seasonal-travel',
          source: 'travel-guide'
        },
        score: 0.95
      });
    }
    
    if (query.toLowerCase().includes('beach') || query.toLowerCase().includes('playa')) {
      fallbackResults.push({
        id: 'beach-destinations',
        content: 'Las mejores playas del mundo incluyen las Maldivas, Bora Bora, las Seychelles y las costas de México. La mejor época para visitar varía según la región, pero generalmente la temporada seca ofrece las mejores condiciones.',
        metadata: {
          type: 'destination',
          location: 'Various',
          category: 'beach-destinations',
          source: 'travel-experts'
        },
        score: 0.89
      });
    }

    return fallbackResults.slice(0, topK);
  }
}

export const pineconeService = new PineconeRAGService();