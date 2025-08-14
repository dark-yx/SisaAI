import {
  users,
  conversations,
  messages,
  travelSearches,
  systemLogs,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type TravelSearch,
  type InsertTravelSearch,
  type SystemLog,
  type InsertSystemLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  
  // Travel search operations
  createTravelSearch(search: InsertTravelSearch): Promise<TravelSearch>;
  getUserTravelSearches(userId: string, limit?: number): Promise<TravelSearch[]>;
  
  // System log operations
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(limit?: number): Promise<SystemLog[]>;
  
  // Analytics operations
  getUserStats(userId: string): Promise<{
    totalTrips: number;
    totalConversations: number;
    recentSearches: number;
  }>;
  
  getSystemStats(): Promise<{
    activeUsers: number;
    todayQueries: number;
    totalTrips: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        ...userData,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return created;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db
      .insert(messages)
      .values(message)
      .returning();
    return created;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  // Travel search operations
  async createTravelSearch(search: InsertTravelSearch): Promise<TravelSearch> {
    const [created] = await db
      .insert(travelSearches)
      .values(search)
      .returning();
    return created;
  }

  async getUserTravelSearches(userId: string, limit: number = 10): Promise<TravelSearch[]> {
    return await db
      .select()
      .from(travelSearches)
      .where(eq(travelSearches.userId, userId))
      .orderBy(desc(travelSearches.createdAt))
      .limit(limit);
  }

  // System log operations
  async createSystemLog(log: InsertSystemLog): Promise<SystemLog> {
    const [created] = await db
      .insert(systemLogs)
      .values(log)
      .returning();
    return created;
  }

  async getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    return await db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit);
  }

  // Analytics operations
  async getUserStats(userId: string): Promise<{
    totalTrips: number;
    totalConversations: number;
    recentSearches: number;
  }> {
    const [userRecord] = await db
      .select({ totalTrips: users.totalTrips })
      .from(users)
      .where(eq(users.id, userId));

    const [conversationCount] = await db
      .select({ count: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    const [searchCount] = await db
      .select({ count: travelSearches.id })
      .from(travelSearches)
      .where(
        and(
          eq(travelSearches.userId, userId),
          eq(travelSearches.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        )
      );

    return {
      totalTrips: userRecord?.totalTrips || 0,
      totalConversations: conversationCount ? 1 : 0,
      recentSearches: searchCount ? 1 : 0,
    };
  }

  async getSystemStats(): Promise<{
    activeUsers: number;
    todayQueries: number;
    totalTrips: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeUsers] = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.updatedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))); // Last 24 hours

    const [todayQueries] = await db
      .select({ count: messages.id })
      .from(messages)
      .where(eq(messages.createdAt, today));

    const [totalTrips] = await db
      .select({ sum: users.totalTrips })
      .from(users);

    return {
      activeUsers: activeUsers ? 1 : 0,
      todayQueries: todayQueries ? 1 : 0,
      totalTrips: totalTrips?.sum || 0,
    };
  }
}

export const storage = new DatabaseStorage();
