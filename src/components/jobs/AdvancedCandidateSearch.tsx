import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronUp, X, SlidersHorizontal, Star } from 'lucide-react';
import { ApplicationWithRelations } from '@/types/ats';

export interface AdvancedFilters {
  booleanQuery: string;
  cargo: string;
  empresa: string;
  localidade: string;
  salaryMin: string;
  salaryMax: string;
  source: string;
  minRating: string;
  tags: string[];
}

export const emptyFilters: AdvancedFilters = {
  booleanQuery: '',
  cargo: '',
  empresa: '',
  localidade: '',
  salaryMin: '',
  salaryMax: '',
  source: '',
  minRating: '',
  tags: [],
};

interface AdvancedCandidateSearchProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  applications: ApplicationWithRelations[];
  activeFilterCount: number;
}

export function AdvancedCandidateSearch({
  filters,
  onFiltersChange,
  applications,
  activeFilterCount,
}: AdvancedCandidateSearchProps) {
  const [open, setOpen] = useState(false);

  // Derive dynamic options from applications
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => {
      const p = a._party;
      if (p?.city) set.add(p.city);
      if (p?.state) set.add(p.state);
      if (p?.city && p?.state) set.add(`${p.city}, ${p.state}`);
    });
    return Array.from(set).sort();
  }, [applications]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => {
      const tags = (a._party as any)?.tags;
      if (Array.isArray(tags)) tags.forEach((t: string) => set.add(t));
    });
    return Array.from(set).sort();
  }, [applications]);

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => { if (a.source) set.add(a.source); });
    return Array.from(set).sort();
  }, [applications]);

  const update = useCallback((field: keyof AdvancedFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value });
  }, [filters, onFiltersChange]);

  const handleClear = useCallback(() => {
    onFiltersChange(emptyFilters);
  }, [onFiltersChange]);

  const handleToggleTag = useCallback((tag: string) => {
    const current = filters.tags;
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    update('tags', next);
  }, [filters.tags, update]);

  const removeFilter = useCallback((field: keyof AdvancedFilters) => {
    if (field === 'tags') {
      update('tags', []);
    } else {
      update(field, '');
    }
  }, [update]);

  const sourceLabels: Record<string, string> = {
    manual: 'Manual',
    referral: 'Indicação',
    linkedin: 'LinkedIn',
    website: 'Site',
    hunting: 'Hunting',
    other: 'Outro',
  };

  // Active filter badges
  const activeBadges: { key: keyof AdvancedFilters; label: string }[] = [];
  if (filters.cargo) activeBadges.push({ key: 'cargo', label: `Cargo: ${filters.cargo}` });
  if (filters.empresa) activeBadges.push({ key: 'empresa', label: `Empresa: ${filters.empresa}` });
  if (filters.localidade) activeBadges.push({ key: 'localidade', label: `Local: ${filters.localidade}` });
  if (filters.salaryMin || filters.salaryMax) {
    const parts = [];
    if (filters.salaryMin) parts.push(`min R$${filters.salaryMin}`);
    if (filters.salaryMax) parts.push(`max R$${filters.salaryMax}`);
    activeBadges.push({ key: 'salaryMin', label: `Salário: ${parts.join(' - ')}` });
  }
  if (filters.source) activeBadges.push({ key: 'source', label: `Fonte: ${sourceLabels[filters.source] || filters.source}` });
  if (filters.minRating) activeBadges.push({ key: 'minRating', label: `Rating ≥ ${filters.minRating}` });
  if (filters.tags.length) activeBadges.push({ key: 'tags', label: `Tags: ${filters.tags.join(', ')}` });

  return (
    <div className="space-y-3">
      {/* Boolean search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder='Busca booleana: ex. "gerente AND (São Paulo OR Curitiba)"'
            value={filters.booleanQuery}
            onChange={(e) => update('booleanQuery', e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 relative">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="default" className="h-5 w-5 p-0 text-[10px] flex items-center justify-center rounded-full ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Active filter badges */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeBadges.map(b => (
            <Badge key={b.key} variant="secondary" className="gap-1 text-xs">
              {b.label}
              <button onClick={() => removeFilter(b.key)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleClear}>
            Limpar tudo
          </Button>
        </div>
      )}

      {/* Collapsible structured filters */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border border-border bg-muted/30">
            {/* Cargo */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cargo</label>
              <Input
                placeholder="Ex: Gerente, Diretor"
                value={filters.cargo}
                onChange={(e) => update('cargo', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Empresa */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Empresa</label>
              <Input
                placeholder="Ex: Google, Meta"
                value={filters.empresa}
                onChange={(e) => update('empresa', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Localidade */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Localidade</label>
              <Select value={filters.localidade || '_all'} onValueChange={(v) => update('localidade', v === '_all' ? '' : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {locationOptions.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fonte</label>
              <Select value={filters.source || '_all'} onValueChange={(v) => update('source', v === '_all' ? '' : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  {sourceOptions.map(s => (
                    <SelectItem key={s} value={s}>{sourceLabels[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Pretensão mín (R$)</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.salaryMin}
                onChange={(e) => update('salaryMin', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Pretensão máx (R$)</label>
              <Input
                type="number"
                placeholder="50000"
                value={filters.salaryMax}
                onChange={(e) => update('salaryMax', e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Rating */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rating mínimo</label>
              <Select value={filters.minRating || '_all'} onValueChange={(v) => update('minRating', v === '_all' ? '' : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  {[1, 2, 3, 4, 5].map(r => (
                    <SelectItem key={r} value={String(r)}>
                      <span className="flex items-center gap-1">
                        {r} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            {tagOptions.length > 0 && (
              <div className="space-y-1 col-span-full">
                <label className="text-xs font-medium text-muted-foreground">Tags / Competências</label>
                <div className="flex flex-wrap gap-1.5">
                  {tagOptions.map(tag => (
                    <Badge
                      key={tag}
                      variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => handleToggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
