import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "default_key" 
});

export interface ResearchResult {
  destinations: Array<{
    name: string;
    description: string;
    highlights: string[];
    bestTime: string;
    estimatedCost: string;
    imageUrl: string;
  }>;
  insights: string[];
  sources: string[];
}

export interface ItineraryResult {
  itinerary: Array<{
    day: number;
    activities: Array<{
      time: string;
      activity: string;
      location: string;
      cost: string;
      description: string;
    }>;
  }>;
  totalCost: string;
  tips: string[];
}

export interface RecommendationResult {
  recommendations: Array<{
    type: string;
    name: string;
    description: string;
    rating: number;
    priceRange: string;
    location: string;
    imageUrl: string;
  }>;
  personalizationFactors: string[];
}

export class OpenAIService {
  async searchDestinations(query: string, budget?: string, duration?: number): Promise<ResearchResult> {
    try {
      const prompt = `Como experto en investigación de viajes, encuentra y analiza destinos basándote en esta consulta: "${query}". 
      ${budget ? `Presupuesto: ${budget}` : ''} 
      ${duration ? `Duración: ${duration} días` : ''}
      
      Proporciona información detallada y precisa sobre 3-4 destinos que coincidan con los criterios. 
      Incluye detalles específicos sobre costos, mejores épocas para visitar y aspectos únicos destacados.
      
      Responde con JSON en este formato: 
      {
        "destinations": [
          {
            "name": "Nombre del Destino",
            "description": "Descripción breve",
            "highlights": ["destacado1", "destacado2"],
            "bestTime": "Mejor época para visitar",
            "estimatedCost": "Estimación de costo",
            "imageUrl": "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg"
          }
        ],
        "insights": ["insight1", "insight2"],
        "sources": ["fuente1", "fuente2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Eres un agente profesional de investigación de viajes con acceso a datos actuales de viaje. Proporciona información precisa y útil sobre destinos en español."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as ResearchResult;
    } catch (error) {
      throw new Error("Failed to research destinations: " + (error as Error).message);
    }
  }

  async createItinerary(
    destination: string, 
    duration: number, 
    budget: string, 
    interests: string[]
  ): Promise<ItineraryResult> {
    try {
      const prompt = `Como experto en planificación de viajes, crea un itinerario detallado de ${duration} días para ${destination}.
      Presupuesto: ${budget}
      Intereses: ${interests.join(", ")}
      
      Crea un itinerario completo día a día con actividades específicas, horarios, ubicaciones y costos.
      Incluye consejos prácticos e insights locales.
      
      Responde con JSON en este formato:
      {
        "itinerary": [
          {
            "day": 1,
            "activities": [
              {
                "time": "9:00 AM",
                "activity": "Nombre de la actividad",
                "location": "Ubicación específica",
                "cost": "$XX",
                "description": "Descripción breve"
              }
            ]
          }
        ],
        "totalCost": "$XXX",
        "tips": ["consejo1", "consejo2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Eres un agente profesional de planificación de viajes especializado en crear itinerarios detallados y prácticos en español."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as ItineraryResult;
    } catch (error) {
      throw new Error("Failed to create itinerary: " + (error as Error).message);
    }
  }

  async getPersonalizedRecommendations(
    destination: string,
    userPreferences: {
      travelStyle: string;
      budget: string;
      interests: string[];
      previousTrips: string[];
    }
  ): Promise<RecommendationResult> {
    try {
      const prompt = `Como experto en recomendaciones de viaje, proporciona recomendaciones personalizadas para ${destination}.
      
      Perfil del Usuario:
      - Estilo de Viaje: ${userPreferences.travelStyle}
      - Presupuesto: ${userPreferences.budget}
      - Intereses: ${userPreferences.interests.join(", ")}
      - Viajes Anteriores: ${userPreferences.previousTrips.join(", ")}
      
      Proporciona recomendaciones personalizadas para hoteles, restaurantes, actividades y atracciones.
      Explica por qué cada recomendación se ajusta al perfil del usuario.
      
      Responde con JSON en este formato:
      {
        "recommendations": [
          {
            "type": "hotel",
            "name": "Nombre del Hotel",
            "description": "Descripción",
            "rating": 4.5,
            "priceRange": "$$$",
            "location": "Área",
            "imageUrl": "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg"
          }
        ],
        "personalizationFactors": ["factor1", "factor2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Eres un agente profesional de recomendaciones de viaje especializado en sugerencias personalizadas de viaje en español."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as RecommendationResult;
    } catch (error) {
      throw new Error("Failed to get recommendations: " + (error as Error).message);
    }
  }

  async handleCustomerService(
    query: string,
    context: {
      userId: string;
      conversationHistory: Array<{ role: string; content: string }>;
      userProfile?: any;
    }
  ): Promise<string> {
    try {
      const messages = [
        {
          role: "system" as const,
          content: `Eres un agente de atención al cliente útil para Sisa AI, una plataforma de asistencia de viajes. 
          Proporciona soporte amigable y profesional. Ayuda con problemas de reservas, preguntas de viaje 
          y asistencia general. Mantén las respuestas conversacionales y útiles en español.
          
          Contexto del Usuario: ${context.userProfile ? JSON.stringify(context.userProfile) : 'Sin perfil disponible'}`
        },
        ...context.conversationHistory.slice(-5).map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        {
          role: "user" as const,
          content: query
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content || "Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.";
    } catch (error) {
      throw new Error("Failed to handle customer service request: " + (error as Error).message);
    }
  }
}

export const openaiService = new OpenAIService();