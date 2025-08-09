// Research Agent - Specialized for destination research and travel data gathering
import { openaiService } from '../openai';
import { ecuadorTourismService } from '../ecuadorTourismService';
import { pineconeService } from '../pinecone';
import { storage } from '../../storage';

export interface ResearchQuery {
  query: string;
  budget?: string;
  duration?: number;
  travelStyle?: string;
  interests?: string[];
  timeOfYear?: string;
}

export interface ResearchContext {
  userId: string;
  conversationId: string;
  userProfile?: any;
}

export class ResearchAgent {
  async processQuery(query: ResearchQuery, context: ResearchContext): Promise<any> {
    try {
      // Step 1: Use RAG to get relevant travel information
      const ragResults = await pineconeService.searchSimilar(query.query, 5);
      const ragContext = ragResults.map(r => `${r.content} (Source: ${r.metadata.source})`).join('\n\n');
      
      // Step 2: Get additional context based on query type
      let additionalContext = '';
      if (query.timeOfYear) {
        const seasonalInfo = await pineconeService.getSeasonalAdvice(query.query, query.timeOfYear);
        additionalContext += '\n\nSeasonal Information:\n' + seasonalInfo.map(s => s.content).join('\n');
      }
      
      // Step 3: Obtener información específica de destinos ecuatorianos
      const ecuadorDestinations = await ecuadorTourismService.searchDestination(query.query);
      
      // Step 4: Get research results from OpenAI with enhanced context
      const enhancedQuery = `${query.query}\n\nAdditional Context:\n${ragContext}${additionalContext}\n\nDestinos de Ecuador relevantes:\n${ecuadorDestinations.map(d => `- ${d.name}: ${d.excerpt}`).join('\n')}`;
      const researchResult = await openaiService.searchDestinations(
        enhancedQuery,
        query.budget,
        query.duration
      );

      // Step 4: Store the search for analytics and user history
      await storage.createTravelSearch({
        userId: context.userId,
        query: query.query,
        destination: this.extractMainDestination(researchResult),
        budget: query.budget ? parseFloat(query.budget.replace(/[^0-9.]/g, '')) : undefined,
        duration: query.duration,
        preferences: {
          travelStyle: query.travelStyle,
          interests: query.interests,
          timeOfYear: query.timeOfYear,
        },
        results: researchResult,
      });

      // Step 5: Log the research activity
      await storage.createSystemLog({
        level: 'info',
        message: `Research agent processed query: ${query.query}`,
        agentType: 'research',
        userId: context.userId,
        metadata: {
          destinationCount: researchResult.destinations.length,
          ragSourcesUsed: ragResults.length,
          queryType: this.classifyQuery(query.query),
        },
      });

      // Step 6: Enhance results with RAG insights
      const enhancedResult = this.enhanceWithRagInsights(researchResult, ragResults);
      
      return enhancedResult;
    } catch (error) {
      await storage.createSystemLog({
        level: 'error',
        message: `Research agent error: ${(error as Error).message}`,
        agentType: 'research',
        userId: context.userId,
        metadata: { query: query.query },
      });
      
      throw error;
    }
  }

  private extractMainDestination(researchResult: any): string | undefined {
    if (researchResult.destinations && researchResult.destinations.length > 0) {
      return researchResult.destinations[0].name;
    }
    return undefined;
  }

  private classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('budget') || lowerQuery.includes('cheap') || lowerQuery.includes('barato')) {
      return 'budget-focused';
    }
    
    if (lowerQuery.includes('luxury') || lowerQuery.includes('lujo') || lowerQuery.includes('premium')) {
      return 'luxury-focused';
    }
    
    if (lowerQuery.includes('adventure') || lowerQuery.includes('aventura') || lowerQuery.includes('extreme')) {
      return 'adventure-focused';
    }
    
    if (lowerQuery.includes('cultural') || lowerQuery.includes('cultura') || lowerQuery.includes('history')) {
      return 'cultural-focused';
    }
    
    if (lowerQuery.includes('beach') || lowerQuery.includes('playa') || lowerQuery.includes('ocean')) {
      return 'beach-focused';
    }
    
    return 'general-inquiry';
  }

  private enhanceWithRagInsights(researchResult: any, ragResults: any[]): any {
    const enhancedResult = { ...researchResult };
    
    // Add RAG-sourced insights
    const ragInsights = ragResults
      .filter(r => r.score > 0.8) // Only high-confidence results
      .map(r => `${r.content.slice(0, 200)}... (Source: ${r.metadata.source})`);
    
    enhancedResult.ragInsights = ragInsights;
    
    // Enhance destinations with RAG data
    if (enhancedResult.destinations) {
      enhancedResult.destinations = enhancedResult.destinations.map((dest: any) => {
        const relevantRag = ragResults.find(r => 
          r.metadata.location && 
          dest.name.toLowerCase().includes(r.metadata.location.toLowerCase())
        );
        
        if (relevantRag) {
          return {
            ...dest,
            additionalInfo: relevantRag.content,
            dataSource: relevantRag.metadata.source,
            lastUpdated: relevantRag.metadata.lastUpdated,
          };
        }
        
        return dest;
      });
    }
    
    return enhancedResult;
  }

  async getDestinationDetails(destination: string, context: ResearchContext): Promise<any> {
    try {
      // Get specific destination information from RAG
      const destinationInfo = await pineconeService.getDestinationInfo(destination);
      const travelTips = await pineconeService.getTravelTips(destination);
      
      // Combine RAG results
      const ragContext = [...destinationInfo, ...travelTips]
        .map(r => r.content)
        .join('\n\n');
      
      // Get detailed information from OpenAI
      const detailedInfo = await openaiService.searchDestinations(
        `Provide detailed information about ${destination}. Include practical travel advice, local customs, transportation, and current travel conditions.\n\nAdditional context:\n${ragContext}`,
        undefined,
        undefined
      );
      
      return detailedInfo;
    } catch (error) {
      await storage.createSystemLog({
        level: 'error',
        message: `Research agent destination details error: ${(error as Error).message}`,
        agentType: 'research',
        userId: context.userId,
      });
      
      throw error;
    }
  }
}

export const researchAgent = new ResearchAgent();
