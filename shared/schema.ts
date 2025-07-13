import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (Required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // User type: traveler, business, admin
  userType: varchar("user_type").notNull().default("traveler"),
  // Travel preferences (for travelers)
  travelStyle: varchar("travel_style"), // adventure, cultural, luxury, budget
  preferredDestinations: jsonb("preferred_destinations").$type<string[]>(),
  languagePreference: varchar("language_preference").default("es"),
  totalTrips: integer("total_trips").default(0),
});

// Travel conversations
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  activeAgent: varchar("active_agent").notNull(), // research, planner, recommendations, customer-service
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  role: varchar("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  agentType: varchar("agent_type"), // which agent sent this message
  metadata: jsonb("metadata"), // for storing additional data like destinations, prices, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Travel searches and recommendations
export const travelSearches = pgTable("travel_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  query: text("query").notNull(),
  destination: varchar("destination"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  duration: integer("duration"), // days
  travelDate: timestamp("travel_date"),
  preferences: jsonb("preferences"),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System logs for monitoring
export const systemLogs = pgTable("system_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  level: varchar("level").notNull(), // info, warning, error
  message: text("message").notNull(),
  agentType: varchar("agent_type"),
  userId: varchar("user_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business profiles for tourism companies
export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  businessName: varchar("business_name").notNull(),
  businessType: varchar("business_type").notNull(), // hotel, restaurant, tour_operator, transport, etc.
  description: text("description"),
  location: varchar("location"),
  contactPhone: varchar("contact_phone"),
  contactEmail: varchar("contact_email"),
  website: varchar("website"),
  rating: decimal("rating").default("0"),
  totalBookings: integer("total_bookings").default(0),
  isVerified: boolean("is_verified").default(false),
  services: jsonb("services").$type<string[]>(), // list of services offered
  priceRange: varchar("price_range"), // budget, mid-range, luxury
  availability: jsonb("availability"), // schedule and availability info
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings/Orders between travelers and businesses
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  travelerId: varchar("traveler_id").references(() => users.id).notNull(),
  businessId: varchar("business_id").references(() => users.id).notNull(),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id).notNull(),
  serviceName: varchar("service_name").notNull(),
  serviceType: varchar("service_type").notNull(), // hotel, tour, transport, etc.
  bookingDate: timestamp("booking_date").notNull(),
  serviceDate: timestamp("service_date").notNull(),
  numberOfGuests: integer("number_of_guests").default(1),
  totalAmount: decimal("total_amount").notNull(),
  currency: varchar("currency").default("USD"),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, cancelled, completed
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, refunded
  specialRequests: text("special_requests"),
  metadata: jsonb("metadata"), // additional booking details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Connections between travelers and businesses (favorites, follow, etc.)
export const userConnections = pgTable("user_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id).notNull(),
  connectionType: varchar("connection_type").notNull(), // favorite, follow, blocked
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  conversations: many(conversations),
  travelSearches: many(travelSearches),
  businessProfile: one(businessProfiles),
  travelerBookings: many(bookings, { relationName: "travelerBookings" }),
  businessBookings: many(bookings, { relationName: "businessBookings" }),
  connectionsFrom: many(userConnections, { relationName: "connectionsFrom" }),
  connectionsTo: many(userConnections, { relationName: "connectionsTo" }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const travelSearchesRelations = relations(travelSearches, ({ one }) => ({
  user: one(users, { fields: [travelSearches.userId], references: [users.id] }),
}));

export const businessProfilesRelations = relations(businessProfiles, ({ one, many }) => ({
  user: one(users, { fields: [businessProfiles.userId], references: [users.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  traveler: one(users, { fields: [bookings.travelerId], references: [users.id], relationName: "travelerBookings" }),
  business: one(users, { fields: [bookings.businessId], references: [users.id], relationName: "businessBookings" }),
  businessProfile: one(businessProfiles, { fields: [bookings.businessProfileId], references: [businessProfiles.id] }),
}));

export const userConnectionsRelations = relations(userConnections, ({ one }) => ({
  fromUser: one(users, { fields: [userConnections.fromUserId], references: [users.id], relationName: "connectionsFrom" }),
  toUser: one(users, { fields: [userConnections.toUserId], references: [users.id], relationName: "connectionsTo" }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  userType: true,
  travelStyle: true,
  preferredDestinations: true,
  languagePreference: true,
});

export const insertBusinessProfileSchema = createInsertSchema(businessProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserConnectionSchema = createInsertSchema(userConnections).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTravelSearchSchema = createInsertSchema(travelSearches).omit({
  id: true,
  createdAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertTravelSearch = z.infer<typeof insertTravelSearchSchema>;
export type TravelSearch = typeof travelSearches.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertUserConnection = z.infer<typeof insertUserConnectionSchema>;
export type UserConnection = typeof userConnections.$inferSelect;
