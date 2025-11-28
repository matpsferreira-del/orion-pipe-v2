import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompanies } from '@/hooks/useCompanies';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useCreateActivity } from '@/hooks/useActivities';
import { useCreateTask } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowUpSuggestions, calculateFollowUpDate, FollowUpSuggestion } from '@/utils/followUpSuggestions';
import { Loader2, Sparkles, Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCompanyId?: string;
  preSelectedOpportunityId?: string;
}

const activityTypes = [
  { value: 'ligacao', label: 'Ligação' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'email', label: 'Email' },
  { value: 'proposta', label: 'Proposta Enviada' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'outro', label: 'Outro' },
];

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-warning/10 text-warning',
  alta: 'bg-destructive/10 text-destructive',
};

export function ActivityDialog({ 
  open, 
  onOpenChange, 
  preSelectedCompanyId,
  preSelectedOpportunityId 
}: ActivityDialogProps) {
  const { profile } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: opportunities = [] } = useOpportunities();
  const createActivity = useCreateActivity();
  const createTask = useCreateTask();

  const [tipo, setTipo] = useState('ligacao');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [companyId, setCompanyId] = useState(preSelectedCompanyId || '');
  const [opportunityId, setOpportunityId] = useState(preSelectedOpportunityId || '');
  const [createFollowUps, setCreateFollowUps] = useState(true);
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([0, 1]); // First 2 selected by default

  const suggestions = getFollowUpSuggestions(tipo);
  const filteredOpportunities = opportunities.filter(o => o.company_id === companyId);

  const handleTipoChange = (newTipo: string) => {
    setTipo(newTipo);
    setSelectedFollowUps([0, 1].filter(i => i < getFollowUpSuggestions(newTipo).length));
  };

  const toggleFollowUp = (index: number) => {
    setSelectedFollowUps(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const resetForm = () => {
    setTipo('ligacao');
    setTitulo('');
    setDescricao('');
    setData(format(new Date(), 'yyyy-MM-dd'));
    setCompanyId(preSelectedCompanyId || '');
    setOpportunityId(preSelectedOpportunityId || '');
    setCreateFollowUps(true);
    setSelectedFollowUps([0, 1]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId || !profile?.id) return;

    const activityDate = new Date(data);

    // Create activity
    await createActivity.mutateAsync({
      type: tipo,
      titulo,
      descricao: descricao || null,
      data: activityDate.toISOString(),
      company_id: companyId,
      opportunity_id: opportunityId || null,
      user_id: profile.id,
    });

    // Create follow-up tasks if enabled
    if (createFollowUps && selectedFollowUps.length > 0) {
      const selectedSuggestions = selectedFollowUps.map(i => suggestions[i]).filter(Boolean);
      
      for (const suggestion of selectedSuggestions) {
        await createTask.mutateAsync({
          titulo: suggestion.titulo,
          descricao: suggestion.descricao,
          priority: suggestion.priority,
          status: 'pendente',
          due_date: calculateFollowUpDate(activityDate, suggestion.diasAposAtividade).toISOString(),
          company_id: companyId,
          opportunity_id: opportunityId || null,
          user_id: profile.id,
          responsavel_id: profile.id,
        });
      }
    }

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Atividade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Atividade *</Label>
              <Select value={tipo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Ligação de prospecção"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <Select value={companyId} onValueChange={(value) => {
                setCompanyId(value);
                setOpportunityId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opportunity">Oportunidade (opcional)</Label>
              <Select value={opportunityId} onValueChange={setOpportunityId} disabled={!companyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a oportunidade" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da atividade..."
              rows={3}
            />
          </div>

          {/* Intelligent Follow-up Suggestions */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Follow-ups Automáticos</span>
                <Checkbox
                  id="createFollowUps"
                  checked={createFollowUps}
                  onCheckedChange={(checked) => setCreateFollowUps(!!checked)}
                  className="ml-auto"
                />
              </div>

              {createFollowUps && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Sugestões inteligentes de próximos passos baseadas no tipo de atividade:
                  </p>
                  {suggestions.map((suggestion, index) => {
                    const followUpDate = calculateFollowUpDate(new Date(data), suggestion.diasAposAtividade);
                    const isSelected = selectedFollowUps.includes(index);
                    
                    return (
                      <div
                        key={index}
                        onClick={() => toggleFollowUp(index)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                              <span className="font-medium text-sm">{suggestion.titulo}</span>
                              <Badge variant="outline" className={priorityColors[suggestion.priority]}>
                                {priorityLabels[suggestion.priority]}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                              {suggestion.descricao}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <Calendar className="h-3 w-3" />
                            {format(followUpDate, "dd/MM", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createActivity.isPending || !companyId}>
              {createActivity.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Registrar Atividade'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
