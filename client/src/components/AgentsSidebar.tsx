import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AgentType, AGENTS } from "@/types/agents";

interface AgentsSidebarProps {
  activeAgent: AgentType;
  onAgentChange: (agent: AgentType) => void;
}

export default function AgentsSidebar({ activeAgent, onAgentChange }: AgentsSidebarProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Agentes IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(AGENTS).map(([key, agent]) => (
            <div
              key={key}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-all hover:shadow-md",
                activeAgent === key ? "bg-primary/10 border-2 border-primary" : "bg-gray-50 hover:bg-gray-100"
              )}
              onClick={() => onAgentChange(key as AgentType)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", agent.color)}>
                    <i className={`${agent.icon} text-white text-sm`}></i>
                  </div>
                  <h3 className="font-medium text-gray-900">{agent.name}</h3>
                </div>
                <Badge 
                  variant={agent.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {agent.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{agent.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}