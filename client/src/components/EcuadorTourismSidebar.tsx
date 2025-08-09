import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MapPin, Search, ExternalLink } from 'lucide-react';

interface TourismDestination {
  id: number;
  name: string;
  description: string;
  region: string;
  type: string;
  link: string;
  image?: string;
  excerpt: string;
}

export default function EcuadorTourismSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  // Obtener destinos de Ecuador
  const { data: destinations = [], isLoading } = useQuery<TourismDestination[]>({
    queryKey: ['/api/ecuador/destinations', searchQuery, selectedRegion],
    enabled: true,
  });

  // Obtener estadísticas de turismo
  const { data: stats } = useQuery<{
    totalDestinations: number;
    regionDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
  }>({
    queryKey: ['/api/ecuador/stats'],
  });

  const regions = [
    { id: 'costa', name: 'Costa Pacífico', color: 'bg-blue-500' },
    { id: 'andes', name: 'Los Andes', color: 'bg-green-500' },
    { id: 'amazonia', name: 'Amazonía', color: 'bg-emerald-500' },
    { id: 'galapagos', name: 'Galápagos', color: 'bg-cyan-500' },
  ];

  const tourismTypes = [
    'Aventura', 'Cultural', 'Naturaleza', 'Gastronómico', 
    'Sol y Playa', 'Bienestar', 'LGBTIQ+', 'Comunitario'
  ];

  return (
    <div className="space-y-4">
      {/* Búsqueda de Destinos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            <span>Destinos Ecuador</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar destinos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros por Región */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Regiones</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedRegion === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRegion('')}
              >
                Todas
              </Button>
              {regions.map((region) => (
                <Button
                  key={region.id}
                  variant={selectedRegion === region.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRegion(region.id)}
                  className="text-xs"
                >
                  {region.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Destinos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Destinos Encontrados ({destinations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                Cargando destinos...
              </div>
            ) : destinations.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No se encontraron destinos
              </div>
            ) : (
              <div className="space-y-3">
                {destinations.map((destination) => (
                  <div
                    key={destination.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    {destination.image && (
                      <img
                        src={destination.image}
                        alt={destination.name}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <h4 className="font-medium text-sm mb-1">
                      {destination.name}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {destination.excerpt.length > 100 
                        ? destination.excerpt.substring(0, 100) + '...' 
                        : destination.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {destination.region}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {destination.type}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(destination.link, '_blank')}
                        className="p-1 h-6 w-6"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Estadísticas de Turismo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {stats.totalDestinations}
                </div>
                <div className="text-xs text-gray-600">Destinos Totales</div>
              </div>
              
              {Object.keys(stats.regionDistribution || {}).length > 0 && (
                <div>
                  <h5 className="text-xs font-medium mb-2">Por Región:</h5>
                  <div className="space-y-1">
                    {Object.entries(stats.regionDistribution).map(([region, count]) => (
                      <div key={region} className="flex justify-between text-xs">
                        <span>{region}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tipos de Turismo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Tipos de Turismo en Ecuador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {tourismTypes.map((type) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}