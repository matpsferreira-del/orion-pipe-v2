import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Trash2, Eye, FolderOpen } from 'lucide-react';
import { useCommercialStrategy } from '@/hooks/useCommercialStrategy';
import { useToast } from '@/hooks/use-toast';
import { StrategyGroupDetail } from '@/components/commercial/StrategyGroupDetail';

export default function MapComercial() {
  const { groups, isLoading, createGroup, deleteGroup } = useCommercialStrategy();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  const handleCreate = async () => {
    if (!newGroup.name.trim()) return;
    try {
      await createGroup.mutateAsync(newGroup);
      setDialogOpen(false);
      setNewGroup({ name: '', description: '' });
      toast({ title: 'Grupo criado com sucesso' });
    } catch {
      toast({ title: 'Erro ao criar grupo', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup.mutateAsync(id);
      toast({ title: 'Grupo excluído' });
    } catch {
      toast({ title: 'Erro ao excluir grupo', variant: 'destructive' });
    }
  };

  if (selectedGroupId) {
    return <StrategyGroupDetail groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Map Comercial"
        description="Crie grupos de estratégia comercial e salve perfis captados no LinkedIn"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Grupo
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : groups?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum grupo criado. Crie seu primeiro grupo de estratégia comercial.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups?.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0" onClick={() => setSelectedGroupId(group.id)}>
                    <CardTitle className="text-base truncate">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="mt-1 line-clamp-2">{group.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0" onClick={() => setSelectedGroupId(group.id)}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{group.member_count || 0} perfis</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Grupo de Estratégia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                placeholder="Ex: Escritórios de Advocacia"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Descreva a estratégia deste grupo..."
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newGroup.name.trim()}>Criar Grupo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
