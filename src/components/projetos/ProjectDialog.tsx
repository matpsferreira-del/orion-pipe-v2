import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useParties } from '@/hooks/useParties';
import { useCompanies } from '@/hooks/useCompanies';
import {
  OutplacementProject,
  useCreateOutplacementProject,
  useUpdateOutplacementProject,
} from '@/hooks/useOutplacementProjects';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: OutplacementProject | null;
}

const NONE = 'none';

export function ProjectDialog({ open, onOpenChange, project }: Props) {
  const { profile } = useAuth();
  const { data: parties = [] } = useParties();
  const { data: companies = [] } = useCompanies();
  const create = useCreateOutplacementProject();
  const update = useUpdateOutplacementProject();

  const [form, setForm] = useState({
    title: '',
    project_type: 'outplacement',
    status: 'ativo',
    party_id: NONE,
    company_id: NONE,
    target_role: '',
    target_industry: '',
    target_location: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title,
        project_type: project.project_type,
        status: project.status,
        party_id: project.party_id || NONE,
        company_id: project.company_id || NONE,
        target_role: project.target_role || '',
        target_industry: project.target_industry || '',
        target_location: project.target_location || '',
        description: project.description || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
      });
    } else {
      setForm({
        title: '', project_type: 'outplacement', status: 'ativo',
        party_id: NONE, company_id: NONE,
        target_role: '', target_industry: '', target_location: '',
        description: '', start_date: '', end_date: '',
      });
    }
  }, [project, open]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      project_type: form.project_type,
      status: form.status,
      party_id: form.party_id === NONE ? null : form.party_id,
      company_id: form.company_id === NONE ? null : form.company_id,
      target_role: form.target_role.trim() || null,
      target_industry: form.target_industry.trim() || null,
      target_location: form.target_location.trim() || null,
      description: form.description.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    if (project) {
      await update.mutateAsync({ id: project.id, ...payload });
    } else {
      if (!profile?.id) return;
      // Pega nome/email do party selecionado para criar o plano espelho no Pathly
      const selectedParty = form.party_id !== NONE ? parties.find(p => p.id === form.party_id) : null;
      await create.mutateAsync({
        ...payload,
        created_by: profile.id,
        _party_name: selectedParty?.full_name,
        _party_email: selectedParty?.email_raw ?? undefined,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título do Projeto *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Outplacement - João Silva" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.project_type} onValueChange={v => setForm({ ...form, project_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outplacement">Outplacement</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Cliente PF (Pessoa)</Label>
              <Select value={form.party_id} onValueChange={v => setForm({ ...form, party_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente PJ (Empresa)</Label>
              <Select value={form.company_id} onValueChange={v => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Cargo-Alvo</Label>
              <Input value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })} />
            </div>
            <div>
              <Label>Indústria-Alvo</Label>
              <Input value={form.target_industry} onChange={e => setForm({ ...form, target_industry: e.target.value })} />
            </div>
            <div>
              <Label>Localização</Label>
              <Input value={form.target_location} onChange={e => setForm({ ...form, target_location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Término Previsto</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Descrição / Observações</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.title.trim() || create.isPending || update.isPending}>
            {project ? 'Salvar' : 'Criar Projeto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
