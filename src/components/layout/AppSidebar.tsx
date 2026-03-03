import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard,
  Kanban,
  Building2,
  Target,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  LogOut,
  CheckSquare,
  Contact,
  UserCircle,
  Briefcase,
  Radar,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TabType } from './TopNav';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon: Icon, label, collapsed, onClick }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const content = (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        'nav-item',
        isActive && 'active'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

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

interface AppSidebarProps {
  activeTab: TabType;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ activeTab, mobileOpen, onMobileClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const isMobile = useIsMobile();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor Comercial',
    consultor: 'Consultor',
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleNavClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const currentItems = tabNavItems[activeTab];

  // On mobile: hidden by default, shown as fixed overlay when mobileOpen
  // On desktop: normal sidebar behavior
  if (isMobile) {
    return (
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border w-64 transition-transform duration-300 top-14',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {currentItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={false}
              onClick={handleNavClick}
            />
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                {profile?.name ? getInitials(profile.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.name || 'Usuário'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {roleLabels[profile?.role || ''] || profile?.role || 'Consultor'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {currentItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User section */}
      <div className={cn(
        'p-3 border-t border-sidebar-border',
        collapsed ? 'flex flex-col items-center gap-2' : ''
      )}>
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg',
          collapsed ? 'justify-center' : ''
        )}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
              {profile?.name ? getInitials(profile.name) : '?'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.name || 'Usuário'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {roleLabels[profile?.role || ''] || profile?.role || 'Consultor'}
              </p>
            </div>
          )}
          {!collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          )}
        </div>

        {collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        )}

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed ? 'mx-auto' : 'ml-auto'
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
