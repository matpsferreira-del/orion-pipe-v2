import { useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialTransactions } from '@/hooks/useFinancial';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['hsl(189, 95%, 38%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(262, 52%, 47%)', 'hsl(210, 40%, 50%)', 'hsl(330, 60%, 50%)', 'hsl(170, 60%, 40%)'];

export function FinancialDashboard({ year }: { year: number }) {
  const { data: transactions = [], isLoading } = useFinancialTransactions(year);

  const now = new Date();
  const currentMonth = now.getMonth();
  const today = now.toISOString().split('T')[0];

  const kpis = useMemo(() => {
    const monthTx = transactions.filter(t => {
      const d = new Date(t.data_referencia);
      return d.getMonth() === currentMonth && d.getFullYear() === year;
    });

    const receita = monthTx.filter(t => t.valor > 0).reduce((s, t) => s + Number(t.valor), 0);
    const despesas = monthTx.filter(t => t.valor < 0).reduce((s, t) => s + Math.abs(Number(t.valor)), 0);
    const resultado = receita - despesas;

    const endOfMonth = new Date(year, currentMonth + 1, 0).toISOString().split('T')[0];
    const aReceber = transactions
      .filter(t => t.status === 'pendente' && t.valor > 0 && t.data_vencimento <= endOfMonth)
      .reduce((s, t) => s + Number(t.valor), 0);

    const emAtraso = transactions
      .filter(t => t.status === 'pendente' && t.data_vencimento < today)
      .reduce((s, t) => s + Math.abs(Number(t.valor)), 0);

    return { receita, despesas, resultado, aReceber, emAtraso };
  }, [transactions, currentMonth, year, today]);

  const barData = useMemo(() => {
    return MONTHS.map((m, i) => {
      const monthTx = transactions.filter(t => new Date(t.data_referencia).getMonth() === i);
      const receita = monthTx.filter(t => t.valor > 0).reduce((s, t) => s + Number(t.valor), 0);
      const despesas = monthTx.filter(t => t.valor < 0).reduce((s, t) => s + Math.abs(Number(t.valor)), 0);
      return { name: m, Receita: receita, Despesas: despesas };
    });
  }, [transactions]);

  const lineData = useMemo(() => {
    let acumulado = 0;
    return MONTHS.map((m, i) => {
      const monthTx = transactions.filter(t => new Date(t.data_referencia).getMonth() === i);
      const resultado = monthTx.reduce((s, t) => s + Number(t.valor), 0);
      acumulado += resultado;
      return { name: m, Acumulado: acumulado };
    });
  }, [transactions]);

  const pieData = useMemo(() => {
    const monthTx = transactions.filter(t => {
      const d = new Date(t.data_referencia);
      return d.getMonth() === currentMonth && t.valor < 0;
    });
    const byPacote: Record<string, number> = {};
    monthTx.forEach(t => {
      byPacote[t.pacote] = (byPacote[t.pacote] || 0) + Math.abs(Number(t.valor));
    });
    return Object.entries(byPacote).map(([name, value]) => ({ name, value }));
  }, [transactions, currentMonth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Receita Bruta" value={formatCurrency(kpis.receita)} icon={TrendingUp} variant="success" />
        <StatCard title="Despesas" value={formatCurrency(kpis.despesas)} icon={TrendingDown} variant="default" />
        <StatCard title="Resultado Líquido" value={formatCurrency(kpis.resultado)} icon={DollarSign} variant={kpis.resultado >= 0 ? 'success' : 'default'} />
        <StatCard title="A Receber" value={formatCurrency(kpis.aReceber)} icon={Clock} variant="warning" />
        <StatCard title="Em Atraso" value={formatCurrency(kpis.emAtraso)} icon={AlertCircle} variant="default" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="Receita" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="Acumulado" stroke="hsl(189, 95%, 38%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas por Pacote — {MONTHS[currentMonth]}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma despesa no mês atual</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
