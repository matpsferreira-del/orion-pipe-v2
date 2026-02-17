import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Merge, SkipForward, CheckCircle2, Building2, MapPin } from 'lucide-react';
import { useCompanyDuplicates, useMergeCompanies, CompanyGroup } from '@/hooks/useCompanyDuplicates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  prospect: 'Prospect',
  cliente_ativo: 'Cliente Ativo',
  cliente_inativo: 'Cliente Inativo',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDuplicatesDialog({ open, onOpenChange }: Props) {
  const { data: groups = [], isLoading, refetch } = useCompanyDuplicates();
  const mergeCompanies = useMergeCompanies();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedSurvivor, setSelectedSurvivor] = useState<Record<string, string>>({});

  const activeGroups = groups.filter(g => !dismissed.has(g.id));

  const handleMerge = async (group: CompanyGroup) => {
    const survivorId = selectedSurvivor[group.id];
    if (!survivorId) return;

    const mergedIds = group.companies.filter(c => c.id !== survivorId).map(c => c.id);
    await mergeCompanies.mutateAsync({ survivorId, mergedIds });
    refetch();
  };

  const handleDismiss = (groupId: string) => {
    setDismissed(prev => new Set(prev).add(groupId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Revisar Duplicatas
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? 'Buscando empresas com nomes similares...'
              : activeGroups.length > 0
                ? `${activeGroups.length} grupo(s) de empresas similares encontrado(s). Selecione qual manter em cada grupo.`
                : 'Nenhuma empresa duplicata encontrada!'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activeGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium text-foreground">Tudo limpo!</p>
            <p className="text-sm">Não há empresas duplicatas para revisar.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-4">
              {activeGroups.map((group) => (
                <div key={group.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Similaridade: {Math.round(group.maxSimilarity * 100)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {group.companies.length} empresas
                    </span>
                  </div>

                  <RadioGroup
                    value={selectedSurvivor[group.id] || ''}
                    onValueChange={(val) =>
                      setSelectedSurvivor(prev => ({ ...prev, [group.id]: val }))
                    }
                  >
                    <div className="space-y-2">
                      {group.companies.map((company) => (
                        <Label
                          key={company.id}
                          htmlFor={`survivor-${company.id}`}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                            selectedSurvivor[group.id] === company.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <RadioGroupItem value={company.id} id={`survivor-${company.id}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{company.name}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {company.cidade}, {company.estado}
                              </span>
                              <span>{statusLabels[company.status] || company.status}</span>
                            </div>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleMerge(group)}
                      disabled={!selectedSurvivor[group.id] || mergeCompanies.isPending}
                    >
                      {mergeCompanies.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Merge className="h-4 w-4 mr-1" />
                      )}
                      Mesclar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(group.id)}
                    >
                      <SkipForward className="h-4 w-4 mr-1" />
                      Não é duplicata
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
