import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Empresas from "./pages/Empresas";
import Contatos from "./pages/Contatos";
import Oportunidades from "./pages/Oportunidades";
import Faturamento from "./pages/Faturamento";
import Relatorios from "./pages/Relatorios";
import Equipe from "./pages/Equipe";
import Configuracoes from "./pages/Configuracoes";
import Tarefas from "./pages/Tarefas";
import Pessoas from "./pages/Pessoas";
import Vagas from "./pages/Vagas";
import ProposalGenerator from "./pages/ProposalGenerator";
import RecrutamentoDashboard from "./pages/RecrutamentoDashboard";
import MapeamentoVagas from "./pages/MapeamentoVagas";
import ShortlistPresentation from "./pages/ShortlistPresentation";
// @ts-ignore
import FormatacaoCV from "./pages/FormatacaoCV";
import Auth from "./pages/Auth";
import ChromeExtension from "./pages/ChromeExtension";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rota pública para extensão Chrome */}
            <Route
              path="/chrome-extension"
              element={
                <ProtectedRoute>
                  <ChromeExtension />
                </ProtectedRoute>
              }
            />

            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/contatos" element={<Contatos />} />
              <Route path="/pessoas" element={<Pessoas />} />
              <Route path="/recrutamento" element={<RecrutamentoDashboard />} />
              <Route path="/vagas" element={<Vagas />} />
              <Route path="/jobs/:id/shortlist-presentation" element={<ShortlistPresentation />} />
              <Route path="/formatacao-cv" element={<FormatacaoCV />} />
              <Route path="/oportunidades" element={<Oportunidades />} />
              <Route path="/oportunidades/:id/proposta" element={<ProposalGenerator />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/faturamento" element={<Faturamento />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/mapeamento-vagas" element={<MapeamentoVagas />} />
              <Route path="/equipe" element={<Equipe />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
