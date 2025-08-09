export type AgentType = 'research' | 'planner' | 'recommendations' | 'customer-service';

export interface Agent {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: 'active' | 'standby' | 'offline';
}

export interface AgentResponse {
  content: string;
  nextAgent?: AgentType;
  metadata?: any;
  shouldEnd?: boolean;
}

export interface AgentContext {
  userId: string;
  conversationId: string;
  userProfile?: any;
  conversationHistory: Array<{ role: string; content: string; agentType?: string }>;
  currentAgent: AgentType;
}

export const AGENTS: Record<AgentType, Agent> = {
  research: {
    type: 'research',
    name: 'Investigador',
    description: 'Búsqueda de destinos',
    icon: 'fas fa-search',
    color: 'bg-primary',
    status: 'standby',
  },
  planner: {
    type: 'planner',
    name: 'Planificador',
    description: 'Creación de itinerarios',
    icon: 'fas fa-calendar',
    color: 'bg-secondary',
    status: 'standby',
  },
  recommendations: {
    type: 'recommendations',
    name: 'Recomendaciones',
    description: 'Sugerencias personalizadas',
    icon: 'fas fa-star',
    color: 'bg-accent',
    status: 'standby',
  },
  'customer-service': {
    type: 'customer-service',
    name: 'Atención al Cliente',
    description: 'Soporte 24/7',
    icon: 'fas fa-headset',
    color: 'bg-purple-500',
    status: 'standby',
  },
};
