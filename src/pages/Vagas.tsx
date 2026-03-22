import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Loader2, LayoutGrid, List, Maximize2, Minimize2 } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useCompanies } from '@/hooks/useCompanies';
import { useProfiles } from '@/hooks/useProfiles';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDialog } from '@/components/jobs/JobDialog';
import { JobDetail } from '@/components/jobs/JobDetail';
import { JobStatus, jobStatusLabels } from '@/types/ats';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { JobRow } from '@/hooks/useJobs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';

function useApplicationCounts() {
  return useQuery({
    queryKey: ['application-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_application_counts_by_job');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { job_id: string; count: number }) => {
        counts[row.job_id] = row.count;
      });
      return counts;
    },
  });
}

export default function Vagas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [editingJob, setEditingJob] = useState<JobRow | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: jobs = [], isLoading } = useJobs();
  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();
  const { data: applicationCounts = {} } = useApplicationCounts();

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const company = companies.find(c => c.id === job.company_id);
      const matchesSearch = searchTerm === '' ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company?.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, companies, searchTerm, filterStatus]);

  // Group by status for tabs
  const openJobs = filteredJobs.filter(j => j.status === 'open');
  const draftJobs = filteredJobs.filter(j => j.status === 'draft');
  const pausedJobs = filteredJobs.filter(j => j.status === 'paused');
  const closedJobs = filteredJobs.filter(j => ['filled', 'cancelled'].includes(j.status));

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderJobGrid = (jobsList: JobRow[]) => (
    <div className={viewMode === 'grid'
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      : "flex flex-col gap-2"
    }>
      {jobsList.map((job) => {
        const company = job.company_id ? companies.find(c => c.id === job.company_id) : null;
        const responsavel = profiles.find(p => p.id === job.responsavel_id);
        const displayCompanyName = company?.nome_fantasia || (job.company_id ? undefined : 'Pessoa Física');
          <JobCard
            key={job.id}
            job={job}
            companyName={company?.nome_fantasia}
            responsavelName={responsavel?.name}
            applicationsCount={applicationCounts[job.id] || 0}
            onClick={() => setSelectedJob(job)}
            listMode={viewMode === 'list'}
          />
        );
      })}
      {jobsList.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          Nenhuma vaga encontrada
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <PageHeader
        title="Vagas"
        description="Gerencie suas vagas e processos seletivos"
        actions={
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 sm:mt-6 mb-4">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vagas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(jobStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}
          className="border border-input rounded-md hidden sm:flex"
        >
          <ToggleGroupItem value="grid" aria-label="Visualização em grade" className="h-10 px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Visualização em lista" className="h-10 px-3">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="open" className="flex-1">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="open" className="text-xs sm:text-sm">
            Abertas ({openJobs.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs sm:text-sm">
            Rascunhos ({draftJobs.length})
          </TabsTrigger>
          <TabsTrigger value="paused" className="text-xs sm:text-sm">
            Pausadas ({pausedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-xs sm:text-sm">
            Encerradas ({closedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 flex-1 overflow-auto">
          {renderJobGrid(openJobs)}
        </TabsContent>
        <TabsContent value="draft" className="mt-4 flex-1 overflow-auto">
          {renderJobGrid(draftJobs)}
        </TabsContent>
        <TabsContent value="paused" className="mt-4 flex-1 overflow-auto">
          {renderJobGrid(pausedJobs)}
        </TabsContent>
        <TabsContent value="closed" className="mt-4 flex-1 overflow-auto">
          {renderJobGrid(closedJobs)}
        </TabsContent>
      </Tabs>

      {/* Job Detail Sheet */}
      <Sheet open={!!selectedJob} onOpenChange={() => { setSelectedJob(null); setIsExpanded(false); }}>
        <SheetContent className={`w-full ${isExpanded ? 'sm:max-w-full' : 'sm:max-w-3xl'} overflow-y-auto transition-all duration-300`}>
          <SheetHeader>
            <div className="flex items-center justify-between pr-8">
              <SheetTitle className="text-base sm:text-lg">{selectedJob?.title}</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="hidden sm:flex">
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </SheetHeader>
          {selectedJob && (
            <JobDetail 
              job={selectedJob} 
              onEdit={() => {
                setEditingJob(selectedJob);
                setSelectedJob(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* New/Edit Job Dialog */}
      <JobDialog 
        open={showNewDialog || !!editingJob} 
        onOpenChange={(open) => {
          if (!open) {
            setShowNewDialog(false);
            setEditingJob(null);
          }
        }}
        job={editingJob}
      />
    </div>
  );
}
