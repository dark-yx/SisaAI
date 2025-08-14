// Recommendation Agent - Specialized for personalized travel recommendations
import { openaiService } from '../openai/openaiService';
import { pineconeService } from '../rag/pineconeService';
import { storage } from '../../storage';

export interface RecommendationRequest {
  destination: string;
  category?: 'hotels' | 'restaurants' | 'activities' | 'attractions' | 'all';
  budget?: string;
  preferences?: {
    cuisine?: string[];
    accommodationType?: string;
    activityLevel?: string;
    groupSize?: number;
  };
}

export interface RecommendationContext {
  userId: string;
  conversationId: string;
  userProfile?: any;
  currentItinerary?: any;
}

export class RecommendationAgent {
  async getRecommendations(request: RecommendationRequest, context: RecommendationContext): Promise<any> {
    try {
      // Step 1: Analyze user profile for personalization
      const userInsights = await this.analyzeUserPreferences(context.userId);
      
      // Step 2: Get relevant information from RAG
      const ragResults = await pineconeService.searchSimilar(
        `${request.destination} ${request.category || 'travel'} recommendations`,
        5
      );
      
      // Step 3: Build user preference profile
      const userPreferences = {
        travelStyle: context.userProfile?.travelStyle || userInsights.inferredTravelStyle,
        budget: request.budget || userInsights.averageBudget,
        interests: userInsights.interests,
        previousTrips: userInsights.visitedDestinations,
      };
      
      // Step 4: Get personalized recommendations from OpenAI
      const recommendations = await openaiService.getPersonalizedRecommendations(
        request.destination,
        userPreferences
      );
      
      // Step 5: Enhance recommendations with RAG data
      const enhancedRecommendations = await this.enhanceRecommendations(
        recommendations,
        ragResults,
        request.category
      );
      
      // Step 6: Apply smart filtering based on context
      const filteredRecommendations = this.applySmartFiltering(
        enhancedRecommendations,
        request,
        context
      );
      
      // Step 7: Log the recommendation activity
      await storage.createSystemLog({
        level: 'info',
        message: `Recommendations agent provided suggestions for ${request.destination}`,
        agentType: 'recommendations',
        userId: context.userId,
        metadata: {
          destination: request.destination,
          category: request.category,
          recommendationCount: filteredRecommendations.recommendations.length,
          personalizationScore: userInsights.personalizationScore,
        },
      });
      
      return filteredRecommendations;
    } catch (error) {
      await storage.createSystemLog({
        level: 'error',
        message: `Recommendations agent error: ${(error as Error).message}`,
        agentType: 'recommendations',
        userId: context.userId,
        metadata: { destination: request.destination },
      });
      
      throw error;
    }
  }

  private async analyzeUserPreferences(userId: string): Promise<any> {
    try {
      const userSearches = await storage.getUserTravelSearches(userId, 15);
      const userStats = await storage.getUserStats(userId);
      
      // Analyze travel patterns
      const destinations = userSearches.map(s => s.destination).filter(Boolean);
      const budgets = userSearches.map(s => s.budget).filter(Boolean);
      const preferences = userSearches.map(s => s.preferences).filter(Boolean);
      
      // Infer travel style from history
      const travelStyles = preferences.map(p => p?.travelStyle).filter(Boolean);
      const interests = preferences.flatMap(p => p?.interests || []).filter(Boolean);
      
      const insights = {
        visitedDestinations: destinations,
        averageBudget: budgets.length > 0 ? 
          budgets.reduce((a, b) => a + b!, 0) / budgets.length : 2000,
        inferredTravelStyle: this.getMostFrequent(travelStyles)[0] || 'cultural',
        interests: this.getMostFrequent(interests),
        experienceLevel: userStats.totalTrips > 5 ? 'experienced' : 'beginner',
        personalizationScore: Math.min(userSearches.length * 0.1, 1.0),
        preferredCategories: this.inferPreferredCategories(preferences),
      };
      
      return insights;
    } catch (error) {
      return {
        visitedDestinations: [],
        averageBudget: 2000,
        inferredTravelStyle: 'cultural',
        interests: ['culture', 'food'],
        experienceLevel: 'beginner',
        personalizationScore: 0.1,
        preferredCategories: ['all'],
      };
    }
  }

  private async enhanceRecommendations(
    baseRecommendations: any,
    ragResults: any[],
    category?: string
  ): Promise<any> {
    const enhanced = { ...baseRecommendations };
    
    // Add RAG-sourced local insights
    enhanced.localInsights = ragResults
      .filter(r => r.score > 0.8)
      .map(r => ({
        content: r.content,
        source: r.metadata.source,
        category: r.metadata.category,
        relevanceScore: r.score,
      }));
    
    // Enhance each recommendation with RAG data
    if (enhanced.recommendations) {
      enhanced.recommendations = enhanced.recommendations.map((rec: any) => {
        // Find relevant RAG information for this recommendation
        const relevantRag = ragResults.find(r => 
          r.content.toLowerCase().includes(rec.name.toLowerCase()) ||
          r.metadata.category === rec.type
        );
        
        if (relevantRag) {
          rec.additionalInfo = relevantRag.content;
          rec.dataSource = relevantRag.metadata.source;
          rec.lastUpdated = relevantRag.metadata.lastUpdated;
          rec.verificationScore = relevantRag.score;
        }
        
        // Add booking simulation data
        rec.bookingInfo = this.generateBookingInfo(rec);
        
        return rec;
      });
    }
    
    // Add category-specific insights
    enhanced.categoryInsights = this.generateCategoryInsights(category, ragResults);
    
    return enhanced;
  }

  private applySmartFiltering(
    recommendations: any,
    request: RecommendationRequest,
    context: RecommendationContext
  ): any {
    const filtered = { ...recommendations };
    
    if (filtered.recommendations) {
      // Filter by category if specified
      if (request.category && request.category !== 'all') {
        filtered.recommendations = filtered.recommendations.filter(
          (rec: any) => rec.type === request.category
        );
      }
      
      // Filter by budget if specified
      if (request.budget) {
        const budgetLevel = this.getBudgetLevel(request.budget);
        filtered.recommendations = filtered.recommendations.filter(
          (rec: any) => this.matchesBudget(rec.priceRange, budgetLevel)
        );
      }
      
      // Apply preference filtering
      if (request.preferences) {
        filtered.recommendations = this.filterByPreferences(
          filtered.recommendations,
          request.preferences
        );
      }
      
      // Sort by relevance and quality
      filtered.recommendations.sort((a: any, b: any) => {
        const aScore = (a.rating || 0) + (a.verificationScore || 0);
        const bScore = (b.rating || 0) + (b.verificationScore || 0);
        return bScore - aScore;
      });
      
      // Limit to top recommendations
      filtered.recommendations = filtered.recommendations.slice(0, 10);
    }
    
    return filtered;
  }

  private generateBookingInfo(recommendation: any): any {
    // Simulate booking information
    const bookingInfo = {
      availability: 'Available',
      bookingUrl: '#',
      priceRange: recommendation.priceRange,
      lastUpdated: new Date().toISOString(),
    };
    
    // Add type-specific booking info
    switch (recommendation.type) {
      case 'hotel':
        bookingInfo.priceRange = '$150-300/night';
        bookingInfo.availability = 'Check availability';
        break;
      case 'restaurant':
        bookingInfo.priceRange = '$25-50/person';
        bookingInfo.availability = 'Reservations recommended';
        break;
      case 'activity':
        bookingInfo.priceRange = '$30-80/person';
        bookingInfo.availability = 'Book in advance';
        break;
      case 'attraction':
        bookingInfo.priceRange = '$15-40/person';
        bookingInfo.availability = 'Open daily';
        break;
    }
    
    return bookingInfo;
  }

  private generateCategoryInsights(category: string | undefined, ragResults: any[]): any {
    const insights = {
      category: category || 'all',
      tips: [] as string[],
      trends: [] as string[],
      localAdvice: [] as string[],
    };
    
    // Generate category-specific tips
    switch (category) {
      case 'hotels':
        insights.tips.push('Book accommodations in advance for better rates');
        insights.tips.push('Consider location vs. price when choosing');
        break;
      case 'restaurants':
        insights.tips.push('Make reservations for popular restaurants');
        insights.tips.push('Try local specialties for authentic experience');
        break;
      case 'activities':
        insights.tips.push('Book activities in advance to avoid disappointment');
        insights.tips.push('Check weather conditions for outdoor activities');
        break;
      case 'attractions':
        insights.tips.push('Visit popular attractions early to avoid crowds');
        insights.tips.push('Look for combination tickets for multiple sites');
        break;
    }
    
    // Extract trends from RAG data
    ragResults.forEach(result => {
      if (result.content.includes('popular') || result.content.includes('trending')) {
        insights.trends.push(result.content.slice(0, 100) + '...');
      }
    });
    
    return insights;
  }

  private getBudgetLevel(budget: string): 'low' | 'medium' | 'high' {
    const amount = parseFloat(budget.replace(/[^0-9.]/g, ''));
    
    if (amount < 1000) return 'low';
    if (amount < 3000) return 'medium';
    return 'high';
  }

  private matchesBudget(priceRange: string, budgetLevel: string): boolean {
    const priceLevel = priceRange.split('$').length - 1; // Count $ symbols
    
    switch (budgetLevel) {
      case 'low':
        return priceLevel <= 2;
      case 'medium':
        return priceLevel <= 3;
      case 'high':
        return true;
      default:
        return true;
    }
  }

  private filterByPreferences(recommendations: any[], preferences: any): any[] {
    return recommendations.filter(rec => {
      // Filter by cuisine type for restaurants
      if (preferences.cuisine && rec.type === 'restaurant') {
        return preferences.cuisine.some((cuisine: string) => 
          rec.description.toLowerCase().includes(cuisine.toLowerCase())
        );
      }
      
      // Filter by accommodation type for hotels
      if (preferences.accommodationType && rec.type === 'hotel') {
        return rec.description.toLowerCase().includes(
          preferences.accommodationType.toLowerCase()
        );
      }
      
      // Filter by activity level
      if (preferences.activityLevel && rec.type === 'activity') {
        const isHighActivity = rec.description.toLowerCase().includes('adventure') ||
                               rec.description.toLowerCase().includes('hiking') ||
                               rec.description.toLowerCase().includes('sports');
        
        return preferences.activityLevel === 'high' ? isHighActivity : !isHighActivity;
      }
      
      return true;
    });
  }

  private getMostFrequent(items: string[]): string[] {
    const frequency = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item]) => item);
  }

  private inferPreferredCategories(preferences: any[]): string[] {
    const categories = ['hotels', 'restaurants', 'activities', 'attractions'];
    // In a real implementation, this would analyze user behavior
    return categories;
  }

  async getRecommendationDetails(recommendationId: string, context: RecommendationContext): Promise<any> {
    try {
      // This would fetch detailed information about a specific recommendation
      await storage.createSystemLog({
        level: 'info',
        message: `Recommendation details requested: ${recommendationId}`,
        agentType: 'recommendations',
        userId: context.userId,
        metadata: { recommendationId },
      });
      
      return {
        id: recommendationId,
        detailedInfo: 'Detailed recommendation information would be provided here',
        bookingOptions: [],
        reviews: [],
        similarRecommendations: [],
      };
    } catch (error) {
      throw error;
    }
  }
}

export const recommendationAgent = new RecommendationAgent();
