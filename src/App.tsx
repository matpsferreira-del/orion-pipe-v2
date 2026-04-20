import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import Auth from "./pages/Auth";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Empresas = lazy(() => import("./pages/Empresas"));
const Contatos = lazy(() => import("./pages/Contatos"));
const Oportunidades = lazy(() => import("./pages/Oportunidades"));
const FinanceiroDashboard = lazy(() => import("./pages/FinanceiroDashboard"));
const FinanceiroLancamentos = lazy(() => import("./pages/FinanceiroLancamentos"));
const FinanceiroDRE = lazy(() => import("./pages/FinanceiroDRE"));
const FinanceiroFluxoCaixa = lazy(() => import("./pages/FinanceiroFluxoCaixa"));
const FinanceiroReembolsos = lazy(() => import("./pages/FinanceiroReembolsos"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Equipe = lazy(() => import("./pages/Equipe"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Pessoas = lazy(() => import("./pages/Pessoas"));
const Vagas = lazy(() => import("./pages/Vagas"));
const ProposalGenerator = lazy(() => import("./pages/ProposalGenerator"));
const RecrutamentoDashboard = lazy(() => import("./pages/RecrutamentoDashboard"));
const MapeamentoVagas = lazy(() => import("./pages/MapeamentoVagas"));
const MapComercial = lazy(() => import("./pages/MapComercial"));
const ShortlistPresentation = lazy(() => import("./pages/ShortlistPresentation"));
const QuestionnaireBuilder = lazy(() => import("./pages/QuestionnaireBuilder"));
const PostGenerator = lazy(() => import("./pages/PostGenerator"));
const FormatacaoCV = lazy(() => import("./pages/FormatacaoCV"));
const ChromeExtension = lazy(() => import("./pages/ChromeExtension"));
const CartaOferta = lazy(() => import("./pages/CartaOferta"));

const PropostaOutplacement = lazy(() => import("./pages/PropostaOutplacement"));
const PptInstitucional = lazy(() => import("./pages/PptInstitucional"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
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
        <Suspense fallback={<PageLoader />}>
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
                <Route path="/vagas/:jobId/questionario" element={<QuestionnaireBuilder />} />
                <Route path="/formatacao-cv" element={<FormatacaoCV />} />
                <Route path="/oportunidades" element={<Oportunidades />} />
                <Route path="/oportunidades/:id/proposta" element={<ProposalGenerator />} />
                <Route path="/oportunidades/:id/proposta-outplacement" element={<PropostaOutplacement />} />
                <Route path="/ppt-institucional" element={<PptInstitucional />} />
                <Route path="/tarefas" element={<Tarefas />} />
                <Route path="/financeiro" element={<Navigate to="/financeiro/dashboard" replace />} />
                <Route path="/faturamento" element={<Navigate to="/financeiro/lancamentos" replace />} />
                <Route path="/financeiro/dashboard" element={<FinanceiroDashboard />} />
                <Route path="/financeiro/lancamentos" element={<FinanceiroLancamentos />} />
                <Route path="/financeiro/dre" element={<FinanceiroDRE />} />
                <Route path="/financeiro/fluxo-caixa" element={<FinanceiroFluxoCaixa />} />
                <Route path="/financeiro/reembolsos" element={<FinanceiroReembolsos />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/mapeamento-vagas" element={<MapeamentoVagas />} />
                <Route path="/map-comercial" element={<MapComercial />} />
                <Route path="/equipe" element={<Equipe />} />
                <Route path="/post-generator" element={<PostGenerator />} />
                <Route path="/carta-oferta" element={<CartaOferta />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
