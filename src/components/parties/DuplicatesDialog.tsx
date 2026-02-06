import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, Check, X, AlertTriangle, Mail, Phone, User 
} from 'lucide-react';
import { useDuplicateSuggestions, useDismissDuplicate, useMergeParties } from '@/hooks/useParties';
import { duplicateReasonLabels, Party } from '@/types/party';

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicatesDialog({ open, onOpenChange }: DuplicatesDialogProps) {
  const [selectedSurvivor, setSelectedSurvivor] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: duplicates, isLoading } = useDuplicateSuggestions();
  const dismissDuplicate = useDismissDuplicate();
  const mergeParties = useMergeParties();

  const current = duplicates?.[currentIndex];

  const handleDismiss = async () => {
    if (!current) return;
    await dismissDuplicate.mutateAsync(current.id);
    setSelectedSurvivor(null);
    if (currentIndex >= (duplicates?.length || 1) - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const handleMerge = async () => {
    if (!current || !selectedSurvivor) return;
    
    const mergedId = selectedSurvivor === current.party_id_a 
      ? current.party_id_b 
      : current.party_id_a;

    await mergeParties.mutateAsync({
      survivorId: selectedSurvivor,
      mergedId,
      suggestionId: current.id,
    });

    setSelectedSurvivor(null);
    if (currentIndex >= (duplicates?.length || 1) - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const goNext = () => {
    if (duplicates && currentIndex < duplicates.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedSurvivor(null);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedSurvivor(null);
    }
  };

  const renderPartyCard = (party: Party | undefined, id: string, isSelected: boolean) => {
    if (!party) return null;
    
    return (
      <Card 
        className={`cursor-pointer transition-all ${
          isSelected 
            ? 'ring-2 ring-primary border-primary' 
            : 'hover:border-primary/50'
        }`}
        onClick={() => setSelectedSurvivor(id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{party.full_name}</span>
              </div>
              {party.email_norm && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{party.email_norm}</span>
                </div>
              )}
              {party.phone_raw && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{party.phone_raw}</span>
                </div>
              )}
              {party.headline && (
                <p className="text-sm text-muted-foreground">{party.headline}</p>
              )}
              {(party.city || party.state) && (
                <p className="text-xs text-muted-foreground">
                  {[party.city, party.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            {isSelected && (
              <Badge variant="default" className="shrink-0">
                <Check className="h-3 w-3 mr-1" />
                Manter
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Possíveis Duplicatas
          </DialogTitle>
          <DialogDescription>
            Revise e mescle registros duplicados para manter o banco de dados limpo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            Carregando...
          </div>
        ) : !duplicates || duplicates.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Nenhuma duplicata encontrada!</p>
            <p className="text-muted-foreground">Seu banco de dados está limpo.</p>
          </div>
        ) : current ? (
          <div className="space-y-4">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} de {duplicates.length} sugestões
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goNext}
                  disabled={currentIndex >= duplicates.length - 1}
                >
                  Próxima
                </Button>
              </div>
            </div>

            {/* Reason badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {duplicateReasonLabels[current.reason]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Confiança: {current.confidence}%
              </span>
            </div>

            {/* Party comparison */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {renderPartyCard(
                current.party_a, 
                current.party_id_a, 
                selectedSurvivor === current.party_id_a
              )}
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              {renderPartyCard(
                current.party_b, 
                current.party_id_b, 
                selectedSurvivor === current.party_id_b
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Selecione qual registro deve ser mantido. O outro será mesclado nele.
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={handleDismiss}
                disabled={dismissDuplicate.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Não é duplicata
              </Button>
              <Button 
                onClick={handleMerge}
                disabled={!selectedSurvivor || mergeParties.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Mesclar
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
