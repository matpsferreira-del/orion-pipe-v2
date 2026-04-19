import { useState, useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, CalendarIcon,
  Loader2, ArrowUpRight, ArrowDownRight, Wallet, Zap, Activity, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFinancialTransactions, useChartOfAccounts } from '@/hooks/useFinancial';
import { MONTHS_SHORT, CHART_COLORS } from '@/lib/financial/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent, formatVariation, calcVariation } from '@/lib/financial/formatters';
import {
  calcKPIs, calcBurnAndRunway, buildMonthlySeries, topCategories, forecastNextMonths,
} from '@/lib/financial/calculations';

type FilterMode = 'year' | 'month' | 'range';
type ViewMode = 'competencia' | 'caixa';

export function FinancialDashboard({ year }: { year: number }) {
  const { data: transactions = [], isLoading } = useFinancialTransactions(year);
  const { data: chartAccounts = [] } = useChartOfAccounts();

  const [filterMode, setFilterMode] = useState<FilterMode>('year');
  const [viewMode, setViewMode] = useState<ViewMode>('competencia');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const dateField = viewMode === 'competencia' ? 'data_referencia' : 'data_vencimento';
  const today = new Date().toISOString().split('T')[0];

  // Mapa para classificação por tipo (custo/despesa/dedução)
  const tipoMap = useMemo(() => {
    const m = new Map<string, 'receita' | 'deducao' | 'custo' | 'despesa'>();
    chartAccounts.forEach(a => m.set(`${a.pacote}|${a.conta_contabil}`, a.tipo as any));
    return m;
  }, [chartAccounts]);

  const filtered = useMemo(() => {
    if (filterMode === 'year') return transactions;
    if (filterMode === 'month') {
      return transactions.filter(t => new Date(t[dateField]).getMonth() === selectedMonth);
    }
    if (!dateFrom && !dateTo) return transactions;
    return transactions.filter(t => {
      const ref = t[dateField];
      if (dateFrom && ref < dateFrom.toISOString().split('T')[0]) return false;
      if (dateTo && ref > dateTo.toISOString().split('T')[0]) return false;
      return true;
    });
  }, [transactions, filterMode, selectedMonth, dateFrom, dateTo, dateField]);

  // KPIs principais
  const kpis = useMemo(() => calcKPIs(filtered, tipoMap), [filtered, tipoMap]);

  // Burn rate + runway
  const burnRunway = useMemo(() => calcBurnAndRunway(transactions, 3), [transactions]);

  // Comparativos: mês atual vs anterior
  const comparison = useMemo(() => {
    if (filterMode !== 'month') return null;
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevTx = transactions.filter(t => new Date(t[dateField]).getMonth() === prevMonth);
    const prev = calcKPIs(prevTx, tipoMap);
    return {
      receita: calcVariation(kpis.receita, prev.receita),
      despesas: calcVariation(kpis.despesas, prev.despesas),
      resultado: calcVariation(kpis.resultado, prev.resultado),
    };
  }, [filterMode, selectedMonth, transactions, dateField, kpis, tipoMap]);

  // Séries mensais
  const series = useMemo(() => buildMonthlySeries(transactions, dateField), [transactions, dateField]);

  const barData = useMemo(() =>
    MONTHS_SHORT.map((m, i) => ({
      name: m,
      Receita: series.receita[i],
      Despesas: series.despesas[i],
      Resultado: series.resultado[i],
    })),
    [series]
  );

  // Top categorias
  const topDespesas = useMemo(() => topCategories(filtered, 'despesa', 'pacote', 6), [filtered]);
  const topReceitas = useMemo(() => topCategories(filtered, 'receita', 'conta_contabil', 5), [filtered]);

  // Forecast 6 meses
  const forecast = useMemo(() => forecastNextMonths(transactions, 6), [transactions]);

  // Débito automático: total mensal recorrente
  const debitoAutomaticoStats = useMemo(() => {
    const debAuto = transactions.filter(t => t.debito_automatico && Number(t.valor) < 0);
    const monthlyAvg = debAuto.length > 0 ? debAuto.reduce((s, t) => s + Math.abs(Number(t.valor)), 0) / 12 : 0;
    const upcoming = debAuto.filter(t => t.status === 'pendente' && t.data_vencimento >= today)
      .reduce((s, t) => s + Math.abs(Number(t.valor)), 0);
    return { count: debAuto.length, monthlyAvg, upcoming };
  }, [transactions, today]);

  // Alertas de vencimento próximo (próximos 7 dias)
  const upcomingDue = useMemo(() => {
    const next7 = new Date();
    next7.setDate(next7.getDate() + 7);
    const next7Str = next7.toISOString().split('T')[0];
    return transactions
      .filter(t => t.status === 'pendente' && t.data_vencimento >= today && t.data_vencimento <= next7Str)
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
  }, [transactions, today]);

  const filterLabel = useMemo(() => {
    if (filterMode === 'year') return `Ano ${year}`;
    if (filterMode === 'month') return `${MONTHS_SHORT[selectedMonth]} ${year}`;
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
          <div className="flex items-center rounded-md border border-input overflow-hidden">
            <Button variant={viewMode === 'competencia' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('competencia')}>Competência</Button>
            <Button variant={viewMode === 'caixa' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('caixa')}>Caixa</Button>
          </div>
          <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Ano inteiro</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="range">Período</SelectItem>
            </SelectContent>
          </Select>

          {filterMode === 'month' && (
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_SHORT.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {filterMode === 'range' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Início'}
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
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Limpar</Button>
              )}
            </div>
          )}

          <span className="ml-auto text-sm font-semibold text-foreground">{filterLabel}</span>
        </CardContent>
      </Card>

      {/* KPIs Linha 1: Resultado */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard title="Receita Bruta" value={kpis.receita} icon={TrendingUp} variant="success" variation={comparison?.receita} />
        <KPICard title="Despesas Totais" value={kpis.despesas + kpis.custos} icon={TrendingDown} variant="default" variation={comparison?.despesas} />
        <KPICard title="Resultado Líquido" value={kpis.resultado} icon={DollarSign} variant={kpis.resultado >= 0 ? 'success' : 'default'} variation={comparison?.resultado} />
        <KPICard title="Margem Bruta" value={kpis.margemBruta} icon={Activity} variant="primary" isPercent />
        <KPICard title="Margem Líquida" value={kpis.margemLiquida} icon={Target} variant="primary" isPercent />
      </div>

      {/* KPIs Linha 2: Caixa & Runway */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard title="Caixa atual" value={burnRunway.cashOnHand} icon={Wallet} variant={burnRunway.cashOnHand >= 0 ? 'success' : 'default'} />
        <KPICard title="Burn rate (mês)" value={burnRunway.burnRate} icon={TrendingDown} variant="warning" />
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Runway</div>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className={cn(
              'text-2xl font-bold',
              burnRunway.runwayMonths === Infinity ? 'text-success' :
              burnRunway.runwayMonths < 3 ? 'text-destructive' :
              burnRunway.runwayMonths < 6 ? 'text-warning' : 'text-success'
            )}>
              {burnRunway.runwayMonths === Infinity ? '∞' : `${burnRunway.runwayMonths.toFixed(1)} m`}
            </div>
          </CardContent>
        </Card>
        <KPICard title="A Receber" value={kpis.aReceber} icon={Clock} variant="warning" />
        <KPICard title="Em Atraso" value={kpis.emAtraso} icon={AlertCircle} variant="default" />
      </div>

      {/* Débito automático + alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Débitos Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Lançamentos</div>
                <div className="text-xl font-bold">{debitoAutomaticoStats.count}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Média mensal</div>
                <div className="text-xl font-bold text-warning">{formatCurrencyCompact(debitoAutomaticoStats.monthlyAvg)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">A vencer (déb. auto)</div>
                <div className="text-xl font-bold text-primary">{formatCurrencyCompact(debitoAutomaticoStats.upcoming)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" /> Próximos Vencimentos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum vencimento próximo. ✓</p>
            ) : (
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {upcomingDue.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {t.debito_automatico && <Zap className="h-3 w-3 text-primary flex-shrink-0" />}
                      <span className="truncate">{t.descricao || t.conta_contabil}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">{format(new Date(t.data_vencimento + 'T00:00:00'), 'dd/MM')}</Badge>
                      <span className={cn('font-medium tabular-nums', Number(t.valor) < 0 ? 'text-destructive' : 'text-success')}>
                        {formatCurrency(Math.abs(Number(t.valor)))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Receita vs Despesas (mensal)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Receita" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Resultado" stroke="hsl(189, 95%, 38%)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resultado Acumulado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MONTHS_SHORT.map((m, i) => ({ name: m, Acumulado: series.acumulado[i] }))}>
                <defs>
                  <linearGradient id="colorAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(189, 95%, 38%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(189, 95%, 38%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="Acumulado" stroke="hsl(189, 95%, 38%)" strokeWidth={2} fill="url(#colorAcum)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Despesas por Pacote — {filterLabel}</CardTitle></CardHeader>
          <CardContent>
            {topDespesas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma despesa no período</p>
            ) : (
              <div className="space-y-2">
                {topDespesas.map((cat, i) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatPercent(cat.pct)}</span>
                        <span className="font-bold tabular-nums">{formatCurrency(cat.value)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${cat.pct * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição de Despesas</CardTitle></CardHeader>
          <CardContent>
            {topDespesas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={topDespesas} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, pct }) => `${name} ${(pct * 100).toFixed(0)}%`}>
                    {topDespesas.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top receitas */}
      {topReceitas.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Receitas por Conta — {filterLabel}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {topReceitas.map((cat, i) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{cat.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{formatPercent(cat.pct)}</span>
                      <span className="font-bold tabular-nums text-success">{formatCurrency(cat.value)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: `${cat.pct * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Projeção Próximos 6 Meses
          </CardTitle>
          <p className="text-xs text-muted-foreground">Baseada na média dos últimos 3 meses + lançamentos recorrentes</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="receitaPrevista" name="Receita prevista" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
              <Bar dataKey="despesaPrevista" name="Despesa prevista" fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
              <Line type="monotone" dataKey="resultado" name="Resultado projetado" stroke="hsl(189, 95%, 38%)" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({
  title, value, icon: Icon, variant, variation, isPercent,
}: {
  title: string;
  value: number;
  icon: any;
  variant: 'success' | 'warning' | 'default' | 'primary';
  variation?: number;
  isPercent?: boolean;
}) {
  const colorClass = {
    success: 'text-success',
    warning: 'text-warning',
    default: 'text-destructive',
    primary: 'text-primary',
  }[variant];

  const formatted = isPercent ? formatPercent(value) : formatCurrencyCompact(value);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{title}</div>
          <Icon className={cn('h-4 w-4', colorClass)} />
        </div>
        <div className={cn('text-2xl font-bold', colorClass)}>{formatted}</div>
        {variation !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium mt-1',
            variation > 0 ? 'text-success' : variation < 0 ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {variation > 0 ? <ArrowUpRight className="h-3 w-3" /> : variation < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
            {formatVariation(variation)} vs mês anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}
