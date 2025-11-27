import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { mockUsers, mockOpportunities } from '@/data/mockData';
import { Plus, Mail, Target, DollarSign, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const roleLabels = {
  admin: 'Administrador',
  gestor: 'Gestor Comercial',
  consultor: 'Consultor',
};

const roleColors = {
  admin: 'bg-destructive/10 text-destructive',
  gestor: 'bg-primary/10 text-primary',
  consultor: 'bg-success/10 text-success',
};

export default function Equipe() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const getUserStats = (userId: string) => {
    const userOpps = mockOpportunities.filter(o => o.responsavelId === userId);
    const activeOpps = userOpps.filter(o => !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage));
    const wonOpps = userOpps.filter(o => o.stage === 'fechado_ganhou');
    
    return {
      activeCount: activeOpps.length,
      pipelineValue: activeOpps.reduce((sum, o) => sum + o.valorPotencial, 0),
      wonCount: wonOpps.length,
      wonValue: wonOpps.reduce((sum, o) => sum + o.valorPotencial, 0),
    };
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Equipe"
        description="Gerencie os membros do time comercial"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Membro
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockUsers.map((user) => {
          const stats = getUserStats(user.id);
          
          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {user.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{user.name}</h3>
                      <Badge variant="secondary" className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Ver oportunidades</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Desativar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Oportunidades</p>
                      <p className="font-semibold">{stats.activeCount} ativas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pipeline</p>
                      <p className="font-semibold">{formatCurrency(stats.pipelineValue)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fechados este ano:</span>
                    <span className="font-medium text-success">{stats.wonCount} ({formatCurrency(stats.wonValue)})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
