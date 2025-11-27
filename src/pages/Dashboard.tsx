import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { LeadSourceChart } from '@/components/dashboard/LeadSourceChart';
import { RecentActivities } from '@/components/dashboard/RecentActivities';
import { TasksList } from '@/components/dashboard/TasksList';
import { mockOpportunities, mockInvoices, mockCompanies } from '@/data/mockData';
import { Target, TrendingUp, DollarSign, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

export default function Dashboard() {
  const stats = useMemo(() => {
    const activeOpps = mockOpportunities.filter(o => 
      !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage)
    );
    const wonOpps = mockOpportunities.filter(o => o.stage === 'fechado_ganhou');
    const totalPipeline = activeOpps.reduce((sum, o) => sum + o.valorPotencial, 0);
    const wonValue = wonOpps.reduce((sum, o) => sum + o.valorPotencial, 0);
    
    const receivedInvoices = mockInvoices.filter(i => i.status === 'recebido');
    const totalRevenue = receivedInvoices.reduce((sum, i) => sum + i.valor, 0);
    
    const pendingInvoices = mockInvoices.filter(i => i.status === 'a_receber');
    const pendingValue = pendingInvoices.reduce((sum, i) => sum + i.valor, 0);

    const activeClients = mockCompanies.filter(c => c.status === 'cliente_ativo').length;

    return {
      activeOpportunities: activeOpps.length,
      totalPipeline,
      wonDeals: wonOpps.length,
      wonValue,
      totalRevenue,
      pendingValue,
      activeClients,
      conversionRate: Math.round((wonOpps.length / mockOpportunities.length) * 100),
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

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
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Pipeline Total"
          value={formatCurrency(stats.totalPipeline)}
          icon={TrendingUp}
          variant="accent"
          subtitle={`${stats.wonDeals} negócios fechados`}
        />
        <StatCard
          title="Faturado (2024)"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          variant="success"
          trend={{ value: 23, isPositive: true }}
        />
        <StatCard
          title="Clientes Ativos"
          value={stats.activeClients}
          icon={Building2}
          variant="warning"
          subtitle={`${mockCompanies.length} empresas cadastradas`}
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
