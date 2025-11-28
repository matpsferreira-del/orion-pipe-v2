import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { KanbanColumn } from '@/components/pipeline/KanbanColumn';
import { pipelineStages } from '@/data/mockData';
import { PipelineStage } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { OpportunityDialog } from '@/components/opportunities/OpportunityDialog';
import { useOpportunities, useUpdateOpportunityStage, OpportunityRow } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';

// Adapter to convert DB row to legacy Opportunity type for detail view
function adaptOpportunityForDetail(opp: OpportunityRow) {
  return {
    id: opp.id,
    companyId: opp.company_id,
    contactId: opp.contact_id,
    responsavelId: opp.responsavel_id,
    stage: opp.stage as PipelineStage,
    valorPotencial: Number(opp.valor_potencial),
    probabilidade: opp.probabilidade,
    createdAt: new Date(opp.created_at),
    dataPrevisaoFechamento: new Date(opp.data_previsao_fechamento),
    origemLead: opp.origem_lead as any,
    tipoServico: opp.tipo_servico as any,
    observacoes: opp.observacoes || undefined,
    spin: opp.spin_situacao_como_contrata ? {
      situacao: {
        comoContrata: opp.spin_situacao_como_contrata || '',
        timeInterno: opp.spin_situacao_time_interno || '',
      },
      problema: {
        dificuldades: opp.spin_problema_dificuldades || '',
        tempoMedio: opp.spin_problema_tempo_medio || '',
      },
      implicacao: {
        impactoNegocios: opp.spin_implicacao_impacto || '',
        perdaReceita: opp.spin_implicacao_perda || '',
      },
      necessidade: {
        cenarioIdeal: opp.spin_necessidade_cenario || '',
        urgencia: opp.spin_necessidade_urgencia || '',
      },
    } : undefined,
  };
}

export default function Pipeline() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRow | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: opportunities = [], isLoading: loadingOpps } = useOpportunities();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: profiles = [] } = useProfiles();
  const updateStage = useUpdateOpportunityStage();

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const company = companies.find(c => c.id === opp.company_id);
      const matchesSearch = searchTerm === '' || 
        opp.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company?.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResponsavel = filterResponsavel === 'all' || 
        opp.responsavel_id === filterResponsavel;
      return matchesSearch && matchesResponsavel;
    });
  }, [opportunities, companies, searchTerm, filterResponsavel]);

  const handleDrop = (opportunityId: string, newStage: PipelineStage) => {
    const stageName = pipelineStages.find(s => s.key === newStage)?.label;
    updateStage.mutate(
      { id: opportunityId, stage: newStage },
      {
        onSuccess: () => {
          toast.success(`Oportunidade movida para "${stageName}"`);
        },
      }
    );
  };

  const handleCardClick = (opp: OpportunityRow) => {
    setSelectedOpportunity(opp);
  };

  // Convert for KanbanColumn which expects the legacy format
  const adaptedOpportunities = useMemo(() => {
    return filteredOpportunities.map(opp => {
      const company = companies.find(c => c.id === opp.company_id);
      const contact = contacts.find(c => c.id === opp.contact_id);
      const responsavel = profiles.find(p => p.id === opp.responsavel_id);
      
      return {
        id: opp.id,
        companyId: opp.company_id,
        contactId: opp.contact_id,
        responsavelId: opp.responsavel_id,
        stage: opp.stage as PipelineStage,
        valorPotencial: Number(opp.valor_potencial),
        probabilidade: opp.probabilidade,
        createdAt: new Date(opp.created_at),
        dataPrevisaoFechamento: new Date(opp.data_previsao_fechamento),
        origemLead: opp.origem_lead as any,
        tipoServico: opp.tipo_servico as any,
        observacoes: opp.observacoes || undefined,
        // Extra data for display
        _company: company,
        _contact: contact,
        _responsavel: responsavel,
      };
    });
  }, [filteredOpportunities, companies, contacts, profiles]);

  // Only show active pipeline stages (not closed or post-sale in main kanban view)
  const activeStages = pipelineStages.filter(s => 
    !['fechado_perdeu', 'pos_venda'].includes(s.key)
  );

  if (loadingOpps) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <PageHeader
        title="Funil Comercial"
        description="Gerencie suas oportunidades de vendas"
        actions={
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Oportunidade
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mt-6 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar oportunidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map(profile => (
              <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {activeStages.map((stage) => (
            <div key={stage.key} className="w-72 flex-shrink-0">
              <KanbanColumn
                stage={stage}
                opportunities={adaptedOpportunities.filter(o => o.stage === stage.key)}
                onDrop={handleDrop}
                onCardClick={(opp) => {
                  const original = opportunities.find(o => o.id === opp.id);
                  if (original) setSelectedOpportunity(original);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity Detail Sheet */}
      <Sheet open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Oportunidade</SheetTitle>
          </SheetHeader>
          {selectedOpportunity && (
            <OpportunityDetail opportunity={adaptOpportunityForDetail(selectedOpportunity)} />
          )}
        </SheetContent>
      </Sheet>

      {/* New Opportunity Dialog */}
      <OpportunityDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
