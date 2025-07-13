import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { UserProfile, TravelSearch, SystemStats } from "@/types/chat";

interface TravelInsightsSidebarProps {
  user?: UserProfile;
}

export default function TravelInsightsSidebar({ user }: TravelInsightsSidebarProps) {
  // Get user travel searches
  const { data: recentSearches = [] } = useQuery({
    queryKey: ['/api/travel-searches'],
    enabled: !!user,
  });

  // Get user stats
  const { data: userStats } = useQuery({
    queryKey: ['/api/user/stats'],
    enabled: !!user,
  });

  // Get system stats
  const { data: systemStats } = useQuery({
    queryKey: ['/api/system/stats'],
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Perfil de Viajero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
              <i className="fas fa-user text-white"></i>
            </div>
            <div>
              <p className="font-medium">{user?.firstName || 'Viajero'}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{userStats?.totalTrips || 0}</p>
              <p className="text-xs text-gray-600">Viajes</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-secondary">{userStats?.totalConversations || 0}</p>
              <p className="text-xs text-gray-600">Conversaciones</p>
            </div>
          </div>

          {user?.travelStyle && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Estilo de Viaje</p>
              <Badge variant="outline">{user.travelStyle}</Badge>
            </div>
          )}

          {user?.preferredDestinations && user.preferredDestinations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Destinos Favoritos</p>
              <div className="flex flex-wrap gap-1">
                {user.preferredDestinations.slice(0, 3).map((dest, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {dest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Búsquedas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSearches.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay búsquedas recientes
            </p>
          ) : (
            <div className="space-y-3">
              {recentSearches.slice(0, 5).map((search: TravelSearch) => (
                <div key={search.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {search.destination || 'Destino general'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {search.query}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    {search.budget && (
                      <Badge variant="outline" className="text-xs">
                        ${search.budget}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(search.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Travel Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Consejos de Viaje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm font-medium text-blue-900">💡 Consejo del Día</p>
              <p className="text-xs text-blue-800 mt-1">
                Reserva vuelos con al menos 2 meses de anticipación para obtener mejores precios.
              </p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <p className="text-sm font-medium text-green-900">🌟 Recomendación</p>
              <p className="text-xs text-green-800 mt-1">
                Viaja en temporada baja para evitar multitudes y precios elevados.
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <p className="text-sm font-medium text-orange-900">⚠️ Importante</p>
              <p className="text-xs text-orange-800 mt-1">
                Siempre verifica los requisitos de visa antes de viajar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Stats */}
      {systemStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-primary">{systemStats.activeUsers}</p>
                <p className="text-xs text-gray-600">Usuarios Activos</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-secondary">{systemStats.todayQueries}</p>
                <p className="text-xs text-gray-600">Consultas Hoy</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-accent">{systemStats.totalTrips}</p>
                <p className="text-xs text-gray-600">Viajes Planificados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}