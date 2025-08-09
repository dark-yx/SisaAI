export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentType?: string;
  metadata?: any;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  activeAgent: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  typingAgent?: string;
  activeAgent: string;
}

export interface TravelSearch {
  id: string;
  userId: string;
  query: string;
  destination?: string;
  budget?: number;
  duration?: number;
  travelDate?: string;
  preferences?: any;
  results?: any;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  travelStyle?: string;
  preferredDestinations?: string[];
  languagePreference?: string;
  totalTrips?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemStats {
  activeUsers: number;
  todayQueries: number;
  totalTrips: number;
}

export interface SystemLog {
  id: string;
  level: string;
  message: string;
  agentType?: string;
  userId?: string;
  metadata?: any;
  createdAt: string;
}
