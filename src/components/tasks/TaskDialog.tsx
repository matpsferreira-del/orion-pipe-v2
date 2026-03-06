import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanies } from '@/hooks/useCompanies';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useProfiles } from '@/hooks/useProfiles';
import { useCreateTask, useUpdateTask, TaskRow } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCompanyId?: string;
  preSelectedOpportunityId?: string;
  editTask?: TaskRow | null;
}

const priorityOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

export function TaskDialog({ 
  open, 
  onOpenChange, 
  preSelectedCompanyId,
  preSelectedOpportunityId,
  editTask,
}: TaskDialogProps) {
  const { profile } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: opportunities = [] } = useOpportunities();
  const { data: profiles = [] } = useProfiles();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [priority, setPriority] = useState('media');
  const [status, setStatus] = useState('pendente');
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [companyId, setCompanyId] = useState(preSelectedCompanyId || '');
  const [opportunityId, setOpportunityId] = useState(preSelectedOpportunityId || '');
  const [responsavelId, setResponsavelId] = useState(profile?.id || '');

  const isEditing = !!editTask;

  useEffect(() => {
    if (editTask) {
      setTitulo(editTask.titulo);
      setDescricao(editTask.descricao || '');
      setPriority(editTask.priority);
      setStatus(editTask.status);
      setDueDate(format(new Date(editTask.due_date), 'yyyy-MM-dd'));
      setCompanyId(editTask.company_id || '');
      setOpportunityId(editTask.opportunity_id || '');
      setResponsavelId(editTask.responsavel_id);
    } else {
      resetForm();
    }
  }, [editTask, open]);

  const filteredOpportunities = opportunities.filter(o => o.company_id === companyId);

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setPriority('media');
    setStatus('pendente');
    setDueDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setCompanyId(preSelectedCompanyId || '');
    setOpportunityId(preSelectedOpportunityId || '');
    setResponsavelId(profile?.id || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    const taskData = {
      titulo,
      descricao: descricao || null,
      priority,
      status,
      due_date: new Date(dueDate).toISOString(),
      company_id: companyId || null,
      opportunity_id: opportunityId || null,
      user_id: isEditing ? editTask!.user_id : profile.id,
      responsavel_id: responsavelId || profile.id,
    };

    if (isEditing) {
      await updateTask.mutateAsync({ id: editTask!.id, ...taskData });
    } else {
      await createTask.mutateAsync(taskData);
    }

    resetForm();
    onOpenChange(false);
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
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

          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Select value={companyId || "none"} onValueChange={(value) => {
                setCompanyId(value === "none" ? "" : value);
                setOpportunityId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
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
              <Select value={responsavelId || "unassigned"} onValueChange={(v) => setResponsavelId(v === "unassigned" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Selecione um responsável</SelectItem>
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
              <Select value={opportunityId || "none"} onValueChange={(v) => setOpportunityId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular oportunidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                isEditing ? 'Salvar Alterações' : 'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
