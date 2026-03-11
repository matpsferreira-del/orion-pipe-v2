import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, CheckCircle, DollarSign, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ApplicationWithRelations, JobPipelineStage } from '@/types/ats';

interface JobClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    closingSalary: number | null;
    closingCandidateId: string | null;
    admissionDate: string | null;
    closingNotes: string;
  }) => void;
  applications: ApplicationWithRelations[];
  stages: JobPipelineStage[];
  isPending?: boolean;
}

export function JobClosingDialog({
  open,
  onOpenChange,
  onConfirm,
  applications,
  stages,
  isPending,
}: JobClosingDialogProps) {
  const [closingSalary, setClosingSalary] = useState('');
  const [admissionDate, setAdmissionDate] = useState<Date>();
  const [closingNotes, setClosingNotes] = useState('');

  // Find candidates in the "Fechamento" stage
  const fechamentoStage = useMemo(
    () => stages.find(s => s.name.toLowerCase() === 'fechamento'),
    [stages]
  );

  const fechamentoCandidates = useMemo(
    () =>
      fechamentoStage
        ? applications.filter(a => a.stage_id === fechamentoStage.id)
        : [],
    [applications, fechamentoStage]
  );

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Auto-select if there's only one
  const effectiveSelected = selectedCandidateId ?? (fechamentoCandidates.length === 1 ? fechamentoCandidates[0]._party?.id ?? null : null);

  const handleSubmit = () => {
    onConfirm({
      closingSalary: closingSalary ? parseFloat(closingSalary.replace(/\D/g, '')) / 100 : null,
      closingCandidateId: effectiveSelected,
      admissionDate: admissionDate ? format(admissionDate, 'yyyy-MM-dd') : null,
      closingNotes,
    });
  };

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Fechamento de Vaga
          </DialogTitle>
          <DialogDescription>
            Preencha as informações de fechamento antes de marcar a vaga como preenchida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Candidate in Fechamento */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Candidato Aprovado
            </Label>
            {fechamentoCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum candidato na etapa de Fechamento.
              </p>
            ) : (
              <div className="space-y-2">
                {fechamentoCandidates.map(app => {
                  const party = app._party;
                  const isSelected = effectiveSelected === party?.id;
                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedCandidateId(party?.id ?? null)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {party?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{party?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {party?.current_title}{party?.current_company ? ` · ${party.current_company}` : ''}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
                          Selecionado
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Salary */}
          <div className="space-y-2">
            <Label htmlFor="closing-salary" className="flex items-center gap-1.5 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Remuneração Acordada
            </Label>
            <Input
              id="closing-salary"
              placeholder="R$ 0,00"
              value={closingSalary}
              onChange={e => setClosingSalary(formatCurrencyInput(e.target.value))}
            />
          </div>

          {/* Admission date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              Data de Admissão
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !admissionDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {admissionDate
                    ? format(admissionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={admissionDate}
                  onSelect={setAdmissionDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="closing-notes" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Observações de Fechamento
            </Label>
            <Textarea
              id="closing-notes"
              placeholder="Observações sobre o fechamento da vaga..."
              value={closingNotes}
              onChange={e => setClosingNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Confirmar Fechamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
