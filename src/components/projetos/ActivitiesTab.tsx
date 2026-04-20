import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Trash2, MessageSquare, Calendar, RefreshCw, Users, Briefcase, MoreHorizontal } from 'lucide-react';
import {
  useOutplacementActivities, useCreateOutplacementActivity, useDeleteOutplacementActivity,
  useOutplacementContacts, OutplacementProject,
} from '@/hooks/useOutplacementProjects';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  project: OutplacementProject;
}

const activityIcons: Record<string, React.ElementType> = {
  mensagem: MessageSquare,
  reuniao: Calendar,
  follow_up: RefreshCw,
  indicacao: Users,
  aplicacao: Briefcase,
  outro: MoreHorizontal,
};

const activityLabels: Record<string, string> = {
  mensagem: 'Mensagem', reuniao: 'Reunião', follow_up: 'Follow-up',
  indicacao: 'Indicação', aplicacao: 'Aplicação', outro: 'Outro',
};

const NONE = 'none';

export function ActivitiesTab({ project }: Props) {
  const { profile } = useAuth();
  const { data: activities = [], isLoading } = useOutplacementActivities(project.id);
  const { data: contacts = [] } = useOutplacementContacts(project.id);
  const create = useCreateOutplacementActivity();
  const del = useDeleteOutplacementActivity();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    activity_type: 'mensagem', title: '', description: '',
    contact_id: NONE, activity_date: new Date().toISOString().slice(0, 10),
  });

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    await create.mutateAsync({
      project_id: project.id,
      activity_type: form.activity_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      contact_id: form.contact_id === NONE ? null : form.contact_id,
      activity_date: new Date(form.activity_date + 'T12:00:00').toISOString(),
      created_by: profile?.id || null,
    });
    setForm({
      activity_type: 'mensagem', title: '', description: '',
      contact_id: NONE, activity_date: new Date().toISOString().slice(0, 10),
    });
    setShowDialog(false);
  };

  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{activities.length} atividade(s)</p>
        <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Atividade
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : activities.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="font-medium">Nenhuma atividade registrada</p>
          <p className="text-sm mt-1">Registre mensagens, reuniões, follow-ups e mais</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(a => {
            const Icon = activityIcons[a.activity_type] || MoreHorizontal;
            return (
              <div key={a.id} className="bg-card border rounded-lg p-3 sm:p-4 flex gap-3 group">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">{a.title}</h4>
                    <Badge variant="outline" className="text-xs">{activityLabels[a.activity_type]}</Badge>
                    {a.contact_id && contactMap[a.contact_id] && (
                      <Badge variant="secondary" className="text-xs">@ {contactMap[a.contact_id]}</Badge>
                    )}
                  </div>
                  {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(a.activity_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={() => confirm('Remover atividade?') && del.mutate(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.activity_type} onValueChange={v => setForm({ ...form, activity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(activityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.activity_date} onChange={e => setForm({ ...form, activity_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Contato (opcional)</Label>
              <Select value={form.contact_id} onValueChange={v => setForm({ ...form, contact_id: v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Mensagem inicial enviada" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!form.title.trim()}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
