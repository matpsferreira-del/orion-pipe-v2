import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Briefcase, GitBranch, History, type LucideIcon, Send, UserCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { usePartyHistory, type PartyHistoryEvent } from '@/hooks/usePartyHistory';

interface PartyHistoryTimelineProps {
  partyId: string;
  email?: string | null;
  emptyMessage?: string;
}

const eventTypeConfig: Record<PartyHistoryEvent['type'], { icon: LucideIcon; label: string; color: string }> = {
  email: { icon: Send, label: 'Email', color: 'text-primary bg-primary/10' },
  stage_change: { icon: GitBranch, label: 'Etapa', color: 'text-accent-foreground bg-accent' },
  status_change: { icon: UserCheck, label: 'Status', color: 'text-foreground bg-secondary' },
  application_created: { icon: Briefcase, label: 'Candidatura', color: 'text-foreground bg-muted' },
};

export function PartyHistoryTimeline({
  partyId,
  email,
  emptyMessage = 'Nenhum evento registrado.',
}: PartyHistoryTimelineProps) {
  const { data: events = [], isLoading } = usePartyHistory(partyId, email);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
      {events.map((event) => {
        const config = eventTypeConfig[event.type];
        const Icon = config.icon;

        return (
          <div key={event.id} className="flex gap-3 items-start">
            <div className={`p-1.5 rounded-md mt-0.5 ${config.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{event.title}</span>
                <Badge variant="outline" className="text-[10px] py-0">
                  {config.label}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>

              {event.metadata?.note && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">&quot;{event.metadata.note}&quot;</p>
              )}

              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(event.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}