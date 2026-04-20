import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import {
  OutplacementContact, KANBAN_STAGES,
  useUpdateOutplacementContact, useDeleteOutplacementContact,
} from '@/hooks/useOutplacementProjects';

interface Props {
  contacts: OutplacementContact[];
  onEdit: (c: OutplacementContact) => void;
}

const tierColor: Record<string, string> = {
  A: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  B: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  C: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};

export function ContactKanban({ contacts, onEdit }: Props) {
  const update = useUpdateOutplacementContact();
  const del = useDeleteOutplacementContact();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary/40');
    const id = e.dataTransfer.getData('contactId');
    if (id) update.mutate({ id, kanban_stage: stageKey });
    setDraggingId(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {KANBAN_STAGES.map(stage => {
        const items = contacts.filter(c => c.kanban_stage === stage.key);
        return (
          <div
            key={stage.key}
            className="flex-shrink-0 w-[260px] sm:w-[280px] bg-muted/40 rounded-lg p-3 transition-all"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-primary/40'); }}
            onDragLeave={e => e.currentTarget.classList.remove('ring-2', 'ring-primary/40')}
            onDrop={e => handleDrop(e, stage.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', stage.color)} />
                <h3 className="font-semibold text-sm">{stage.label}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {items.map(c => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('contactId', c.id); setDraggingId(c.id); }}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(
                    'bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all group',
                    draggingId === c.id && 'opacity-40'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-semibold text-sm leading-tight truncate flex-1">{c.name}</h4>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', tierColor[c.tier])}>
                      {c.tier}
                    </Badge>
                  </div>
                  {c.current_position && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.current_position}</p>
                  )}
                  {c.company_name && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.company_name}</p>
                  )}
                  <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      {c.linkedin_url && (
                        <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80" onClick={e => e.stopPropagation()}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); onEdit(c); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); if (confirm('Remover contato?')) del.mutate(c.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
