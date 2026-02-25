import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, MapPin, Calendar, DollarSign, User, Clock, 
  Edit, UserPlus, Play, Pause, CheckCircle, XCircle,
  Globe, GlobeLock, Copy, ExternalLink, Image, FileText, Loader2
} from 'lucide-react';
import { JobRow, useUpdateJobStatus, useJobStages, usePublishJob } from '@/hooks/useJobs';
import { useApplicationsWithParties, useUpdateApplicationStage } from '@/hooks/useApplications';
import { useCompanies } from '@/hooks/useCompanies';
import { useProfiles } from '@/hooks/useProfiles';
import { CandidateKanban } from './CandidateKanban';
import { AddCandidateDialog } from './AddCandidateDialog';
import { LinkedInPostDialog } from './LinkedInPostDialog';
import { CandidateDetailDialog } from './CandidateDetailDialog';
import { ApplicationWithRelations } from '@/types/ats';
import { 
  jobStatusLabels, jobStatusColors, priorityLabels, priorityColors, 
  JobPriority, jobAreaLabels, JobArea
} from '@/types/ats';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface JobDetailProps {
  job: JobRow;
  onEdit: () => void;
}

export function JobDetail({ job, onEdit }: JobDetailProps) {
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithRelations | null>(null);
  const [showLinkedInPost, setShowLinkedInPost] = useState(false);
  const [generatingShortlist, setGeneratingShortlist] = useState(false);
  const navigate = useNavigate();

  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();
  const { data: stages = [] } = useJobStages(job.id);
  const { data: applications = [], isLoading: loadingApps } = useApplicationsWithParties(job.id);
  const updateStatus = useUpdateJobStatus();
  const updateAppStage = useUpdateApplicationStage();
  const publishJob = usePublishJob();

  const company = companies.find(c => c.id === job.company_id);
  const responsavel = profiles.find(p => p.id === job.responsavel_id);

  // Campos extras que vêm do banco mas não estão no tipo antigo
  const jobPublished = (job as any).published as boolean | undefined;
  const jobSlug = (job as any).slug as string | undefined;

  // URL do portal público separado — atualizar após criar o projeto externo no Lovable
  const PORTAL_URL = 'https://recruit-sync-spot.lovable.app';
  const portalUrl = jobSlug ? `${PORTAL_URL}/vagas/${jobSlug}` : null;

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

  const handlePublish = async () => {
    try {
      await publishJob.mutateAsync({ id: job.id, title: job.title });
      toast.success('Vaga publicada no portal!');
    } catch {
      toast.error('Erro ao publicar vaga');
    }
  };

  const handleUnpublish = async () => {
    try {
      await publishJob.mutateAsync({ id: job.id, title: job.title, unpublish: true });
      toast.success('Vaga removida do portal');
    } catch {
      toast.error('Erro ao despublicar vaga');
    }
  };

  const handleCopyLink = () => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl);
      toast.success('Link copiado!');
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

  const handleGenerateShortlist = async () => {
    // Find the "Shortlist" stage
    const shortlistStage = stages.find(s => 
      s.name.toLowerCase() === 'shortlist'
    );

    if (!shortlistStage) {
      toast.error('Nenhuma etapa "Shortlist" encontrada no pipeline desta vaga.');
      return;
    }

    const shortlistApps = applications.filter(app => app.stage_id === shortlistStage.id);

    if (shortlistApps.length === 0) {
      toast.error(`Nenhum candidato na etapa "${shortlistStage.name}".`);
      return;
    }

    setGeneratingShortlist(true);

    try {
      const candidatesPayload = shortlistApps.map(app => ({
        name: app._party?.full_name || 'Candidato',
        current_role: app._party?.headline || null,
        notes: app.notes || '',
        salary_expectation: app.salary_expectation,
      }));

      const { data, error } = await supabase.functions.invoke('generate-shortlist', {
        body: { candidates: candidatesPayload },
      });

      if (error) throw error;

      const processedCandidates = (data?.candidates || candidatesPayload).map((c: any) => ({
        name: c.name,
        current_role: c.current_role,
        ai_summary: c.ai_summary || null,
        ai_deliveries: c.ai_deliveries || null,
        ai_background: c.ai_background || null,
        salary_expectation: c.salary_expectation
          ? (typeof c.salary_expectation === 'number'
              ? `R$ ${Number(c.salary_expectation).toLocaleString('pt-BR')}`
              : c.salary_expectation)
          : 'A Combinar',
      }));

      navigate(`/jobs/${job.id}/shortlist-presentation`, {
        state: {
          candidates: processedCandidates,
          jobTitle: job.title,
          companyName: company?.nome_fantasia || 'Cliente',
        },
      });
    } catch (err) {
      console.error('Shortlist generation error:', err);
      toast.error('Erro ao gerar shortlist. Tentando sem IA...');

      // Fallback without AI
      const fallbackCandidates = shortlistApps.map(app => ({
        name: app._party?.full_name || 'Candidato',
        current_role: app._party?.headline || null,
        ai_summary: app.notes || null,
        ai_deliveries: null,
        ai_background: null,
        salary_expectation: app.salary_expectation
          ? `R$ ${Number(app.salary_expectation).toLocaleString('pt-BR')}`
          : 'A Combinar',
      }));

      navigate(`/jobs/${job.id}/shortlist-presentation`, {
        state: {
          candidates: fallbackCandidates,
          jobTitle: job.title,
          companyName: company?.nome_fantasia || 'Cliente',
        },
      });
    } finally {
      setGeneratingShortlist(false);
    }
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Header Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('text-xs', jobStatusColors[job.status])}>
              {jobStatusLabels[job.status]}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', priorityColors[job.priority as JobPriority])}>
              {priorityLabels[job.priority as JobPriority]}
            </Badge>
            {jobPublished ? (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 gap-1">
                <Globe className="h-3 w-3" />
                Publicada no Portal
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                <GlobeLock className="h-3 w-3" />
                Não publicada
              </Badge>
            )}
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
          {(job as any).area && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted border border-border">
                {jobAreaLabels[(job as any).area as JobArea]}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateShortlist}
            disabled={generatingShortlist}
          >
            {generatingShortlist ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1" />
            )}
            {generatingShortlist ? 'Processando...' : 'Gerar Shortlist'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowLinkedInPost(true)}>
            <Image className="h-4 w-4 mr-1" />
            Gerar Post
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </div>
      </div>

      {/* Portal publish controls */}
      {job.status === 'open' && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          {jobPublished ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Link público da vaga:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-foreground truncate max-w-xs">{portalUrl}</code>
                  <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={handleCopyLink}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" asChild>
                    <a href={portalUrl!} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive flex-shrink-0"
                onClick={handleUnpublish}
                disabled={publishJob.isPending}
              >
                <GlobeLock className="h-4 w-4 mr-1" />
                Despublicar
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground flex-1">
                Esta vaga não está visível no portal público.
              </p>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={publishJob.isPending}
              >
                <Globe className="h-4 w-4 mr-1" />
                Publicar no Site
              </Button>
            </>
          )}
        </div>
      )}

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
      {/* LinkedIn Post Generator */}
      <LinkedInPostDialog
        open={showLinkedInPost}
        onOpenChange={setShowLinkedInPost}
        job={job}
      />
    </div>
  );
}
