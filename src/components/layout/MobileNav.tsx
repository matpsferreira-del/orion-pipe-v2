import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Kanban, Building2, Target, Receipt, BarChart3, Settings,
  Users, LogOut, CheckSquare, Contact, UserCircle, Briefcase, Radar,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TabType, tabConfig } from './TopNav';

const tabNavItems = {
  comercial: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pipeline', icon: Kanban, label: 'Funil Comercial' },
    { to: '/empresas', icon: Building2, label: 'Empresas' },
    { to: '/contatos', icon: Contact, label: 'Contatos' },
    { to: '/oportunidades', icon: Target, label: 'Oportunidades' },
    { to: '/tarefas', icon: CheckSquare, label: 'Tarefas' },
    { to: '/faturamento', icon: Receipt, label: 'Faturamento' },
    { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
    { to: '/mapeamento-vagas', icon: Radar, label: 'Mapeamento de Vagas' },
  ],
  recrutamento: [
    { to: '/recrutamento', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pessoas', icon: UserCircle, label: 'Banco de Talentos' },
    { to: '/vagas', icon: Briefcase, label: 'Vagas' },
  ],
  configuracoes: [
    { to: '/equipe', icon: Users, label: 'Equipe' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ],
};

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function MobileNav({ open, onOpenChange, activeTab, onTabChange }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor Comercial',
    consultor: 'Consultor',
  };

  const handleNavClick = (to: string) => {
    navigate(to);
    onOpenChange(false);
  };

  const handleTabSwitch = (tab: TabType) => {
    onTabChange(tab);
    navigate(tabConfig[tab].defaultRoute);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left text-base">Menu</SheetTitle>
        </SheetHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 p-3 border-b border-border">
          {(Object.keys(tabConfig) as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              className={cn(
                'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {tabConfig[tab].label}
            </button>
          ))}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabNavItems[activeTab].map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <button
                key={item.to}
                onClick={() => handleNavClick(item.to)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {profile?.name ? getInitials(profile.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.name || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {roleLabels[profile?.role || ''] || profile?.role || 'Consultor'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
