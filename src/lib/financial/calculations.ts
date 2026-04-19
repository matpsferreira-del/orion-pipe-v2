// Cálculos financeiros centralizados (reutilizados em Dashboard / DRE / Fluxo)
import type { FinancialTransaction } from '@/hooks/useFinancial';

export const sumArray = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

export const addArrays = (...arrays: number[][]): number[] => {
  if (arrays.length === 0) return Array(12).fill(0);
  return Array(12).fill(0).map((_, i) => arrays.reduce((s, a) => s + (a[i] || 0), 0));
};

export interface MonthlyKPIs {
  receita: number;
  despesas: number;
  custos: number;
  deducoes: number;
  resultado: number;
  aReceber: number;
  emAtraso: number;
  aPagar: number;
  margemBruta: number;
  margemLiquida: number;
}

/**
 * Calcula KPIs de um conjunto de transações.
 * Receita: valor > 0 (lançamentos positivos)
 * Despesas/Custos/Deduções: valor < 0 (negativos), separados por pacote/conta
 */
export function calcKPIs(
  transactions: FinancialTransaction[],
  classifyByTipo?: Map<string, 'receita' | 'deducao' | 'custo' | 'despesa'>,
): MonthlyKPIs {
  const today = new Date().toISOString().split('T')[0];
  let receita = 0;
  let despesas = 0;
  let custos = 0;
  let deducoes = 0;
  let aReceber = 0;
  let aPagar = 0;
  let emAtraso = 0;

  for (const t of transactions) {
    const valor = Number(t.valor);
    const absVal = Math.abs(valor);

    if (valor > 0) {
      receita += valor;
      if (t.status === 'pendente') aReceber += valor;
    } else if (valor < 0) {
      // Classifica por tipo se disponível, senão tudo é despesa
      const tipo = classifyByTipo?.get(`${t.pacote}|${t.conta_contabil}`) ?? 'despesa';
      if (tipo === 'custo') custos += absVal;
      else if (tipo === 'deducao') deducoes += absVal;
      else despesas += absVal;

      if (t.status === 'pendente') aPagar += absVal;
    }

    if (t.status === 'pendente' && t.data_vencimento < today) {
      emAtraso += absVal;
    }
  }

  const receitaLiq = receita - deducoes;
  const lucroBruto = receitaLiq - custos;
  const resultado = lucroBruto - despesas;
  const margemBruta = receitaLiq > 0 ? lucroBruto / receitaLiq : 0;
  const margemLiquida = receitaLiq > 0 ? resultado / receitaLiq : 0;

  return {
    receita,
    despesas,
    custos,
    deducoes,
    resultado,
    aReceber,
    emAtraso,
    aPagar,
    margemBruta,
    margemLiquida,
  };
}

/**
 * Burn rate: média de despesas + custos dos últimos N meses (apenas meses com gasto > 0).
 * Runway: caixa atual / burn rate (em meses).
 */
export function calcBurnAndRunway(
  transactions: FinancialTransaction[],
  monthsBack: number = 3,
): { burnRate: number; cashOnHand: number; runwayMonths: number } {
  const now = new Date();
  const monthlyBurn: number[] = [];
  let cashOnHand = 0;

  // Caixa = todas receitas pagas - todas despesas pagas (acumulado histórico)
  for (const t of transactions) {
    if (t.status === 'pago') {
      cashOnHand += Number(t.valor);
    }
  }

  for (let i = 0; i < monthsBack; i++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthBurn = transactions
      .filter(t => {
        const d = new Date(t.data_referencia);
        return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && Number(t.valor) < 0;
      })
      .reduce((s, t) => s + Math.abs(Number(t.valor)), 0);
    if (monthBurn > 0) monthlyBurn.push(monthBurn);
  }

  const burnRate = monthlyBurn.length > 0 ? sumArray(monthlyBurn) / monthlyBurn.length : 0;
  const runwayMonths = burnRate > 0 ? cashOnHand / burnRate : Infinity;

  return { burnRate, cashOnHand, runwayMonths };
}

/**
 * Constrói série mensal de receita/despesa para gráficos.
 */
export function buildMonthlySeries(
  transactions: FinancialTransaction[],
  dateField: 'data_referencia' | 'data_vencimento' = 'data_referencia',
): { receita: number[]; despesas: number[]; resultado: number[]; acumulado: number[] } {
  const receita = Array(12).fill(0);
  const despesas = Array(12).fill(0);

  for (const t of transactions) {
    const month = new Date(t[dateField]).getMonth();
    const valor = Number(t.valor);
    if (valor > 0) receita[month] += valor;
    else despesas[month] += Math.abs(valor);
  }

  const resultado = receita.map((r, i) => r - despesas[i]);
  let acum = 0;
  const acumulado = resultado.map(r => (acum += r));

  return { receita, despesas, resultado, acumulado };
}

/**
 * Top N categorias (pacotes ou contas) por valor.
 */
export function topCategories(
  transactions: FinancialTransaction[],
  type: 'receita' | 'despesa',
  groupBy: 'pacote' | 'conta_contabil' = 'pacote',
  topN: number = 5,
): Array<{ name: string; value: number; pct: number }> {
  const filtered = transactions.filter(t =>
    type === 'receita' ? Number(t.valor) > 0 : Number(t.valor) < 0,
  );

  const totals: Record<string, number> = {};
  for (const t of filtered) {
    const key = t[groupBy];
    totals[key] = (totals[key] || 0) + Math.abs(Number(t.valor));
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value, pct: grandTotal > 0 ? value / grandTotal : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/**
 * Forecast simples: projeta os próximos N meses baseado em recorrências cadastradas
 * + média móvel das despesas dos últimos meses.
 */
export function forecastNextMonths(
  transactions: FinancialTransaction[],
  monthsAhead: number = 6,
): Array<{ month: string; receitaPrevista: number; despesaPrevista: number; resultado: number }> {
  const now = new Date();
  const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Média dos últimos 3 meses para baseline
  const last3 = [0, 1, 2].map(i => new Date(now.getFullYear(), now.getMonth() - i, 1));
  const baseReceita: number[] = [];
  const baseDespesa: number[] = [];

  for (const ref of last3) {
    const monthTx = transactions.filter(t => {
      const d = new Date(t.data_referencia);
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    });
    baseReceita.push(monthTx.filter(t => Number(t.valor) > 0).reduce((s, t) => s + Number(t.valor), 0));
    baseDespesa.push(monthTx.filter(t => Number(t.valor) < 0).reduce((s, t) => s + Math.abs(Number(t.valor)), 0));
  }

  const avgReceita = baseReceita.length > 0 ? sumArray(baseReceita) / baseReceita.length : 0;
  const avgDespesa = baseDespesa.length > 0 ? sumArray(baseDespesa) / baseDespesa.length : 0;

  // Projeta + ajusta com lançamentos futuros já cadastrados
  return Array.from({ length: monthsAhead }, (_, i) => {
    const future = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const futureTx = transactions.filter(t => {
      const d = new Date(t.data_vencimento);
      return d.getFullYear() === future.getFullYear() && d.getMonth() === future.getMonth();
    });
    const futureReceita = futureTx.filter(t => Number(t.valor) > 0).reduce((s, t) => s + Number(t.valor), 0);
    const futureDespesa = futureTx.filter(t => Number(t.valor) < 0).reduce((s, t) => s + Math.abs(Number(t.valor)), 0);

    // Usa o maior entre cadastrado e média (assume que a média captura recorrências não modeladas)
    const receitaPrevista = Math.max(futureReceita, avgReceita);
    const despesaPrevista = Math.max(futureDespesa, avgDespesa);

    return {
      month: `${MONTHS_SHORT[future.getMonth()]}/${String(future.getFullYear()).slice(-2)}`,
      receitaPrevista,
      despesaPrevista,
      resultado: receitaPrevista - despesaPrevista,
    };
  });
}
