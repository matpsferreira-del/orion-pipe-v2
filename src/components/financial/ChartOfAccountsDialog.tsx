import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartOfAccounts, ChartAccount } from '@/hooks/useFinancial';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Loader2, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPOS = [
  { value: 'receita', label: 'Receita', prefix: '1' },
  { value: 'deducao', label: 'Dedução', prefix: '2' },
  { value: 'custo', label: 'Custo', prefix: '3' },
  { value: 'despesa', label: 'Despesa', prefix: '4' },
];

function getNextCode(accounts: ChartAccount[], tipo: string): string {
  const prefix = TIPOS.find(t => t.value === tipo)?.prefix || '4';
  const baseNum = Number(prefix) * 100;
  const existing = accounts
    .filter(a => a.tipo === tipo && a.codigo)
    .map(a => Number(a.codigo))
    .filter(n => !isNaN(n));
  const max = existing.length > 0 ? Math.max(...existing) : baseNum;
  return String(max + 1);
}

export function ChartOfAccountsDialog({ open, onOpenChange }: Props) {
  const { data: accounts = [], isLoading } = useChartOfAccounts(true);
  const queryClient = useQueryClient();
  const [newPacote, setNewPacote] = useState('');
  const [newSubPacote, setNewSubPacote] = useState('');
  const [newConta, setNewConta] = useState('');
  const [newTipo, setNewTipo] = useState('despesa');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubPacote, setEditSubPacote] = useState('');

  const handleAdd = async () => {
    if (!newPacote.trim() || !newConta.trim()) {
      toast.error('Preencha o pacote e a conta contábil.');
      return;
    }

    setSaving(true);
    const maxOrdem = accounts.reduce((max, a) => Math.max(max, a.ordem || 0), 0);
    const codigo = getNextCode(accounts, newTipo);

    const { error } = await supabase
      .from('chart_of_accounts' as any)
      .insert({
        pacote: newPacote.trim(),
        conta_contabil: newConta.trim(),
        tipo: newTipo,
        ordem: maxOrdem + 10,
        ativo: true,
        codigo,
        sub_pacote: newSubPacote.trim() || null,
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
    setNewSubPacote('');
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

  const startEdit = (conta: ChartAccount) => {
    setEditingId(conta.id);
    setEditName(conta.conta_contabil);
    setEditSubPacote(conta.sub_pacote || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditSubPacote('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Nome não pode ser vazio.');
      return;
    }

    const { error } = await supabase
      .from('chart_of_accounts' as any)
      .update({ conta_contabil: editName.trim(), sub_pacote: editSubPacote.trim() || null } as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }

    toast.success('Conta atualizada!');
    queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
    setEditingId(null);
  };

  // Group by tipo then pacote then sub_pacote
  const tipoOrder = ['receita', 'deducao', 'custo', 'despesa'];
  const allAccounts = [...accounts].sort((a, b) => {
    const ta = tipoOrder.indexOf(a.tipo);
    const tb = tipoOrder.indexOf(b.tipo);
    if (ta !== tb) return ta - tb;
    return (a.ordem || 0) - (b.ordem || 0);
  });

  const grouped: Record<string, Record<string, Record<string, ChartAccount[]>>> = {};
  allAccounts.forEach(acc => {
    const tipo = acc.tipo;
    const pacote = acc.pacote;
    const sub = acc.sub_pacote || '_root';
    if (!grouped[tipo]) grouped[tipo] = {};
    if (!grouped[tipo][pacote]) grouped[tipo][pacote] = {};
    if (!grouped[tipo][pacote][sub]) grouped[tipo][pacote][sub] = [];
    grouped[tipo][pacote][sub].push(acc);
  });

  const existingPacotes = [...new Set(accounts.map(a => a.pacote))];
  const existingSubPacotes = [...new Set(accounts.map(a => a.sub_pacote).filter(Boolean))] as string[];

  const tipoLabel = (tipo: string) => TIPOS.find(t => t.value === tipo)?.label || tipo;
  const tipoColor = (tipo: string) => {
    switch (tipo) {
      case 'receita': return 'text-emerald-600 bg-emerald-500/10';
      case 'deducao': return 'text-yellow-700 bg-yellow-500/10';
      case 'custo': return 'text-orange-600 bg-orange-500/10';
      case 'despesa': return 'text-destructive bg-destructive/10';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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
              <Label className="text-xs">Sub-pacote (opcional)</Label>
              <Input
                placeholder="Ex: Consultores"
                value={newSubPacote}
                onChange={e => setNewSubPacote(e.target.value)}
                list="subpacotes-list"
              />
              <datalist id="subpacotes-list">
                {existingSubPacotes.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Conta Contábil</Label>
              <Input
                placeholder="Ex: Licenças de Software"
                value={newConta}
                onChange={e => setNewConta(e.target.value)}
              />
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
          <p className="text-xs text-muted-foreground">
            Código será gerado automaticamente: Receita (1xx), Dedução (2xx), Custo (3xx), Despesa (4xx)
          </p>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {tipoOrder.map(tipo => {
              if (!grouped[tipo]) return null;
              return (
                <div key={tipo} className="space-y-3">
                  <h3 className={cn('text-sm font-bold uppercase tracking-wide px-2 py-1 rounded', tipoColor(tipo))}>
                    {tipoLabel(tipo)}
                  </h3>
                  {Object.entries(grouped[tipo]).map(([pacote, subs]) => (
                    <div key={pacote} className="space-y-1 ml-2">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide border-b pb-1">
                        {pacote}
                      </h4>
                      {Object.entries(subs).map(([sub, contas]) => (
                        <div key={sub} className="space-y-0.5">
                          {sub !== '_root' && (
                            <p className="text-xs font-medium text-muted-foreground ml-3 mt-1">▸ {sub}</p>
                          )}
                          {contas.map(conta => (
                            <div
                              key={conta.id}
                              className={cn(
                                'flex items-center justify-between px-3 py-1.5 rounded border text-sm',
                                sub !== '_root' && 'ml-4',
                                !conta.ativo && 'opacity-40 bg-muted/30',
                              )}
                            >
                              {editingId === conta.id ? (
                                <div className="flex items-center gap-2 flex-1 mr-2">
                                  <span className="text-xs text-muted-foreground font-mono w-8">{conta.codigo}</span>
                                  <Input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="h-7 text-sm flex-1"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && saveEdit(conta.id)}
                                  />
                                  <Input
                                    value={editSubPacote}
                                    onChange={e => setEditSubPacote(e.target.value)}
                                    className="h-7 text-sm w-28"
                                    placeholder="Sub-pacote"
                                  />
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => saveEdit(conta.id)}>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-mono w-8">{conta.codigo || '—'}</span>
                                    <span>{conta.conta_contabil}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEdit(conta)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggle(conta.id, conta.ativo)}
                                      className="h-7 text-xs"
                                    >
                                      {conta.ativo ? 'Desativar' : 'Ativar'}
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
