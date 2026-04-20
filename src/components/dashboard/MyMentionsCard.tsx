import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AtSign } from 'lucide-react';
import { useAllOpportunityMentions } from '@/hooks/useOpportunityMentions';
import { useAuth } from '@/contexts/AuthContext';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useProfiles } from '@/hooks/useProfiles';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OpportunityRow } from '@/hooks/useOpportunities';

export function MyMentionsCard() {
  const { profile } = useAuth();
  const { data: mentions = [] } = useAllOpportunityMentions();
  const { data: opportunities = [] } = useOpportunities();
  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();
  const [selected, setSelected] = useState<OpportunityRow | null>(null);

  const myPending = mentions.filter(
    (m) => m.mentioned_user_id === profile?.id && m.status === 'pendente'
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <AtSign className="h-4 w-4" />
            Minhas Menções
          </CardTitle>
          {myPending.length > 0 && (
            <Badge variant="secondary">{myPending.length}</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {myPending.length === 0 ? (
            <p className="text-muted-foreground text-xs">Nenhuma menção pendente.</p>
          ) : (
            myPending.slice(0, 6).map((m) => {
              const opp = opportunities.find((o) => o.id === m.opportunity_id);
              const by = profiles.find((p) => p.id === m.mentioned_by_user_id);
              const company = companies.find((c) => c.id === opp?.company_id);
              const pfName = opp?.observacoes?.match(/\[PF: (.+?)\]/)?.[1];
              const title = company?.nome_fantasia || pfName || 'Oportunidade';

              return (
                <button
                  key={m.id}
                  onClick={() => opp && setSelected(opp)}
                  className="w-full text-left rounded-md border bg-warning/5 hover:bg-warning/10 p-2 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium truncate">{title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(m.created_at), 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                  {m.observacao && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{m.observacao}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">por {by?.name || '—'}</p>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Oportunidade</SheetTitle>
          </SheetHeader>
          {selected && <OpportunityDetail opportunity={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
