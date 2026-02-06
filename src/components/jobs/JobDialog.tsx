import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateJob, useUpdateJob, JobRow } from '@/hooks/useJobs';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';
import { JobStatus, JobPriority, priorityLabels, jobStatusLabels } from '@/types/ats';
import { Loader2 } from 'lucide-react';

interface JobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: JobRow | null;
}

export function JobDialog({ open, onOpenChange, job }: JobDialogProps) {
  const [formData, setFormData] = useState({
    company_id: '',
    contact_id: '',
    responsavel_id: '',
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary_min: '',
    salary_max: '',
    status: 'draft' as JobStatus,
    priority: 'media' as JobPriority,
    deadline: '',
  });

  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: profiles = [] } = useProfiles();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const isEditing = !!job;
  const isLoading = createJob.isPending || updateJob.isPending;

  // Filter contacts by selected company
  const filteredContacts = contacts.filter(c => c.company_id === formData.company_id);

  useEffect(() => {
    if (job) {
      setFormData({
        company_id: job.company_id,
        contact_id: job.contact_id || '',
        responsavel_id: job.responsavel_id || '',
        title: job.title,
        description: job.description || '',
        requirements: job.requirements || '',
        location: job.location || '',
        salary_min: job.salary_min?.toString() || '',
        salary_max: job.salary_max?.toString() || '',
        status: job.status,
        priority: job.priority as JobPriority,
        deadline: job.deadline || '',
      });
    } else {
      setFormData({
        company_id: '',
        contact_id: '',
        responsavel_id: '',
        title: '',
        description: '',
        requirements: '',
        location: '',
        salary_min: '',
        salary_max: '',
        status: 'draft',
        priority: 'media',
        deadline: '',
      });
    }
  }, [job, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_id || !formData.title) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const payload = {
        company_id: formData.company_id,
        contact_id: formData.contact_id || null,
        responsavel_id: formData.responsavel_id || null,
        title: formData.title,
        description: formData.description || null,
        requirements: formData.requirements || null,
        location: formData.location || null,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
        status: formData.status,
        priority: formData.priority,
        deadline: formData.deadline || null,
      };

      if (isEditing && job) {
        await updateJob.mutateAsync({ id: job.id, ...payload });
        toast.success('Vaga atualizada com sucesso!');
      } else {
        await createJob.mutateAsync(payload);
        toast.success('Vaga criada com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar vaga');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Vaga' : 'Nova Vaga'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título da Vaga *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Desenvolvedor Full Stack Senior"
              />
            </div>

            <div>
              <Label htmlFor="company_id">Empresa *</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => setFormData({ ...formData, company_id: value, contact_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contact_id">Contato</Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                disabled={!formData.company_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contato" />
                </SelectTrigger>
                <SelectContent>
                  {filteredContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.nome} - {contact.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="responsavel_id">Responsável</Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: São Paulo, SP (Híbrido)"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as JobStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(jobStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as JobPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deadline">Data Limite</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="salary_min">Salário Mínimo</Label>
              <Input
                id="salary_min"
                type="number"
                value={formData.salary_min}
                onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="salary_max">Salário Máximo</Label>
              <Input
                id="salary_max"
                type="number"
                value={formData.salary_max}
                onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva as responsabilidades e atividades da vaga..."
                rows={4}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="requirements">Requisitos</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Liste os requisitos técnicos e comportamentais..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Vaga'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
