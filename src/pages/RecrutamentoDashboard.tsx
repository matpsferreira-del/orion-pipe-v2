import { useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useJobs } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import { useParties } from '@/hooks/useParties';
import { jobStatusLabels, jobStatusColors, sourceLabels, applicationStatusLabels } from '@/types/ats';
import type { JobStatus, ApplicationSource, ApplicationStatus } from '@/types/ats';
import {
  Briefcase, Users, UserCheck, UserX, Clock, TrendingUp, Loader2, Globe,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  open: '#22c55e',
  paused: '#f59e0b',
  filled: '#3b82f6',
  cancelled: '#ef4444',
};

const SOURCE_COLORS: Record<string, string> = {
  manual: '#6366f1',
  referral: '#8b5cf6',
  linkedin: '#0ea5e9',
  website: '#22c55e',
  hunting: '#f59e0b',
  other: '#6b7280',
};

const APP_STATUS_COLORS: Record<string, string> = {
  new: '#6b7280',
  screening: '#8b5cf6',
  interviewing: '#3b82f6',
  offer: '#f59e0b',
  hired: '#22c55e',
  rejected: '#ef4444',
  withdrawn: '#9ca3af',
};

export default function RecrutamentoDashboard() {
  const { data: jobs = [], isLoading: loadingJobs } = useJobs();
  const { data: applications = [], isLoading: loadingApps } = useApplications();
  const { data: parties = [], isLoading: loadingParties } = useParties();

  const isLoading = loadingJobs || loadingApps || loadingParties;

  const stats = useMemo(() => {
    const openJobs = jobs.filter(j => j.status === 'open');
    const filledJobs = jobs.filter(j => j.status === 'filled');
    const publishedJobs = jobs.filter(j => (j as any).published);
    const hiredApps = applications.filter(a => a.status === 'hired');
    const rejectedApps = applications.filter(a => a.status === 'rejected');
    const activeApps = applications.filter(a => !['hired', 'rejected', 'withdrawn'].includes(a.status));

    // Average time to fill (days between job created_at and filled_at)
    const filledWithDates = filledJobs.filter(j => j.filled_at);
    const avgTimeToFill = filledWithDates.length > 0
      ? Math.round(filledWithDates.reduce((sum, j) => {
          const created = new Date(j.created_at).getTime();
          const filled = new Date(j.filled_at!).getTime();
          return sum + (filled - created) / (1000 * 60 * 60 * 24);
        }, 0) / filledWithDates.length)
      : 0;

    return {
      totalJobs: jobs.length,
      openJobs: openJobs.length,
      filledJobs: filledJobs.length,
      publishedJobs: publishedJobs.length,
      totalCandidates: applications.length,
      activeCandidates: activeApps.length,
      hiredCount: hiredApps.length,
      rejectedCount: rejectedApps.length,
      avgTimeToFill,
      talentPool: parties.length,
      hiringRate: applications.length > 0 ? Math.round((hiredApps.length / applications.length) * 100) : 0,
    };
  }, [jobs, applications, parties]);

  // Jobs by status chart
  const jobsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      counts[j.status] = (counts[j.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: jobStatusLabels[status as JobStatus] || status,
      value: count,
      color: STATUS_COLORS[status] || '#6b7280',
    }));
  }, [jobs]);

  // Applications by source chart
  const appsBySource = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach(a => {
      counts[a.source] = (counts[a.source] || 0) + 1;
    });
    return Object.entries(counts).map(([source, count]) => ({
      name: sourceLabels[source as ApplicationSource] || source,
      value: count,
      color: SOURCE_COLORS[source] || '#6b7280',
    }));
  }, [applications]);

  // Applications by status (funnel)
  const appsByStatus = useMemo(() => {
    const statusOrder: ApplicationStatus[] = ['new', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'];
    const counts: Record<string, number> = {};
    applications.forEach(a => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return statusOrder
      .filter(s => counts[s])
      .map(status => ({
        name: applicationStatusLabels[status],
        count: counts[status] || 0,
        color: APP_STATUS_COLORS[status] || '#6b7280',
      }));
  }, [applications]);

  // Top jobs by applications count
  const topJobs = useMemo(() => {
    const jobAppCounts: Record<string, number> = {};
    applications.forEach(a => {
      jobAppCounts[a.job_id] = (jobAppCounts[a.job_id] || 0) + 1;
    });
    return Object.entries(jobAppCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([jobId, count]) => {
        const job = jobs.find(j => j.id === jobId);
        return {
          title: job?.title || 'Vaga desconhecida',
          count,
          status: job?.status || 'draft',
        };
      });
  }, [jobs, applications]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard de Recrutamento"
        description="Visão geral dos indicadores de recrutamento e seleção"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Vagas Abertas"
          value={stats.openJobs}
          icon={Briefcase}
          variant="primary"
          subtitle={`${stats.totalJobs} vagas no total`}
        />
        <StatCard
          title="Candidatos em Pipeline"
          value={stats.activeCandidates}
          icon={Users}
          variant="accent"
          subtitle={`${stats.totalCandidates} candidaturas totais`}
        />
        <StatCard
          title="Contratados"
          value={stats.hiredCount}
          icon={UserCheck}
          variant="success"
          subtitle={`Taxa: ${stats.hiringRate}%`}
        />
        <StatCard
          title="Tempo Médio p/ Preencher"
          value={stats.avgTimeToFill > 0 ? `${stats.avgTimeToFill} dias` : '—'}
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Vagas Publicadas"
          value={stats.publishedJobs}
          icon={Globe}
          variant="primary"
        />
        <StatCard
          title="Banco de Talentos"
          value={stats.talentPool}
          icon={Users}
          variant="accent"
          subtitle="Pessoas cadastradas"
        />
        <StatCard
          title="Vagas Preenchidas"
          value={stats.filledJobs}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel: Applications by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Funil de Candidatos</CardTitle>
          </CardHeader>
          <CardContent>
            {appsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={appsByStatus} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {appsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma candidatura registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Applications by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Origem dos Candidatos</CardTitle>
          </CardHeader>
          <CardContent>
            {appsBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={appsBySource}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {appsBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma candidatura registrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Vagas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={jobsByStatus}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {jobsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma vaga cadastrada</p>
            )}
          </CardContent>
        </Card>

        {/* Top jobs by applications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Vagas com Mais Candidatos</CardTitle>
          </CardHeader>
          <CardContent>
            {topJobs.length > 0 ? (
              <div className="space-y-3">
                {topJobs.map((job, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <Badge variant="outline" className={cn('text-xs mt-1', jobStatusColors[job.status as JobStatus])}>
                        {jobStatusLabels[job.status as JobStatus]}
                      </Badge>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-semibold">{job.count}</p>
                      <p className="text-xs text-muted-foreground">candidatos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhuma candidatura registrada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
