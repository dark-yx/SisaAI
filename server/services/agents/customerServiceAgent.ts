// Customer Service Agent - Specialized for user support and assistance
import { openaiService } from '../openai/openaiService';
import { pineconeService } from '../rag/pineconeService';
import { storage } from '../../storage';

export interface SupportRequest {
  query: string;
  category?: 'booking' | 'technical' | 'general' | 'complaint' | 'information';
  urgency?: 'low' | 'medium' | 'high';
  language?: 'es' | 'en';
}

export interface SupportContext {
  userId: string;
  conversationId: string;
  userProfile?: any;
  conversationHistory: Array<{ role: string; content: string; agentType?: string }>;
  currentIssue?: string;
}

export class CustomerServiceAgent {
  async handleSupportRequest(request: SupportRequest, context: SupportContext): Promise<any> {
    try {
      // Step 1: Classify the request
      const classification = await this.classifyRequest(request.query);
      
      // Step 2: Check if we have relevant information in our knowledge base
      const relevantInfo = await pineconeService.searchSimilar(
        `customer service ${request.query} ${classification.category}`,
        3
      );
      
      // Step 3: Get user's recent activity for context
      const userContext = await this.getUserContext(context.userId);
      
      // Step 4: Generate appropriate response
      const response = await this.generateResponse(
        request,
        context,
        classification,
        relevantInfo,
        userContext
      );
      
      // Step 5: Log the support interaction
      await storage.createSystemLog({
        level: 'info',
        message: `Customer service agent handled ${classification.category} request`,
        agentType: 'customer-service',
        userId: context.userId,
        metadata: {
          category: classification.category,
          urgency: classification.urgency,
          resolved: classification.canResolve,
          language: request.language || 'es',
        },
      });
      
      return {
        response: response.content,
        category: classification.category,
        resolved: classification.canResolve,
        followUpActions: response.followUpActions,
        escalationNeeded: !classification.canResolve,
        confidence: classification.confidence,
      };
    } catch (error) {
      await storage.createSystemLog({
        level: 'error',
        message: `Customer service agent error: ${(error as Error).message}`,
        agentType: 'customer-service',
        userId: context.userId,
        metadata: { query: request.query },
      });
      
      throw error;
    }
  }

  private async classifyRequest(query: string): Promise<any> {
    const lowerQuery = query.toLowerCase();
    
    // Rule-based classification
    const classifications = {
      booking: ['reserva', 'booking', 'cancelar', 'cancel', 'cambiar', 'change', 'voucher'],
      technical: ['error', 'no funciona', 'not working', 'bug', 'problem', 'problema'],
      information: ['información', 'information', 'help', 'ayuda', 'como', 'how'],
      complaint: ['complaint', 'queja', 'malo', 'bad', 'terrible', 'horrible'],
      general: ['general', 'otros', 'other']
    };
    
    let category = 'general';
    let confidence = 0.5;
    
    // Find the best matching category
    for (const [cat, keywords] of Object.entries(classifications)) {
      const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
      if (matches.length > 0) {
        category = cat;
        confidence = Math.min(0.9, 0.5 + (matches.length * 0.2));
        break;
      }
    }
    
    // Determine urgency
    const urgentKeywords = ['urgent', 'urgente', 'emergency', 'emergencia', 'help', 'ayuda'];
    const urgency = urgentKeywords.some(keyword => lowerQuery.includes(keyword)) ? 'high' : 'medium';
    
    // Determine if we can resolve this
    const canResolve = category !== 'complaint' && confidence > 0.7;
    
    return {
      category,
      urgency,
      confidence,
      canResolve,
      suggestedActions: this.getSuggestedActions(category),
    };
  }

  private async getUserContext(userId: string): Promise<any> {
    try {
      const userSearches = await storage.getUserTravelSearches(userId, 5);
      const userStats = await storage.getUserStats(userId);
      
      return {
        recentSearches: userSearches,
        totalTrips: userStats.totalTrips,
        isNewUser: userStats.totalTrips === 0,
        recentActivity: userSearches.length > 0 ? userSearches[0] : null,
      };
    } catch (error) {
      return {
        recentSearches: [],
        totalTrips: 0,
        isNewUser: true,
        recentActivity: null,
      };
    }
  }

  private async generateResponse(
    request: SupportRequest,
    context: SupportContext,
    classification: any,
    relevantInfo: any[],
    userContext: any
  ): Promise<any> {
    // Build context for OpenAI
    const systemContext = `You are a helpful customer service agent for Sisa AI, a travel assistance platform. 
    
    User Profile: ${JSON.stringify(context.userProfile || {})}
    Request Category: ${classification.category}
    User Context: ${JSON.stringify(userContext)}
    
    Relevant Information: ${relevantInfo.map(info => info.content).join('\n')}
    
    Language: ${request.language || 'es'}
    
    Provide helpful, professional support. Be empathetic and solution-oriented.`;
    
    const response = await openaiService.handleCustomerService(request.query, {
      userId: context.userId,
      conversationHistory: context.conversationHistory,
      userProfile: context.userProfile,
    });
    
    // Generate follow-up actions based on category
    const followUpActions = this.generateFollowUpActions(classification.category, userContext);
    
    return {
      content: response,
      followUpActions,
      category: classification.category,
    };
  }

  private getSuggestedActions(category: string): string[] {
    const actions = {
      booking: [
        'Check booking status',
        'Provide booking reference',
        'Contact booking partner',
        'Offer modification options',
      ],
      technical: [
        'Check system status',
        'Provide troubleshooting steps',
        'Collect error details',
        'Escalate to technical team',
      ],
      information: [
        'Provide relevant documentation',
        'Suggest helpful resources',
        'Offer guided assistance',
        'Direct to appropriate agent',
      ],
      complaint: [
        'Acknowledge concern',
        'Collect detailed feedback',
        'Offer compensation if appropriate',
        'Escalate to management',
      ],
      general: [
        'Provide general assistance',
        'Offer relevant suggestions',
        'Guide to specific resources',
        'Follow up as needed',
      ],
    };
    
    return actions[category as keyof typeof actions] || actions.general;
  }

  private generateFollowUpActions(category: string, userContext: any): any[] {
    const actions = [];
    
    switch (category) {
      case 'booking':
        actions.push({
          type: 'check_booking',
          label: 'Check Booking Status',
          description: 'Verify current booking status',
        });
        break;
        
      case 'technical':
        actions.push({
          type: 'system_status',
          label: 'Check System Status',
          description: 'Verify if there are any known issues',
        });
        break;
        
      case 'information':
        if (userContext.isNewUser) {
          actions.push({
            type: 'onboarding',
            label: 'Start Tutorial',
            description: 'Get familiar with Sisa AI features',
          });
        }
        break;
        
      case 'complaint':
        actions.push({
          type: 'escalate',
          label: 'Escalate to Manager',
          description: 'Forward to customer service manager',
        });
        break;
    }
    
    // Common follow-up actions
    actions.push({
      type: 'contact_support',
      label: 'Contact Human Support',
      description: 'Speak with a human representative',
    });
    
    return actions;
  }

  async handleFollowUp(
    actionType: string,
    context: SupportContext,
    additionalData?: any
  ): Promise<any> {
    try {
      let response;
      
      switch (actionType) {
        case 'check_booking':
          response = await this.checkBookingStatus(context.userId, additionalData);
          break;
          
        case 'system_status':
          response = await this.checkSystemStatus();
          break;
          
        case 'escalate':
          response = await this.escalateToManager(context, additionalData);
          break;
          
        case 'contact_support':
          response = await this.initiateHumanSupport(context);
          break;
          
        default:
          response = {
            message: 'Follow-up action completed',
            status: 'success',
          };
      }
      
      // Log the follow-up action
      await storage.createSystemLog({
        level: 'info',
        message: `Customer service follow-up: ${actionType}`,
        agentType: 'customer-service',
        userId: context.userId,
        metadata: { actionType, additionalData },
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  private async checkBookingStatus(userId: string, bookingRef?: string): Promise<any> {
    // Simulate booking check
    const userSearches = await storage.getUserTravelSearches(userId, 1);
    
    return {
      message: 'Booking status checked',
      status: 'confirmed',
      bookingReference: bookingRef || 'SIS-' + Date.now(),
      details: userSearches[0] || null,
    };
  }

  private async checkSystemStatus(): Promise<any> {
    // Simulate system status check
    return {
      message: 'All systems operational',
      status: 'operational',
      lastChecked: new Date().toISOString(),
      services: {
        'Search Engine': 'operational',
        'Booking System': 'operational',
        'AI Agents': 'operational',
      },
    };
  }

  private async escalateToManager(context: SupportContext, issue?: string): Promise<any> {
    // Simulate escalation
    await storage.createSystemLog({
      level: 'warning',
      message: `Support escalation requested: ${issue || 'Unspecified issue'}`,
      agentType: 'customer-service',
      userId: context.userId,
      metadata: { escalationType: 'manager', issue },
    });
    
    return {
      message: 'Your case has been escalated to our management team',
      status: 'escalated',
      ticketNumber: 'ESC-' + Date.now(),
      expectedResponse: '24 hours',
    };
  }

  private async initiateHumanSupport(context: SupportContext): Promise<any> {
    // Simulate human support initiation
    return {
      message: 'Connecting you with a human representative',
      status: 'queued',
      estimatedWaitTime: '5-10 minutes',
      queuePosition: 3,
    };
  }
}

export const customerServiceAgent = new CustomerServiceAgent();
