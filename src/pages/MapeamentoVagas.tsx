import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { Search, ExternalLink, MapPin, Building2, X, Loader2, Zap, Filter } from 'lucide-react';
import { BRAZIL_STATES, BRAZIL_CITIES } from '@/data/brazilLocations';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface JobPosting {
  id: string;
  created_at: string;
  title: string;
  company: string;
  cidade: string | null;
  estado: string | null;
  url: string;
  source: string;
  search_term: string;
}

const ALL = 'all';

export default function MapeamentoVagas() {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState(ALL);
  const [filterSearchTerm, setFilterSearchTerm] = useState(ALL);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterState, setFilterState] = useState(ALL);
  const [filterCity, setFilterCity] = useState(ALL);

  const { data: postings = [], isLoading } = useQuery({
    queryKey: ['job-postings'],
    queryFn: () => fetchAllRows<JobPosting>('job_postings', { orderBy: 'created_at', ascending: false }),
  });

  const sources = useMemo(() => Array.from(new Set(postings.map(p => p.source))).sort(), [postings]);
  const searchTerms = useMemo(() => Array.from(new Set(postings.map(p => p.search_term))).sort(), [postings]);

  const cities = useMemo(() => {
    if (filterState !== ALL) return BRAZIL_CITIES[filterState] || [];
    return [];
  }, [filterState]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return postings.filter(p => {
      const loc = [p.cidade, p.estado].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) || loc.includes(q);
      const matchesSource = filterSource === ALL || p.source === filterSource;
      const matchesTerm = filterSearchTerm === ALL || p.search_term === filterSearchTerm;
      const matchesCompany = !filterCompany || p.company.toLowerCase().includes(filterCompany.toLowerCase());
      const matchesState = filterState === ALL || p.estado === filterState;
      const matchesCity = filterCity === ALL || p.cidade === filterCity;
      return matchesSearch && matchesSource && matchesTerm && matchesCompany && matchesState && matchesCity;
    });
  }, [postings, search, filterSource, filterSearchTerm, filterCompany, filterState, filterCity]);

  const hasFilters = search || filterSource !== ALL || filterSearchTerm !== ALL || filterCompany || filterState !== ALL || filterCity !== ALL;
  const activeFiltersCount = [filterSource !== ALL, filterSearchTerm !== ALL, filterCompany, filterState !== ALL, filterCity !== ALL].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setFilterSource(ALL);
    setFilterSearchTerm(ALL);
    setFilterCompany('');
    setFilterState(ALL);
    setFilterCity(ALL);
  };

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const location = [filterCity !== ALL ? filterCity : null, filterState !== ALL ? filterState : null]
        .filter(Boolean).join(', ') || null;
      const { error } = await supabase.from('automation_triggers').insert({
        search_term: filterSearchTerm !== ALL ? filterSearchTerm : (search || null),
        location, status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Automação iniciada com sucesso!'),
    onError: () => toast.error('Erro ao iniciar automação'),
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const formatLocation = (cidade: string | null, estado: string | null) => {
    if (cidade && estado) return `${cidade}, ${estado}`;
    return cidade || estado || '—';
  };

  const getStateName = (uf: string) => {
    const state = BRAZIL_STATES.find(s => s.uf === uf);
    return state ? `${state.name} (${uf})` : uf;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4 md:space-y-6">
        <PageHeader title="Mapeamento de Vagas" description="Vagas mapeadas de portais externos" />

        {/* Mobile: filters in popover. Desktop: sidebar */}
        <div className="flex gap-4 sm:gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-[240px] shrink-0 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto py-1 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />Limpar
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9 text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</Label>
              <Select value={filterState} onValueChange={(v) => { setFilterState(v); setFilterCity(ALL); }}>
                <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-[300px]">
                  <SelectItem value={ALL}>Todos os estados</SelectItem>
                  {BRAZIL_STATES.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name} ({s.uf})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</Label>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todas as cidades</SelectItem>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</Label>
              <Input className="h-9 text-sm" placeholder="Filtrar..." value={filterCompany} onChange={e => setFilterCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fonte</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todas as fontes</SelectItem>
                  {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Termo de busca</Label>
              <Select value={filterSearchTerm} onValueChange={setFilterSearchTerm}>
                <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todos os termos</SelectItem>
                  {searchTerms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <Button className="w-full gap-2" onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}>
                {triggerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Acionar Automação
              </Button>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile: search + filter popover */}
            <div className="flex gap-2 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-1">
                    <Filter className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">{activeFiltersCount}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover space-y-4" align="end">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtros</h4>
                    {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs"><X className="h-3 w-3 mr-1" />Limpar</Button>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Estado</Label>
                    <Select value={filterState} onValueChange={(v) => { setFilterState(v); setFilterCity(ALL); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={ALL}>Todos</SelectItem>
                        {BRAZIL_STATES.map(s => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Fonte</Label>
                    <Select value={filterSource} onValueChange={setFilterSource}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={ALL}>Todas</SelectItem>
                        {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full gap-2" size="sm" onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}>
                    <Zap className="h-4 w-4" />Acionar Automação
                  </Button>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active filter badges */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2">
                {filterState !== ALL && (
                  <Badge variant="secondary" className="gap-1">
                    {getStateName(filterState)}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterState(ALL); setFilterCity(ALL); }} />
                  </Badge>
                )}
                {filterCity !== ALL && (
                  <Badge variant="secondary" className="gap-1">{filterCity}<X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCity(ALL)} /></Badge>
                )}
                {filterCompany && (
                  <Badge variant="secondary" className="gap-1">{filterCompany}<X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCompany('')} /></Badge>
                )}
                {filterSource !== ALL && (
                  <Badge variant="secondary" className="gap-1">{filterSource}<X className="h-3 w-3 cursor-pointer" onClick={() => setFilterSource(ALL)} /></Badge>
                )}
                {filterSearchTerm !== ALL && (
                  <Badge variant="secondary" className="gap-1">{filterSearchTerm}<X className="h-3 w-3 cursor-pointer" onClick={() => setFilterSearchTerm(ALL)} /></Badge>
                )}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {filtered.length} vaga{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  {hasFilters ? 'Nenhuma vaga encontrada' : 'Nenhuma vaga mapeada ainda'}
                </p>
                <p className="text-sm mt-1">
                  {hasFilters ? 'Tente ajustar os filtros' : 'As vagas aparecerão aqui quando forem importadas'}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="hidden sm:table-cell">Cidade</TableHead>
                      <TableHead className="hidden md:table-cell">Estado</TableHead>
                      <TableHead className="hidden md:table-cell">Fonte</TableHead>
                      <TableHead className="hidden lg:table-cell">Termo</TableHead>
                      <TableHead className="hidden sm:table-cell w-[80px]">Data</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(posting => (
                      <TableRow key={posting.id}>
                        <TableCell className="font-medium">
                          <span className="block truncate max-w-[200px] sm:max-w-none">{posting.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{posting.company}</span>
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {posting.cidade || '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {posting.estado || '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{posting.source}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary" className="text-xs">{posting.search_term}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                          {formatDate(posting.created_at)}
                        </TableCell>
                        <TableCell>
                          <a href={posting.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
