import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { KanbanColumn } from '@/components/pipeline/KanbanColumn';
import { mockOpportunities, pipelineStages, mockUsers } from '@/data/mockData';
import { Opportunity, PipelineStage } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { toast } from 'sonner';

export default function Pipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const matchesSearch = searchTerm === '' || 
        opp.observacoes?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResponsavel = filterResponsavel === 'all' || 
        opp.responsavelId === filterResponsavel;
      return matchesSearch && matchesResponsavel;
    });
  }, [opportunities, searchTerm, filterResponsavel]);

  const handleDrop = (opportunityId: string, newStage: PipelineStage) => {
    setOpportunities(prev => prev.map(opp => {
      if (opp.id === opportunityId) {
        toast.success(`Oportunidade movida para "${pipelineStages.find(s => s.key === newStage)?.label}"`);
        return { ...opp, stage: newStage };
      }
      return opp;
    }));
  };

  const handleCardClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
  };

  // Only show active pipeline stages (not closed or post-sale in main kanban view)
  const activeStages = pipelineStages.filter(s => 
    !['fechado_perdeu', 'pos_venda'].includes(s.key)
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <PageHeader
        title="Funil Comercial"
        description="Gerencie suas oportunidades de vendas"
        actions={
          <Button>
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
            {mockUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
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
                opportunities={filteredOpportunities.filter(o => o.stage === stage.key)}
                onDrop={handleDrop}
                onCardClick={handleCardClick}
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
            <OpportunityDetail opportunity={selectedOpportunity} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
