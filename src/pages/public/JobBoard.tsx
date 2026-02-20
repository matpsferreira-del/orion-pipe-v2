import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Building2, DollarSign, Calendar, ArrowRight, Briefcase, Layers } from 'lucide-react';
import { jobAreaLabels, JobArea } from '@/types/ats';

interface PublicJob {
  id: string;
  title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  deadline: string | null;
  description: string | null;
  slug: string;
  published_at: string | null;
  area: string | null;
  companies: { nome_fantasia: string } | null;
}

function usePublicJobs() {
  return useQuery({
    queryKey: ['public-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, location, salary_min, salary_max, deadline, description, slug, published_at, area, companies(nome_fantasia)')
        .eq('published', true)
        .eq('status', 'open')
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PublicJob[];
    },
  });
}

const ALL_AREAS = 'all';

export default function JobBoard() {
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState(ALL_AREAS);
  const { data: jobs = [], isLoading } = usePublicJobs();

  // Collect only areas present in the job list
  const availableAreas = useMemo(() => {
    const areas = new Set(jobs.map(j => j.area).filter(Boolean) as string[]);
    return Array.from(areas);
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter(j => {
      const matchesSearch = !q ||
        j.title.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.companies?.nome_fantasia.toLowerCase().includes(q);
      const matchesArea = filterArea === ALL_AREAS || j.area === filterArea;
      return matchesSearch && matchesArea;
    });
  }, [jobs, search, filterArea]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Vagas Abertas</h1>
              <p className="text-xs text-muted-foreground">Encontre sua próxima oportunidade</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-primary/5 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Vagas disponíveis para você
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Candidate-se com apenas um formulário. Sua candidatura vai direto para o nosso time de recrutamento.
          </p>

          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-12 h-12 text-base bg-background"
              placeholder="Buscar por cargo, empresa ou cidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Job list */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Area filter chips */}
        {availableAreas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilterArea(ALL_AREAS)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                filterArea === ALL_AREAS
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              Todas as áreas
            </button>
            {availableAreas.map(area => (
              <button
                key={area}
                onClick={() => setFilterArea(area === filterArea ? ALL_AREAS : area)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border flex items-center gap-1.5 ${
                  filterArea === area
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                {jobAreaLabels[area as JobArea] || area}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Briefcase className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {search || filterArea !== ALL_AREAS ? 'Nenhuma vaga encontrada para esse filtro' : 'Nenhuma vaga disponível no momento'}
            </p>
            {(search || filterArea !== ALL_AREAS) && (
              <Button variant="link" onClick={() => { setSearch(''); setFilterArea(ALL_AREAS); }} className="mt-2">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-5">
              {filtered.length} vaga{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-4">
              {filtered.map(job => (
                <Link
                  key={job.id}
                  to={`/vagas/${job.slug}`}
                  className="block group"
                >
                  <div className="border border-border rounded-xl p-5 bg-card hover:border-primary/50 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {job.title}
                          </h3>
                          {job.area && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 flex-shrink-0">
                              {jobAreaLabels[job.area as JobArea] || job.area}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          {job.companies?.nome_fantasia && (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              {job.companies.nome_fantasia}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </span>
                          )}
                          {(job.salary_min || job.salary_max) && (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5" />
                              {job.salary_min && job.salary_max
                                ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`
                                : job.salary_min
                                  ? `A partir de ${formatCurrency(job.salary_min)}`
                                  : `Até ${formatCurrency(job.salary_max!)}`}
                            </span>
                          )}
                          {job.deadline && (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              Até {formatDate(job.deadline)}
                            </span>
                          )}
                        </div>

                        {job.description && (
                          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                            {job.description}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-xs">
                          Ver vaga
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Todas as candidaturas são tratadas com confidencialidade.
        </div>
      </footer>
    </div>
  );
}
