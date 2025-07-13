import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AgentsSidebar from "@/components/AgentsSidebar";
import MainChatInterface from "@/components/MainChatInterface";
import TravelInsightsSidebar from "@/components/TravelInsightsSidebar";
import { AgentType } from "@/types/agents";
import { User } from "@shared/schema";

export default function TravelerDashboard() {
  const { user } = useAuth();
  const [activeAgent, setActiveAgent] = useState<AgentType>("research");

  const { data: userProfile } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Agents Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <AgentsSidebar 
          activeAgent={activeAgent}
          onAgentChange={setActiveAgent}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header user={userProfile} />

        {/* Chat Interface */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <MainChatInterface activeAgent={activeAgent} />
          </div>
          
          {/* Travel Insights Sidebar */}
          <div className="w-80 bg-white border-l border-gray-200">
            <TravelInsightsSidebar user={userProfile} />
          </div>
        </div>
      </div>
    </div>
  );
}