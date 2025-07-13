import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AgentsSidebar from "@/components/AgentsSidebar";
import MainChatInterface from "@/components/MainChatInterface";
import TravelInsightsSidebar from "@/components/TravelInsightsSidebar";
import AdminDashboard from "@/components/AdminDashboard";
import { AgentType } from "@/types/agents";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [activeAgent, setActiveAgent] = useState<AgentType>('research');
  const [showAdminModal, setShowAdminModal] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <Header user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <AgentsSidebar activeAgent={activeAgent} onAgentChange={setActiveAgent} />
          <MainChatInterface activeAgent={activeAgent} />
          <TravelInsightsSidebar user={user} />
        </div>
      </div>

      {/* Admin Modal */}
      <AdminDashboard 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
      />

      {/* Fixed Admin Access Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setShowAdminModal(true)}
          className="bg-neutral text-white w-14 h-14 rounded-full shadow-lg hover:bg-neutral/90 transition-all transform hover:scale-110 flex items-center justify-center"
        >
          <i className="fas fa-cog text-xl"></i>
        </button>
      </div>
    </div>
  );
}
