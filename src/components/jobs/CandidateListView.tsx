import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Mail, Phone, Linkedin, MoreHorizontal, ArrowRight, XCircle, Eye, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { ApplicationWithRelations, JobPipelineStage, applicationStatusLabels } from '@/types/ats';
import { cn } from '@/lib/utils';

type SortField = 'name' | 'current_title' | 'current_company' | 'stage' | 'salary' | 'date';
type SortDir = 'asc' | 'desc';

interface CandidateListViewProps {
  applications: ApplicationWithRelations[];
  stages: JobPipelineStage[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onCandidateClick: (application: ApplicationWithRelations) => void;
  onMoveToStage: (applicationId: string, stageId: string) => void;
  onReject: (applicationId: string) => void;
  searchTerm?: string;
}

export function CandidateListView({
  applications, stages, selectedIds, onToggleSelect, onCandidateClick, onMoveToStage, onReject, searchTerm = '',
}: CandidateListViewProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sortedStages = useMemo(() => [...stages].sort((a, b) => a.position - b.position), [stages]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredAndSorted = useMemo(() => {
    let list = applications;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(app => {
        const p = app._party;
        const searchStr = [
          p?.full_name, p?.current_title, p?.current_company, p?.headline,
          p?.email_raw, p?.city, p?.state, app.notes,
        ].filter(Boolean).join(' ').toLowerCase();
        return searchStr.includes(term);
      });
    }

    const stageMap = new Map(sortedStages.map(s => [s.id, s.name]));

    return [...list].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'name':
          valA = a._party?.full_name?.toLowerCase() || '';
          valB = b._party?.full_name?.toLowerCase() || '';
          break;
        case 'current_title':
          valA = a._party?.current_title?.toLowerCase() || '';
          valB = b._party?.current_title?.toLowerCase() || '';
          break;
        case 'current_company':
          valA = a._party?.current_company?.toLowerCase() || '';
          valB = b._party?.current_company?.toLowerCase() || '';
          break;
        case 'stage':
          valA = (a.stage_id ? stageMap.get(a.stage_id) || '' : '').toLowerCase();
          valB = (b.stage_id ? stageMap.get(b.stage_id) || '' : '').toLowerCase();
          break;
        case 'salary':
          valA = Number(a.salary_expectation) || 0;
          valB = Number(b.salary_expectation) || 0;
          break;
        case 'date':
          valA = new Date(a.applied_at).getTime();
          valB = new Date(b.applied_at).getTime();
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [applications, searchTerm, sortField, sortDir, sortedStages]);

  const allSelected = filteredAndSorted.length > 0 && filteredAndSorted.every(a => selectedIds.has(a.id));
  const someSelected = filteredAndSorted.some(a => selectedIds.has(a.id));

  const handleSelectAll = () => {
    if (allSelected) {
      filteredAndSorted.forEach(a => onToggleSelect(a.id));
    } else {
      filteredAndSorted.filter(a => !selectedIds.has(a.id)).forEach(a => onToggleSelect(a.id));
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    screening: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    interviewing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    offer: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    hired: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    withdrawn: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                <span className="flex items-center">Candidato <SortIcon field="name" /></span>
              </TableHead>
              <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('current_title')}>
                <span className="flex items-center">Cargo Atual <SortIcon field="current_title" /></span>
              </TableHead>
              <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort('current_company')}>
                <span className="flex items-center">Empresa Atual <SortIcon field="current_company" /></span>
              </TableHead>
              <TableHead className="w-28 hidden sm:table-cell cursor-pointer select-none" onClick={() => handleSort('stage')}>
                <span className="flex items-center">Etapa <SortIcon field="stage" /></span>
              </TableHead>
              <TableHead className="w-28 hidden sm:table-cell">Situação</TableHead>
              <TableHead className="w-28 hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('salary')}>
                <span className="flex items-center">Pretensão <SortIcon field="salary" /></span>
              </TableHead>
              <TableHead className="w-28 hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort('date')}>
                <span className="flex items-center">Inscrição <SortIcon field="date" /></span>
              </TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nenhum candidato encontrado para esta busca.' : 'Nenhum candidato inscrito nesta vaga.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((app) => {
                const party = app._party;
                const currentStage = sortedStages.find(s => s.id === app.stage_id);
                const isFinal = ['hired', 'rejected', 'withdrawn'].includes(app.status);

                return (
                  <TableRow
                    key={app.id}
                    className={cn(
                      'group',
                      selectedIds.has(app.id) && 'bg-primary/5',
                      isFinal && 'opacity-60'
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(app.id)}
                        onCheckedChange={() => onToggleSelect(app.id)}
                        aria-label={`Selecionar ${party?.full_name}`}
                      />
                    </TableCell>

                    <TableCell>
                      <div
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer"
                        onClick={() => onCandidateClick(app)}
                      >
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {party ? getInitials(party.full_name) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate hover:underline">
                            {party?.full_name || 'Candidato desconhecido'}
                          </p>
                          {(party?.current_title || party?.current_company) && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                              {[party.current_title, party.current_company].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {!(party?.current_title || party?.current_company) && party?.headline && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{party.headline}</p>
                          )}
                          {(party?.city || party?.state) && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {[party.city, party.state].filter(Boolean).join(' - ')}
                            </p>
                          )}
                          {/* Mobile: show stage + status inline */}
                          <div className="flex items-center gap-2 mt-1 sm:hidden">
                            {currentStage && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${currentStage.color}20`, color: currentStage.color }}>
                                {currentStage.name}
                              </span>
                            )}
                            <Badge variant="outline" className={cn('text-[10px]', statusColors[app.status])}>
                              {applicationStatusLabels[app.status]}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          {party?.email_raw && (
                            <a href={`mailto:${party.email_raw}`} onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary transition-colors">
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {party?.phone_raw && (
                            <a href={`https://wa.me/${(party.phone_raw || '').replace(/\D/g, '')}`}
                              target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-green-500 transition-colors hidden sm:inline">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {party?.linkedin_url && (
                            <a href={party.linkedin_url} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-blue-500 transition-colors hidden sm:inline">
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground truncate block max-w-[160px]">
                        {party?.current_title || '—'}
                      </span>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground truncate block max-w-[160px]">
                        {party?.current_company || '—'}
                      </span>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      {currentStage ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${currentStage.color}20`, color: currentStage.color }}>
                          {currentStage.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={cn('text-[10px]', statusColors[app.status])}>
                        {applicationStatusLabels[app.status]}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs hidden md:table-cell">
                      {app.salary_expectation != null
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(app.salary_expectation))
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {formatDate(app.applied_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onCandidateClick(app)}>
                            <Eye className="h-4 w-4 mr-2" />Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ArrowRight className="h-4 w-4 mr-2" />Mover para etapa
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {sortedStages.map((stage) => (
                                <DropdownMenuItem key={stage.id} disabled={stage.id === app.stage_id}
                                  onClick={() => onMoveToStage(app.id, stage.id)}>
                                  <span className="h-2 w-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: stage.color }} />
                                  {stage.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive"
                            onClick={() => onReject(app.id)} disabled={isFinal}>
                            <XCircle className="h-4 w-4 mr-2" />Reprovar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
