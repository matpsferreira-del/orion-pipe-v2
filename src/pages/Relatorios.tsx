import { useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { LeadSourceChart } from '@/components/dashboard/LeadSourceChart';
import { mockOpportunities, mockInvoices, mockUsers, pipelineStages, getCompanyById } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Download, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Relatorios() {
  const conversionData = useMemo(() => {
    const stages = ['lead_identificado', 'contato_inicial', 'diagnostico_spin', 'proposta_enviada', 'negociacao', 'fechado_ganhou'];
    
    return stages.slice(0, -1).map((stage, index) => {
      const nextStage = stages[index + 1];
      const currentCount = mockOpportunities.filter(o => {
        const stageIndex = stages.indexOf(o.stage);
        return stageIndex >= index;
      }).length;
      const nextCount = mockOpportunities.filter(o => {
        const stageIndex = stages.indexOf(o.stage);
        return stageIndex >= index + 1;
      }).length;
      
      const stageLabel = pipelineStages.find(s => s.key === stage)?.label || stage;
      const nextLabel = pipelineStages.find(s => s.key === nextStage)?.label || nextStage;
      
      return {
        name: `${stageLabel.slice(0, 10)}...`,
        rate: currentCount > 0 ? Math.round((nextCount / currentCount) * 100) : 0,
      };
    });
  }, []);

  const performanceData = useMemo(() => {
    return mockUsers.filter(u => u.role !== 'admin').map(user => {
      const userOpps = mockOpportunities.filter(o => o.responsavelId === user.id);
      const activeOpps = userOpps.filter(o => !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage));
      const wonOpps = userOpps.filter(o => o.stage === 'fechado_ganhou');
      
      return {
        name: user.name.split(' ')[0],
        ativas: activeOpps.length,
        fechadas: wonOpps.length,
        valor: activeOpps.reduce((sum, o) => sum + o.valorPotencial, 0),
        faturado: wonOpps.reduce((sum, o) => sum + o.valorPotencial, 0),
      };
    });
  }, []);

  const topClients = useMemo(() => {
    const clientRevenue = mockInvoices.reduce((acc, inv) => {
      if (inv.status === 'recebido') {
        acc[inv.companyId] = (acc[inv.companyId] || 0) + inv.valor;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(clientRevenue)
      .map(([companyId, valor]) => ({
        company: getCompanyById(companyId),
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, []);

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
            <PipelineChart />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Taxa de Conversão por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
          <LeadSourceChart />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Oportunidades por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Valor em Pipeline por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Top 5 Clientes por Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
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
                        <TableCell>{client.company?.nomeFantasia}</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatCurrencyFull(client.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
