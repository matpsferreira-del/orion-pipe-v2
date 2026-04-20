import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinancialTransaction } from '@/hooks/useFinancial';

interface RevenueChartProps {
  transactions: FinancialTransaction[];
}

export function RevenueChart({ transactions = [] }: RevenueChartProps) {
  const data = useMemo(() => {
    // Only positive values (receita)
    const revenueTransactions = (transactions ?? []).filter(t => Number(t.valor) > 0);

    if (revenueTransactions.length === 0) {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months.map(name => ({ name, recebido: 0, pendente: 0 }));
    }

    const dates = revenueTransactions.map(t => new Date(t.data_referencia));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result: { name: string; recebido: number; pendente: number }[] = [];
    
    const startMonth = minDate.getMonth();
    const startYear = minDate.getFullYear();
    const endMonth = maxDate.getMonth();
    const endYear = maxDate.getFullYear();
    
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthTxns = revenueTransactions.filter(t => {
        const d = new Date(t.data_referencia);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      const recebido = monthTxns
        .filter(t => t.status === 'pago')
        .reduce((sum, t) => sum + Number(t.valor), 0);
      
      const pendente = monthTxns
        .filter(t => t.status === 'pendente')
        .reduce((sum, t) => sum + Number(t.valor), 0);
      
      const label = startYear === endYear 
        ? monthNames[currentMonth]
        : `${monthNames[currentMonth]}/${String(currentYear).slice(2)}`;
      
      result.push({ name: label, recebido, pendente });
      
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    return result;
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const hasData = transactions.some(t => Number(t.valor) > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Receita Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum lançamento de receita cadastrado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="recebido"
                name="Recebido"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="pendente"
                name="A Receber"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--warning))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
