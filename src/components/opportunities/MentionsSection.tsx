import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AtSign, CheckCircle2, Plus, Trash2, Loader2 } from 'lucide-react';
import { useOpportunityMentions, useCreateMention, useResolveMention, useDeleteMention } from '@/hooks/useOpportunityMentions';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MentionsSectionProps {
  opportunityId: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function MentionsSection({ opportunityId }: MentionsSectionProps) {
  const { profile } = useAuth();
  const { data: mentions = [], isLoading } = useOpportunityMentions(opportunityId);
  const { data: profiles = [] } = useProfiles();
  const createMention = useCreateMention();
  const resolveMention = useResolveMention();
  const deleteMention = useDeleteMention();

  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [observation, setObservation] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const pending = mentions.filter((m) => m.status === 'pendente');
  const resolved = mentions.filter((m) => m.status === 'sinalizada');

  const handleCreate = async () => {
    if (!selectedUser) return;
    await createMention.mutateAsync({
      opportunity_id: opportunityId,
      mentioned_user_id: selectedUser,
      observacao: observation,
    });
    setSelectedUser('');
    setObservation('');
    setShowForm(false);
  };

  const handleResolve = async (id: string) => {
    await resolveMention.mutateAsync({ id, resolution_note: resolutionNote });
    setResolvingId(null);
    setResolutionNote('');
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <AtSign className="h-4 w-4" />
          Menções {pending.length > 0 && <Badge variant="secondary">{pending.length} pendente(s)</Badge>}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3 w-3 mr-1" />
          Marcar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {showForm && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o integrante..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.filter((p) => p.id !== profile?.id).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Descreva a ação que esse integrante precisa realizar..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={!selectedUser || createMention.isPending}>
                {createMention.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Marcar e notificar
              </Button>
            </div>
          </div>
        )}

        {isLoading && <p className="text-muted-foreground text-xs">Carregando...</p>}

        {!isLoading && mentions.length === 0 && !showForm && (
          <p className="text-muted-foreground text-xs">Nenhuma menção registrada.</p>
        )}

        {/* Pending mentions */}
        {pending.map((m) => {
          const mentioned = profiles.find((p) => p.id === m.mentioned_user_id);
          const by = profiles.find((p) => p.id === m.mentioned_by_user_id);
          const isOwn = m.mentioned_user_id === profile?.id;
          return (
            <div key={m.id} className="rounded-md border border-warning/40 bg-warning/5 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {mentioned ? getInitials(mentioned.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{mentioned?.name || 'Integrante'}</p>
                    <p className="text-xs text-muted-foreground">
                      por {by?.name || '—'} • {format(new Date(m.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-warning text-warning">Pendente</Badge>
              </div>

              {m.observacao && (
                <p className="text-xs text-foreground bg-background/60 rounded p-2 whitespace-pre-wrap">
                  {m.observacao}
                </p>
              )}

              {resolvingId === m.id ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Adicione uma observação sobre a ação realizada (opcional)..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setResolvingId(null); setResolutionNote(''); }}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => handleResolve(m.id)} disabled={resolveMention.isPending}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Confirmar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-1">
                  {isOwn && (
                    <Button size="sm" variant="default" onClick={() => setResolvingId(m.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Sinalizar como feito
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteMention.mutate(m.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* History */}
        {resolved.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Histórico ({resolved.length})</p>
            <div className="space-y-2">
              {resolved.map((m) => {
                const mentioned = profiles.find((p) => p.id === m.mentioned_user_id);
                const by = profiles.find((p) => p.id === m.mentioned_by_user_id);
                return (
                  <div key={m.id} className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground">
                        <strong>{mentioned?.name}</strong> — marcado por {by?.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] border-success text-success">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Resolvido
                      </Badge>
                    </div>
                    {m.observacao && <p className="text-muted-foreground">📌 {m.observacao}</p>}
                    {m.resolution_note && <p className="text-success">✓ {m.resolution_note}</p>}
                    <p className="text-muted-foreground text-[10px]">
                      {format(new Date(m.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      {m.resolved_at && ` → resolvido em ${format(new Date(m.resolved_at), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
