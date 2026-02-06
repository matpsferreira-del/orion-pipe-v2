import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useParties } from '@/hooks/useParties';
import { useCreateApplication, useApplications } from '@/hooks/useApplications';
import { useJobStages } from '@/hooks/useJobs';
import { sourceLabels, ApplicationSource } from '@/types/ats';
import { toast } from 'sonner';
import { Loader2, Search, User, Mail, Phone } from 'lucide-react';

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
}

export function AddCandidateDialog({ open, onOpenChange, jobId }: AddCandidateDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string>('');
  const [source, setSource] = useState<ApplicationSource>('manual');
  const [notes, setNotes] = useState('');

  const { data: parties = [], isLoading: loadingParties } = useParties();
  const { data: existingApplications = [] } = useApplications(jobId);
  const { data: stages = [] } = useJobStages(jobId);
  const createApplication = useCreateApplication();

  // Filter out parties that already have applications for this job
  const existingPartyIds = new Set(existingApplications.map(a => a.party_id));
  
  const availableParties = useMemo(() => {
    return parties.filter(p => {
      if (existingPartyIds.has(p.id)) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        p.full_name.toLowerCase().includes(search) ||
        p.email_raw?.toLowerCase().includes(search) ||
        p.phone_raw?.includes(searchTerm)
      );
    });
  }, [parties, existingPartyIds, searchTerm]);

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  const handleSubmit = async () => {
    if (!selectedPartyId) {
      toast.error('Selecione um candidato');
      return;
    }

    try {
      await createApplication.mutateAsync({
        job_id: jobId,
        party_id: selectedPartyId,
        stage_id: stageId || (stages[0]?.id ?? null),
        source,
        status: 'new',
        notes: notes || null,
        rating: null,
      });
      toast.success('Candidato adicionado com sucesso!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao adicionar candidato');
      console.error(error);
    }
  };

  const resetForm = () => {
    setSearchTerm('');
    setSelectedPartyId(null);
    setStageId('');
    setSource('manual');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Candidato à Vaga</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div>
            <Label>Buscar Candidato</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, email ou telefone..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Party List */}
          {loadingParties ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-2 space-y-1">
                {availableParties.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? 'Nenhum candidato encontrado' : 'Todos os candidatos já foram adicionados'}
                  </p>
                ) : (
                  availableParties.map((party) => (
                    <div
                      key={party.id}
                      className={`p-2 rounded-md cursor-pointer transition-colors ${
                        selectedPartyId === party.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                      onClick={() => setSelectedPartyId(party.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{party.full_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {party.email_raw && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {party.email_raw}
                              </span>
                            )}
                            {party.phone_raw && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {party.phone_raw}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {/* Selected Party */}
          {selectedParty && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Selecionado:</p>
              <p className="text-sm">{selectedParty.full_name}</p>
              {selectedParty.headline && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {selectedParty.headline}
                </Badge>
              )}
            </div>
          )}

          {/* Stage & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Etapa Inicial</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Primeira etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Origem</Label>
              <Select value={source} onValueChange={(v) => setSource(v as ApplicationSource)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre o candidato..."
              rows={3}
              className="mt-1.5"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedPartyId || createApplication.isPending}
            >
              {createApplication.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
