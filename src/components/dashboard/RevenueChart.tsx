import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceRow } from '@/hooks/useInvoices';

interface RevenueChartProps {
  invoices: InvoiceRow[];
}

export function RevenueChart({ invoices }: RevenueChartProps) {
  const data = useMemo(() => {
    if (invoices.length === 0) {
      // Return empty months for current year if no data
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months.map(name => ({ name, recebido: 0, pendente: 0 }));
    }

    // Find the date range from invoices
    const dates = invoices.map(inv => new Date(inv.data_emissao));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Generate months from min to max date (or last 12 months if range is too small)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result: { name: string; recebido: number; pendente: number }[] = [];
    
    // Start from minDate's month/year and go to maxDate's month/year
    const startMonth = minDate.getMonth();
    const startYear = minDate.getFullYear();
    const endMonth = maxDate.getMonth();
    const endYear = maxDate.getFullYear();
    
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthInvoices = invoices.filter(inv => {
        const invoiceDate = new Date(inv.data_emissao);
        return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
      });
      
      const recebido = monthInvoices
        .filter(inv => inv.status === 'recebido')
        .reduce((sum, inv) => sum + Number(inv.valor), 0);
      
      const pendente = monthInvoices
        .filter(inv => inv.status === 'a_receber' || inv.status === 'em_atraso')
        .reduce((sum, inv) => sum + Number(inv.valor), 0);
      
      const label = startYear === endYear 
        ? monthNames[currentMonth]
        : `${monthNames[currentMonth]}/${String(currentYear).slice(2)}`;
      
      result.push({
        name: label,
        recebido,
        pendente,
      });
      
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    
    return result;
  }, [invoices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const hasData = invoices.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Receita Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhuma fatura cadastrada
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
