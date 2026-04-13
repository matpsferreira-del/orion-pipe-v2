import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
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
import { ApplicationWithRelations } from '@/types/ats';

interface OfferLetterPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: ApplicationWithRelations | null;
  jobTitle: string;
  companyName: string;
}

export function OfferLetterPrompt({
  open,
  onOpenChange,
  application,
  jobTitle,
  companyName,
}: OfferLetterPromptProps) {
  const navigate = useNavigate();

  const handleGenerate = () => {
    onOpenChange(false);
    navigate('/carta-oferta', {
      state: {
        candidateName: application?._party?.full_name || '',
        jobTitle,
        companyName,
        remuneration: application?.salary_expectation
          ? `R$ ${Number(application.salary_expectation).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '',
        admissionDate: '',
        candidateEmail: application?._party?.email_raw || '',
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerar Carta Oferta?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O candidato <strong className="text-foreground">{application?._party?.full_name}</strong> foi movido para a etapa de <strong className="text-foreground">Fechamento</strong>.
            Deseja gerar uma carta oferta agora?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Agora não</AlertDialogCancel>
          <AlertDialogAction onClick={handleGenerate}>
            <FileText className="h-4 w-4 mr-1.5" />
            Gerar Carta Oferta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
