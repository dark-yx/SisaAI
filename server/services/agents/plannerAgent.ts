// Planner Agent - Specialized for creating detailed travel itineraries
import { openaiService } from '../openai';
import { pineconeService } from '../pinecone';
import { storage } from '../../storage';

export interface PlanningRequest {
  destination: string;
  duration: number;
  budget: string;
  interests: string[];
  travelStyle: string;
  groupSize?: number;
  accommodationType?: string;
  startDate?: string;
}

export interface PlanningContext {
  userId: string;
  conversationId: string;
  userProfile?: any;
  previousSearches?: any[];
}

export class PlannerAgent {
  async createItinerary(request: PlanningRequest, context: PlanningContext): Promise<any> {
    try {
      // Step 1: Get destination-specific information from RAG
      const destinationInfo = await pineconeService.getDestinationInfo(request.destination);
      const seasonalAdvice = await pineconeService.getSeasonalAdvice(
        request.destination, 
        request.startDate || 'current'
      );
      const travelTips = await pineconeService.getTravelTips(request.destination);
      
      // Step 2: Combine RAG context
      const ragContext = [...destinationInfo, ...seasonalAdvice, ...travelTips]
        .map(r => `${r.content} (Source: ${r.metadata.source})`)
        .join('\n\n');
      
      // Step 3: Analyze user's travel history for personalization
      const userInsights = await this.analyzeUserTravelHistory(context.userId);
      
      // Step 4: Create detailed itinerary using OpenAI
      const itinerary = await openaiService.createItinerary(
        request.destination,
        request.duration,
        request.budget,
        request.interests
      );
      
      // Step 5: Enhance itinerary with RAG insights and personalization
      const enhancedItinerary = await this.enhanceItinerary(itinerary, ragContext, userInsights);
      
      // Step 6: Store the itinerary
      await storage.createTravelSearch({
        userId: context.userId,
        query: `Itinerary for ${request.destination}`,
        destination: request.destination,
        budget: parseFloat(request.budget.replace(/[^0-9.]/g, '')),
        duration: request.duration,
        travelDate: request.startDate ? new Date(request.startDate) : undefined,
        preferences: {
          interests: request.interests,
          travelStyle: request.travelStyle,
          groupSize: request.groupSize,
          accommodationType: request.accommodationType,
        },
        results: enhancedItinerary,
      });
      
      // Step 7: Log the planning activity
      await storage.createSystemLog({
        level: 'info',
        message: `Planner agent created itinerary for ${request.destination}`,
        agentType: 'planner',
        userId: context.userId,
        metadata: {
          destination: request.destination,
          duration: request.duration,
          budget: request.budget,
          activitiesCount: this.countActivities(enhancedItinerary),
          personalizationApplied: userInsights.personalizedElements.length > 0,
        },
      });
      
      return enhancedItinerary;
    } catch (error) {
      await storage.createSystemLog({
        level: 'error',
        message: `Planner agent error: ${(error as Error).message}`,
        agentType: 'planner',
        userId: context.userId,
        metadata: { destination: request.destination },
      });
      
      throw error;
    }
  }

  private async analyzeUserTravelHistory(userId: string): Promise<any> {
    try {
      const userSearches = await storage.getUserTravelSearches(userId, 10);
      const userStats = await storage.getUserStats(userId);
      
      // Analyze patterns in user's travel history
      const destinations = userSearches.map(s => s.destination).filter(Boolean);
      const budgetPatterns = userSearches.map(s => s.budget).filter(Boolean);
      const durationPatterns = userSearches.map(s => s.duration).filter(Boolean);
      
      const insights = {
        favoriteDestinations: this.getMostFrequent(destinations),
        averageBudget: budgetPatterns.length > 0 ? 
          budgetPatterns.reduce((a, b) => a + b!, 0) / budgetPatterns.length : 0,
        averageDuration: durationPatterns.length > 0 ? 
          durationPatterns.reduce((a, b) => a + b!, 0) / durationPatterns.length : 0,
        travelFrequency: userStats.totalTrips,
        personalizedElements: [] as string[],
      };
      
      // Generate personalized recommendations based on history
      if (insights.favoriteDestinations.length > 0) {
        insights.personalizedElements.push(`Based on your previous interest in ${insights.favoriteDestinations.join(', ')}`);
      }
      
      if (insights.averageBudget > 0) {
        insights.personalizedElements.push(`Considering your typical budget range of $${insights.averageBudget.toFixed(0)}`);
      }
      
      return insights;
    } catch (error) {
      return {
        favoriteDestinations: [],
        averageBudget: 0,
        averageDuration: 0,
        travelFrequency: 0,
        personalizedElements: [],
      };
    }
  }

  private async enhanceItinerary(baseItinerary: any, ragContext: string, userInsights: any): Promise<any> {
    const enhanced = { ...baseItinerary };
    
    // Add RAG-sourced local insights
    enhanced.localInsights = this.extractLocalInsights(ragContext);
    
    // Add personalized recommendations
    enhanced.personalizedTips = userInsights.personalizedElements;
    
    // Enhance each day with local context
    if (enhanced.itinerary) {
      enhanced.itinerary = enhanced.itinerary.map((day: any) => {
        return {
          ...day,
          localTips: this.getLocalTipsForDay(day, ragContext),
          weatherAdvice: this.getWeatherAdvice(day, ragContext),
        };
      });
    }
    
    // Add transportation recommendations
    enhanced.transportation = this.generateTransportationAdvice(ragContext);
    
    // Add packing suggestions
    enhanced.packingList = this.generatePackingList(baseItinerary, ragContext);
    
    return enhanced;
  }

  private extractLocalInsights(ragContext: string): string[] {
    // Extract key local insights from RAG context
    const insights = [];
    
    if (ragContext.includes('tipping') || ragContext.includes('propina')) {
      insights.push('Local tipping customs and etiquette');
    }
    
    if (ragContext.includes('transport') || ragContext.includes('metro') || ragContext.includes('bus')) {
      insights.push('Public transportation recommendations');
    }
    
    if (ragContext.includes('visa') || ragContext.includes('passport')) {
      insights.push('Entry requirements and documentation');
    }
    
    if (ragContext.includes('currency') || ragContext.includes('money')) {
      insights.push('Currency and payment methods');
    }
    
    return insights;
  }

  private getLocalTipsForDay(day: any, ragContext: string): string[] {
    const tips = [];
    
    // Extract relevant tips based on activities
    if (day.activities) {
      day.activities.forEach((activity: any) => {
        if (activity.location && ragContext.includes(activity.location.toLowerCase())) {
          tips.push(`Local tip for ${activity.location}: Check opening hours in advance`);
        }
      });
    }
    
    return tips;
  }

  private getWeatherAdvice(day: any, ragContext: string): string {
    // Extract weather-related advice from RAG context
    const weatherKeywords = ['weather', 'climate', 'rain', 'sun', 'temperature'];
    const weatherInfo = weatherKeywords.find(keyword => ragContext.toLowerCase().includes(keyword));
    
    if (weatherInfo) {
      return `Weather consideration: Check local conditions for outdoor activities`;
    }
    
    return 'Check weather forecast for optimal planning';
  }

  private generateTransportationAdvice(ragContext: string): any {
    return {
      publicTransport: ragContext.includes('metro') || ragContext.includes('bus') ? 
        'Public transportation is recommended' : 'Consider alternative transport options',
      walkingFriendly: ragContext.includes('walking') || ragContext.includes('pedestrian') ? 
        'This destination is very walkable' : 'Some areas may require transportation',
      recommendations: [
        'Download local transport apps',
        'Consider day passes for public transport',
        'Keep emergency contact for taxi services',
      ],
    };
  }

  private generatePackingList(itinerary: any, ragContext: string): any {
    const packingList = {
      essentials: ['Passport', 'Travel insurance', 'Phone charger'],
      clothing: ['Comfortable walking shoes'],
      activities: [] as string[],
      weather: [] as string[],
    };
    
    // Add activity-specific items
    if (itinerary.itinerary) {
      itinerary.itinerary.forEach((day: any) => {
        if (day.activities) {
          day.activities.forEach((activity: any) => {
            if (activity.activity.toLowerCase().includes('hiking')) {
              packingList.activities.push('Hiking boots', 'Backpack');
            }
            if (activity.activity.toLowerCase().includes('swimming')) {
              packingList.activities.push('Swimwear', 'Sunscreen');
            }
          });
        }
      });
    }
    
    // Add weather-specific items
    if (ragContext.includes('rain')) {
      packingList.weather.push('Rain jacket', 'Umbrella');
    }
    if (ragContext.includes('sun')) {
      packingList.weather.push('Sun hat', 'Sunglasses');
    }
    
    return packingList;
  }

  private getMostFrequent(items: string[]): string[] {
    const frequency = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item]) => item);
  }

  private countActivities(itinerary: any): number {
    if (!itinerary.itinerary) return 0;
    
    return itinerary.itinerary.reduce((count: number, day: any) => {
      return count + (day.activities ? day.activities.length : 0);
    }, 0);
  }

  async optimizeItinerary(itineraryId: string, feedback: string, context: PlanningContext): Promise<any> {
    try {
      // This would optimize an existing itinerary based on user feedback
      // For now, we'll log the optimization request
      await storage.createSystemLog({
        level: 'info',
        message: `Itinerary optimization requested: ${feedback}`,
        agentType: 'planner',
        userId: context.userId,
        metadata: { itineraryId, feedback },
      });
      
      return {
        message: 'Itinerary optimization is being processed',
        status: 'pending',
      };
    } catch (error) {
      throw error;
    }
  }
}

export const plannerAgent = new PlannerAgent();
