import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { Search, ExternalLink, MapPin, Building2, X, Loader2 } from 'lucide-react';
import { BRAZIL_STATES } from '@/data/brazilLocations';

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
  const [filterCompany, setFilterCompany] = useState(ALL);
  const [filterState, setFilterState] = useState(ALL);
  const [filterCity, setFilterCity] = useState(ALL);

  const { data: postings = [], isLoading } = useQuery({
    queryKey: ['job-postings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as JobPosting[];
    },
  });

  const sources = useMemo(() => Array.from(new Set(postings.map(p => p.source))).sort(), [postings]);
  const searchTerms = useMemo(() => Array.from(new Set(postings.map(p => p.search_term))).sort(), [postings]);
  const companies = useMemo(() => Array.from(new Set(postings.map(p => p.company).filter(Boolean))).sort(), [postings]);

  const states = useMemo(() => Array.from(new Set(postings.map(p => p.estado).filter(Boolean) as string[])).sort(), [postings]);

  const cities = useMemo(() => {
    const relevant = filterState !== ALL
      ? postings.filter(p => p.estado === filterState)
      : postings;
    return Array.from(new Set(relevant.map(p => p.cidade).filter(Boolean) as string[])).sort();
  }, [postings, filterState]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return postings.filter(p => {
      const loc = [p.cidade, p.estado].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) || loc.includes(q);
      const matchesSource = filterSource === ALL || p.source === filterSource;
      const matchesTerm = filterSearchTerm === ALL || p.search_term === filterSearchTerm;
      const matchesCompany = filterCompany === ALL || p.company === filterCompany;
      const matchesState = filterState === ALL || p.estado === filterState;
      const matchesCity = filterCity === ALL || p.cidade === filterCity;
      return matchesSearch && matchesSource && matchesTerm && matchesCompany && matchesState && matchesCity;
    });
  }, [postings, search, filterSource, filterSearchTerm, filterCompany, filterState, filterCity]);

  const hasFilters = search || filterSource !== ALL || filterSearchTerm !== ALL || filterCompany !== ALL || filterState !== ALL || filterCity !== ALL;

  const clearFilters = () => {
    setSearch('');
    setFilterSource(ALL);
    setFilterSearchTerm(ALL);
    setFilterCompany(ALL);
    setFilterState(ALL);
    setFilterCity(ALL);
  };

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
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <PageHeader
          title="Mapeamento de Vagas"
          description="Vagas mapeadas de portais externos via API"
        />

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside className="w-[240px] shrink-0 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto py-1 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</Label>
              <Select value={filterState} onValueChange={(v) => { setFilterState(v); setFilterCity(ALL); }}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todos os estados</SelectItem>
                  {states.map(uf => (
                    <SelectItem key={uf} value={uf}>{getStateName(uf)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</Label>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todas as cidades</SelectItem>
                  {cities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</Label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todas as empresas</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fonte</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todas as fontes</SelectItem>
                  {sources.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Termo de busca</Label>
              <Select value={filterSearchTerm} onValueChange={setFilterSearchTerm}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={ALL}>Todos os termos</SelectItem>
                  {searchTerms.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Active filter badges */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2">
                {filterState !== ALL && (
                  <Badge variant="secondary" className="gap-1">
                    Estado: {getStateName(filterState)}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterState(ALL); setFilterCity(ALL); }} />
                  </Badge>
                )}
                {filterCity !== ALL && (
                  <Badge variant="secondary" className="gap-1">
                    Cidade: {filterCity}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCity(ALL)} />
                  </Badge>
                )}
                {filterCompany !== ALL && (
                  <Badge variant="secondary" className="gap-1">
                    Empresa: {filterCompany}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCompany(ALL)} />
                  </Badge>
                )}
                {filterSource !== ALL && (
                  <Badge variant="secondary" className="gap-1">
                    Fonte: {filterSource}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterSource(ALL)} />
                  </Badge>
                )}
                {filterSearchTerm !== ALL && (
                  <Badge variant="secondary" className="gap-1">
                    Termo: {filterSearchTerm}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterSearchTerm(ALL)} />
                  </Badge>
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
                  {hasFilters ? 'Nenhuma vaga encontrada para esses filtros' : 'Nenhuma vaga mapeada ainda'}
                </p>
                <p className="text-sm mt-1">
                  {hasFilters ? 'Tente ajustar os filtros de busca' : 'As vagas aparecerão aqui quando forem importadas via API'}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Título</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Termo</TableHead>
                      <TableHead className="w-[80px]">Data</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(posting => (
                      <TableRow key={posting.id}>
                        <TableCell className="font-medium">{posting.title}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {posting.company}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatLocation(posting.cidade, posting.estado)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{posting.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{posting.search_term}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
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
