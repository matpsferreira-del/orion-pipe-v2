import { useState, useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialTransactions } from '@/hooks/useFinancial';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CalendarIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['hsl(189, 95%, 38%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(262, 52%, 47%)', 'hsl(210, 40%, 50%)', 'hsl(330, 60%, 50%)', 'hsl(170, 60%, 40%)'];

type FilterMode = 'year' | 'month' | 'range';
type ViewMode = 'competencia' | 'caixa';

export function FinancialDashboard({ year }: { year: number }) {
  const { data: transactions = [], isLoading } = useFinancialTransactions(year);

  const [filterMode, setFilterMode] = useState<FilterMode>('year');
  const [viewMode, setViewMode] = useState<ViewMode>('competencia');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const dateField = viewMode === 'competencia' ? 'data_referencia' : 'data_vencimento';

  const today = new Date().toISOString().split('T')[0];

  // Filter transactions based on selected mode
  const filtered = useMemo(() => {
    if (filterMode === 'year') return transactions;
    if (filterMode === 'month') {
      return transactions.filter(t => {
        const d = new Date(t[dateField]);
        return d.getMonth() === selectedMonth;
      });
    }
    // range
    if (!dateFrom && !dateTo) return transactions;
    return transactions.filter(t => {
      const ref = t[dateField];
      if (dateFrom && ref < dateFrom.toISOString().split('T')[0]) return false;
      if (dateTo && ref > dateTo.toISOString().split('T')[0]) return false;
      return true;
    });
  }, [transactions, filterMode, selectedMonth, dateFrom, dateTo, dateField]);

  const kpis = useMemo(() => {
    const receita = filtered.filter(t => t.valor > 0).reduce((s, t) => s + Number(t.valor), 0);
    const despesas = filtered.filter(t => t.valor < 0).reduce((s, t) => s + Math.abs(Number(t.valor)), 0);
    const resultado = receita - despesas;

    const aReceber = filtered
      .filter(t => t.status === 'pendente' && t.valor > 0)
      .reduce((s, t) => s + Number(t.valor), 0);

    const emAtraso = filtered
      .filter(t => t.status === 'pendente' && t.data_vencimento < today)
      .reduce((s, t) => s + Math.abs(Number(t.valor)), 0);

    return { receita, despesas, resultado, aReceber, emAtraso };
  }, [filtered, today]);

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
    const expenseTx = filtered.filter(t => t.valor < 0);
    const byPacote: Record<string, number> = {};
    expenseTx.forEach(t => {
      byPacote[t.pacote] = (byPacote[t.pacote] || 0) + Math.abs(Number(t.valor));
    });
    return Object.entries(byPacote).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const filterLabel = useMemo(() => {
    if (filterMode === 'year') return `Ano ${year}`;
    if (filterMode === 'month') return `${MONTHS[selectedMonth]} ${year}`;
    if (dateFrom && dateTo) return `${format(dateFrom, 'dd/MM/yy')} — ${format(dateTo, 'dd/MM/yy')}`;
    if (dateFrom) return `A partir de ${format(dateFrom, 'dd/MM/yy')}`;
    if (dateTo) return `Até ${format(dateTo, 'dd/MM/yy')}`;
    return `Ano ${year}`;
  }, [filterMode, year, selectedMonth, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Ano inteiro</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="range">Período</SelectItem>
            </SelectContent>
          </Select>

          {filterMode === 'month' && (
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filterMode === 'range' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">—</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                  Limpar
                </Button>
              )}
            </div>
          )}

          <span className="ml-auto text-sm font-semibold text-foreground">{filterLabel}</span>
        </CardContent>
      </Card>

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
          <CardTitle className="text-base">Despesas por Pacote — {filterLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma despesa no período selecionado</p>
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
