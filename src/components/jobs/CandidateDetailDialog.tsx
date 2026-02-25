import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Mail, Phone, Linkedin, Star, ExternalLink, 
  CheckCircle, XCircle, UserMinus, DollarSign
} from 'lucide-react';
import { 
  ApplicationWithRelations, JobPipelineStage, 
  applicationStatusLabels, ApplicationStatus, sourceLabels 
} from '@/types/ats';
import { useUpdateApplication, useUpdateApplicationStatus, useUpdateApplicationStage } from '@/hooks/useApplications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CandidateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: ApplicationWithRelations | null;
  stages: JobPipelineStage[];
  jobId: string;
}

export function CandidateDetailDialog({ 
  open, 
  onOpenChange, 
  application, 
  stages,
  jobId 
}: CandidateDetailDialogProps) {
  const [notes, setNotes] = useState(application?.notes || '');
  const [rating, setRating] = useState(application?.rating || 0);

  const updateApplication = useUpdateApplication();
  const updateStatus = useUpdateApplicationStatus();
  const updateStage = useUpdateApplicationStage();

  if (!application) return null;

  const party = application._party;
  const currentStage = application._stage;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleSaveNotes = async () => {
    try {
      await updateApplication.mutateAsync({
        id: application.id,
        notes,
        rating: rating || null,
      });
      toast.success('Notas salvas');
    } catch (error) {
      toast.error('Erro ao salvar notas');
    }
  };

  const handleStatusChange = async (status: ApplicationStatus) => {
    try {
      await updateStatus.mutateAsync({ id: application.id, status });
      toast.success(`Status alterado para ${applicationStatusLabels[status]}`);
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleStageChange = async (stageId: string) => {
    try {
      await updateStage.mutateAsync({ 
        id: application.id, 
        stage_id: stageId,
        job_id: jobId 
      });
      toast.success('Etapa alterada');
    } catch (error) {
      toast.error('Erro ao alterar etapa');
    }
  };

  const isFinalStatus = ['hired', 'rejected', 'withdrawn'].includes(application.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Candidato</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {party ? getInitials(party.full_name) : '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {party?.full_name || 'Candidato desconhecido'}
              </h3>
              {party?.headline && (
                <p className="text-sm text-muted-foreground">{party.headline}</p>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {party?.email_raw && (
                  <a 
                    href={`mailto:${party.email_raw}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Mail className="h-3 w-3" />
                    {party.email_raw}
                  </a>
                )}
                {party?.phone_raw && (
                  <a 
                    href={`tel:${party.phone_raw}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {party.phone_raw}
                  </a>
                )}
                {party?.linkedin_url && (
                  <a 
                    href={party.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Salary Expectation */}
          {application.salary_expectation != null && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Pretensão Salarial</p>
                <p className="font-semibold text-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(application.salary_expectation))}
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Status & Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Etapa</Label>
              <Select 
                value={application.stage_id || ''} 
                onValueChange={handleStageChange}
                disabled={isFinalStatus}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Badge 
                variant="outline" 
                className={cn(
                  "mt-1.5 w-full justify-center py-2",
                  application.status === 'hired' && 'bg-green-100 text-green-800 border-green-200',
                  application.status === 'rejected' && 'bg-red-100 text-red-800 border-red-200',
                  application.status === 'withdrawn' && 'bg-gray-100 text-gray-800 border-gray-200'
                )}
              >
                {applicationStatusLabels[application.status]}
              </Badge>
            </div>
          </div>

          {/* Rating */}
          <div>
            <Label>Avaliação</Label>
            <div className="flex items-center gap-1 mt-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={cn(
                    "p-1 transition-colors",
                    star <= rating ? "text-yellow-500" : "text-muted-foreground/30"
                  )}
                >
                  <Star className={cn("h-5 w-5", star <= rating && "fill-current")} />
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o candidato..."
              rows={4}
              className="mt-1.5"
            />
            <Button 
              size="sm" 
              className="mt-2"
              onClick={handleSaveNotes}
              disabled={updateApplication.isPending}
            >
              Salvar Notas
            </Button>
          </div>

          {/* Source & Date */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Origem: {sourceLabels[application.source]}</span>
            <span>
              Adicionado em {new Date(application.applied_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <Separator />

          {/* Actions */}
          {!isFinalStatus && (
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleStatusChange('rejected')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reprovar
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleStatusChange('withdrawn')}
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Candidato Desistiu
              </Button>

              <Button 
                size="sm"
                onClick={() => handleStatusChange('hired')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Contratar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
