import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated } = useAuth();

  const handleAuthSuccess = () => {
    setShowAuth(false);
    // The useAuth hook will automatically detect the authentication change
    window.location.reload();
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        {isLogin ? (
          <LoginForm 
            onSuccess={handleAuthSuccess}
            onToggleMode={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm 
            onSuccess={handleAuthSuccess}
            onToggleMode={() => setIsLogin(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <i className="fas fa-brain text-2xl text-primary mr-2"></i>
                <h1 className="text-2xl font-bold text-neutral">Sisa AI</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Español</option>
                  <option>English</option>
                </select>
              </div>
              <Button onClick={() => window.location.href = '/api/login'} className="bg-primary hover:bg-primary/90">
              <Button onClick={() => setShowAuth(true)} className="bg-primary hover:bg-primary/90">
                Iniciar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold text-neutral mb-6">
              Tu Agente de Viajes
              <span className="text-primary"> Definitivo</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Experiencia hiper-personalizada con inteligencia artificial avanzada. 
              Sistema multiagente que planifica, investiga y recomienda todo lo que necesitas para tu viaje perfecto.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setShowAuth(true)}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg"
              >
                Comenzar Ahora
              </Button>
              <Button 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary/10 px-8 py-4 text-lg"
              >
                Ver Demo
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="border-primary/20 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-search text-primary text-xl"></i>
                </div>
                <CardTitle className="text-lg">Investigación IA</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Busca destinos con información actualizada y verificada usando tecnología RAG.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-secondary/20 hover:border-secondary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-calendar text-secondary text-xl"></i>
                </div>
                <CardTitle className="text-lg">Planificación</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Itinerarios personalizados día a día adaptados a tus preferencias y presupuesto.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-accent/20 hover:border-accent/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-star text-accent text-xl"></i>
                </div>
                <CardTitle className="text-lg">Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Sugerencias hiper-personalizadas de hoteles, restaurantes y actividades.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-purple-500/20 hover:border-purple-500/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-headset text-purple-500 text-xl"></i>
                </div>
                <CardTitle className="text-lg">Soporte 24/7</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Atención al cliente inteligente disponible las 24 horas, los 7 días de la semana.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-neutral mb-4">Tecnología de Vanguardia</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Impulsado por las últimas innovaciones en inteligencia artificial y arquitectura multiagente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-brain text-primary text-2xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-neutral mb-2">LangGraph</h4>
              <p className="text-gray-600">Sistema multiagente avanzado para orquestación inteligente de tareas.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-database text-secondary text-2xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-neutral mb-2">RAG + Pinecone</h4>
              <p className="text-gray-600">Generación aumentada con recuperación para información precisa y actualizada.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-robot text-accent text-2xl"></i>
              </div>
              <h4 className="text-xl font-semibold text-neutral mb-2">GPT-4</h4>
              <p className="text-gray-600">Modelo de lenguaje más avanzado para conversaciones naturales y precisas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">¿Listo para tu próxima aventura?</h3>
          <p className="text-xl mb-8 opacity-90">
            Únete a miles de viajeros que ya confían en Sisa AI para planificar sus viajes perfectos.
          </p>
          <Button 
            onClick={() => setShowAuth(true)}
            className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
          >
            Comenzar Gratis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <i className="fas fa-brain text-2xl text-primary mr-2"></i>
                <h5 className="text-xl font-bold">Sisa AI</h5>
              </div>
              <p className="text-gray-400">
                Tu agente de viajes inteligente para experiencias inolvidables.
              </p>
            </div>
            <div>
              <h6 className="font-semibold mb-4">Producto</h6>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Características</a></li>
                <li><a href="#" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h6 className="font-semibold mb-4">Empresa</h6>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carreras</a></li>
              </ul>
            </div>
            <div>
              <h6 className="font-semibold mb-4">Soporte</h6>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentación</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
                <li><a href="#" className="hover:text-white">Estado</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Sisa AI. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
