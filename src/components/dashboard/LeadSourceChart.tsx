import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpportunities } from '@/hooks/useOpportunities';

const sourceLabels: Record<string, string> = {
  indicacao: 'Indicação',
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Evento',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

const COLORS = ['#3b82f6', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#6b7280'];

export function LeadSourceChart() {
  const { data: opportunities = [] } = useOpportunities();

  const data = useMemo(() => {
    const sources = opportunities.reduce((acc, opp) => {
      acc[opp.origem_lead] = (acc[opp.origem_lead] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sources).map(([key, value]) => ({
      name: sourceLabels[key] || key,
      value,
    }));
  }, [opportunities]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Origem dos Leads</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhuma oportunidade cadastrada
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Origem dos Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
      </CardContent>
    </Card>
  );
}
