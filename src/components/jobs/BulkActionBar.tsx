import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ComposeEmailDialog } from '@/components/email/ComposeEmailDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Mail, XCircle, ChevronRight, X, Loader2, ArrowRight } from 'lucide-react';
import { ApplicationWithRelations, JobPipelineStage } from '@/types/ats';
import { useUpdateApplicationStatus, useUpdateApplicationStage } from '@/hooks/useApplications';
import { toast } from 'sonner';

interface BulkActionBarProps {
  selectedIds: Set<string>;
  applications: ApplicationWithRelations[];
  stages: JobPipelineStage[];
  jobId: string;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedIds,
  applications,
  stages,
  jobId,
  onClearSelection,
}: BulkActionBarProps) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const updateStatus = useUpdateApplicationStatus();
  const updateStage = useUpdateApplicationStage();

  const selectedApps = applications.filter(a => selectedIds.has(a.id));
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  const handleMoveToStage = async (stageId: string) => {
    setProcessing(true);
    try {
      await Promise.all(
        selectedApps.map(a =>
          updateStage.mutateAsync({ id: a.id, stage_id: stageId, job_id: jobId })
        )
      );
      const stageName = sortedStages.find(s => s.id === stageId)?.name || '';
      toast.success(`${selectedApps.length} candidato(s) movido(s) para ${stageName}.`);
      onClearSelection();
    } catch {
      toast.error('Erro ao mover candidatos.');
    } finally {
      setProcessing(false);
    }
  };

  const handleEmail = () => {
    const emails = selectedApps
      .map(a => a._party?.email_raw)
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error('Nenhum candidato selecionado possui email.');
      return;
    }
    window.open(`mailto:?bcc=${emails.join(',')}`);
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await Promise.all(
        selectedApps.map(a =>
          updateStatus.mutateAsync({ id: a.id, status: 'rejected' })
        )
      );
      toast.success(`${selectedApps.length} candidato(s) reprovado(s).`);
      onClearSelection();
    } catch {
      toast.error('Erro ao reprovar candidatos.');
    } finally {
      setProcessing(false);
      setShowRejectConfirm(false);
    }
  };

  const handleAdvance = async () => {
    setProcessing(true);
    let moved = 0;
    try {
      for (const app of selectedApps) {
        const currentIdx = sortedStages.findIndex(s => s.id === app.stage_id);
        const nextStage = sortedStages[currentIdx + 1];
        if (nextStage) {
          await updateStage.mutateAsync({ id: app.id, stage_id: nextStage.id, job_id: jobId });
          moved++;
        }
      }
      if (moved > 0) {
        toast.success(`${moved} candidato(s) avançado(s) para a próxima etapa.`);
      } else {
        toast.info('Nenhum candidato pôde ser avançado (já estão na última etapa).');
      }
      onClearSelection();
    } catch {
      toast.error('Erro ao avançar candidatos.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg bg-primary/5 border border-primary/20">
        <span className="text-sm font-medium text-foreground">
          {selectedIds.size} selecionado(s)
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={handleEmail} disabled={processing}>
          <Mail className="h-4 w-4 mr-1" />
          Enviar Email
        </Button>
        <Button size="sm" variant="outline" onClick={handleAdvance} disabled={processing}>
          {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          Próxima Etapa
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={processing}>
              <ArrowRight className="h-4 w-4 mr-1" />
              Mover para Etapa
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {sortedStages.map((stage) => (
              <DropdownMenuItem key={stage.id} onClick={() => handleMoveToStage(stage.id)}>
                <span className="h-2 w-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: stage.color }} />
                {stage.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setShowRejectConfirm(true)}
          disabled={processing}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reprovar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClearSelection} disabled={processing}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar candidatos?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a reprovar {selectedIds.size} candidato(s). Esta ação não pode ser desfeita facilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={processing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Reprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
