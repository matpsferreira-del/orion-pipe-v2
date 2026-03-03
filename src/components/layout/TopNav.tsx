import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';

export type TabType = 'comercial' | 'recrutamento' | 'configuracoes';

export const tabConfig = {
  comercial: {
    label: 'Comercial',
    defaultRoute: '/',
  },
  recrutamento: {
    label: 'Recrutamento',
    defaultRoute: '/recrutamento',
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
  '/faturamento': 'comercial',
  '/relatorios': 'comercial',
  '/recrutamento': 'recrutamento',
  '/pessoas': 'recrutamento',
  '/vagas': 'recrutamento',
  '/equipe': 'configuracoes',
  '/configuracoes': 'configuracoes',
};

export const getActiveTab = (pathname: string): TabType => {
  return routeToTab[pathname] || 'comercial';
};

interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const navigate = useNavigate();

  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
    navigate(tabConfig[tab].defaultRoute);
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mr-8">
        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
          <Target className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-sm">RecruitCRM</span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1">
        {(Object.keys(tabConfig) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
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
