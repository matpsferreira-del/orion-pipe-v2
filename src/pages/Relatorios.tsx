import { useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { LeadSourceChart } from '@/components/dashboard/LeadSourceChart';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useInvoices } from '@/hooks/useInvoices';
import { useCompanies } from '@/hooks/useCompanies';
import { useProfiles } from '@/hooks/useProfiles';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const pipelineStages = [
  { key: 'lead_identificado', label: 'Lead Identificado' },
  { key: 'contato_inicial', label: 'Contato Inicial' },
  { key: 'diagnostico_spin', label: 'Diagnóstico SPIN' },
  { key: 'proposta_enviada', label: 'Proposta Enviada' },
  { key: 'negociacao', label: 'Negociação' },
  { key: 'fechado_ganhou', label: 'Fechado (Ganhou)' },
];

export default function Relatorios() {
  const { data: opportunities = [], isLoading: loadingOpps } = useOpportunities();
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();
  const { data: profiles = [], isLoading: loadingProfiles } = useProfiles();

  const isLoading = loadingOpps || loadingInvoices || loadingCompanies || loadingProfiles;

  const conversionData = useMemo(() => {
    const stages = ['lead_identificado', 'contato_inicial', 'diagnostico_spin', 'proposta_enviada', 'negociacao', 'fechado_ganhou'];
    
    return stages.slice(0, -1).map((stage, index) => {
      const nextStage = stages[index + 1];
      const currentCount = opportunities.filter(o => {
        const stageIndex = stages.indexOf(o.stage);
        return stageIndex >= index;
      }).length;
      const nextCount = opportunities.filter(o => {
        const stageIndex = stages.indexOf(o.stage);
        return stageIndex >= index + 1;
      }).length;
      
      const stageLabel = pipelineStages.find(s => s.key === stage)?.label || stage;
      
      return {
        name: stageLabel.length > 12 ? `${stageLabel.slice(0, 12)}...` : stageLabel,
        rate: currentCount > 0 ? Math.round((nextCount / currentCount) * 100) : 0,
      };
    });
  }, [opportunities]);

  const performanceData = useMemo(() => {
    return profiles.map(profile => {
      const userOpps = opportunities.filter(o => o.responsavel_id === profile.id);
      const activeOpps = userOpps.filter(o => !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage));
      const wonOpps = userOpps.filter(o => o.stage === 'fechado_ganhou');
      
      return {
        name: profile.name.split(' ')[0],
        ativas: activeOpps.length,
        fechadas: wonOpps.length,
        valor: activeOpps.reduce((sum, o) => sum + Number(o.valor_potencial), 0),
        faturado: wonOpps.reduce((sum, o) => sum + Number(o.valor_potencial), 0),
      };
    }).filter(p => p.ativas > 0 || p.fechadas > 0);
  }, [opportunities, profiles]);

  const topClients = useMemo(() => {
    const clientRevenue = invoices.reduce((acc, inv) => {
      if (inv.status === 'recebido') {
        acc[inv.company_id] = (acc[inv.company_id] || 0) + Number(inv.valor);
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(clientRevenue)
      .map(([companyId, valor]) => ({
        company: companies.find(c => c.id === companyId),
        valor,
      }))
      .filter(c => c.company)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [invoices, companies]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
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
        title="Relatórios"
        description="Análises e métricas do desempenho comercial"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        }
      />

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PipelineChart opportunities={opportunities} />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Taxa de Conversão por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
                {conversionData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhuma oportunidade cadastrada
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={conversionData}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => `${value}%`}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          <LeadSourceChart opportunities={opportunities} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Oportunidades por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhuma oportunidade cadastrada
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="ativas" name="Ativas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="fechadas" name="Fechadas" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Valor em Pipeline por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhuma oportunidade cadastrada
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => formatCurrencyFull(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="valor" name="Em Negociação" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="faturado" name="Faturado" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart invoices={invoices} />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Top 5 Clientes por Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
                {topClients.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    Nenhuma fatura recebida
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Faturado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topClients.map((client, index) => (
                        <TableRow key={client.company?.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{client.company?.nome_fantasia}</TableCell>
                          <TableCell className="text-right font-medium text-success">
                            {formatCurrencyFull(client.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
