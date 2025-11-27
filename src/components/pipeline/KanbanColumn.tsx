import { cn } from '@/lib/utils';
import { PipelineStage } from '@/types/crm';
import { KanbanCard } from './KanbanCard';
import { Opportunity } from '@/types/crm';

interface KanbanColumnProps {
  stage: {
    key: PipelineStage;
    label: string;
    color: string;
  };
  opportunities: Opportunity[];
  onDrop: (opportunityId: string, newStage: PipelineStage) => void;
  onCardClick: (opportunity: Opportunity) => void;
}

const stageColors: Record<string, string> = {
  'pipeline-lead': 'border-t-pipeline-lead',
  'pipeline-contact': 'border-t-pipeline-contact',
  'pipeline-diagnostic': 'border-t-pipeline-diagnostic',
  'pipeline-proposal': 'border-t-pipeline-proposal',
  'pipeline-negotiation': 'border-t-pipeline-negotiation',
  'pipeline-won': 'border-t-pipeline-won',
  'pipeline-lost': 'border-t-pipeline-lost',
  'pipeline-postsale': 'border-t-pipeline-postsale',
};

const stageBgColors: Record<string, string> = {
  'pipeline-lead': 'bg-pipeline-lead/10',
  'pipeline-contact': 'bg-pipeline-contact/10',
  'pipeline-diagnostic': 'bg-pipeline-diagnostic/10',
  'pipeline-proposal': 'bg-pipeline-proposal/10',
  'pipeline-negotiation': 'bg-pipeline-negotiation/10',
  'pipeline-won': 'bg-pipeline-won/10',
  'pipeline-lost': 'bg-pipeline-lost/10',
  'pipeline-postsale': 'bg-pipeline-postsale/10',
};

export function KanbanColumn({ stage, opportunities, onDrop, onCardClick }: KanbanColumnProps) {
  const totalValue = opportunities.reduce((sum, o) => sum + o.valorPotencial, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-primary/5');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-primary/5');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-primary/5');
    const opportunityId = e.dataTransfer.getData('opportunityId');
    if (opportunityId) {
      onDrop(opportunityId, stage.key);
    }
  };

  return (
    <div
      className={cn(
        'kanban-column border-t-4 transition-colors flex flex-col',
        stageColors[stage.color]
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">{stage.label}</h3>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            stageBgColors[stage.color],
            'text-foreground'
          )}>
            {opportunities.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatCurrency(totalValue)}
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
        {opportunities.map((opportunity) => (
          <KanbanCard
            key={opportunity.id}
            opportunity={opportunity}
            onClick={() => onCardClick(opportunity)}
          />
        ))}
      </div>
    </div>
  );
}
