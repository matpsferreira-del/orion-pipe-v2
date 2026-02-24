import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { JobPipelineStage, ApplicationWithRelations, applicationStatusLabels } from '@/types/ats';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Mail, Phone, Linkedin, DollarSign } from 'lucide-react';

interface CandidateKanbanProps {
  stages: JobPipelineStage[];
  applications: ApplicationWithRelations[];
  onMoveCandidate: (applicationId: string, newStageId: string) => void;
  onCandidateClick: (application: ApplicationWithRelations) => void;
}

export function CandidateKanban({ 
  stages, 
  applications, 
  onMoveCandidate, 
  onCandidateClick 
}: CandidateKanbanProps) {
  // Group applications by stage
  const applicationsByStage = useMemo(() => {
    const grouped: Record<string, ApplicationWithRelations[]> = {};
    stages.forEach(stage => {
      grouped[stage.id] = [];
    });
    // Add unassigned group
    grouped['unassigned'] = [];
    
    applications.forEach(app => {
      if (app.stage_id && grouped[app.stage_id]) {
        grouped[app.stage_id].push(app);
      } else {
        grouped['unassigned'].push(app);
      }
    });
    
    return grouped;
  }, [stages, applications]);

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {/* Unassigned column */}
      {applicationsByStage['unassigned']?.length > 0 && (
        <KanbanColumn
          stage={{ id: 'unassigned', name: 'Sem Etapa', color: '#6b7280', position: -1, job_id: '', created_at: '' }}
          applications={applicationsByStage['unassigned']}
          onDrop={(appId) => {}} // Can't drop to unassigned
          onCardClick={onCandidateClick}
        />
      )}
      
      {/* Stage columns */}
      {stages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          applications={applicationsByStage[stage.id] || []}
          onDrop={(appId) => onMoveCandidate(appId, stage.id)}
          onCardClick={onCandidateClick}
        />
      ))}
    </div>
  );
}

interface KanbanColumnProps {
  stage: JobPipelineStage;
  applications: ApplicationWithRelations[];
  onDrop: (applicationId: string) => void;
  onCardClick: (application: ApplicationWithRelations) => void;
}

function KanbanColumn({ stage, applications, onDrop, onCardClick }: KanbanColumnProps) {
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
    const applicationId = e.dataTransfer.getData('applicationId');
    if (applicationId && stage.id !== 'unassigned') {
      onDrop(applicationId);
    }
  };

  return (
    <div
      className="w-72 flex-shrink-0 bg-muted/30 rounded-lg p-3 flex flex-col transition-colors"
      style={{ borderTop: `4px solid ${stage.color}` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
          >
            {applications.length}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
        {applications.map((app) => (
          <CandidateCard
            key={app.id}
            application={app}
            onClick={() => onCardClick(app)}
          />
        ))}
      </div>
    </div>
  );
}

interface CandidateCardProps {
  application: ApplicationWithRelations;
  onClick: () => void;
}

function CandidateCard({ application, onClick }: CandidateCardProps) {
  const party = application._party;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('applicationId', application.id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const isFinalStatus = ['hired', 'rejected', 'withdrawn'].includes(application.status);

  return (
    <div
      className={cn(
        "bg-background rounded-lg p-3 shadow-sm border border-border cursor-pointer",
        "hover:shadow-md transition-all",
        isFinalStatus && "opacity-60"
      )}
      draggable={!isFinalStatus}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {party ? getInitials(party.full_name) : '??'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">
            {party?.full_name || 'Candidato desconhecido'}
          </h4>
          {party?.headline && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {party.headline}
            </p>
          )}
        </div>

        {application.rating && (
          <div className="flex items-center gap-0.5 text-yellow-500">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-xs">{application.rating}</span>
          </div>
        )}
      </div>

      {(application as any).salary_expectation && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((application as any).salary_expectation)}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        {party?.email_raw && (
          <a href={`mailto:${party.email_raw}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
            <Mail className="h-3 w-3" />
          </a>
        )}
        {party?.phone_raw && (
          <a href={`https://wa.me/${(party.phone_raw || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-green-500 transition-colors">
            <Phone className="h-3 w-3" />
          </a>
        )}
        {party?.linkedin_url && (
          <a href={party.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-blue-500 transition-colors">
            <Linkedin className="h-3 w-3" />
          </a>
        )}
        
        <div className="flex-1" />
        
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1.5",
            application.status === 'hired' && 'bg-green-100 text-green-800 border-green-200',
            application.status === 'rejected' && 'bg-red-100 text-red-800 border-red-200',
            application.status === 'withdrawn' && 'bg-gray-100 text-gray-800 border-gray-200'
          )}
        >
          {applicationStatusLabels[application.status]}
        </Badge>
      </div>
    </div>
  );
}
