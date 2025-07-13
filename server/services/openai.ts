import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
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
    type: string; // hotel, restaurant, activity, attraction
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
      const prompt = `As a travel research expert, find and analyze destinations based on this query: "${query}". 
      ${budget ? `Budget: ${budget}` : ''} 
      ${duration ? `Duration: ${duration} days` : ''}
      
      Provide detailed, accurate information about 3-4 destinations that match the criteria. 
      Include specific details about costs, best times to visit, and unique highlights.
      
      Respond with JSON in this format: 
      {
        "destinations": [
          {
            "name": "Destination Name",
            "description": "Brief description",
            "highlights": ["highlight1", "highlight2"],
            "bestTime": "Best time to visit",
            "estimatedCost": "Cost estimate",
            "imageUrl": "https://example.com/image.jpg"
          }
        ],
        "insights": ["insight1", "insight2"],
        "sources": ["source1", "source2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional travel research agent with access to current travel data. Provide accurate, helpful destination information."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
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
      const prompt = `As a travel planning expert, create a detailed ${duration}-day itinerary for ${destination}.
      Budget: ${budget}
      Interests: ${interests.join(", ")}
      
      Create a comprehensive day-by-day itinerary with specific activities, timings, locations, and costs.
      Include practical tips and local insights.
      
      Respond with JSON in this format:
      {
        "itinerary": [
          {
            "day": 1,
            "activities": [
              {
                "time": "9:00 AM",
                "activity": "Activity name",
                "location": "Specific location",
                "cost": "$XX",
                "description": "Brief description"
              }
            ]
          }
        ],
        "totalCost": "$XXX",
        "tips": ["tip1", "tip2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional travel planning agent specializing in creating detailed, practical itineraries."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
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
      const prompt = `As a travel recommendation expert, provide personalized recommendations for ${destination}.
      
      User Profile:
      - Travel Style: ${userPreferences.travelStyle}
      - Budget: ${userPreferences.budget}
      - Interests: ${userPreferences.interests.join(", ")}
      - Previous Trips: ${userPreferences.previousTrips.join(", ")}
      
      Provide personalized recommendations for hotels, restaurants, activities, and attractions.
      Explain why each recommendation fits the user's profile.
      
      Respond with JSON in this format:
      {
        "recommendations": [
          {
            "type": "hotel",
            "name": "Hotel Name",
            "description": "Description",
            "rating": 4.5,
            "priceRange": "$$$",
            "location": "Area",
            "imageUrl": "https://example.com/image.jpg"
          }
        ],
        "personalizationFactors": ["factor1", "factor2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional travel recommendation agent specializing in personalized travel suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
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
          content: `You are a helpful customer service agent for Sisa AI, a travel assistance platform. 
          Provide friendly, professional support. Help with booking issues, travel questions, 
          and general assistance. Keep responses conversational and helpful.
          
          User Context: ${context.userProfile ? JSON.stringify(context.userProfile) : 'No profile available'}`
        },
        ...context.conversationHistory.slice(-5), // Last 5 messages for context
        {
          role: "user" as const,
          content: query
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "I'm sorry, I couldn't process your request. Please try again.";
    } catch (error) {
      throw new Error("Failed to handle customer service request: " + (error as Error).message);
    }
  }
}

export const openaiService = new OpenAIService();
