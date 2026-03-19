import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Linkedin, UserCircle } from 'lucide-react';
import { useStrategyGroupMembers } from '@/hooks/useCommercialStrategy';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  groupId: string;
  onBack: () => void;
}

export function StrategyGroupDetail({ groupId, onBack }: Props) {
  const { members, isLoading, addMember, removeMember } = useStrategyGroupMembers(groupId);
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Get group info
  const { data: group } = useQuery({
    queryKey: ['strategy-group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_strategy_groups')
        .select('*')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Search parties not already in group
  const { data: searchResults } = useQuery({
    queryKey: ['party-search-strategy', search, groupId],
    queryFn: async () => {
      if (!search.trim()) return [];
      const memberPartyIds = members?.map((m: any) => m.party_id) || [];
      let query = supabase
        .from('party')
        .select('id, full_name, current_title, current_company, linkedin_url, email_raw')
        .ilike('full_name', `%${search}%`)
        .eq('status', 'active')
        .limit(10);
      
      const { data, error } = await query;
      if (error) throw error;
      return data?.filter((p: any) => !memberPartyIds.includes(p.id)) || [];
    },
    enabled: search.length >= 2,
  });

  const handleAdd = async (partyId: string) => {
    try {
      await addMember.mutateAsync({ group_id: groupId, party_id: partyId });
      toast({ title: 'Perfil adicionado ao grupo' });
    } catch {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast({ title: 'Perfil removido' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={group?.name || 'Carregando...'}
        description={group?.description || ''}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Perfil
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : members?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum perfil neste grupo. Adicione perfis captados no LinkedIn.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Cargo</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="hidden md:table-cell">LinkedIn</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.party?.full_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {member.party?.current_title || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {member.party?.current_company || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {member.party?.linkedin_url ? (
                      <a href={member.party.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1">
                        <Linkedin className="h-4 w-4" /> Perfil
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => handleRemove(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Perfil ao Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchResults?.map((party: any) => (
                <div key={party.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => handleAdd(party.id)}>
                  <div>
                    <p className="text-sm font-medium">{party.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[party.current_title, party.current_company].filter(Boolean).join(' · ') || party.email_raw || '—'}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {search.length >= 2 && searchResults?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum perfil encontrado
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
