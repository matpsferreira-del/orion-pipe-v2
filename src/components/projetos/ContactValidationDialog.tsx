import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Check, X, Sparkles, Linkedin, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ContactSuggestion } from '@/hooks/useContactValidation';
import { useUpdateOutplacementContact } from '@/hooks/useOutplacementProjects';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  suggestions: ContactSuggestion[];
  isLoading?: boolean;
}

export function ContactValidationDialog({ open, onOpenChange, suggestions, isLoading }: Props) {
  const update = useUpdateOutplacementContact();
  const [resolved, setResolved] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [editing, setEditing] = useState<Record<string, { position: string; company: string }>>({});

  // Reset state when dialog opens with a new batch
  useEffect(() => {
    if (open) {
      setResolved({});
      setEditing({});
    }
  }, [open, suggestions]);

  const getValues = (s: ContactSuggestion) => {
    const e = editing[s.contact_id];
    return {
      position: e ? e.position : (s.suggested.current_position ?? ''),
      company: e ? e.company : (s.suggested.company_name ?? ''),
    };
  };

  const setEdit = (id: string, patch: Partial<{ position: string; company: string }>) => {
    setEditing(prev => {
      const current = prev[id] ?? {
        position: suggestions.find(s => s.contact_id === id)?.suggested.current_position ?? '',
        company: suggestions.find(s => s.contact_id === id)?.suggested.company_name ?? '',
      };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  };

  const handleApply = async (s: ContactSuggestion) => {
    const { position, company } = getValues(s);
    try {
      await update.mutateAsync({
        id: s.contact_id,
        current_position: position.trim() || null,
        company_name: company.trim() || null,
      } as any);
      setResolved(prev => ({ ...prev, [s.contact_id]: 'accepted' }));
    } catch {
      toast.error('Erro ao aplicar correção');
    }
  };

  const handleReject = (s: ContactSuggestion) => {
    setResolved(prev => ({ ...prev, [s.contact_id]: 'rejected' }));
  };

  const pending = suggestions.filter(s => !resolved[s.contact_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões de Correção (IA)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-3 animate-pulse text-primary" />
              <p>Analisando contatos com IA...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Check className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              <p className="font-medium">Tudo certo!</p>
              <p className="text-sm mt-1">Nenhuma inconsistência encontrada nos contatos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                A IA encontrou <strong>{suggestions.length}</strong> contato(s) com possíveis inconsistências.
                Você pode editar os valores antes de aplicar.
              </p>
              {suggestions.map(s => {
                const status = resolved[s.contact_id];
                const { position, company } = getValues(s);
                const isEdited = !!editing[s.contact_id];
                return (
                  <div
                    key={s.contact_id}
                    className={`border rounded-lg p-4 space-y-3 transition-opacity ${
                      status ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{s.name}</h4>
                          {s.linkedin_url && (
                            <a
                              href={s.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#0A66C2] hover:underline"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                              LinkedIn
                            </a>
                          )}
                          {isEdited && !status && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                              <Pencil className="h-3 w-3" /> Editado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                      </div>
                      {status === 'accepted' && (
                        <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">✓ Aplicada</span>
                      )}
                      {status === 'rejected' && (
                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Ignorada</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-3 md:items-stretch text-xs">
                      {/* Original */}
                      <div className="space-y-1.5 bg-muted/40 p-2.5 rounded">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Original</p>
                        <div>
                          <span className="text-muted-foreground">Cargo: </span>
                          <span className="font-medium">{s.original.current_position || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Empresa: </span>
                          <span className="font-medium">{s.original.company_name || '—'}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto self-center hidden md:block" />
                      {/* Editable */}
                      <div className="space-y-2 bg-primary/5 border border-primary/20 p-2.5 rounded">
                        <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">Sugerido (editável)</p>
                        <div className="space-y-1">
                          <Label htmlFor={`pos-${s.contact_id}`} className="text-[11px] text-muted-foreground">Cargo</Label>
                          <Input
                            id={`pos-${s.contact_id}`}
                            value={position}
                            onChange={e => setEdit(s.contact_id, { position: e.target.value })}
                            disabled={!!status}
                            className="h-8 text-xs"
                            placeholder="—"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`comp-${s.contact_id}`} className="text-[11px] text-muted-foreground">Empresa</Label>
                          <Input
                            id={`comp-${s.contact_id}`}
                            value={company}
                            onChange={e => setEdit(s.contact_id, { company: e.target.value })}
                            disabled={!!status}
                            className="h-8 text-xs"
                            placeholder="—"
                          />
                        </div>
                      </div>
                    </div>

                    {!status && (
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => handleReject(s)} className="gap-1.5">
                          <X className="h-3.5 w-3.5" /> Ignorar
                        </Button>
                        <Button size="sm" onClick={() => handleApply(s)} disabled={update.isPending} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" /> Aplicar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {pending.length === 0 ? 'Fechar' : 'Concluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
