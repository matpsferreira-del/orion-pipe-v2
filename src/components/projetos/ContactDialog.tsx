import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  OutplacementContact, KANBAN_STAGES,
  useCreateOutplacementContact, useUpdateOutplacementContact,
} from '@/hooks/useOutplacementProjects';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  contact?: OutplacementContact | null;
}

export function ProjectContactDialog({ open, onOpenChange, projectId, contact }: Props) {
  const { profile } = useAuth();
  const create = useCreateOutplacementContact();
  const update = useUpdateOutplacementContact();

  const [form, setForm] = useState({
    name: '', current_position: '', company_name: '', linkedin_url: '',
    email: '', phone: '', city: '', state: '',
    contact_type: 'decisor', tier: 'B', kanban_stage: 'identificado', notes: '',
  });

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name, current_position: contact.current_position || '',
        company_name: contact.company_name || '', linkedin_url: contact.linkedin_url || '',
        email: contact.email || '', phone: contact.phone || '',
        city: contact.city || '', state: contact.state || '',
        contact_type: contact.contact_type, tier: contact.tier,
        kanban_stage: contact.kanban_stage, notes: contact.notes || '',
      });
    } else {
      setForm({
        name: '', current_position: '', company_name: '', linkedin_url: '',
        email: '', phone: '', city: '', state: '',
        contact_type: 'decisor', tier: 'B', kanban_stage: 'identificado', notes: '',
      });
    }
  }, [contact, open]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      current_position: form.current_position.trim() || null,
      company_name: form.company_name.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      contact_type: form.contact_type,
      tier: form.tier,
      kanban_stage: form.kanban_stage,
      notes: form.notes.trim() || null,
    };
    if (contact) {
      await update.mutateAsync({ id: contact.id, ...payload });
    } else {
      await create.mutateAsync({ ...payload, project_id: projectId, created_by: profile?.id || null } as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Cargo Atual</Label>
              <Input value={form.current_position} onChange={e => setForm({ ...form, current_position: e.target.value })} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>LinkedIn (URL)</Label>
            <Input value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Estado (UF)</Label>
              <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.contact_type} onValueChange={v => setForm({ ...form, contact_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="decisor">Decisor</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="recrutador">Recrutador</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={v => setForm({ ...form, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estágio</Label>
              <Select value={form.kanban_stage} onValueChange={v => setForm({ ...form, kanban_stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || create.isPending || update.isPending}>
            {contact ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
