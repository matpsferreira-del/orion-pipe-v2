import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { mockOpportunities } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadSource } from '@/types/crm';

const sourceLabels: Record<LeadSource, string> = {
  indicacao: 'Indicação',
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Evento',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

const COLORS = ['#3b82f6', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#6b7280'];

export function LeadSourceChart() {
  const data = useMemo(() => {
    const sources = mockOpportunities.reduce((acc, opp) => {
      acc[opp.origemLead] = (acc[opp.origemLead] || 0) + 1;
      return acc;
    }, {} as Record<LeadSource, number>);

    return Object.entries(sources).map(([key, value]) => ({
      name: sourceLabels[key as LeadSource],
      value,
    }));
  }, []);

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
