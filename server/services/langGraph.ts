// LangGraph Multi-Agent Orchestration Service
import { openaiService } from './openai';
import { pineconeService } from './pinecone';
import { storage } from '../storage';

export type AgentType = 'research' | 'planner' | 'recommendations' | 'customer-service';

export interface AgentContext {
  userId: string;
  conversationId: string;
  userProfile?: any;
  conversationHistory: Array<{ role: string; content: string; agentType?: string }>;
  currentAgent: AgentType;
  metadata?: any;
}

export interface AgentResponse {
  content: string;
  nextAgent?: AgentType;
  metadata?: any;
  shouldEnd?: boolean;
}

export class LangGraphOrchestrator {
  private agents: Map<AgentType, (context: AgentContext, message: string) => Promise<AgentResponse>>;

  constructor() {
    this.agents = new Map();
    this.initializeAgents();
  }

  private initializeAgents() {
    // Research Agent
    this.agents.set('research', async (context: AgentContext, message: string): Promise<AgentResponse> => {
      try {
        // Use RAG to enhance the research
        const ragResults = await pineconeService.searchSimilar(message, 3);
        const ragContext = ragResults.map(r => r.content).join('\n');
        
        // Extract potential travel parameters
        const budget = this.extractBudget(message);
        const duration = this.extractDuration(message);
        
        // Get research results from OpenAI
        const researchResult = await openaiService.searchDestinations(
          message + (ragContext ? `\n\nAdditional context: ${ragContext}` : ''),
          budget,
          duration
        );

        // Store search in database
        await storage.createTravelSearch({
          userId: context.userId,
          query: message,
          results: researchResult,
          budget: budget ? parseFloat(budget.replace(/[^0-9.]/g, '')) : undefined,
          duration: duration,
        });

        // Log agent activity
        await storage.createSystemLog({
          level: 'info',
          message: `Research agent processed query: ${message}`,
          agentType: 'research',
          userId: context.userId,
          metadata: { destinationCount: researchResult.destinations.length },
        });

        return {
          content: this.formatResearchResponse(researchResult),
          nextAgent: 'planner', // Suggest moving to planner next
          metadata: researchResult,
        };
      } catch (error) {
        await storage.createSystemLog({
          level: 'error',
          message: `Research agent error: ${(error as Error).message}`,
          agentType: 'research',
          userId: context.userId,
        });
        
        return {
          content: "Lo siento, tuve un problema al buscar destinos. Por favor, intenta reformular tu consulta.",
          shouldEnd: true,
        };
      }
    });

    // Planner Agent
    this.agents.set('planner', async (context: AgentContext, message: string): Promise<AgentResponse> => {
      try {
        // Extract planning parameters
        const destination = this.extractDestination(message, context);
        const duration = this.extractDuration(message) || 7;
        const budget = this.extractBudget(message) || "$2000";
        const interests = this.extractInterests(message, context);

        if (!destination) {
          return {
            content: "Para crear un itinerario, necesito saber el destino. ¿Podrías especificar dónde te gustaría viajar?",
            shouldEnd: false,
          };
        }

        // Get relevant travel info from RAG
        const destinationInfo = await pineconeService.getDestinationInfo(destination);
        const seasonalAdvice = await pineconeService.getSeasonalAdvice(destination, 'current');

        // Create itinerary
        const itinerary = await openaiService.createItinerary(
          destination,
          duration,
          budget,
          interests
        );

        await storage.createSystemLog({
          level: 'info',
          message: `Planner agent created itinerary for ${destination}`,
          agentType: 'planner',
          userId: context.userId,
          metadata: { destination, duration, budget },
        });

        return {
          content: this.formatItineraryResponse(itinerary),
          nextAgent: 'recommendations',
          metadata: itinerary,
        };
      } catch (error) {
        await storage.createSystemLog({
          level: 'error',
          message: `Planner agent error: ${(error as Error).message}`,
          agentType: 'planner',
          userId: context.userId,
        });
        
        return {
          content: "Tuve dificultades para crear tu itinerario. ¿Podrías proporcionar más detalles sobre tu viaje?",
          shouldEnd: true,
        };
      }
    });

    // Recommendations Agent
    this.agents.set('recommendations', async (context: AgentContext, message: string): Promise<AgentResponse> => {
      try {
        const destination = this.extractDestination(message, context);
        const userPreferences = {
          travelStyle: context.userProfile?.travelStyle || 'cultural',
          budget: this.extractBudget(message) || "$2000",
          interests: this.extractInterests(message, context),
          previousTrips: context.userProfile?.preferredDestinations || [],
        };

        if (!destination) {
          return {
            content: "Para darte recomendaciones personalizadas, necesito saber el destino. ¿Sobre qué lugar te gustaría que te recomiende?",
            shouldEnd: false,
          };
        }

        // Get personalized recommendations
        const recommendations = await openaiService.getPersonalizedRecommendations(
          destination,
          userPreferences
        );

        await storage.createSystemLog({
          level: 'info',
          message: `Recommendations agent provided suggestions for ${destination}`,
          agentType: 'recommendations',
          userId: context.userId,
          metadata: { destination, recommendationCount: recommendations.recommendations.length },
        });

        return {
          content: this.formatRecommendationsResponse(recommendations),
          nextAgent: 'customer-service',
          metadata: recommendations,
        };
      } catch (error) {
        await storage.createSystemLog({
          level: 'error',
          message: `Recommendations agent error: ${(error as Error).message}`,
          agentType: 'recommendations',
          userId: context.userId,
        });
        
        return {
          content: "No pude generar recomendaciones en este momento. ¿Te gustaría que te ayude con algo más?",
          shouldEnd: true,
        };
      }
    });

    // Customer Service Agent
    this.agents.set('customer-service', async (context: AgentContext, message: string): Promise<AgentResponse> => {
      try {
        const response = await openaiService.handleCustomerService(message, {
          userId: context.userId,
          conversationHistory: context.conversationHistory,
          userProfile: context.userProfile,
        });

        await storage.createSystemLog({
          level: 'info',
          message: `Customer service agent handled query`,
          agentType: 'customer-service',
          userId: context.userId,
        });

        return {
          content: response,
          shouldEnd: false,
        };
      } catch (error) {
        await storage.createSystemLog({
          level: 'error',
          message: `Customer service agent error: ${(error as Error).message}`,
          agentType: 'customer-service',
          userId: context.userId,
        });
        
        return {
          content: "Disculpa, tengo problemas técnicos. ¿Podrías intentar nuevamente en unos minutos?",
          shouldEnd: true,
        };
      }
    });
  }

  async processMessage(context: AgentContext, message: string): Promise<AgentResponse> {
    const agent = this.agents.get(context.currentAgent);
    if (!agent) {
      throw new Error(`Agent ${context.currentAgent} not found`);
    }

    return await agent(context, message);
  }

  // Helper methods for extracting information
  private extractBudget(message: string): string | undefined {
    const budgetMatch = message.match(/\$?\d+(?:,\d{3})*(?:\.\d{2})?/);
    return budgetMatch ? budgetMatch[0] : undefined;
  }

  private extractDuration(message: string): number | undefined {
    const durationMatch = message.match(/(\d+)\s*(?:día|days?|semana|weeks?)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1]);
      return message.toLowerCase().includes('semana') || message.toLowerCase().includes('week') ? num * 7 : num;
    }
    return undefined;
  }

  private extractDestination(message: string, context: AgentContext): string | undefined {
    // Look for destination in current message
    const commonDestinations = [
      'tokyo', 'japón', 'japan', 'paris', 'francia', 'france', 'london', 'londres', 'england',
      'new york', 'nueva york', 'thailand', 'tailandia', 'italy', 'italia', 'spain', 'españa',
      'mexico', 'méxico', 'brazil', 'brasil', 'argentina', 'chile', 'peru', 'perú'
    ];
    
    const lowerMessage = message.toLowerCase();
    for (const dest of commonDestinations) {
      if (lowerMessage.includes(dest)) {
        return dest;
      }
    }
    
    // Look in conversation history or metadata
    if (context.metadata?.destination) {
      return context.metadata.destination;
    }
    
    return undefined;
  }

  private extractInterests(message: string, context: AgentContext): string[] {
    const interests = [];
    const interestKeywords = {
      'cultura': ['cultura', 'cultural', 'museum', 'museo', 'history', 'historia'],
      'aventura': ['aventura', 'adventure', 'hiking', 'trekking', 'extreme'],
      'playa': ['playa', 'beach', 'mar', 'ocean', 'surf'],
      'gastronomía': ['comida', 'food', 'gastronomía', 'restaurant', 'cocina'],
      'vida nocturna': ['noche', 'nightlife', 'bar', 'club', 'fiesta'],
      'naturaleza': ['naturaleza', 'nature', 'parque', 'park', 'wildlife'],
    };

    const lowerMessage = message.toLowerCase();
    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        interests.push(interest);
      }
    }

    // Add user profile interests
    if (context.userProfile?.travelStyle) {
      interests.push(context.userProfile.travelStyle);
    }

    return interests.length > 0 ? interests : ['cultura', 'aventura'];
  }

  private formatResearchResponse(result: any): string {
    let response = "He encontrado algunos destinos increíbles para ti:\n\n";
    
    result.destinations.forEach((dest: any, index: number) => {
      response += `**${index + 1}. ${dest.name}**\n`;
      response += `${dest.description}\n`;
      response += `📅 Mejor época: ${dest.bestTime}\n`;
      response += `💰 Costo estimado: ${dest.estimatedCost}\n`;
      response += `✨ Destacados: ${dest.highlights.join(', ')}\n\n`;
    });

    if (result.insights.length > 0) {
      response += "💡 **Insights adicionales:**\n";
      result.insights.forEach((insight: string) => {
        response += `• ${insight}\n`;
      });
    }

    response += "\n¿Te gustaría que cree un itinerario detallado para alguno de estos destinos?";
    return response;
  }

  private formatItineraryResponse(result: any): string {
    let response = "¡Perfecto! He creado un itinerario detallado para tu viaje:\n\n";
    
    result.itinerary.forEach((day: any) => {
      response += `**Día ${day.day}:**\n`;
      day.activities.forEach((activity: any) => {
        response += `${activity.time} - ${activity.activity}\n`;
        response += `📍 ${activity.location} | 💰 ${activity.cost}\n`;
        response += `${activity.description}\n\n`;
      });
    });

    response += `**Costo total estimado: ${result.totalCost}**\n\n`;
    
    if (result.tips.length > 0) {
      response += "💡 **Consejos útiles:**\n";
      result.tips.forEach((tip: string) => {
        response += `• ${tip}\n`;
      });
    }

    response += "\n¿Te gustaría que te dé recomendaciones específicas de hoteles y restaurantes?";
    return response;
  }

  private formatRecommendationsResponse(result: any): string {
    let response = "Aquí tienes mis recomendaciones personalizadas:\n\n";
    
    const groupedRecs = result.recommendations.reduce((acc: any, rec: any) => {
      if (!acc[rec.type]) acc[rec.type] = [];
      acc[rec.type].push(rec);
      return acc;
    }, {});

    Object.entries(groupedRecs).forEach(([type, recs]: [string, any]) => {
      const typeEmoji = {
        'hotel': '🏨',
        'restaurant': '🍽️',
        'activity': '🎯',
        'attraction': '🏛️'
      };

      response += `${typeEmoji[type as keyof typeof typeEmoji] || '📍'} **${type.charAt(0).toUpperCase() + type.slice(1)}s:**\n`;
      
      recs.forEach((rec: any) => {
        response += `• **${rec.name}** (${rec.priceRange})\n`;
        response += `  ⭐ ${rec.rating}/5 | 📍 ${rec.location}\n`;
        response += `  ${rec.description}\n\n`;
      });
    });

    if (result.personalizationFactors.length > 0) {
      response += "🎯 **Personalizado para ti por:**\n";
      result.personalizationFactors.forEach((factor: string) => {
        response += `• ${factor}\n`;
      });
    }

    response += "\n¿Hay algo específico sobre el que te gustaría más información?";
    return response;
  }
}

export const langGraphOrchestrator = new LangGraphOrchestrator();
