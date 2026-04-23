import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Trash2, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ACTIVITY_TYPE_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  StrategyActivityType,
  StrategyLeadStatus,
  useCreateStrategyActivity,
  useDeleteStrategyActivity,
  useStrategyActivitiesByGroup,
} from '@/hooks/useStrategyActivities';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  memberId: string;
  partyId: string;
  contactName: string;
}

export function StrategyActivityHistoryDialog({
  open, onOpenChange, groupId, memberId, partyId, contactName,
}: Props) {
  const { data: allActivities = [], isLoading } = useStrategyActivitiesByGroup(groupId);
  const createMut = useCreateStrategyActivity();
  const deleteMut = useDeleteStrategyActivity();

  const memberActivities = useMemo(
    () => allActivities.filter(a => a.member_id === memberId),
    [allActivities, memberId],
  );

  const [activityType, setActivityType] = useState<StrategyActivityType>('email');
  const [leadStatus, setLeadStatus] = useState<StrategyLeadStatus>('morno');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const reset = () => {
    setActivityType('email');
    setLeadStatus('morno');
    setTitle('');
    setDescription('');
    setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Informe um título para a atividade');
      return;
    }
    try {
      await createMut.mutateAsync({
        group_id: groupId,
        member_id: memberId,
        party_id: partyId,
        activity_type: activityType,
        lead_status: leadStatus,
        title: title.trim(),
        description: description.trim() || null,
        activity_date: new Date(activityDate).toISOString(),
      });
      toast.success('Atividade registrada');
      reset();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar atividade');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Atividades — {contactName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Form de nova atividade */}
          <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Registrar nova atividade</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={activityType} onValueChange={(v) => setActivityType(v as StrategyActivityType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status do lead</Label>
                <Select value={leadStatus} onValueChange={(v) => setLeadStatus(v as StrategyLeadStatus)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input
                className="h-9"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: E-mail de apresentação enviado"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes da interação..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data e hora</Label>
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSave}
                  disabled={createMut.isPending || !title.trim()}
                  className="w-full h-9"
                >
                  {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar atividade
                </Button>
              </div>
            </div>
          </div>

          {/* Histórico */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Histórico ({memberActivities.length})</p>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : memberActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma atividade registrada ainda.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {memberActivities.map((a) => (
                  <div key={a.id} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-card">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{a.title}</span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {ACTIVITY_TYPE_LABELS[a.activity_type]}
                        </Badge>
                        <Badge className={`text-[10px] py-0 border ${LEAD_STATUS_COLORS[a.lead_status]}`}>
                          {LEAD_STATUS_LABELS[a.lead_status]}
                        </Badge>
                      </div>
                      {a.description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(a.activity_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => deleteMut.mutate({ id: a.id, group_id: groupId })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
