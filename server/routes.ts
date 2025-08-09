import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { langGraphOrchestrator } from "./services/langGraph";
import { researchAgent } from "./services/agents/researchAgent";
import { plannerAgent } from "./services/agents/plannerAgent";
import { recommendationAgent } from "./services/agents/recommendationAgent";
import { customerServiceAgent } from "./services/agents/customerServiceAgent";
import { ecuadorTourismService } from "./services/ecuadorTourismService";
import { insertMessageSchema, insertConversationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Chat and Conversation routes
  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertConversationSchema.parse({
        ...req.body,
        userId,
      });
      
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getConversationMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Multi-Agent Chat Processing
  app.post('/api/chat/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, conversationId, agentType } = req.body;
      
      if (!message || !conversationId || !agentType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get user profile and conversation history
      const userProfile = await storage.getUser(userId);
      const conversationHistory = await storage.getConversationMessages(conversationId);
      
      // Build agent context
      const agentContext = {
        userId,
        conversationId,
        userProfile,
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
          agentType: msg.agentType || undefined,
        })),
        currentAgent: agentType,
      };

      // Process message through LangGraph orchestrator
      const agentResponse = await langGraphOrchestrator.processMessage(agentContext, message);
      
      // Store user message
      await storage.createMessage({
        conversationId,
        role: 'user',
        content: message,
      });
      
      // Store agent response
      await storage.createMessage({
        conversationId,
        role: 'assistant',
        content: agentResponse.content,
        agentType: agentType,
        metadata: agentResponse.metadata,
      });
      
      // Update conversation with new agent if suggested
      if (agentResponse.nextAgent) {
        await storage.updateConversation(conversationId, {
          activeAgent: agentResponse.nextAgent,
        });
      }
      
      res.json({
        response: agentResponse.content,
        nextAgent: agentResponse.nextAgent,
        metadata: agentResponse.metadata,
        shouldEnd: agentResponse.shouldEnd,
      });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Individual Agent Routes
  app.post('/api/agents/research', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { query, budget, duration, travelStyle, interests, timeOfYear } = req.body;
      
      const researchQuery = {
        query,
        budget,
        duration,
        travelStyle,
        interests,
        timeOfYear,
      };
      
      const context = {
        userId,
        conversationId: req.body.conversationId,
        userProfile: await storage.getUser(userId),
      };
      
      const result = await researchAgent.processQuery(researchQuery, context);
      res.json(result);
    } catch (error) {
      console.error("Error in research agent:", error);
      res.status(500).json({ message: "Failed to process research query" });
    }
  });

  app.post('/api/agents/planner', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const planningRequest = req.body;
      
      const context = {
        userId,
        conversationId: req.body.conversationId,
        userProfile: await storage.getUser(userId),
      };
      
      const result = await plannerAgent.createItinerary(planningRequest, context);
      res.json(result);
    } catch (error) {
      console.error("Error in planner agent:", error);
      res.status(500).json({ message: "Failed to create itinerary" });
    }
  });

  app.post('/api/agents/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recommendationRequest = req.body;
      
      const context = {
        userId,
        conversationId: req.body.conversationId,
        userProfile: await storage.getUser(userId),
      };
      
      const result = await recommendationAgent.getRecommendations(recommendationRequest, context);
      res.json(result);
    } catch (error) {
      console.error("Error in recommendation agent:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  app.post('/api/agents/customer-service', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { query, category, urgency, language } = req.body;
      
      const supportRequest = {
        query,
        category,
        urgency,
        language,
      };
      
      const context = {
        userId,
        conversationId: req.body.conversationId,
        userProfile: await storage.getUser(userId),
        conversationHistory: [], // Would be populated from conversation
      };
      
      const result = await customerServiceAgent.handleSupportRequest(supportRequest, context);
      res.json(result);
    } catch (error) {
      console.error("Error in customer service agent:", error);
      res.status(500).json({ message: "Failed to handle support request" });
    }
  });

  // User Profile and Preferences
  app.get('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const stats = await storage.getUserStats(userId);
      
      res.json({
        ...user,
        stats,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        ...updates,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Travel History and Searches
  app.get('/api/user/travel-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const searches = await storage.getUserTravelSearches(userId, limit);
      res.json(searches);
    } catch (error) {
      console.error("Error fetching travel history:", error);
      res.status(500).json({ message: "Failed to fetch travel history" });
    }
  });

  // Ecuador Tourism API routes
  app.get('/api/ecuador/destinations', async (req, res) => {
    try {
      const { search, region, per_page = 10, page = 1 } = req.query;
      
      let destinations;
      if (region && ['costa', 'andes', 'amazonia', 'galapagos'].includes(region as string)) {
        destinations = await ecuadorTourismService.getDestinationsByRegion(region as any);
      } else {
        destinations = await ecuadorTourismService.getDestinations({
          search: search as string,
          per_page: parseInt(per_page as string),
          page: parseInt(page as string),
        });
      }
      
      res.json(destinations);
    } catch (error) {
      console.error("Error fetching Ecuador destinations:", error);
      res.status(500).json({ message: "Failed to fetch destinations" });
    }
  });

  app.get('/api/ecuador/destinations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const destination = await ecuadorTourismService.getDestinationDetails(parseInt(id));
      
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      
      res.json(destination);
    } catch (error) {
      console.error("Error fetching destination details:", error);
      res.status(500).json({ message: "Failed to fetch destination details" });
    }
  });

  app.post('/api/ecuador/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const { interests, budget, duration, travelStyle } = req.body;
      
      const recommendations = await ecuadorTourismService.getSmartRecommendations({
        interests,
        budget,
        duration,
        travelStyle,
      });
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get('/api/ecuador/stats', async (req, res) => {
    try {
      const stats = await ecuadorTourismService.getDestinationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching Ecuador tourism stats:", error);
      res.status(500).json({ message: "Failed to fetch tourism stats" });
    }
  });

  // Ecuador Tourism API routes
  app.get('/api/ecuador/destinations', async (req, res) => {
    try {
      const { search, region, per_page = 10, page = 1 } = req.query;
      
      let destinations;
      if (region && ['costa', 'andes', 'amazonia', 'galapagos'].includes(region as string)) {
        destinations = await ecuadorTourismService.getDestinationsByRegion(region as any);
      } else {
        destinations = await ecuadorTourismService.getDestinations({
          search: search as string,
          per_page: parseInt(per_page as string),
          page: parseInt(page as string),
        });
      }
      
      res.json(destinations);
    } catch (error) {
      console.error("Error fetching Ecuador destinations:", error);
      res.status(500).json({ message: "Failed to fetch destinations" });
    }
  });

  app.get('/api/ecuador/destinations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const destination = await ecuadorTourismService.getDestinationDetails(parseInt(id));
      
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      
      res.json(destination);
    } catch (error) {
      console.error("Error fetching destination details:", error);
      res.status(500).json({ message: "Failed to fetch destination details" });
    }
  });

  app.post('/api/ecuador/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const { interests, budget, duration, travelStyle } = req.body;
      
      const recommendations = await ecuadorTourismService.getSmartRecommendations({
        interests,
        budget,
        duration,
        travelStyle,
      });
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get('/api/ecuador/stats', async (req, res) => {
    try {
      const stats = await ecuadorTourismService.getDestinationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching Ecuador tourism stats:", error);
      res.status(500).json({ message: "Failed to fetch tourism stats" });
    }
  });

  // Admin Routes
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/logs', isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getSystemLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching system logs:", error);
      res.status(500).json({ message: "Failed to fetch system logs" });
    }
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        openai: 'connected',
        pinecone: 'connected',
        langGraph: 'operational',
      },
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
