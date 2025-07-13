import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Building, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { User, BusinessProfile, Booking } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserType, setSelectedUserType] = useState<string>("all");

  const { data: adminStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users", selectedUserType],
    enabled: !!user,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["/api/admin/businesses"],
    enabled: !!user,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["/api/admin/bookings"],
    enabled: !!user,
  });

  const { data: systemLogs = [] } = useQuery({
    queryKey: ["/api/admin/logs"],
    enabled: !!user,
  });

  const verifyBusinessMutation = useMutation({
    mutationFn: async ({ businessId, verified }: { businessId: string; verified: boolean }) => {
      return await apiRequest(`/api/admin/businesses/${businessId}/verify`, "PUT", { verified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/businesses"] });
      toast({
        title: "Negocio actualizado",
        description: "El estado de verificación del negocio ha sido actualizado.",
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      return await apiRequest(`/api/admin/users/${userId}/suspend`, "PUT", { suspended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El estado del usuario ha sido actualizado.",
      });
    },
  });

  const handleVerifyBusiness = (businessId: string, verified: boolean) => {
    verifyBusinessMutation.mutate({ businessId, verified });
  };

  const handleSuspendUser = (userId: string, suspended: boolean) => {
    suspendUserMutation.mutate({ userId, suspended });
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case "traveler": return "bg-blue-100 text-blue-800";
      case "business": return "bg-green-100 text-green-800";
      case "admin": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "suspended": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case "info": return "bg-blue-100 text-blue-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "error": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Verificar que el usuario es admin
  if (user?.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder al panel de administración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración Sisa</h1>
          <p className="text-gray-600 mt-2">Gestiona usuarios, negocios y el sistema completo</p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Usuarios Totales</p>
                  <p className="text-2xl font-bold">{adminStats?.totalUsers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Negocios</p>
                  <p className="text-2xl font-bold">{adminStats?.totalBusinesses || 0}</p>
                </div>
                <Building className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reservas</p>
                  <p className="text-2xl font-bold">{adminStats?.totalBookings || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos</p>
                  <p className="text-2xl font-bold">${adminStats?.totalRevenue || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Crecimiento</p>
                  <p className="text-2xl font-bold">{adminStats?.monthlyGrowth || 0}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="businesses">Negocios</TabsTrigger>
            <TabsTrigger value="bookings">Reservas</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
            <TabsTrigger value="logs">Logs del Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Gestión de Usuarios</span>
                  <Select value={selectedUserType} onValueChange={setSelectedUserType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      <SelectItem value="traveler">Viajeros</SelectItem>
                      <SelectItem value="business">Negocios</SelectItem>
                      <SelectItem value="admin">Administradores</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user: User) => (
                    <div key={user.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getUserTypeColor(user.userType)}>
                            {user.userType}
                          </Badge>
                          <Badge className={getStatusColor(user.suspended ? "suspended" : "active")}>
                            {user.suspended ? "Suspendido" : "Activo"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Registrado: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          {!user.suspended ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleSuspendUser(user.id, true)}
                              disabled={suspendUserMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Suspender
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => handleSuspendUser(user.id, false)}
                              disabled={suspendUserMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Activar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="businesses">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Negocios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {businesses.map((business: BusinessProfile) => (
                    <div key={business.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{business.businessName}</h3>
                          <p className="text-sm text-gray-600">{business.businessType} • {business.location}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={business.isVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {business.isVerified ? "Verificado" : "Pendiente"}
                          </Badge>
                          <Badge>
                            ⭐ {business.rating}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{business.description}</p>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          {business.totalBookings} reservas • Rango: {business.priceRange}
                        </div>
                        <div className="flex gap-2">
                          {!business.isVerified ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleVerifyBusiness(business.id, true)}
                              disabled={verifyBusinessMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verificar
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleVerifyBusiness(business.id, false)}
                              disabled={verifyBusinessMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Remover Verificación
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Supervisión de Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking: Booking) => (
                    <div key={booking.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{booking.serviceName}</h3>
                          <p className="text-sm text-gray-600">{booking.serviceType}</p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <strong>Fecha:</strong> {new Date(booking.serviceDate).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>Huéspedes:</strong> {booking.numberOfGuests}
                        </div>
                        <div>
                          <strong>Monto:</strong> ${booking.totalAmount}
                        </div>
                        <div>
                          <strong>Pago:</strong> {booking.paymentStatus}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Reserva realizada: {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Análisis del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Usuarios Activos</h3>
                      <p className="text-2xl font-bold text-blue-600">{adminStats?.activeUsers || 0}</p>
                      <p className="text-sm text-gray-600">Últimos 30 días</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Tasa de Conversión</h3>
                      <p className="text-2xl font-bold text-green-600">{adminStats?.conversionRate || 0}%</p>
                      <p className="text-sm text-gray-600">Búsquedas → Reservas</p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Satisfacción</h3>
                      <p className="text-2xl font-bold text-purple-600">{adminStats?.satisfaction || 0}/5</p>
                      <p className="text-sm text-gray-600">Calificación promedio</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Países con Más Usuarios</h3>
                      <div className="space-y-2">
                        {adminStats?.topCountries?.map((country: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span>{country.name}</span>
                            <span className="font-semibold">{country.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Destinos Populares</h3>
                      <div className="space-y-2">
                        {adminStats?.topDestinations?.map((destination: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span>{destination.name}</span>
                            <span className="font-semibold">{destination.searches}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Logs del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemLogs.map((log: any) => (
                    <div key={log.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={getLogLevelColor(log.level)}>
                              {log.level}
                            </Badge>
                            {log.level === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {log.agentType && (
                              <Badge variant="outline">{log.agentType}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}