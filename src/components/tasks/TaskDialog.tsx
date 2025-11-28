import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanies } from '@/hooks/useCompanies';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useProfiles } from '@/hooks/useProfiles';
import { useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCompanyId?: string;
  preSelectedOpportunityId?: string;
}

const priorityOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

export function TaskDialog({ 
  open, 
  onOpenChange, 
  preSelectedCompanyId,
  preSelectedOpportunityId 
}: TaskDialogProps) {
  const { profile } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: opportunities = [] } = useOpportunities();
  const { data: profiles = [] } = useProfiles();
  const createTask = useCreateTask();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [priority, setPriority] = useState('media');
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [companyId, setCompanyId] = useState(preSelectedCompanyId || '');
  const [opportunityId, setOpportunityId] = useState(preSelectedOpportunityId || '');
  const [responsavelId, setResponsavelId] = useState(profile?.id || '');

  const filteredOpportunities = opportunities.filter(o => o.company_id === companyId);

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setPriority('media');
    setDueDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setCompanyId(preSelectedCompanyId || '');
    setOpportunityId(preSelectedOpportunityId || '');
    setResponsavelId(profile?.id || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) return;

    await createTask.mutateAsync({
      titulo,
      descricao: descricao || null,
      priority,
      status: 'pendente',
      due_date: new Date(dueDate).toISOString(),
      company_id: companyId || null,
      opportunity_id: opportunityId || null,
      user_id: profile.id,
      responsavel_id: responsavelId || profile.id,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Ligar para cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Select value={companyId} onValueChange={(value) => {
                setCompanyId(value);
                setOpportunityId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável *</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {companyId && filteredOpportunities.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="opportunity">Oportunidade</Label>
              <Select value={opportunityId} onValueChange={setOpportunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular oportunidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {filteredOpportunities.map(opp => (
                    <SelectItem key={opp.id} value={opp.id}>
                      R$ {Number(opp.valor_potencial).toLocaleString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
