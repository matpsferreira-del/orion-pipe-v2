import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, Phone, Linkedin, Star, ExternalLink, 
  CheckCircle, XCircle, UserMinus, DollarSign, FileText, RotateCcw, ImageIcon
} from 'lucide-react';
import { 
  ApplicationWithRelations, JobPipelineStage, 
  applicationStatusLabels, ApplicationStatus, sourceLabels 
} from '@/types/ats';
import { CandidateCVSection } from './CandidateCVSection';
import { useUpdateApplication, useUpdateApplicationStatus, useUpdateApplicationStage } from '@/hooks/useApplications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ComposeEmailDialog } from '@/components/email/ComposeEmailDialog';

interface CandidateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: ApplicationWithRelations | null;
  stages: JobPipelineStage[];
  jobId: string;
  jobTitle?: string;
}

export function CandidateDetailDialog({ 
  open, 
  onOpenChange, 
  application, 
  stages,
  jobId,
  jobTitle = '' 
}: CandidateDetailDialogProps) {
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Reset state when application changes
  useEffect(() => {
    if (application) {
      setNotes(application.notes || '');
      setRating(application.rating || 0);
      setSalaryExpectation(
        application.salary_expectation != null ? String(application.salary_expectation) : ''
      );
      setPhoneInput(application._party?.phone_raw || '');
      setPhotoUrlInput(application._party?.photo_url || '');
    }
  }, [application?.id]);

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
      const parsedSalary = salaryExpectation ? parseFloat(salaryExpectation.replace(/\D/g, '')) : null;
      await updateApplication.mutateAsync({
        id: application.id,
        notes,
        rating: rating || null,
        salary_expectation: parsedSalary || null,
      });
      // Update party fields if changed
      if (party) {
        const partyUpdates: Record<string, any> = {};
        if (phoneInput !== (party.phone_raw || '')) partyUpdates.phone_raw = phoneInput || null;
        if (photoUrlInput !== (party.photo_url || '')) partyUpdates.photo_url = photoUrlInput || null;
        if (Object.keys(partyUpdates).length > 0) {
          const { error } = await supabase
            .from('party')
            .update(partyUpdates)
            .eq('id', party.id);
          if (error) throw error;
        }
      }
      toast.success('Dados salvos');
    } catch (error) {
      toast.error('Erro ao salvar');
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Candidato</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              {(photoUrlInput || party?.photo_url) && (
                <AvatarImage src={photoUrlInput || party?.photo_url || ''} alt={party?.full_name || ''} />
              )}
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
                  <button 
                    onClick={() => setEmailDialogOpen(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Mail className="h-3 w-3" />
                    {party.email_raw}
                  </button>
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

          {/* Phone */}
          <div>
            <Label>Telefone</Label>
            <div className="relative mt-1.5">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                className="pl-9"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>
          </div>

          {/* Photo URL */}
          <div>
            <Label>URL da Foto</Label>
            <div className="relative mt-1.5">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://exemplo.com/foto.jpg"
                className="pl-9"
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
              />
            </div>
          </div>

          {/* Salary Expectation */}
          <div>
            <Label>Pretensão Salarial</Label>
            <div className="relative mt-1.5">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 8000"
                className="pl-9"
                value={salaryExpectation}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setSalaryExpectation(raw);
                }}
              />
            </div>
            {salaryExpectation && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(salaryExpectation))}
              </p>
            )}
          </div>

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
              Salvar Dados
            </Button>
          </div>

          {/* CV Data */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Dados do Currículo</Label>
            </div>
            <CandidateCVSection partyId={party?.id} />
          </div>

          <Separator />

          {/* Source & Date */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Origem: {sourceLabels[application.source]}</span>
            <span>
              Adicionado em {new Date(application.applied_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <Separator />

          {/* Actions */}
          {isFinalStatus ? (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="sm"
                className="text-primary hover:text-primary/80"
                onClick={() => handleStatusChange('new')}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reativar Candidato
              </Button>
            </div>
          ) : (
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

    {party?.email_raw && (
      <ComposeEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        defaultRecipients={[party.email_raw]}
        variables={{ nome_candidato: party.full_name, nome_vaga: jobTitle }}
      />
    )}
    </>
  );
}
