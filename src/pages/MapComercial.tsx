import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, Search, Users, Trash2, Loader2, ExternalLink, FolderOpen, ChevronRight,
  Building, BadgeCheck, ArrowLeft, UserPlus, MoreHorizontal, Upload, Download,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ImportLeadsDialog } from '@/components/commercial/ImportLeadsDialog';

interface StrategyGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

interface StrategyMember {
  id: string;
  group_id: string;
  party_id: string;
  notes: string | null;
  created_at: string;
  party: {
    id: string;
    full_name: string;
    current_title: string | null;
    current_company: string | null;
    linkedin_url: string | null;
    email_raw: string | null;
    phone_raw: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

export default function MapComercial() {
  const { user, profile: authProfile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StrategyGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Fetch groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['commercial-strategy-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_strategy_groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StrategyGroup[];
    },
  });

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // Fetch members for selected group
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['commercial-strategy-members', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const { data, error } = await supabase
        .from('commercial_strategy_members')
        .select('*, party:party_id(id, full_name, current_title, current_company, linkedin_url, email_raw)')
        .eq('group_id', selectedGroupId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as StrategyMember[];
    },
    enabled: !!selectedGroupId,
  });

  // Search parties to add
  const { data: searchResults = [], isFetching: searchingParties } = useQuery({
    queryKey: ['party-search-commercial', memberSearch],
    queryFn: async () => {
      if (memberSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('party')
        .select('id, full_name, current_title, current_company, linkedin_url')
        .ilike('full_name', `%${memberSearch}%`)
        .eq('status', 'active')
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: memberSearch.length >= 2,
  });

  // Mutations
  const saveGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupName.trim()) throw new Error('Nome é obrigatório');
      if (editingGroup) {
        const { error } = await supabase
          .from('commercial_strategy_groups')
          .update({ name: groupName.trim(), description: groupDescription.trim() || null })
          .eq('id', editingGroup.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('commercial_strategy_groups')
          .insert({ name: groupName.trim(), description: groupDescription.trim() || null, created_by: authProfile?.id || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-strategy-groups'] });
      toast.success(editingGroup ? 'Estratégia atualizada!' : 'Estratégia criada!');
      closeGroupDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: membersError } = await supabase
        .from('commercial_strategy_members')
        .delete()
        .eq('group_id', id);
      if (membersError) throw membersError;
      const { error } = await supabase.from('commercial_strategy_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-strategy-groups'] });
      if (selectedGroupId === deleteGroupId) setSelectedGroupId(null);
      toast.success('Estratégia excluída');
      setDeleteGroupId(null);
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (partyId: string) => {
      if (!selectedGroupId) throw new Error('Selecione uma estratégia');
      const { error } = await supabase
        .from('commercial_strategy_members')
        .insert({ group_id: selectedGroupId, party_id: partyId });
      if (error) {
        if (error.code === '23505') throw new Error('Este perfil já está nesta estratégia');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-strategy-members', selectedGroupId] });
      toast.success('Perfil adicionado à estratégia!');
      setShowAddMemberDialog(false);
      setMemberSearch('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('commercial_strategy_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-strategy-members', selectedGroupId] });
      toast.success('Perfil removido');
    },
  });

  const closeGroupDialog = () => {
    setShowGroupDialog(false);
    setEditingGroup(null);
    setGroupName('');
    setGroupDescription('');
  };

  const openEditGroup = (group: StrategyGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setShowGroupDialog(true);
  };

  const filteredMembers = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.party?.full_name?.toLowerCase().includes(q) ||
      m.party?.current_company?.toLowerCase().includes(q) ||
      m.party?.current_title?.toLowerCase().includes(q)
    );
  });

  const existingPartyIds = new Set(members.map(m => m.party_id));

  // ---- DETAIL VIEW ----
  if (selectedGroup) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelectedGroupId(null)} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{selectedGroup.name}</h1>
              {selectedGroup.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{selectedGroup.description}</p>
              )}
            </div>
            <Button size="sm" onClick={() => setShowAddMemberDialog(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Adicionar Perfil
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Buscar perfis..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <p className="text-sm text-muted-foreground">
            {filteredMembers.length} perfil{filteredMembers.length !== 1 ? 's' : ''} nesta estratégia
          </p>

          {loadingMembers ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{search ? 'Nenhum perfil encontrado' : 'Nenhum perfil adicionado ainda'}</p>
              <p className="text-sm mt-1">{search ? 'Ajuste a busca' : 'Adicione perfis do banco de talentos ou via extensão Chrome'}</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Cargo Atual</TableHead>
                    <TableHead className="hidden sm:table-cell">Empresa Atual</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.party?.full_name || '—'}</span>
                          {member.party?.linkedin_url && (
                            <a href={member.party.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {member.party?.current_title || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {member.party?.current_company || '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add member dialog */}
          <Dialog open={showAddMemberDialog} onOpenChange={(open) => { setShowAddMemberDialog(open); if (!open) setMemberSearch(''); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Perfil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nome..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {searchingParties && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
                  {!searchingParties && memberSearch.length >= 2 && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado</p>
                  )}
                  {searchResults.map(party => {
                    const alreadyAdded = existingPartyIds.has(party.id);
                    return (
                      <div
                        key={party.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{party.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[party.current_title, party.current_company].filter(Boolean).join(' · ') || 'Sem cargo/empresa'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyAdded ? 'secondary' : 'default'}
                          disabled={alreadyAdded || addMemberMutation.isPending}
                          onClick={() => addMemberMutation.mutate(party.id)}
                          className="ml-2 shrink-0"
                        >
                          {alreadyAdded ? 'Já adicionado' : 'Adicionar'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // ---- GROUP LIST VIEW ----
  const filteredGroups = groups.filter(g => {
    if (!search) return true;
    return g.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
        <PageHeader
          title="Map Comercial"
          description="Estratégias comerciais com perfis decisores e influenciadores"
          actions={
            <Button onClick={() => setShowGroupDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova Estratégia
            </Button>
          }
        />

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Buscar estratégias..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loadingGroups ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? 'Nenhuma estratégia encontrada' : 'Nenhuma estratégia criada'}</p>
            <p className="text-sm mt-1">Crie uma estratégia para organizar perfis decisores</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map(group => (
              <Card
                key={group.id}
                className="cursor-pointer hover:border-primary/40 transition-colors group"
                onClick={() => { setSelectedGroupId(group.id); setSearch(''); }}
              >
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base font-semibold truncate pr-2">{group.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => openEditGroup(group)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteGroupId(group.id)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(group.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Group Dialog */}
        <Dialog open={showGroupDialog} onOpenChange={(open) => { if (!open) closeGroupDialog(); else setShowGroupDialog(true); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Editar Estratégia' : 'Nova Estratégia'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Escritórios de Advocacia SP" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição (opcional)</Label>
                <Textarea value={groupDescription} onChange={e => setGroupDescription(e.target.value)} placeholder="Descreva o objetivo desta estratégia..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeGroupDialog}>Cancelar</Button>
              <Button onClick={() => saveGroupMutation.mutate()} disabled={!groupName.trim() || saveGroupMutation.isPending}>
                {saveGroupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingGroup ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteGroupId} onOpenChange={(open) => { if (!open) setDeleteGroupId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir estratégia?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os perfis vinculados a esta estratégia serão removidos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteGroupId && deleteGroupMutation.mutate(deleteGroupId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
