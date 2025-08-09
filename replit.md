# Sisa AI Travel Assistant

## Overview

This is a full-stack travel assistant application powered by AI that provides a multi-agent system for comprehensive travel planning. The application features a React frontend with TypeScript, Express.js backend, PostgreSQL database with Drizzle ORM, and integrates with OpenAI for AI capabilities and Pinecone for vector database functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful API with structured error handling

### Multi-Agent System
The application implements a sophisticated multi-agent architecture:
- **Research Agent**: Handles destination research and travel data gathering
- **Planner Agent**: Creates detailed travel itineraries
- **Recommendation Agent**: Provides personalized travel recommendations
- **Customer Service Agent**: Handles user support and assistance
- **LangGraph Orchestrator**: Coordinates agent interactions and workflow

## Key Components

### Database Schema
- **Users**: Stores user profiles with travel preferences and history
- **Conversations**: Manages chat conversations with active agent tracking
- **Messages**: Stores conversation messages with agent attribution
- **Travel Searches**: Tracks user search history and preferences
- **System Logs**: Maintains audit trail and system monitoring
- **Sessions**: Handles user authentication sessions

### AI Integration
- **OpenAI Service**: Integrates GPT-4o for natural language processing
- **Pinecone Service**: Vector database for RAG (Retrieval-Augmented Generation)
- **Agent Services**: Specialized AI agents for different travel domains

### Authentication System
- **Replit Auth**: Integrated OpenID Connect authentication
- **Session Management**: Secure session handling with PostgreSQL backend
- **User Profile**: Automatic user creation and profile management

## Data Flow

1. **User Authentication**: Users authenticate through Replit Auth system
2. **Conversation Management**: System creates or retrieves conversations
3. **Message Processing**: User messages are processed by appropriate AI agents
4. **AI Agent Orchestration**: LangGraph coordinates multi-agent responses
5. **Response Generation**: AI generates contextual responses using OpenAI and RAG
6. **Data Persistence**: All interactions are stored in PostgreSQL database

## External Dependencies

### Primary Services
- **OpenAI API**: For language model capabilities (GPT-4o)
- **Pinecone**: Vector database for semantic search and RAG
- **Neon Database**: PostgreSQL database hosting
- **Replit Auth**: Authentication service

### Development Dependencies
- **Vite**: Frontend build tool and development server
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Backend bundling for production
- **TypeScript**: Type checking and compilation

## Deployment Strategy

### Development Mode
- Frontend served by Vite dev server with HMR
- Backend runs with tsx for TypeScript execution
- Database migrations handled by Drizzle Kit

### Production Build
- Frontend built with Vite and served as static files
- Backend bundled with ESBuild for Node.js execution
- Database schema pushed using Drizzle migrations

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API access
- `PINECONE_API_KEY`: Pinecone vector database access
- `SESSION_SECRET`: Session encryption key
- `REPLIT_DOMAINS`: Authentication domain configuration

The application follows a monorepo structure with shared TypeScript types and schemas, enabling type safety across the full stack while maintaining clear separation of concerns between frontend, backend, and shared utilities.