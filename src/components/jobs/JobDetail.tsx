import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, MapPin, Calendar, DollarSign, User, Clock, 
  Edit, UserPlus, Play, Pause, CheckCircle, XCircle 
} from 'lucide-react';
import { JobRow, useUpdateJobStatus, useJobStages } from '@/hooks/useJobs';
import { useApplicationsWithParties, useUpdateApplicationStage } from '@/hooks/useApplications';
import { useCompanies } from '@/hooks/useCompanies';
import { useProfiles } from '@/hooks/useProfiles';
import { CandidateKanban } from './CandidateKanban';
import { AddCandidateDialog } from './AddCandidateDialog';
import { CandidateDetailDialog } from './CandidateDetailDialog';
import { ApplicationWithRelations } from '@/types/ats';
import { 
  jobStatusLabels, jobStatusColors, priorityLabels, priorityColors, 
  JobPriority 
} from '@/types/ats';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface JobDetailProps {
  job: JobRow;
  onEdit: () => void;
}

export function JobDetail({ job, onEdit }: JobDetailProps) {
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithRelations | null>(null);

  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();
  const { data: stages = [] } = useJobStages(job.id);
  const { data: applications = [], isLoading: loadingApps } = useApplicationsWithParties(job.id);
  const updateStatus = useUpdateJobStatus();
  const updateAppStage = useUpdateApplicationStage();

  const company = companies.find(c => c.id === job.company_id);
  const responsavel = profiles.find(p => p.id === job.responsavel_id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleStatusChange = async (newStatus: 'open' | 'paused' | 'filled' | 'cancelled') => {
    try {
      await updateStatus.mutateAsync({ id: job.id, status: newStatus });
      toast.success(`Status atualizado para ${jobStatusLabels[newStatus]}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleMoveCandidate = async (applicationId: string, newStageId: string) => {
    try {
      await updateAppStage.mutateAsync({ 
        id: applicationId, 
        stage_id: newStageId,
        job_id: job.id 
      });
      toast.success('Candidato movido com sucesso');
    } catch (error) {
      toast.error('Erro ao mover candidato');
    }
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', jobStatusColors[job.status])}>
              {jobStatusLabels[job.status]}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', priorityColors[job.priority as JobPriority])}>
              {priorityLabels[job.priority as JobPriority]}
            </Badge>
          </div>
          
          {company && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {company.nome_fantasia}
            </div>
          )}
          
          {job.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {job.location}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {job.status === 'draft' && (
          <Button size="sm" onClick={() => handleStatusChange('open')}>
            <Play className="h-4 w-4 mr-1" />
            Abrir Vaga
          </Button>
        )}
        {job.status === 'open' && (
          <>
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('paused')}>
              <Pause className="h-4 w-4 mr-1" />
              Pausar
            </Button>
            <Button size="sm" variant="default" onClick={() => handleStatusChange('filled')}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Marcar como Preenchida
            </Button>
          </>
        )}
        {job.status === 'paused' && (
          <>
            <Button size="sm" onClick={() => handleStatusChange('open')}>
              <Play className="h-4 w-4 mr-1" />
              Reabrir
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleStatusChange('cancelled')}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </>
        )}
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {(job.salary_min || job.salary_max) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>
              {job.salary_min && job.salary_max
                ? `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max)}`
                : job.salary_min
                  ? `A partir de ${formatCurrency(job.salary_min)}`
                  : `Até ${formatCurrency(job.salary_max!)}`
              }
            </span>
          </div>
        )}
        
        {responsavel && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{responsavel.name}</span>
          </div>
        )}
        
        {job.deadline && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Prazo: {formatDate(job.deadline)}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Criada em {formatDate(job.created_at)}</span>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="candidates" className="flex-1">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="candidates">
              Candidatos ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="details">
              Detalhes
            </TabsTrigger>
          </TabsList>
          
          {job.status !== 'cancelled' && job.status !== 'filled' && (
            <Button size="sm" onClick={() => setShowAddCandidate(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Adicionar Candidato
            </Button>
          )}
        </div>

        <TabsContent value="candidates" className="mt-4">
          {loadingApps ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando candidatos...
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum candidato nesta vaga ainda</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setShowAddCandidate(true)}
              >
                Adicionar primeiro candidato
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <CandidateKanban
                stages={stages}
                applications={applications}
                onMoveCandidate={handleMoveCandidate}
                onCandidateClick={setSelectedApplication}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-4 space-y-4">
          {job.description && (
            <div>
              <h4 className="font-medium mb-2">Descrição</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}
          
          {job.requirements && (
            <div>
              <h4 className="font-medium mb-2">Requisitos</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.requirements}
              </p>
            </div>
          )}
          
          {!job.description && !job.requirements && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum detalhe adicionado ainda
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Candidate Dialog */}
      <AddCandidateDialog
        open={showAddCandidate}
        onOpenChange={setShowAddCandidate}
        jobId={job.id}
      />

      {/* Candidate Detail Dialog */}
      <CandidateDetailDialog
        open={!!selectedApplication}
        onOpenChange={() => setSelectedApplication(null)}
        application={selectedApplication}
        stages={stages}
        jobId={job.id}
      />
    </div>
  );
}
