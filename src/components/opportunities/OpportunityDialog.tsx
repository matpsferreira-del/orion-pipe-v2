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
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

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
  { value: 'outplacement', label: 'Outplacement' },
];

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyId?: string;
  opportunity?: OpportunityRow;
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
  const [nomeClientePF, setNomeClientePF] = useState('');
  const [emailClientePF, setEmailClientePF] = useState('');
  const [telefoneClientePF, setTelefoneClientePF] = useState('');
  const [outplacementTipo, setOutplacementTipo] = useState<'pf' | 'pj'>('pf');
  const [outplacementPartyId, setOutplacementPartyId] = useState<string | null>(null);

  // Sub-dialogs
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);

  const isOutplacement = tipoServico === 'outplacement';
  const isOutplacementPF = isOutplacement && outplacementTipo === 'pf';
  const isOutplacementPJ = isOutplacement && outplacementTipo === 'pj';

  const { profile } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContactsByCompany(companyId);
  const { data: profiles = [] } = useProfiles();
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  useEffect(() => {
    if (opportunity) {
      setCompanyId(opportunity.company_id ?? '');
      setContactId(opportunity.contact_id ?? '');
      setResponsavelId(opportunity.responsavel_id);
      setValorPotencial(String(opportunity.valor_potencial));
      setProbabilidade(String(opportunity.probabilidade));
      setDataPrevisao(opportunity.data_previsao_fechamento);
      setOrigemLead(opportunity.origem_lead);
      setTipoServico(opportunity.tipo_servico);
      setObservacoes(opportunity.observacoes ?? '');
      setOutplacementPartyId(opportunity.outplacement_party_id ?? null);
      if (opportunity.tipo_servico === 'outplacement') {
        if (opportunity.company_id) {
          setOutplacementTipo('pj');
        } else {
          setOutplacementTipo('pf');
          const match = opportunity.observacoes?.match(/\[PF: (.+?)\]/);
          if (match) setNomeClientePF(match[1]);
        }
      }
    } else {
      resetForm();
    }
  }, [opportunity, open]);

  // Load PF email/phone from linked party when editing
  useEffect(() => {
    if (isEditing && outplacementPartyId && isOutplacementPF) {
      supabase
        .from('party')
        .select('full_name, email_raw, phone_raw')
        .eq('id', outplacementPartyId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.full_name) setNomeClientePF(data.full_name);
            if (data.email_raw) setEmailClientePF(data.email_raw);
            if (data.phone_raw) setTelefoneClientePF(data.phone_raw);
          }
        });
    }
  }, [outplacementPartyId, isOutplacementPF, isEditing]);

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

  // Clear company/contact when switching to outplacement PF
  useEffect(() => {
    if (isOutplacementPF && !isEditing) {
      setCompanyId('');
      setContactId('');
    }
  }, [tipoServico, outplacementTipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build observacoes with PF name tag for outplacement
    let finalObs = observacoes || '';
    if (isOutplacementPF && nomeClientePF) {
      finalObs = finalObs.replace(/\[PF: .+?\]\s*/g, '').trim();
      finalObs = `[PF: ${nomeClientePF}] ${finalObs}`.trim();
    }

    // For Outplacement PF: resolve_party (create or update Banco de Talentos entry)
    let partyId: string | null = outplacementPartyId;
    if (isOutplacementPF && nomeClientePF) {
      try {
        const { data: resolvedId, error: resolveErr } = await supabase.rpc('resolve_party', {
          p_full_name: nomeClientePF,
          p_email: emailClientePF || null,
          p_phone: telefoneClientePF || null,
          p_created_from: 'crm' as any,
          p_notes: 'Cliente Outplacement PF',
        });
        if (resolveErr) throw resolveErr;
        partyId = resolvedId as string;

        // Ensure 'candidate' role
        await supabase.rpc('ensure_party_role', {
          p_party_id: partyId,
          p_role: 'candidate' as any,
          p_confidence: 100,
        });
      } catch (err: any) {
        toast.error('Erro ao salvar dados do cliente PF: ' + err.message);
        return;
      }
    } else if (!isOutplacementPF) {
      partyId = null;
    }

    const data: any = {
      company_id: isOutplacementPF ? null : (companyId || null),
      contact_id: isOutplacementPF ? null : (contactId || null),
      responsavel_id: responsavelId,
      valor_potencial: parseFloat(valorPotencial) || 0,
      probabilidade: parseInt(probabilidade) || 0,
      data_previsao_fechamento: dataPrevisao,
      origem_lead: origemLead,
      tipo_servico: tipoServico,
      observacoes: finalObs || undefined,
      outplacement_party_id: partyId,
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
    setNomeClientePF('');
    setEmailClientePF('');
    setTelefoneClientePF('');
    setOutplacementTipo('pf');
    setOutplacementPartyId(null);
  };

  // After creating a new company in sub-dialog, auto-select the most recent one
  const handleCompanyDialogChange = (open: boolean) => {
    setShowNewCompanyDialog(open);
    if (!open && companies.length > 0) {
      // The newest company is at the end after invalidation; pick it after refetch settles.
      // useCompanies is sorted by nome_fantasia, so we need to detect by created_at.
      setTimeout(() => {
        // Find newest by created_at
        const newest = [...companies].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        if (newest) setCompanyId(newest.id);
      }, 300);
    }
  };

  const handleContactDialogChange = (open: boolean) => {
    setShowNewContactDialog(open);
    if (!open && contacts.length > 0) {
      setTimeout(() => {
        const newest = [...contacts].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        if (newest) setContactId(newest.id);
      }, 300);
    }
  };

  const isPending = createOpportunity.isPending || updateOpportunity.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Serviço first so it controls visibility */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Outplacement: PF ou PJ */}
            {isOutplacement && (
              <div className="space-y-4 rounded-md border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Cliente *</Label>
                    <Select value={outplacementTipo} onValueChange={(v: 'pf' | 'pj') => setOutplacementTipo(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pf">Pessoa Física</SelectItem>
                        <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isOutplacementPF && (
                    <div className="space-y-2">
                      <Label htmlFor="nomeClientePF">Nome do Cliente (PF) *</Label>
                      <Input
                        id="nomeClientePF"
                        placeholder="Nome completo do profissional"
                        value={nomeClientePF}
                        onChange={(e) => setNomeClientePF(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>

                {isOutplacementPF && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emailClientePF">E-mail do Cliente</Label>
                        <Input
                          id="emailClientePF"
                          type="email"
                          placeholder="cliente@email.com"
                          value={emailClientePF}
                          onChange={(e) => setEmailClientePF(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefoneClientePF">Telefone do Cliente</Label>
                        <Input
                          id="telefoneClientePF"
                          placeholder="(00) 00000-0000"
                          value={telefoneClientePF}
                          onChange={(e) => setTelefoneClientePF(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Os dados serão registrados no Banco de Talentos e levados automaticamente para o projeto quando criado.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Company & Contact - hidden for outplacement PF */}
            {!isOutplacementPF && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="company">Empresa *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowNewCompanyDialog(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Nova
                    </Button>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contact">Contato *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setShowNewContactDialog(true)}
                      disabled={!companyId}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Novo
                    </Button>
                  </div>
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
            )}

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

      {/* Sub-dialogs for inline creation */}
      <CompanyDialog
        open={showNewCompanyDialog}
        onOpenChange={handleCompanyDialogChange}
      />
      <ContactDialog
        open={showNewContactDialog}
        onOpenChange={handleContactDialogChange}
        preSelectedCompanyId={companyId}
      />
    </>
  );
}
