// import { openaiService } from './openai';

interface WordPressPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  date: string;
  featured_media?: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
  };
}

interface TourismDestination {
  id: number;
  name: string;
  description: string;
  region: string;
  type: string;
  link: string;
  image?: string;
  excerpt: string;
}

const ECUADOR_TOURISM_BASE_URL = 'https://turismo.ecuadors.live/wp-json/wp/v2';

export class EcuadorTourismService {
  
  // Obtener posts de destinos turísticos
  async getDestinations(params?: {
    search?: string;
    per_page?: number;
    page?: number;
    category?: string;
  }): Promise<TourismDestination[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.search) searchParams.append('search', params.search);
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.category) searchParams.append('categories', params.category);
      
      // Incluir media embebida para obtener imágenes
      searchParams.append('_embed', 'true');
      
      const response = await fetch(`${ECUADOR_TOURISM_BASE_URL}/posts?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching destinations: ${response.status}`);
      }
      
      const posts: WordPressPost[] = await response.json();
      
      return posts.map(post => this.transformPostToDestination(post));
    } catch (error) {
      console.error('Error fetching Ecuador tourism destinations:', error);
      return [];
    }
  }

  // Buscar destinos específicos por región
  async getDestinationsByRegion(region: 'costa' | 'andes' | 'amazonia' | 'galapagos'): Promise<TourismDestination[]> {
    try {
      // Obtener categorías de WordPress
      const categoriesResponse = await fetch(`${ECUADOR_TOURISM_BASE_URL}/categories?search=${region}`);
      const categories = await categoriesResponse.json();
      
      if (categories.length > 0) {
        return await this.getDestinations({ 
          category: categories[0].id.toString(),
          per_page: 20 
        });
      }
      
      // Si no encuentra la categoría exacta, buscar por texto
      return await this.getDestinations({ 
        search: region,
        per_page: 10 
      });
    } catch (error) {
      console.error(`Error fetching destinations for region ${region}:`, error);
      return [];
    }
  }

  // Buscar información específica de un destino
  async searchDestination(query: string): Promise<TourismDestination[]> {
    return await this.getDestinations({ 
      search: query,
      per_page: 5 
    });
  }

  // Obtener información detallada de un destino específico
  async getDestinationDetails(id: number): Promise<TourismDestination | null> {
    try {
      const response = await fetch(`${ECUADOR_TOURISM_BASE_URL}/posts/${id}?_embed=true`);
      
      if (!response.ok) {
        return null;
      }
      
      const post: WordPressPost = await response.json();
      return this.transformPostToDestination(post);
    } catch (error) {
      console.error(`Error fetching destination details for ID ${id}:`, error);
      return null;
    }
  }

  // Obtener recomendaciones inteligentes basadas en preferencias del usuario
  async getSmartRecommendations(userPreferences: {
    interests?: string[];
    budget?: 'bajo' | 'medio' | 'alto';
    duration?: number; // días
    travelStyle?: string;
  }): Promise<TourismDestination[]> {
    try {
      // Obtener una muestra amplia de destinos
      const allDestinations = await this.getDestinations({ per_page: 50 });
      
      if (allDestinations.length === 0) {
        return [];
      }

      // Filtrar destinos basados en preferencias usando lógica simple
      let filteredDestinations = allDestinations;
      
      // Filtrar por intereses
      if (userPreferences.interests && userPreferences.interests.length > 0) {
        filteredDestinations = filteredDestinations.filter(dest => {
          const destContent = `${dest.name} ${dest.description} ${dest.type}`.toLowerCase();
          return userPreferences.interests!.some((interest: string) => 
            destContent.includes(interest.toLowerCase())
          );
        });
      }
      
      // Filtrar por tipo de turismo según estilo de viaje
      if (userPreferences.travelStyle) {
        const style = userPreferences.travelStyle.toLowerCase();
        filteredDestinations = filteredDestinations.filter(dest => {
          const destType = dest.type.toLowerCase();
          if (style.includes('aventura')) return destType.includes('aventura') || destType.includes('naturaleza');
          if (style.includes('cultural')) return destType.includes('cultural');
          if (style.includes('relax')) return destType.includes('playa') || destType.includes('bienestar');
          return true; // Mantener todos si no coincide
        });
      }
      
      // Si no hay coincidencias específicas, devolver destinos populares
      const finalRecommendations = filteredDestinations.length > 0 
        ? filteredDestinations.slice(0, 5)
        : allDestinations.slice(0, 5);
        
      return finalRecommendations;
    } catch (error) {
      console.error('Error generating smart recommendations:', error);
      // Fallback: devolver destinos populares
      return await this.getDestinations({ per_page: 5 });
    }
  }

  // Transformar post de WordPress a formato de destino turístico
  private transformPostToDestination(post: WordPressPost): TourismDestination {
    const cleanExcerpt = post.excerpt.rendered
      .replace(/<[^>]*>/g, '') // Remover HTML
      .replace(/\[&hellip;\]/g, '...') // Reemplazar hellip
      .trim();

    const cleanDescription = post.content.rendered
      .replace(/<[^>]*>/g, '') // Remover HTML
      .substring(0, 500) + '...'; // Limitar descripción

    // Determinar región basada en el contenido o categorías
    const content = post.content.rendered.toLowerCase();
    let region = 'Ecuador';
    
    if (content.includes('costa') || content.includes('playa') || content.includes('guayaquil') || content.includes('manta')) {
      region = 'Costa';
    } else if (content.includes('andes') || content.includes('quito') || content.includes('montaña') || content.includes('volcán')) {
      region = 'Andes';
    } else if (content.includes('amazonía') || content.includes('selva') || content.includes('oriente')) {
      region = 'Amazonía';
    } else if (content.includes('galápagos') || content.includes('galapagos')) {
      region = 'Galápagos';
    }

    // Determinar tipo de turismo
    let type = 'General';
    if (content.includes('aventura')) type = 'Aventura';
    else if (content.includes('cultural')) type = 'Cultural';
    else if (content.includes('naturaleza') || content.includes('ecoturismo')) type = 'Naturaleza';
    else if (content.includes('gastronomía')) type = 'Gastronómico';
    else if (content.includes('playa')) type = 'Sol y Playa';

    return {
      id: post.id,
      name: post.title.rendered,
      description: cleanDescription,
      excerpt: cleanExcerpt,
      region,
      type,
      link: post.link,
      image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url
    };
  }

  // Obtener estadísticas de destinos
  async getDestinationStats(): Promise<{
    totalDestinations: number;
    regionDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
  }> {
    try {
      const destinations = await this.getDestinations({ per_page: 100 });
      
      const regionDistribution: Record<string, number> = {};
      const typeDistribution: Record<string, number> = {};
      
      destinations.forEach(dest => {
        regionDistribution[dest.region] = (regionDistribution[dest.region] || 0) + 1;
        typeDistribution[dest.type] = (typeDistribution[dest.type] || 0) + 1;
      });

      return {
        totalDestinations: destinations.length,
        regionDistribution,
        typeDistribution
      };
    } catch (error) {
      console.error('Error getting destination stats:', error);
      return {
        totalDestinations: 0,
        regionDistribution: {},
        typeDistribution: {}
      };
    }
  }
}

export const ecuadorTourismService = new EcuadorTourismService();