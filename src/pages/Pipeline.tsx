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
import { JobDialog } from '@/components/jobs/JobDialog';
import { ProjectDialog } from '@/components/projetos/ProjectDialog';
import { ActivityDialog } from '@/components/activities/ActivityDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOpportunities, useUpdateOpportunityStage, useUpdateOpportunity, OpportunityRow } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';


export default function Pipeline() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRow | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: opportunities = [], isLoading: loadingOpps } = useOpportunities();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: profiles = [] } = useProfiles();
  const updateStage = useUpdateOpportunityStage();
  const updateOpportunity = useUpdateOpportunity();

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const company = companies.find(c => c.id === opp.company_id);
      const pfName = opp.observacoes?.match(/\[PF: (.+?)\]/)?.[1];
      const displayName = opp.tipo_servico === 'outplacement' && !opp.company_id
        ? (pfName || 'Pessoa Física') : (company?.nome_fantasia || '');
      const matchesSearch = searchTerm === '' || 
        opp.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayName.toLowerCase().includes(searchTerm.toLowerCase());
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
        _company: company,
        _contact: contact,
        _responsavel: responsavel,
      };
    });
  }, [filteredOpportunities, companies, contacts, profiles]);

  const activeStages = pipelineStages.filter(s => 
    !['fechado_perdeu', 'pos_venda'].includes(s.key)
  );

  if (loadingOpps) {
    return (
      <div className="p-4 md:p-6 h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 h-full flex flex-col">
      <PageHeader
        title="Funil Comercial"
        description="Gerencie suas oportunidades de vendas"
        actions={
          <Button onClick={() => setShowNewDialog(true)} size="sm" className="sm:h-10">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Oportunidade</span>
            <span className="sm:hidden ml-1">Nova</span>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mt-3 sm:mt-6 mb-3 sm:mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 sm:h-10"
          />
        </div>
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="w-[44px] sm:w-[200px] h-9 sm:h-10 px-2 sm:px-3">
            <Filter className="h-4 w-4 sm:mr-2 shrink-0" />
            <SelectValue placeholder="Responsável" className="hidden sm:inline" />
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
      <div className="flex-1 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="flex gap-2 sm:gap-4 h-full min-w-max pb-4 snap-x snap-mandatory sm:snap-none">
          {activeStages.map((stage) => (
            <div key={stage.key} className="w-[78vw] sm:w-72 flex-shrink-0 snap-start">
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

      <Sheet open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Oportunidade</SheetTitle>
          </SheetHeader>
          {selectedOpportunity && (
            <OpportunityDetail opportunity={selectedOpportunity} />
          )}
        </SheetContent>
      </Sheet>

      <OpportunityDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
