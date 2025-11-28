import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpportunities } from '@/hooks/useOpportunities';

const pipelineStages = [
  { key: 'lead_identificado', label: 'Lead Identificado', color: '#6b7280' },
  { key: 'contato_inicial', label: 'Contato Inicial', color: '#3b82f6' },
  { key: 'diagnostico_spin', label: 'Diagnóstico SPIN', color: '#8b5cf6' },
  { key: 'proposta_enviada', label: 'Proposta Enviada', color: '#f59e0b' },
  { key: 'negociacao', label: 'Negociação', color: '#0ea5e9' },
];

export function PipelineChart() {
  const { data: opportunities = [] } = useOpportunities();

  const data = useMemo(() => {
    return pipelineStages.map(stage => {
      const stageOpps = opportunities.filter(o => o.stage === stage.key);
      return {
        name: stage.label,
        count: stageOpps.length,
        value: stageOpps.reduce((sum, o) => sum + Number(o.valor_potencial), 0),
        color: stage.color,
      };
    });
  }, [opportunities]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Pipeline de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <XAxis 
              type="number" 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
