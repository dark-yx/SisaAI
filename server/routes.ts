import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { authenticateToken, AuthRequest } from "./auth/authMiddleware";
import { sisaOrchestrator } from "./services/langGraph/orchestrator";
import { researchAgent } from "./services/agents/researchAgent";
import { plannerAgent } from "./services/agents/plannerAgent";
import { recommendationAgent } from "./services/agents/recommendationAgent";
import { customerServiceAgent } from "./services/agents/customerServiceAgent";
import authRoutes from "./routes/auth";
import { insertMessageSchema, insertConversationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  });
  app.use('/api', limiter);

  // Auth routes
  app.use('/api/auth', authRoutes);

  // Auth routes
  app.get('/api/auth/user', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Chat and Conversation routes
  app.post('/api/conversations', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.get('/api/conversations', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
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
  app.post('/api/chat/process', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { message, conversationId, agentType } = req.body;
      
      if (!message || !conversationId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get user profile and conversation history
      const userProfile = await storage.getUser(userId);
      
      // Process message through Sisa AI orchestrator
      const response = await sisaOrchestrator.processMessage(message, {
        userId,
        conversationId,
        userProfile,
      });
      
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
        content: response,
        agentType: agentType,
      });
      
      res.json({
        response,
      });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Individual Agent Routes
  app.post('/api/agents/research', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.post('/api/agents/planner', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.post('/api/agents/recommendations', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.post('/api/agents/customer-service', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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
        conversationHistory: [],
      };
      
      const result = await customerServiceAgent.handleSupportRequest(supportRequest, context);
      res.json(result);
    } catch (error) {
      console.error("Error in customer service agent:", error);
      res.status(500).json({ message: "Failed to handle support request" });
    }
  });

  // User Profile and Preferences
  app.get('/api/user/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.put('/api/user/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
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
  app.get('/api/travel-searches', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const searches = await storage.getUserTravelSearches(userId, limit);
      res.json(searches);
    } catch (error) {
      console.error("Error fetching travel history:", error);
      res.status(500).json({ message: "Failed to fetch travel history" });
    }
  });

  // User stats
  app.get('/api/user/stats', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Admin Routes
  app.get('/api/system/stats', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/system/logs', authenticateToken, async (req: AuthRequest, res) => {
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
        sisaAI: 'operational',
      },
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}