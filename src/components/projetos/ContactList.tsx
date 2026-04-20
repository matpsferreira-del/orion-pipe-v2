import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OutplacementContact, KANBAN_STAGES, CONTACT_TYPE_LABELS,
  useUpdateOutplacementContact, useDeleteOutplacementContact,
} from '@/hooks/useOutplacementProjects';

interface Props {
  contacts: OutplacementContact[];
  onEdit: (c: OutplacementContact) => void;
  showProject?: boolean;
  projectNameMap?: Record<string, string>;
}

const tierColor: Record<string, string> = {
  A: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  B: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  C: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
};

export function ContactList({ contacts, onEdit, showProject, projectNameMap = {} }: Props) {
  const update = useUpdateOutplacementContact();
  const del = useDeleteOutplacementContact();

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {contacts.map(c => (
          <div key={c.id} className="bg-card border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{c.name}</h4>
                {c.current_position && <p className="text-xs text-muted-foreground truncate">{c.current_position}</p>}
                {c.company_name && <p className="text-xs text-muted-foreground truncate">{c.company_name}</p>}
              </div>
              <Badge variant="outline" className={cn('text-xs', tierColor[c.tier])}>{c.tier}</Badge>
            </div>
            {showProject && projectNameMap[c.project_id] && (
              <Badge variant="secondary" className="text-xs">{projectNameMap[c.project_id]}</Badge>
            )}
            <Select value={c.kanban_stage} onValueChange={v => update.mutate({ id: c.id, kanban_stage: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KANBAN_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 justify-end pt-1 border-t">
              {c.linkedin_url && (
                <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary p-2">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                onClick={() => confirm('Remover?') && del.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Empresa</TableHead>
              {showProject && <TableHead>Projeto</TableHead>}
              <TableHead>Tipo</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.current_position || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.company_name || '—'}</TableCell>
                {showProject && (
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{projectNameMap[c.project_id] || '—'}</Badge>
                  </TableCell>
                )}
                <TableCell><Badge variant="outline" className="text-xs">{CONTACT_TYPE_LABELS[c.contact_type]}</Badge></TableCell>
                <TableCell><Badge variant="outline" className={cn('text-xs', tierColor[c.tier])}>{c.tier}</Badge></TableCell>
                <TableCell>
                  <Select value={c.kanban_stage} onValueChange={v => update.mutate({ id: c.id, kanban_stage: v })}>
                    <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KANBAN_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary p-1.5">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                      onClick={() => confirm('Remover?') && del.mutate(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
