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
import { Target, TrendingUp, DollarSign, Building2, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

export default function Dashboard() {
  const { data: opportunities = [], isLoading: loadingOpps } = useOpportunities();
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();

  const isLoading = loadingOpps || loadingInvoices || loadingCompanies;

  const stats = useMemo(() => {
    const activeOpps = opportunities.filter(o => 
      !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage)
    );
    const wonOpps = opportunities.filter(o => o.stage === 'fechado_ganhou');
    const totalPipeline = activeOpps.reduce((sum, o) => sum + Number(o.valor_potencial), 0);
    const wonValue = wonOpps.reduce((sum, o) => sum + Number(o.valor_potencial), 0);
    
    const receivedInvoices = invoices.filter(i => i.status === 'recebido');
    const totalRevenue = receivedInvoices.reduce((sum, i) => sum + Number(i.valor), 0);
    
    const pendingInvoices = invoices.filter(i => i.status === 'a_receber');
    const pendingValue = pendingInvoices.reduce((sum, i) => sum + Number(i.valor), 0);

    const activeClients = companies.filter(c => c.status === 'cliente_ativo').length;

    return {
      activeOpportunities: activeOpps.length,
      totalPipeline,
      wonDeals: wonOpps.length,
      wonValue,
      totalRevenue,
      pendingValue,
      activeClients,
      conversionRate: opportunities.length > 0 ? Math.round((wonOpps.length / opportunities.length) * 100) : 0,
    };
  }, [opportunities, invoices, companies]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

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
        title="Dashboard"
        description="Visão geral do desempenho comercial"
      />

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
          subtitle={`${companies.length} empresas cadastradas`}
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
        <PipelineChart />
        <RevenueChart />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LeadSourceChart />
        <RecentActivities />
        <TasksList />
      </div>
    </div>
  );
}
