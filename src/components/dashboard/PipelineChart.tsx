import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { mockOpportunities, pipelineStages } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PipelineChart() {
  const data = useMemo(() => {
    const activeStages = pipelineStages.filter(s => 
      !['fechado_ganhou', 'fechado_perdeu', 'pos_venda'].includes(s.key)
    );
    
    return activeStages.map(stage => {
      const opportunities = mockOpportunities.filter(o => o.stage === stage.key);
      const totalValue = opportunities.reduce((sum, o) => sum + o.valorPotencial, 0);
      return {
        name: stage.label,
        count: opportunities.length,
        value: totalValue,
        color: stage.color,
      };
    });
  }, []);

  const colors = ['#0ea5e9', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Funil de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tickFormatter={formatCurrency} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => label}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
