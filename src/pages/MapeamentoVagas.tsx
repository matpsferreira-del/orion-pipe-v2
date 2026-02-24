import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageHeader } from '@/components/ui/page-header';
import { Search, ExternalLink, MapPin, Building2, Globe, Filter, X, Loader2, SlidersHorizontal } from 'lucide-react';
import { BRAZIL_STATES } from '@/data/brazilLocations';

interface JobPosting {
  id: string;
  created_at: string;
  title: string;
  company: string;
  location: string;
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

  const sources = useMemo(() => {
    const set = new Set(postings.map(p => p.source));
    return Array.from(set).sort();
  }, [postings]);

  const searchTerms = useMemo(() => {
    const set = new Set(postings.map(p => p.search_term));
    return Array.from(set).sort();
  }, [postings]);

  const companies = useMemo(() => {
    const set = new Set(postings.map(p => p.company).filter(Boolean));
    return Array.from(set).sort();
  }, [postings]);

  // Extract states from location field (try to match UF patterns)
  const extractedStates = useMemo(() => {
    const stateSet = new Set<string>();
    const ufList = BRAZIL_STATES.map(s => s.uf);
    postings.forEach(p => {
      if (!p.location) return;
      // Try matching " - UF", ", UF", "(UF)" patterns
      for (const uf of ufList) {
        const patterns = [
          new RegExp(`[\\s,\\-/]${uf}$`, 'i'),
          new RegExp(`[\\s,\\-/]${uf}[\\s,\\-/]`, 'i'),
          new RegExp(`\\(${uf}\\)`, 'i'),
        ];
        if (patterns.some(pat => pat.test(p.location))) {
          stateSet.add(uf);
          break;
        }
      }
    });
    return Array.from(stateSet).sort();
  }, [postings]);

  // Extract cities from location
  const extractedCities = useMemo(() => {
    const citySet = new Set<string>();
    postings.forEach(p => {
      if (!p.location) return;
      // Take first part before common separators as city
      const city = p.location.split(/[\-,\/]/)[0]?.trim();
      if (city) citySet.add(city);
    });
    // If state filter active, only show cities from that state
    if (filterState !== ALL) {
      const citiesInState = new Set<string>();
      postings.forEach(p => {
        if (!p.location) return;
        const matchesState = new RegExp(`[\\s,\\-/\\(]${filterState}[\\s,\\-/\\)]?`, 'i').test(p.location) ||
          p.location.toUpperCase().endsWith(filterState);
        if (matchesState) {
          const city = p.location.split(/[\-,\/]/)[0]?.trim();
          if (city) citiesInState.add(city);
        }
      });
      return Array.from(citiesInState).sort();
    }
    return Array.from(citySet).sort();
  }, [postings, filterState]);

  const locationMatchesState = (location: string, state: string) => {
    const patterns = [
      new RegExp(`[\\s,\\-/]${state}$`, 'i'),
      new RegExp(`[\\s,\\-/]${state}[\\s,\\-/]`, 'i'),
      new RegExp(`\\(${state}\\)`, 'i'),
    ];
    return patterns.some(pat => pat.test(location)) || location.toUpperCase().endsWith(state);
  };

  const locationMatchesCity = (location: string, city: string) => {
    return location.toLowerCase().includes(city.toLowerCase());
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return postings.filter(p => {
      const matchesSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q);
      const matchesSource = filterSource === ALL || p.source === filterSource;
      const matchesTerm = filterSearchTerm === ALL || p.search_term === filterSearchTerm;
      const matchesCompany = filterCompany === ALL || p.company === filterCompany;
      const matchesState = filterState === ALL || locationMatchesState(p.location, filterState);
      const matchesCity = filterCity === ALL || locationMatchesCity(p.location, filterCity);
      return matchesSearch && matchesSource && matchesTerm && matchesCompany && matchesState && matchesCity;
    });
  }, [postings, search, filterSource, filterSearchTerm, filterCompany, filterState, filterCity]);

  const hasFilters = search || filterSource !== ALL || filterSearchTerm !== ALL || filterCompany !== ALL || filterState !== ALL || filterCity !== ALL;

  const activeFilterCount = [filterSource, filterSearchTerm, filterCompany, filterState, filterCity].filter(f => f !== ALL).length;

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

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <PageHeader
          title="Mapeamento de Vagas"
          description="Vagas mapeadas de portais externos via API"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por título, empresa ou local..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4 bg-popover z-50" align="start">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</Label>
                <Select value={filterState} onValueChange={(v) => { setFilterState(v); setFilterCity(ALL); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value={ALL}>Todos os estados</SelectItem>
                    {extractedStates.map(uf => {
                      const stateName = BRAZIL_STATES.find(s => s.uf === uf)?.name;
                      return <SelectItem key={uf} value={uf}>{stateName ? `${stateName} (${uf})` : uf}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</Label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value={ALL}>Todas as cidades</SelectItem>
                    {extractedCities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</Label>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value={ALL}>Todas as empresas</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fonte</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas as fontes" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value={ALL}>Todas as fontes</SelectItem>
                    {sources.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Termo de busca</Label>
                <Select value={filterSearchTerm} onValueChange={setFilterSearchTerm}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos os termos" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value={ALL}>Todos os termos</SelectItem>
                    {searchTerms.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full gap-1.5">
                  <X className="h-4 w-4" />
                  Limpar todos os filtros
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Active filter badges */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {filterState !== ALL && (
              <Badge variant="secondary" className="gap-1">
                Estado: {BRAZIL_STATES.find(s => s.uf === filterState)?.name || filterState}
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

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filtered.length} vaga{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Table */}
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
              {hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'As vagas aparecerão aqui quando forem importadas via API'}
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
                        {posting.location}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {posting.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {posting.search_term}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(posting.created_at)}
                    </TableCell>
                    <TableCell>
                      <a
                        href={posting.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
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
  );
}
