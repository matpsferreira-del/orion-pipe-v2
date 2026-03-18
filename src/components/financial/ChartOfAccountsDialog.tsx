import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartOfAccounts } from '@/hooks/useFinancial';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPOS = [
  { value: 'receita', label: 'Receita' },
  { value: 'custo', label: 'Custo' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'deducao', label: 'Dedução' },
];

export function ChartOfAccountsDialog({ open, onOpenChange }: Props) {
  const { data: accounts = [], isLoading } = useChartOfAccounts();
  const queryClient = useQueryClient();
  const [newPacote, setNewPacote] = useState('');
  const [newConta, setNewConta] = useState('');
  const [newTipo, setNewTipo] = useState('despesa');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newPacote.trim() || !newConta.trim()) {
      toast.error('Preencha o pacote e a conta contábil.');
      return;
    }

    setSaving(true);
    const maxOrdem = accounts.reduce((max, a) => Math.max(max, a.ordem || 0), 0);

    const { error } = await supabase
      .from('chart_of_accounts' as any)
      .insert({
        pacote: newPacote.trim(),
        conta_contabil: newConta.trim(),
        tipo: newTipo,
        ordem: maxOrdem + 10,
        ativo: true,
      } as any);

    setSaving(false);

    if (error) {
      toast.error('Erro ao adicionar: ' + error.message);
      return;
    }

    toast.success('Conta contábil adicionada!');
    queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
    setNewPacote('');
    setNewConta('');
  };

  const handleToggle = async (id: string, currentAtivo: boolean) => {
    const { error } = await supabase
      .from('chart_of_accounts' as any)
      .update({ ativo: !currentAtivo } as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
  };

  const grouped = accounts.reduce<Record<string, typeof accounts>>((acc, item) => {
    if (!acc[item.pacote]) acc[item.pacote] = [];
    acc[item.pacote].push(item);
    return acc;
  }, {});

  // Get unique pacotes for suggestions
  const existingPacotes = [...new Set(accounts.map(a => a.pacote))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plano de Contas</DialogTitle>
        </DialogHeader>

        {/* Add new */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <h4 className="font-medium text-sm">Adicionar Nova Conta</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Pacote</Label>
              <Input
                placeholder="Ex: Tecnologia"
                value={newPacote}
                onChange={e => setNewPacote(e.target.value)}
                list="pacotes-list"
              />
              <datalist id="pacotes-list">
                {existingPacotes.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Conta Contábil</Label>
              <Input
                placeholder="Ex: Licenças de Software"
                value={newConta}
                onChange={e => setNewConta(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={newTipo} onValueChange={setNewTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Adicionar
            </Button>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([pacote, contas]) => (
              <div key={pacote} className="space-y-1">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{pacote}</h4>
                {contas.map(conta => (
                  <div
                    key={conta.id}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded border text-sm',
                      !conta.ativo && 'opacity-50 bg-muted/30',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        conta.tipo === 'receita' && 'bg-success/10 text-success',
                        conta.tipo === 'despesa' && 'bg-destructive/10 text-destructive',
                        conta.tipo === 'custo' && 'bg-orange-500/10 text-orange-600',
                        conta.tipo === 'deducao' && 'bg-yellow-500/10 text-yellow-700',
                      )}>
                        {conta.tipo}
                      </span>
                      <span>{conta.conta_contabil}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(conta.id, conta.ativo)}
                      className="h-7 text-xs"
                    >
                      {conta.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
