import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateJob, useUpdateJob, JobRow } from '@/hooks/useJobs';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';
import { JobStatus, JobPriority, priorityLabels, jobStatusLabels } from '@/types/ats';
import { Loader2, Globe } from 'lucide-react';
import { BRAZIL_STATES, BRAZIL_CITIES, COUNTRIES } from '@/data/brazilLocations';

interface JobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: JobRow | null;
}

// Parse a stored location string back into its parts
function parseLocation(location: string | null): {
  isInternational: boolean;
  state: string;
  city: string;
  country: string;
  workModel: string;
} {
  if (!location) return { isInternational: false, state: '', city: '', country: '', workModel: '' };

  if (location.startsWith('Internacional - ')) {
    const rest = location.replace('Internacional - ', '');
    const parts = rest.split(' (');
    return {
      isInternational: true,
      state: '',
      city: '',
      country: parts[0] || '',
      workModel: parts[1]?.replace(')', '') || '',
    };
  }

  // Brazilian format: "City, UF (workModel)" or "City, UF"
  const workModelMatch = location.match(/\(([^)]+)\)$/);
  const workModel = workModelMatch ? workModelMatch[1] : '';
  const locationWithoutModel = location.replace(/\s*\([^)]+\)$/, '');
  const [city, uf] = locationWithoutModel.split(', ');

  return {
    isInternational: false,
    state: uf || '',
    city: city || '',
    country: '',
    workModel,
  };
}

const WORK_MODELS = [
  { value: 'Presencial', label: 'Presencial' },
  { value: 'Híbrido', label: 'Híbrido' },
  { value: 'Remoto', label: 'Remoto' },
];

export function JobDialog({ open, onOpenChange, job }: JobDialogProps) {
  const [formData, setFormData] = useState({
    company_id: '',
    contact_id: '',
    responsavel_id: '',
    title: '',
    description: '',
    requirements: '',
    salary_min: '',
    salary_max: '',
    status: 'draft' as JobStatus,
    priority: 'media' as JobPriority,
    deadline: '',
  });

  // Location fields
  const [isInternational, setIsInternational] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [workModel, setWorkModel] = useState('');

  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: profiles = [] } = useProfiles();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const isEditing = !!job;
  const isLoading = createJob.isPending || updateJob.isPending;

  // Filter contacts by selected company
  const filteredContacts = contacts.filter(c => c.company_id === formData.company_id);

  // Cities for selected state
  const citiesForState = selectedState ? (BRAZIL_CITIES[selectedState] || []) : [];

  useEffect(() => {
    if (job) {
      const loc = parseLocation(job.location);
      setFormData({
        company_id: job.company_id,
        contact_id: job.contact_id || '',
        responsavel_id: job.responsavel_id || '',
        title: job.title,
        description: job.description || '',
        requirements: job.requirements || '',
        salary_min: job.salary_min?.toString() || '',
        salary_max: job.salary_max?.toString() || '',
        status: job.status,
        priority: job.priority as JobPriority,
        deadline: job.deadline || '',
      });
      setIsInternational(loc.isInternational);
      setSelectedState(loc.state);
      setSelectedCity(loc.city);
      setSelectedCountry(loc.country);
      setWorkModel(loc.workModel);
    } else {
      setFormData({
        company_id: '',
        contact_id: '',
        responsavel_id: '',
        title: '',
        description: '',
        requirements: '',
        salary_min: '',
        salary_max: '',
        status: 'draft',
        priority: 'media',
        deadline: '',
      });
      setIsInternational(false);
      setSelectedState('');
      setSelectedCity('');
      setSelectedCountry('');
      setWorkModel('');
    }
  }, [job, open]);

  // Reset city when state changes
  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setSelectedCity('');
  };

  // Build the location string for storage
  const buildLocationString = () => {
    if (isInternational) {
      if (!selectedCountry) return null;
      return workModel
        ? `Internacional - ${selectedCountry} (${workModel})`
        : `Internacional - ${selectedCountry}`;
    }
    if (!selectedCity && !selectedState) return null;
    const base = selectedCity && selectedState
      ? `${selectedCity}, ${selectedState}`
      : selectedCity || selectedState;
    return workModel ? `${base} (${workModel})` : base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_id || !formData.title) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (isInternational && !selectedCountry) {
      toast.error('Selecione o país para vaga internacional');
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
        location: buildLocationString(),
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
            {/* Title */}
            <div className="col-span-2">
              <Label htmlFor="title">Título da Vaga *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Desenvolvedor Full Stack Senior"
              />
            </div>

            {/* Company */}
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

            {/* Contact */}
            <div>
              <Label htmlFor="contact_id">Contato</Label>
              <Select
                value={formData.contact_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, contact_id: value === 'none' ? '' : value })}
                disabled={!formData.company_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {filteredContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.nome} - {contact.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsável */}
            <div>
              <Label htmlFor="responsavel_id">Responsável</Label>
              <Select
                value={formData.responsavel_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, responsavel_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Work Model */}
            <div>
              <Label>Modelo de Trabalho</Label>
              <Select
                value={workModel || 'none'}
                onValueChange={(v) => setWorkModel(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não especificado</SelectItem>
                  {WORK_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location section */}
            <div className="col-span-2">
              <Label className="mb-2 block">Localização</Label>
              <div className="flex items-center gap-2 mb-3 p-3 rounded-md border border-input bg-muted/30">
                <Checkbox
                  id="international"
                  checked={isInternational}
                  onCheckedChange={(checked) => {
                    setIsInternational(!!checked);
                    setSelectedState('');
                    setSelectedCity('');
                    setSelectedCountry('');
                  }}
                />
                <label htmlFor="international" className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Vaga Internacional
                </label>
              </div>

              {isInternational ? (
                <div>
                  <Label htmlFor="country" className="text-sm text-muted-foreground mb-1 block">País</Label>
                  <Select value={selectedCountry || 'none'} onValueChange={(v) => setSelectedCountry(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o país" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione o país</SelectItem>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Estado</Label>
                    <Select value={selectedState || 'none'} onValueChange={(v) => handleStateChange(v === 'none' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione o estado</SelectItem>
                        {BRAZIL_STATES.map((s) => (
                          <SelectItem key={s.uf} value={s.uf}>
                            {s.uf} – {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Cidade</Label>
                    <Select
                      value={selectedCity || 'none'}
                      onValueChange={(v) => setSelectedCity(v === 'none' ? '' : v)}
                      disabled={!selectedState}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedState ? 'Selecione a cidade' : 'Selecione o estado primeiro'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione a cidade</SelectItem>
                        {citiesForState.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Status */}
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
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
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
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div>
              <Label htmlFor="deadline">Data Limite</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            {/* Salary min */}
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

            {/* Salary max */}
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

            {/* Description */}
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

            {/* Requirements */}
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
