import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateOpportunity, useUpdateOpportunity, OpportunityInsert, OpportunityRow } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContactsByCompany } from '@/hooks/useContacts';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const sourceOptions = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'evento', label: 'Evento' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'outro', label: 'Outro' },
];

const serviceOptions = [
  { value: 'recrutamento_pontual', label: 'Recrutamento Pontual' },
  { value: 'programa_recorrente', label: 'Programa Recorrente' },
  { value: 'rpo', label: 'RPO' },
  { value: 'hunting', label: 'Hunting' },
  { value: 'consultoria', label: 'Consultoria' },
];

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  opportunity?: OpportunityRow; // when set, dialog is in edit mode
}

export function OpportunityDialog({ open, onOpenChange, defaultCompanyId, opportunity }: OpportunityDialogProps) {
  const isEditing = !!opportunity;

  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [valorPotencial, setValorPotencial] = useState('');
  const [probabilidade, setProbabilidade] = useState('20');
  const [dataPrevisao, setDataPrevisao] = useState('');
  const [origemLead, setOrigemLead] = useState('outro');
  const [tipoServico, setTipoServico] = useState('recrutamento_pontual');
  const [observacoes, setObservacoes] = useState('');

  const { profile } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContactsByCompany(companyId);
  const { data: profiles = [] } = useProfiles();
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  // Populate fields when editing
  useEffect(() => {
    if (opportunity) {
      setCompanyId(opportunity.company_id);
      setContactId(opportunity.contact_id);
      setResponsavelId(opportunity.responsavel_id);
      setValorPotencial(String(opportunity.valor_potencial));
      setProbabilidade(String(opportunity.probabilidade));
      setDataPrevisao(opportunity.data_previsao_fechamento);
      setOrigemLead(opportunity.origem_lead);
      setTipoServico(opportunity.tipo_servico);
      setObservacoes(opportunity.observacoes ?? '');
    } else {
      resetForm();
    }
  }, [opportunity, open]);

  useEffect(() => {
    if (!isEditing && profile?.id) {
      setResponsavelId(profile.id);
    }
  }, [profile, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setCompanyId(defaultCompanyId ?? '');
      setContactId('');
    }
  }, [defaultCompanyId, open, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setContactId('');
    }
  }, [companyId, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      company_id: companyId,
      contact_id: contactId,
      responsavel_id: responsavelId,
      valor_potencial: parseFloat(valorPotencial) || 0,
      probabilidade: parseInt(probabilidade) || 0,
      data_previsao_fechamento: dataPrevisao,
      origem_lead: origemLead,
      tipo_servico: tipoServico,
      observacoes: observacoes || undefined,
    };

    if (isEditing) {
      updateOpportunity.mutate({ id: opportunity.id, data }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createOpportunity.mutate(data as OpportunityInsert, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    setCompanyId(defaultCompanyId ?? '');
    setContactId('');
    setValorPotencial('');
    setProbabilidade('20');
    setDataPrevisao('');
    setOrigemLead('outro');
    setTipoServico('recrutamento_pontual');
    setObservacoes('');
  };

  const isPending = createOpportunity.isPending || updateOpportunity.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <Select value={companyId} onValueChange={setCompanyId} required disabled={!!defaultCompanyId && !isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

            <div className="space-y-2">
              <Label htmlFor="contact">Contato *</Label>
              <Select value={contactId} onValueChange={setContactId} required disabled={!companyId}>
                <SelectTrigger>
                  <SelectValue placeholder={companyId ? "Selecione..." : "Selecione empresa primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.nome} - {contact.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Potencial (R$) *</Label>
              <Input
                id="valor"
                type="number"
                placeholder="50000"
                value={valorPotencial}
                onChange={(e) => setValorPotencial(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probabilidade">Probabilidade (%) *</Label>
              <Input
                id="probabilidade"
                type="number"
                min="0"
                max="100"
                value={probabilidade}
                onChange={(e) => setProbabilidade(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataPrevisao">Previsão de Fechamento *</Label>
              <Input
                id="dataPrevisao"
                type="date"
                value={dataPrevisao}
                onChange={(e) => setDataPrevisao(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável *</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origem">Origem do Lead *</Label>
              <Select value={origemLead} onValueChange={setOrigemLead}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servico">Tipo de Serviço *</Label>
              <Select value={tipoServico} onValueChange={setTipoServico}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Anotações sobre a oportunidade..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Oportunidade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
