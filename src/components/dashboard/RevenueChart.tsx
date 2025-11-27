import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { mockInvoices } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RevenueChart() {
  const data = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'];
    
    return months.map((month, index) => {
      const monthInvoices = mockInvoices.filter(inv => {
        const invoiceMonth = new Date(inv.dataEmissao).getMonth();
        return invoiceMonth === index + 1; // Starting from Feb (index 1)
      });
      
      const received = monthInvoices
        .filter(inv => inv.status === 'recebido')
        .reduce((sum, inv) => sum + inv.valor, 0);
      
      const pending = monthInvoices
        .filter(inv => inv.status === 'a_receber')
        .reduce((sum, inv) => sum + inv.valor, 0);

      // Add some mock data for visualization
      const mockReceived = [0, 15000, 30000, 45000, 60000, 75000, 95000];
      const mockPending = [0, 0, 0, 0, 0, 0, 20000];

      return {
        name: month,
        recebido: mockReceived[index],
        pendente: mockPending[index],
      };
    });
  }, []);

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
        <CardTitle className="text-lg font-semibold">Faturamento Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="recebido"
              name="Recebido"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="pendente"
              name="A Receber"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
