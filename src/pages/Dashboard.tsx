import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { LeadSourceChart } from '@/components/dashboard/LeadSourceChart';
import { RecentActivities } from '@/components/dashboard/RecentActivities';
import { TasksList } from '@/components/dashboard/TasksList';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useInvoices } from '@/hooks/useInvoices';
import { useCompanies } from '@/hooks/useCompanies';
import { useProfiles } from '@/hooks/useProfiles';
import { useActivities } from '@/hooks/useActivities';
import { usePendingTasks } from '@/hooks/useTasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, TrendingUp, DollarSign, Building2, Clock, CheckCircle2, Loader2, Users } from 'lucide-react';

export default function Dashboard() {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  
  const { data: opportunities = [], isLoading: loadingOpps } = useOpportunities();
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();
  const { data: profiles = [], isLoading: loadingProfiles } = useProfiles();
  const { data: activities = [], isLoading: loadingActivities } = useActivities();
  const { data: tasks = [], isLoading: loadingTasks } = usePendingTasks();

  const isLoading = loadingOpps || loadingInvoices || loadingCompanies || loadingProfiles || loadingActivities || loadingTasks;

  // Filter data by selected team member
  const filteredData = useMemo(() => {
    if (selectedMemberId === 'all') {
      return {
        opportunities,
        invoices,
        companies,
        activities,
        tasks,
      };
    }

    const filteredOpps = opportunities.filter(o => o.responsavel_id === selectedMemberId);
    const filteredOppIds = new Set(filteredOpps.map(o => o.id));
    
    // Filter invoices by opportunities that belong to the selected member
    const filteredInvoices = invoices.filter(inv => 
      inv.opportunity_id && filteredOppIds.has(inv.opportunity_id)
    );
    
    // Filter companies by responsavel_id
    const filteredCompanies = companies.filter(c => c.responsavel_id === selectedMemberId);
    
    // Filter activities by user_id (the person who created the activity)
    const filteredActivities = activities.filter(a => a.user_id === selectedMemberId);
    
    // Filter tasks by responsavel_id
    const filteredTasks = tasks.filter(t => t.responsavel_id === selectedMemberId);

    return {
      opportunities: filteredOpps,
      invoices: filteredInvoices,
      companies: filteredCompanies,
      activities: filteredActivities,
      tasks: filteredTasks,
    };
  }, [selectedMemberId, opportunities, invoices, companies, activities, tasks]);

  const stats = useMemo(() => {
    const { opportunities: opps, invoices: invs, companies: comps } = filteredData;
    
    const activeOpps = opps.filter(o => 
      !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage)
    );
    const wonOpps = opps.filter(o => o.stage === 'fechado_ganhou');
    const totalPipeline = activeOpps.reduce((sum, o) => sum + Number(o.valor_potencial), 0);
    const wonValue = wonOpps.reduce((sum, o) => sum + Number(o.valor_potencial), 0);
    
    const receivedInvoices = invs.filter(i => i.status === 'recebido');
    const totalRevenue = receivedInvoices.reduce((sum, i) => sum + Number(i.valor), 0);
    
    const pendingInvoices = invs.filter(i => i.status === 'a_receber');
    const pendingValue = pendingInvoices.reduce((sum, i) => sum + Number(i.valor), 0);

    const activeClients = comps.filter(c => c.status === 'cliente_ativo').length;

    return {
      activeOpportunities: activeOpps.length,
      totalPipeline,
      wonDeals: wonOpps.length,
      wonValue,
      totalRevenue,
      pendingValue,
      activeClients,
      conversionRate: opps.length > 0 ? Math.round((wonOpps.length / opps.length) * 100) : 0,
      totalCompanies: comps.length,
    };
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const selectedMemberName = useMemo(() => {
    if (selectedMemberId === 'all') return 'Toda Equipe';
    const profile = profiles.find(p => p.id === selectedMemberId);
    return profile?.name || 'Membro';
  }, [selectedMemberId, profiles]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Dashboard"
          description={`Visão geral do desempenho comercial - ${selectedMemberName}`}
        />
        
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por membro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda Equipe</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Oportunidades Ativas"
          value={stats.activeOpportunities}
          icon={Target}
          variant="primary"
        />
        <StatCard
          title="Pipeline Total"
          value={formatCurrency(stats.totalPipeline)}
          icon={TrendingUp}
          variant="accent"
          subtitle={`${stats.wonDeals} negócios fechados`}
        />
        <StatCard
          title="Faturado"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Clientes Ativos"
          value={stats.activeClients}
          icon={Building2}
          variant="warning"
          subtitle={`${stats.totalCompanies} empresas cadastradas`}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Taxa de Conversão"
          value={`${stats.conversionRate}%`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="A Receber"
          value={formatCurrency(stats.pendingValue)}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(stats.wonValue / (stats.wonDeals || 1))}
          icon={DollarSign}
          variant="primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart opportunities={filteredData.opportunities} />
        <RevenueChart invoices={filteredData.invoices} />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LeadSourceChart opportunities={filteredData.opportunities} />
        <RecentActivities activities={filteredData.activities} profiles={profiles} companies={companies} />
        <TasksList tasks={filteredData.tasks} profiles={profiles} companies={companies} />
      </div>
    </div>
  );
}
