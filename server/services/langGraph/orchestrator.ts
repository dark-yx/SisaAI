import { StateGraph, END, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { researchAgent } from "../agents/researchAgent";
import { plannerAgent } from "../agents/plannerAgent";
import { recommendationAgent } from "../agents/recommendationAgent";
import { customerServiceAgent } from "../agents/customerServiceAgent";
import { storage } from "../../storage";

export interface AgentState {
  messages: BaseMessage[];
  currentAgent: string;
  userContext: {
    userId: string;
    conversationId: string;
    userProfile?: any;
  };
  travelContext: {
    destination?: string;
    budget?: string;
    duration?: number;
    interests?: string[];
    travelStyle?: string;
  };
  nextAgent?: string;
  shouldEnd?: boolean;
  metadata?: any;
}

export class SisaAIOrchestrator {
  private graph: StateGraph<AgentState>;

  constructor() {
    this.graph = new StateGraph<AgentState>({
      channels: {
        messages: {
          reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
          default: () => [],
        },
        currentAgent: {
          default: () => "router",
        },
        userContext: {
          default: () => ({}),
        },
        travelContext: {
          default: () => ({}),
        },
        nextAgent: {
          default: () => undefined,
        },
        shouldEnd: {
          default: () => false,
        },
        metadata: {
          default: () => ({}),
        },
      },
    });

    this.setupGraph();
  }

  private setupGraph() {
    // Add nodes for each agent
    this.graph.addNode("router", this.routerAgent.bind(this));
    this.graph.addNode("research", this.researchAgentNode.bind(this));
    this.graph.addNode("planner", this.plannerAgentNode.bind(this));
    this.graph.addNode("recommendations", this.recommendationAgentNode.bind(this));
    this.graph.addNode("customer_service", this.customerServiceAgentNode.bind(this));

    // Define the flow
    this.graph.addEdge(START, "router");
    
    // Router decides which agent to use
    this.graph.addConditionalEdges(
      "router",
      this.routeToAgent.bind(this),
      {
        research: "research",
        planner: "planner", 
        recommendations: "recommendations",
        customer_service: "customer_service",
        end: END,
      }
    );

    // Each agent can either end or route to another agent
    this.graph.addConditionalEdges(
      "research",
      this.shouldContinue.bind(this),
      {
        continue: "router",
        end: END,
      }
    );

    this.graph.addConditionalEdges(
      "planner",
      this.shouldContinue.bind(this),
      {
        continue: "router",
        end: END,
      }
    );

    this.graph.addConditionalEdges(
      "recommendations",
      this.shouldContinue.bind(this),
      {
        continue: "router",
        end: END,
      }
    );

    this.graph.addConditionalEdges(
      "customer_service",
      this.shouldContinue.bind(this),
      {
        continue: "router",
        end: END,
      }
    );
  }

  private async routerAgent(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const userMessage = lastMessage?.content || "";

    // Analyze the message to determine which agent should handle it
    const agentChoice = this.analyzeMessageForAgent(userMessage, state);

    await storage.createSystemLog({
      level: 'info',
      message: `Router directing to ${agentChoice} agent`,
      agentType: 'router',
      userId: state.userContext.userId,
      metadata: { userMessage: userMessage.slice(0, 100) },
    });

    return {
      currentAgent: agentChoice,
      nextAgent: agentChoice,
    };
  }

  private analyzeMessageForAgent(message: string, state: AgentState): string {
    const lowerMessage = message.toLowerCase();

    // Research patterns
    if (lowerMessage.includes('buscar') || lowerMessage.includes('destino') || 
        lowerMessage.includes('información') || lowerMessage.includes('dónde') ||
        lowerMessage.includes('search') || lowerMessage.includes('find')) {
      return 'research';
    }

    // Planning patterns
    if (lowerMessage.includes('itinerario') || lowerMessage.includes('planificar') ||
        lowerMessage.includes('plan') || lowerMessage.includes('días') ||
        lowerMessage.includes('schedule') || lowerMessage.includes('organize')) {
      return 'planner';
    }

    // Recommendation patterns
    if (lowerMessage.includes('recomienda') || lowerMessage.includes('sugiere') ||
        lowerMessage.includes('hotel') || lowerMessage.includes('restaurante') ||
        lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      return 'recommendations';
    }

    // Customer service patterns
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('problema') ||
        lowerMessage.includes('cancelar') || lowerMessage.includes('cambiar') ||
        lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return 'customer_service';
    }

    // Default to research for general queries
    return 'research';
  }

  private routeToAgent(state: AgentState): string {
    if (state.shouldEnd) return "end";
    return state.nextAgent || "end";
  }

  private shouldContinue(state: AgentState): string {
    if (state.shouldEnd || !state.nextAgent) return "end";
    return "continue";
  }

  private async researchAgentNode(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const userMessage = lastMessage?.content || "";

    try {
      const result = await researchAgent.processQuery(
        {
          query: userMessage,
          budget: state.travelContext.budget,
          duration: state.travelContext.duration,
          travelStyle: state.travelContext.travelStyle,
          interests: state.travelContext.interests,
        },
        {
          userId: state.userContext.userId,
          conversationId: state.userContext.conversationId,
          userProfile: state.userContext.userProfile,
        }
      );

      const response = new AIMessage({
        content: this.formatResearchResponse(result),
      });

      return {
        messages: [response],
        currentAgent: "research",
        nextAgent: "planner",
        metadata: result,
      };
    } catch (error) {
      const errorResponse = new AIMessage({
        content: "Lo siento, tuve un problema al buscar información. ¿Podrías reformular tu consulta?",
      });

      return {
        messages: [errorResponse],
        shouldEnd: true,
      };
    }
  }

  private async plannerAgentNode(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const userMessage = lastMessage?.content || "";

    try {
      const destination = this.extractDestination(userMessage, state);
      if (!destination) {
        const response = new AIMessage({
          content: "Para crear un itinerario, necesito saber el destino. ¿Podrías especificar dónde te gustaría viajar?",
        });

        return {
          messages: [response],
          currentAgent: "planner",
          shouldEnd: false,
        };
      }

      const result = await plannerAgent.createItinerary(
        {
          destination,
          duration: state.travelContext.duration || 7,
          budget: state.travelContext.budget || "$2000",
          interests: state.travelContext.interests || ["cultura"],
          travelStyle: state.travelContext.travelStyle || "cultural",
        },
        {
          userId: state.userContext.userId,
          conversationId: state.userContext.conversationId,
          userProfile: state.userContext.userProfile,
        }
      );

      const response = new AIMessage({
        content: this.formatItineraryResponse(result),
      });

      return {
        messages: [response],
        currentAgent: "planner",
        nextAgent: "recommendations",
        travelContext: {
          ...state.travelContext,
          destination,
        },
        metadata: result,
      };
    } catch (error) {
      const errorResponse = new AIMessage({
        content: "Tuve dificultades para crear tu itinerario. ¿Podrías proporcionar más detalles?",
      });

      return {
        messages: [errorResponse],
        shouldEnd: true,
      };
    }
  }

  private async recommendationAgentNode(state: AgentState): Promise<Partial<AgentState>> {
    const destination = state.travelContext.destination;
    if (!destination) {
      const response = new AIMessage({
        content: "Para darte recomendaciones, necesito saber el destino. ¿Sobre qué lugar te gustaría que te recomiende?",
      });

      return {
        messages: [response],
        shouldEnd: false,
      };
    }

    try {
      const result = await recommendationAgent.getRecommendations(
        {
          destination,
          budget: state.travelContext.budget,
          preferences: {
            activityLevel: state.travelContext.travelStyle,
            groupSize: 1,
          },
        },
        {
          userId: state.userContext.userId,
          conversationId: state.userContext.conversationId,
          userProfile: state.userContext.userProfile,
        }
      );

      const response = new AIMessage({
        content: this.formatRecommendationsResponse(result),
      });

      return {
        messages: [response],
        currentAgent: "recommendations",
        nextAgent: "customer_service",
        metadata: result,
      };
    } catch (error) {
      const errorResponse = new AIMessage({
        content: "No pude generar recomendaciones en este momento. ¿Te gustaría que te ayude con algo más?",
      });

      return {
        messages: [errorResponse],
        shouldEnd: true,
      };
    }
  }

  private async customerServiceAgentNode(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const userMessage = lastMessage?.content || "";

    try {
      const result = await customerServiceAgent.handleSupportRequest(
        {
          query: userMessage,
          language: 'es',
        },
        {
          userId: state.userContext.userId,
          conversationId: state.userContext.conversationId,
          userProfile: state.userContext.userProfile,
          conversationHistory: state.messages.map(msg => ({
            role: msg._getType() === 'human' ? 'user' : 'assistant',
            content: msg.content,
          })),
        }
      );

      const response = new AIMessage({
        content: result.response,
      });

      return {
        messages: [response],
        currentAgent: "customer_service",
        shouldEnd: false,
      };
    } catch (error) {
      const errorResponse = new AIMessage({
        content: "Disculpa, tengo problemas técnicos. ¿Podrías intentar nuevamente?",
      });

      return {
        messages: [errorResponse],
        shouldEnd: true,
      };
    }
  }

  private extractDestination(message: string, state: AgentState): string | undefined {
    // Look for destination in current message or state
    const commonDestinations = [
      'tokyo', 'japón', 'japan', 'paris', 'francia', 'france', 'london', 'londres',
      'new york', 'nueva york', 'thailand', 'tailandia', 'italy', 'italia', 
      'spain', 'españa', 'mexico', 'méxico', 'brazil', 'brasil', 'argentina', 
      'chile', 'peru', 'perú', 'colombia', 'ecuador', 'uruguay'
    ];

    const lowerMessage = message.toLowerCase();
    for (const dest of commonDestinations) {
      if (lowerMessage.includes(dest)) {
        return dest;
      }
    }

    return state.travelContext.destination;
  }

  private formatResearchResponse(result: any): string {
    let response = "🌍 **He encontrado algunos destinos increíbles para ti:**\n\n";
    
    if (result.destinations) {
      result.destinations.forEach((dest: any, index: number) => {
        response += `**${index + 1}. ${dest.name}**\n`;
        response += `${dest.description}\n`;
        response += `📅 Mejor época: ${dest.bestTime}\n`;
        response += `💰 Costo estimado: ${dest.estimatedCost}\n`;
        response += `✨ Destacados: ${dest.highlights?.join(', ')}\n\n`;
      });
    }

    if (result.insights?.length > 0) {
      response += "💡 **Insights adicionales:**\n";
      result.insights.forEach((insight: string) => {
        response += `• ${insight}\n`;
      });
    }

    response += "\n¿Te gustaría que cree un itinerario detallado para alguno de estos destinos?";
    return response;
  }

  private formatItineraryResponse(result: any): string {
    let response = "📋 **¡Perfecto! He creado un itinerario detallado para tu viaje:**\n\n";
    
    if (result.itinerary) {
      result.itinerary.forEach((day: any) => {
        response += `**Día ${day.day}:**\n`;
        if (day.activities) {
          day.activities.forEach((activity: any) => {
            response += `${activity.time} - ${activity.activity}\n`;
            response += `📍 ${activity.location} | 💰 ${activity.cost}\n`;
            response += `${activity.description}\n\n`;
          });
        }
      });
    }

    response += `**💰 Costo total estimado: ${result.totalCost}**\n\n`;
    
    if (result.tips?.length > 0) {
      response += "💡 **Consejos útiles:**\n";
      result.tips.forEach((tip: string) => {
        response += `• ${tip}\n`;
      });
    }

    response += "\n¿Te gustaría que te dé recomendaciones específicas de hoteles y restaurantes?";
    return response;
  }

  private formatRecommendationsResponse(result: any): string {
    let response = "🎯 **Aquí tienes mis recomendaciones personalizadas:**\n\n";
    
    if (result.recommendations) {
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
    }

    if (result.personalizationFactors?.length > 0) {
      response += "🎯 **Personalizado para ti por:**\n";
      result.personalizationFactors.forEach((factor: string) => {
        response += `• ${factor}\n`;
      });
    }

    response += "\n¿Hay algo específico sobre lo que te gustaría más información?";
    return response;
  }

  private routeToAgent(state: AgentState): string {
    if (state.shouldEnd) return "end";
    return state.nextAgent || "end";
  }

  private shouldContinue(state: AgentState): string {
    if (state.shouldEnd || !state.nextAgent) return "end";
    return "continue";
  }

  public async processMessage(
    userMessage: string,
    userContext: { userId: string; conversationId: string; userProfile?: any }
  ): Promise<string> {
    const initialState: AgentState = {
      messages: [new HumanMessage(userMessage)],
      currentAgent: "router",
      userContext,
      travelContext: {},
    };

    const compiledGraph = this.graph.compile();
    const result = await compiledGraph.invoke(initialState);

    // Return the last AI message
    const lastMessage = result.messages[result.messages.length - 1];
    return lastMessage?.content || "Lo siento, no pude procesar tu solicitud.";
  }
}

export const sisaOrchestrator = new SisaAIOrchestrator();