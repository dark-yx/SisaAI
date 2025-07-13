import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SystemStats, SystemLog } from "@/types/chat";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: logs, isLoading: logsLoading } = useQuery<SystemLog[]>({
    queryKey: ["/api/admin/logs"],
    retry: false,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading || !isAuthenticated) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral">Dashboard Administrativo</h1>
          <p className="text-gray-600 mt-2">Monitoreo y estadísticas del sistema Sisa AI</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary-100">
                Usuarios Activos
              </CardTitle>
              <i className="fas fa-users text-2xl text-primary-200"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.activeUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-secondary to-secondary/80 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary-100">
                Consultas Hoy
              </CardTitle>
              <i className="fas fa-comments text-2xl text-secondary-200"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.todayQueries || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-accent to-accent/80 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-accent-100">
                Viajes Planificados
              </CardTitle>
              <i className="fas fa-plane text-2xl text-accent-200"></i>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.totalTrips || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Rendimiento de Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <i className="fas fa-search text-white text-sm"></i>
                  </div>
                  <span className="font-medium text-neutral">Investigador</span>
                </div>
                <div className="flex items-center space-x-4">
                  <Progress value={92} className="w-24" />
                  <span className="text-sm text-neutral">92%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <i className="fas fa-calendar text-white text-sm"></i>
                  </div>
                  <span className="font-medium text-neutral">Planificador</span>
                </div>
                <div className="flex items-center space-x-4">
                  <Progress value={88} className="w-24" />
                  <span className="text-sm text-neutral">88%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <i className="fas fa-star text-white text-sm"></i>
                  </div>
                  <span className="font-medium text-neutral">Recomendaciones</span>
                </div>
                <div className="flex items-center space-x-4">
                  <Progress value={95} className="w-24" />
                  <span className="text-sm text-neutral">95%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-headset text-white text-sm"></i>
                  </div>
                  <span className="font-medium text-neutral">Atención al Cliente</span>
                </div>
                <div className="flex items-center space-x-4">
                  <Progress value={90} className="w-24" />
                  <span className="text-sm text-neutral">90%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : logs && logs.length > 0 ? (
                logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.level === 'error' ? 'bg-error/20' :
                      log.level === 'warning' ? 'bg-warning/20' :
                      'bg-primary/20'
                    }`}>
                      <i className={`fas ${
                        log.agentType === 'research' ? 'fa-search' :
                        log.agentType === 'planner' ? 'fa-calendar' :
                        log.agentType === 'recommendations' ? 'fa-star' :
                        log.agentType === 'customer-service' ? 'fa-headset' :
                        'fa-info-circle'
                      } text-sm ${
                        log.level === 'error' ? 'text-error' :
                        log.level === 'warning' ? 'text-warning' :
                        'text-primary'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral">{log.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString('es-ES')} | 
                        {log.agentType ? ` ${log.agentType}` : ''} | 
                        {log.level.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                  <p>No hay actividad reciente para mostrar</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
