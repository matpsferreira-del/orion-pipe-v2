import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Target, DollarSign, MoreHorizontal, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useProfiles, ProfileRow } from '@/hooks/useProfiles';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useAuth } from '@/contexts/AuthContext';
import { MemberDialog } from '@/components/team/MemberDialog';
import { MemberProfileDialog } from '@/components/team/MemberProfileDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor Comercial',
  consultor: 'Consultor',
};

const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive',
  gestor: 'bg-primary/10 text-primary',
  consultor: 'bg-success/10 text-success',
};

export default function Equipe() {
  const { profile } = useAuth();
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: opportunities } = useOpportunities();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProfileRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const getUserStats = (profileId: string) => {
    if (!opportunities) return { activeCount: 0, pipelineValue: 0, wonCount: 0, wonValue: 0 };
    
    const userOpps = opportunities.filter(o => o.responsavel_id === profileId);
    const activeOpps = userOpps.filter(o => !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage));
    const wonOpps = userOpps.filter(o => o.stage === 'fechado_ganhou');
    
    return {
      activeCount: activeOpps.length,
      pipelineValue: activeOpps.reduce((sum, o) => sum + Number(o.valor_potencial || 0), 0),
      wonCount: wonOpps.length,
      wonValue: wonOpps.reduce((sum, o) => sum + Number(o.valor_potencial || 0), 0),
    };
  };

  const handleViewProfile = (member: ProfileRow) => {
    setSelectedMember(member);
    setProfileDialogOpen(true);
  };

  const handleEdit = (member: ProfileRow) => {
    setSelectedMember(member);
    setMemberDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedMember(null);
    setMemberDialogOpen(true);
  };

  const handleDeleteClick = (member: ProfileRow) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    setDeleting(true);
    try {
      const response = await supabase.functions.invoke('manage-team-member', {
        body: { action: 'delete', profileId: memberToDelete.id, userId: memberToDelete.user_id },
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || response.error?.message);
      }

      toast({
        title: 'Membro removido',
        description: `${memberToDelete.name} foi removido da equipe.`,
      });

      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message || 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (profilesLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Equipe"
        description="Gerencie os membros do time comercial"
        actions={
          isAdmin && (
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Membro
            </Button>
          )
        }
      />

      {(!profiles || profiles.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum membro cadastrado.</p>
            {isAdmin && (
              <Button className="mt-4" onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Membro
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((member) => {
            const stats = getUserStats(member.id);
            
            return (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {member.avatar || getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{member.name}</h3>
                        <Badge variant="secondary" className={roleColors[member.role] || roleColors.consultor}>
                          {roleLabels[member.role] || member.role}
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
                        <DropdownMenuItem onClick={() => handleViewProfile(member)}>
                          Ver perfil
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(member)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteClick(member)}
                              disabled={member.user_id === profile?.user_id}
                            >
                              Remover
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Mail className="h-4 w-4" />
                    <span>{member.email}</span>
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
      )}

      <MemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        member={selectedMember}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['profiles'] })}
      />

      <MemberProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        member={selectedMember}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{memberToDelete?.name}</strong> da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
