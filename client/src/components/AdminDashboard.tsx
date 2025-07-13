import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { SystemStats, SystemLog } from "@/types/chat";

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("stats");

  // Get system stats
  const { data: systemStats } = useQuery({
    queryKey: ['/api/system/stats'],
    enabled: isOpen,
  });

  // Get system logs
  const { data: systemLogs = [] } = useQuery({
    queryKey: ['/api/system/logs'],
    enabled: isOpen,
  });

  const getLogBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'default';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <i className="fas fa-cog text-primary"></i>
            <span>Panel de Administración</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
            <TabsTrigger value="logs">Logs del Sistema</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                  <i className="fas fa-users text-primary"></i>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats?.activeUsers || 0}</div>
                  <p className="text-xs text-gray-600">Usuarios conectados ahora</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Consultas Hoy</CardTitle>
                  <i className="fas fa-chart-line text-secondary"></i>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats?.todayQueries || 0}</div>
                  <p className="text-xs text-gray-600">Consultas procesadas hoy</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Viajes Planificados</CardTitle>
                  <i className="fas fa-map-marked-alt text-accent"></i>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats?.totalTrips || 0}</div>
                  <p className="text-xs text-gray-600">Viajes creados en total</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Agentes del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-search text-green-600"></i>
                        <span className="font-medium">Agente de Investigación</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Activo</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Procesando consultas de destinos</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-calendar text-blue-600"></i>
                        <span className="font-medium">Agente de Planificación</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">Activo</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Creando itinerarios personalizados</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-star text-purple-600"></i>
                        <span className="font-medium">Agente de Recomendaciones</span>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Activo</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Generando recomendaciones personalizadas</p>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-headset text-orange-600"></i>
                        <span className="font-medium">Agente de Soporte</span>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">Activo</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Atendiendo consultas de usuarios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {systemLogs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay logs disponibles</p>
                  ) : (
                    systemLogs.map((log: SystemLog) => (
                      <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getLogBadgeVariant(log.level)} className="text-xs">
                              {log.level.toUpperCase()}
                            </Badge>
                            {log.agentType && (
                              <Badge variant="outline" className="text-xs">
                                {log.agentType}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{log.message}</p>
                        {log.metadata && (
                          <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Configuración de IA</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Modelo OpenAI</span>
                      <Badge variant="outline">GPT-4</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Base de Datos Vectorial</span>
                      <Badge variant="outline">Pinecone</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Multiagente</span>
                      <Badge className="bg-green-100 text-green-800">Activo</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Configuración de Idioma</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Idioma Principal</span>
                      <Badge variant="outline">Español</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Idiomas Soportados</span>
                      <Badge variant="outline">ES, EN</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Configuración de Base de Datos</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Estado de la DB</span>
                      <Badge className="bg-green-100 text-green-800">Conectada</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tipo de DB</span>
                      <Badge variant="outline">PostgreSQL</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}