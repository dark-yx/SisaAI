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
        const duration = this.extractDuration(message);
        const budget = this.extractBudget(message);
        const interests = this.extractInterests(message, context);
        const groupSize = this.extractGroupSize(message);

        // Detectar destino en el mensaje o usar contexto de Ecuador
        if (!destination) {
          // Detectar destinos ecuatorianos específicos
          const ecuadorDestinations = ['salinas', 'galápagos', 'galapagos', 'quito', 'cuenca', 'baños', 'montañita', 'manta', 'guayaquil', 'otavalo', 'cotopaxi'];
          const lowerMessage = message.toLowerCase();
          const foundDestination = ecuadorDestinations.find(dest => lowerMessage.includes(dest));
          
          // También revisar si el usuario está proporcionando información solicitada
          if (!foundDestination && context.conversationHistory && context.conversationHistory.length > 0) {
            // Buscar si en mensajes anteriores se mencionó un destino
            const previousMessages = context.conversationHistory.slice(-3); // Últimos 3 mensajes
            for (const prevMsg of previousMessages) {
              if (prevMsg.role === 'assistant' && prevMsg.content.includes('needsInfo')) {
                // El usuario está respondiendo a una pregunta anterior
                const destination = ecuadorDestinations.find(dest => prevMsg.content.toLowerCase().includes(dest));
                if (destination) {
                  return this.handleFollowUpResponse(message, destination, context);
                }
              }
            }
          }
          
          if (foundDestination) {
            // Extraer información del mensaje para determinar si necesitamos más detalles
            const hasDuration = this.extractDuration(message) !== undefined;
            const hasBudget = this.extractBudget(message) !== undefined;
            const hasGroupSize = /(\d+)\s*(persona|people|viajero)/i.test(message);
            
            // SIEMPRE preguntar por información si no está completa
            if (!hasDuration || !hasGroupSize) {
              const questions = [];
              if (!hasDuration) questions.push("📅 ¿Cuántos días planeas quedarte?");
              if (!hasGroupSize) questions.push("👥 ¿Cuántas personas van a viajar?");
              
              return {
                content: `¡Excelente elección! ${foundDestination.charAt(0).toUpperCase() + foundDestination.slice(1)} es un destino increíble en Ecuador. 

Para crear el itinerario perfecto y estimar el presupuesto necesario, necesito que me confirmes:

${questions.join('\n')}

Con esta información podré calcular el presupuesto promedio necesario y diseñarte un itinerario personalizado con las mejores actividades y recomendaciones.`,
                shouldEnd: false,
                metadata: { destination: foundDestination, needsInfo: ['duration', 'groupSize'] },
              };
            }
            
            try {
              // Si tenemos toda la información necesaria, crear el itinerario completo
              const duration = this.extractDuration(message);
              const groupSize = this.extractGroupSize(message);
              
              // Calcular presupuesto promedio basado en destino, duración y personas
              const estimatedBudget = this.calculateEstimatedBudget(foundDestination, duration!, groupSize);
              
              const response = await openaiService.generateResponse(
                `Crea un itinerario detallado de ${duration} días para ${foundDestination}, Ecuador. 
                
                Información del viaje:
                - Destino: ${foundDestination}
                - Duración: ${duration} días
                - Número de personas: ${groupSize}
                - Mensaje original: "${message}"
                
                IMPORTANTE: Estima y calcula un presupuesto promedio realista para ${groupSize} persona${groupSize > 1 ? 's' : ''} durante ${duration} día${duration > 1 ? 's' : ''} en ${foundDestination}, Ecuador.
                
                Crea un itinerario día por día que incluya:
                - Actividades específicas con horarios
                - Restaurantes recomendados con precios reales de Ecuador
                - Opciones de hospedaje según categoría moderada
                - Transporte local y costos reales
                - Tips importantes para Ecuador
                - Presupuesto total estimado específico para ${groupSize} persona${groupSize > 1 ? 's' : ''} y ${duration} día${duration > 1 ? 's' : ''}
                
                Responde en español de manera natural, profesional y entusiasta como un experto local en turismo ecuatoriano.`,
                'planner'
              );
              
              return {
                content: response,
                nextAgent: 'recommendations',
                metadata: { destination: foundDestination, duration, estimatedBudget, groupSize },
              };
            } catch (error) {
              console.error('Error generating itinerary:', error);
              return {
                content: `¡Excelente elección! ${foundDestination} es un destino increíble. Para crear tu itinerario perfecto, necesito saber cuántos días planeas quedarte y cuántas personas van a viajar.`,
                shouldEnd: false,
              };
            }
          }
          
          return {
            content: "¡Perfecto! Soy especialista en Ecuador. Para crear el mejor itinerario, necesito saber:\n\n📍 ¿Qué destino específico te interesa? (Salinas, Galápagos, Quito, Baños, Montañita, etc.)\n📅 ¿Cuántos días planeas quedarte?\n👥 ¿Cuántas personas van a viajar?\n\nCon esta información podré estimar el presupuesto necesario y crear un itinerario personalizado.",
            shouldEnd: false,
          };
        }

        // Get relevant travel info from RAG
        const destinationInfo = await pineconeService.getDestinationInfo(destination);
        const seasonalAdvice = await pineconeService.getSeasonalAdvice(destination, 'current');

        // Verificar si tenemos información suficiente para crear itinerario
        if (!duration || !groupSize) {
          const questions = [];
          if (!duration) questions.push("📅 ¿Cuántos días planeas quedarte?");
          if (!groupSize) questions.push("👥 ¿Cuántas personas van a viajar?");
          
          return {
            content: `¡Perfecto! ${destination.charAt(0).toUpperCase() + destination.slice(1)} es un excelente destino en Ecuador.

Para crear tu itinerario perfecto y estimar el presupuesto necesario, necesito que me confirmes:

${questions.join('\n')}

Con esta información podré calcular el presupuesto promedio necesario y diseñarte un itinerario personalizado.`,
            shouldEnd: false,
          };
        }

        try {
          // Calcular presupuesto estimado basado en destino, duración y personas
          const estimatedBudget = this.calculateEstimatedBudget(destination, duration, groupSize);
          
          // Create itinerary usando OpenAI con contexto específico
          const itineraryPrompt = `Crea un itinerario detallado de ${duration} días para ${destination}, Ecuador.
          Número de personas: ${groupSize}
          Intereses: ${interests.join(', ')}
          Mensaje original: "${message}"
          
          IMPORTANTE: Estima y calcula un presupuesto promedio realista para ${groupSize} persona${groupSize > 1 ? 's' : ''} durante ${duration} día${duration > 1 ? 's' : ''} en ${destination}, Ecuador.
          
          Incluye:
          - Actividades diarias específicas con horarios
          - Restaurantes recomendados con precios reales de Ecuador
          - Opciones de hospedaje según categoría moderada
          - Transporte local y costos reales
          - Tips importantes de Ecuador
          - Presupuesto total estimado específico para ${groupSize} persona${groupSize > 1 ? 's' : ''} y ${duration} día${duration > 1 ? 's' : ''}
          
          Responde en español de manera natural, profesional y entusiasta como un experto local.`;
          
          const itinerary = await openaiService.generateResponse(itineraryPrompt, 'planner');
          
          await storage.createSystemLog({
            level: 'info',
            message: `Planner agent created itinerary for ${destination}`,
            agentType: 'planner',
            userId: context.userId,
            metadata: { destination, duration, estimatedBudget },
          });

          return {
            content: itinerary,
            nextAgent: 'recommendations',
            metadata: { destination, duration, estimatedBudget, groupSize, generatedAt: new Date().toISOString() },
          };
        } catch (error) {
          console.error('Error in planner agent:', error);
          return {
            content: "Para crear tu itinerario perfecto, necesito saber cuántos días planeas quedarte y cuántas personas van a viajar. ¿Podrías proporcionarme esa información?",
            shouldEnd: false,
          };
        }
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
    // Buscar montos específicos en dólares
    const dollarMatch = message.match(/\$\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatch) return `$${dollarMatch[1]}`;
    
    // Buscar números seguidos de "dolares", "usd", etc.
    const usdMatch = message.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dolares|usd|dollars)/i);
    if (usdMatch) return `$${usdMatch[1]}`;
    
    // Buscar rangos de presupuesto
    const rangeMatch = message.match(/(\d+)\s*(?:a|to|-)\s*(\d+)/);
    if (rangeMatch) return `$${rangeMatch[1]}-${rangeMatch[2]}`;
    
    // Buscar palabras clave de presupuesto
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('economico') || lowerMessage.includes('barato') || lowerMessage.includes('budget')) {
      return 'presupuesto económico (menos de $800)';
    }
    if (lowerMessage.includes('moderado') || lowerMessage.includes('medio') || lowerMessage.includes('medium')) {
      return 'presupuesto moderado ($800-1500)';
    }
    if (lowerMessage.includes('alto') || lowerMessage.includes('lujo') || lowerMessage.includes('luxury')) {
      return 'presupuesto alto (más de $1500)';
    }
    
    return undefined;
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
    // Look for destination in current message - priorizar destinos ecuatorianos
    const ecuadorDestinations = [
      'salinas', 'galápagos', 'galapagos', 'quito', 'cuenca', 'baños', 'montañita', 'manta', 
      'guayaquil', 'otavalo', 'cotopaxi', 'puyo', 'tena', 'machala', 'loja', 'riobamba',
      'ambato', 'ibarra', 'tulcán', 'esmeraldas', 'puerto lópez', 'playas', 'atacames',
      'canoa', 'bahía de caráquez', 'zaruma', 'vilcabamba', 'banos', 'puerto ayora'
    ];
    
    const commonDestinations = [
      'tokyo', 'japón', 'japan', 'paris', 'francia', 'france', 'london', 'londres', 'england',
      'new york', 'nueva york', 'thailand', 'tailandia', 'italy', 'italia', 'spain', 'españa',
      'mexico', 'méxico', 'brazil', 'brasil', 'argentina', 'chile', 'peru', 'perú', 'ecuador'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // Buscar primero destinos ecuatorianos
    for (const dest of ecuadorDestinations) {
      if (lowerMessage.includes(dest)) {
        return dest;
      }
    }
    
    // Después buscar otros destinos
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

  private extractGroupSize(message: string): number {
    // Buscar número de personas en el mensaje
    const groupMatches = message.match(/(\d+)\s*(?:persona|people|viajero|traveler|pax)/i);
    if (groupMatches) {
      return parseInt(groupMatches[1]);
    }
    
    // Buscar indicaciones como "con mi familia", "con amigos", etc.
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('pareja') || lowerMessage.includes('couple')) return 2;
    if (lowerMessage.includes('familia') || lowerMessage.includes('family')) return 4;
    if (lowerMessage.includes('grupo') || lowerMessage.includes('friends')) return 3;
    if (lowerMessage.includes('solo') || lowerMessage.includes('alone')) return 1;
    
    return 1; // Default a 1 persona
  }

  private async handleFollowUpResponse(message: string, destination: string, context: AgentContext): Promise<AgentResponse> {
    // El usuario está proporcionando información de seguimiento
    const duration = this.extractDuration(message) || this.extractNumberFromMessage(message);
    const budget = this.extractBudget(message);
    const groupSize = this.extractGroupSize(message);
    
    try {
      const response = await openaiService.generateResponse(
        `El usuario quiere viajar a ${destination}, Ecuador y ha proporcionado esta información adicional: "${message}".
        
        ${duration ? `Duración: ${duration} días` : 'Duración: No especificada'}
        ${budget ? `Presupuesto: ${budget}` : 'Presupuesto: No especificado'}
        ${groupSize ? `Grupo: ${groupSize} personas` : 'Grupo: No especificado'}
        
        Si falta información crítica (días o presupuesto), pregúntala amablemente.
        Si tienes suficiente información, crea un itinerario detallado día por día.
        
        Responde en español como un experto en turismo ecuatoriano.`,
        'planner'
      );
      
      return {
        content: response,
        nextAgent: duration && budget ? 'recommendations' : undefined,
        metadata: { destination, duration, budget, groupSize },
      };
    } catch (error) {
      return {
        content: `Perfecto, estoy procesando tu información para ${destination}. ¿Podrías confirmarme cuántos días planeas quedarte y cuál sería tu presupuesto aproximado por persona?`,
        shouldEnd: false,
      };
    }
  }

  private extractNumberFromMessage(message: string): number | undefined {
    const numberMatch = message.match(/(\d+)/);
    return numberMatch ? parseInt(numberMatch[1]) : undefined;
  }

  private calculateEstimatedBudget(destination: string, duration: number, groupSize: number): string {
    // Costos base por día por persona según el destino
    const dailyCosts = {
      'galápagos': { accommodation: 80, food: 40, activities: 60, transport: 20 },
      'galapagos': { accommodation: 80, food: 40, activities: 60, transport: 20 },
      'quito': { accommodation: 35, food: 25, activities: 30, transport: 15 },
      'cuenca': { accommodation: 30, food: 20, activities: 25, transport: 10 },
      'baños': { accommodation: 25, food: 18, activities: 35, transport: 12 },
      'banos': { accommodation: 25, food: 18, activities: 35, transport: 12 },
      'montañita': { accommodation: 20, food: 15, activities: 25, transport: 10 },
      'salinas': { accommodation: 40, food: 25, activities: 30, transport: 15 },
      'manta': { accommodation: 35, food: 20, activities: 25, transport: 12 },
      'esmeraldas': { accommodation: 30, food: 18, activities: 20, transport: 12 },
      'guayaquil': { accommodation: 45, food: 30, activities: 25, transport: 15 }
    };

    const costs = dailyCosts[destination.toLowerCase() as keyof typeof dailyCosts] || 
                  { accommodation: 35, food: 25, activities: 30, transport: 15 }; // Default

    const dailyPerPerson = costs.accommodation + costs.food + costs.activities + costs.transport;
    const totalEstimated = dailyPerPerson * duration * groupSize;

    return `$${totalEstimated} (aproximadamente $${dailyPerPerson} por persona por día)`;
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
