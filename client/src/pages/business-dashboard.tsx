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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Users, DollarSign, Star, Clock } from "lucide-react";
import { BusinessProfile, Booking, User } from "@shared/schema";

export default function BusinessDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { data: businessProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/business/profile"],
    enabled: !!user,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/business/bookings"],
    enabled: !!user,
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/business/analytics"],
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<BusinessProfile>) => {
      return await apiRequest(`/api/business/profile`, "PUT", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      toast({
        title: "Perfil actualizado",
        description: "Tu perfil de negocio ha sido actualizado exitosamente.",
      });
      setIsEditingProfile(false);
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      return await apiRequest(`/api/business/bookings/${bookingId}`, "PUT", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/bookings"] });
      toast({
        title: "Reserva actualizada",
        description: "El estado de la reserva ha sido actualizado.",
      });
    },
  });

  const handleUpdateBooking = (bookingId: string, status: string) => {
    updateBookingMutation.mutate({ bookingId, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "completed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (profileLoading) {
    return <div>Cargando panel de negocio...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Negocio</h1>
          <p className="text-gray-600 mt-2">Gestiona tu negocio turístico y reservas</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reservas Totales</p>
                  <p className="text-2xl font-bold">{analytics?.totalBookings || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos Mensuales</p>
                  <p className="text-2xl font-bold">${analytics?.monthlyRevenue || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calificación</p>
                  <p className="text-2xl font-bold">{businessProfile?.rating || 0}</p>
                </div>
                <Star className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold">{analytics?.totalClients || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings">Reservas</TabsTrigger>
            <TabsTrigger value="profile">Perfil del Negocio</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Reservas</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div>Cargando reservas...</div>
                ) : (
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(booking.serviceDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            {booking.numberOfGuests} huéspedes
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            ${booking.totalAmount}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {booking.specialRequests && (
                          <p className="text-sm text-gray-600 mt-2">
                            <strong>Solicitudes especiales:</strong> {booking.specialRequests}
                          </p>
                        )}
                        
                        <div className="flex gap-2 mt-4">
                          {booking.status === "pending" && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateBooking(booking.id, "confirmed")}
                                disabled={updateBookingMutation.isPending}
                              >
                                Confirmar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleUpdateBooking(booking.id, "cancelled")}
                                disabled={updateBookingMutation.isPending}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                          {booking.status === "confirmed" && (
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateBooking(booking.id, "completed")}
                              disabled={updateBookingMutation.isPending}
                            >
                              Marcar como Completado
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Perfil del Negocio</CardTitle>
              </CardHeader>
              <CardContent>
                {businessProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="businessName">Nombre del Negocio</Label>
                        <Input
                          id="businessName"
                          value={businessProfile.businessName}
                          readOnly={!isEditingProfile}
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessType">Tipo de Negocio</Label>
                        <Select value={businessProfile.businessType} disabled={!isEditingProfile}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hotel">Hotel</SelectItem>
                            <SelectItem value="restaurant">Restaurante</SelectItem>
                            <SelectItem value="tour_operator">Operador de Tours</SelectItem>
                            <SelectItem value="transport">Transporte</SelectItem>
                            <SelectItem value="attraction">Atracción</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={businessProfile.description || ""}
                        readOnly={!isEditingProfile}
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Ubicación</Label>
                        <Input
                          id="location"
                          value={businessProfile.location || ""}
                          readOnly={!isEditingProfile}
                        />
                      </div>
                      <div>
                        <Label htmlFor="priceRange">Rango de Precios</Label>
                        <Select value={businessProfile.priceRange || ""} disabled={!isEditingProfile}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="budget">Económico</SelectItem>
                            <SelectItem value="mid-range">Medio</SelectItem>
                            <SelectItem value="luxury">Lujo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      {!isEditingProfile ? (
                        <Button onClick={() => setIsEditingProfile(true)}>
                          Editar Perfil
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditingProfile(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={() => updateProfileMutation.mutate(businessProfile)}
                            disabled={updateProfileMutation.isPending}
                          >
                            Guardar Cambios
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No tienes un perfil de negocio configurado</p>
                    <Button onClick={() => setIsEditingProfile(true)}>
                      Crear Perfil de Negocio
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Reservas por Mes</h3>
                      <p className="text-2xl font-bold text-blue-600">{analytics?.monthlyBookings || 0}</p>
                      <p className="text-sm text-gray-600">+15% vs mes anterior</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Tasa de Ocupación</h3>
                      <p className="text-2xl font-bold text-green-600">{analytics?.occupancyRate || 0}%</p>
                      <p className="text-sm text-gray-600">Promedio mensual</p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Clientes Habituales</h3>
                    <p className="text-2xl font-bold text-yellow-600">{analytics?.returningClients || 0}</p>
                    <p className="text-sm text-gray-600">Clientes que han reservado más de una vez</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}