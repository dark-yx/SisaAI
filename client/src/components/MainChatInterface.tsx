import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AgentType, AGENTS } from "@/types/agents";
import { Conversation, Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface MainChatInterfaceProps {
  activeAgent: AgentType;
}

export default function MainChatInterface({ activeAgent }: MainChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get user conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!user,
  });

  // Get current conversation messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/conversations', currentConversation?.id, 'messages'],
    enabled: !!currentConversation,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string; activeAgent: string }): Promise<Conversation> => {
      const response = await apiRequest('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversation(conversation);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Necesitas iniciar sesión. Redirigiendo...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      });
    },
  });

  // Send message to agent
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; conversationId: string; agentType: string }): Promise<Message> => {
      const response = await apiRequest('/api/chat/process', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', currentConversation?.id, 'messages'] 
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Necesitas iniciar sesión. Redirigiendo...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start new conversation when agent changes
  useEffect(() => {
    if (user && !currentConversation) {
      const title = `Conversación con ${AGENTS[activeAgent].name}`;
      createConversationMutation.mutate({ title, activeAgent });
    }
  }, [activeAgent, user, currentConversation]);

  const handleSendMessage = async () => {
    if (!message.trim() || !currentConversation) return;

    sendMessageMutation.mutate({
      message: message.trim(),
      conversationId: currentConversation.id,
      agentType: activeAgent,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    const title = `Nueva conversación con ${AGENTS[activeAgent].name}`;
    createConversationMutation.mutate({ title, activeAgent });
  };

  return (
    <div className="lg:col-span-2 space-y-4">
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${AGENTS[activeAgent].color}`}>
              <i className={`${AGENTS[activeAgent].icon} text-white text-sm`}></i>
            </div>
            <span>{AGENTS[activeAgent].name}</span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={startNewConversation}
          >
            Nueva Conversación
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <i className={`${AGENTS[activeAgent].icon} text-4xl text-gray-400 mb-4`}></i>
                <p>¡Hola! Soy tu {AGENTS[activeAgent].name.toLowerCase()}.</p>
                <p className="text-sm mt-2">{AGENTS[activeAgent].description}</p>
              </div>
            ) : (
              messages.map((msg: Message) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className={`flex items-start space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="w-8 h-8">
                        {msg.role === 'user' ? (
                          <>
                            <AvatarImage src={(user as any)?.profileImageUrl || undefined} />
                            <AvatarFallback>{(user as any)?.firstName?.[0] || 'U'}</AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className={AGENTS[activeAgent].color}>
                            <i className={`${AGENTS[activeAgent].icon} text-white text-xs`}></i>
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className={`rounded-lg px-3 py-2 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white' 
                          : 'bg-white border'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={AGENTS[activeAgent].color}>
                      <i className={`${AGENTS[activeAgent].icon} text-white text-xs`}></i>
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white border rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Escribe tu mensaje para ${AGENTS[activeAgent].name.toLowerCase()}...`}
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              <i className="fas fa-paper-plane"></i>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}