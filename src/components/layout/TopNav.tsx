import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export type TabType = 'comercial' | 'recrutamento' | 'financeiro' | 'configuracoes';

export const tabConfig = {
  comercial: {
    label: 'Comercial',
    defaultRoute: '/',
  },
  recrutamento: {
    label: 'Recrutamento',
    defaultRoute: '/recrutamento',
  },
  financeiro: {
    label: 'Financeiro',
    defaultRoute: '/financeiro/dashboard',
  },
  configuracoes: {
    label: 'Configurações',
    defaultRoute: '/equipe',
  },
};

export const routeToTab: Record<string, TabType> = {
  '/': 'comercial',
  '/pipeline': 'comercial',
  '/empresas': 'comercial',
  '/contatos': 'comercial',
  '/oportunidades': 'comercial',
  '/tarefas': 'comercial',
  '/relatorios': 'comercial',
  '/mapeamento-vagas': 'comercial',
  '/map-comercial': 'comercial',
  '/post-generator': 'comercial',
  '/financeiro': 'financeiro',
  '/financeiro/dashboard': 'financeiro',
  '/financeiro/lancamentos': 'financeiro',
  '/financeiro/dre': 'financeiro',
  '/financeiro/fluxo-caixa': 'financeiro',
  '/financeiro/reembolsos': 'financeiro',
  '/faturamento': 'financeiro',
  '/formatacao-cv': 'recrutamento',
  '/chrome-extension': 'recrutamento',
  '/recrutamento': 'recrutamento',
  '/pessoas': 'recrutamento',
  '/vagas': 'recrutamento',
  '/projetos': 'recrutamento',
  '/equipe': 'configuracoes',
  '/configuracoes': 'configuracoes',
};

export const getActiveTab = (pathname: string): TabType => {
  if (routeToTab[pathname]) return routeToTab[pathname];
  // Prefix match for nested routes (e.g. /projetos/:id)
  const match = Object.keys(routeToTab).find(
    (route) => route !== '/' && pathname.startsWith(route + '/')
  );
  return match ? routeToTab[match] : 'comercial';
};

interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onMenuToggle?: () => void;
}

export function TopNav({ activeTab, onTabChange, onMenuToggle }: TopNavProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
    navigate(tabConfig[tab].defaultRoute);
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-3 md:px-6">
      {/* Mobile hamburger */}
      {isMobile && (
        <Button variant="ghost" size="icon" className="mr-2 h-9 w-9" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Logo */}
      <div className="flex items-center mr-4 md:mr-8">
        <span className="text-xl md:text-2xl font-bold tracking-wider text-foreground">
          ORION<span className="text-primary">.</span>
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-0.5 md:gap-1 overflow-x-auto">
        {(Object.keys(tabConfig) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={cn(
              'px-2.5 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tabConfig[tab].label}
          </button>
        ))}
      </nav>
    </header>
  );
}
