import { useMemo } from 'react';
import { useFinancialTransactions, useChartOfAccounts } from '@/hooks/useFinancial';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

interface FluxoRow {
  label: string;
  values: number[];
  isGroup?: boolean;
  isSummary?: boolean;
  indent?: number;
  highlight?: boolean;
}

export function FinancialFluxoCaixa({ year }: { year: number }) {
  const { data: transactions = [], isLoading } = useFinancialTransactions(year);
  const { data: chartAccounts = [] } = useChartOfAccounts();

  const fluxoData = useMemo(() => {
    const getMonthlyByVencimento = (filter: (t: typeof transactions[0]) => boolean): number[] => {
      return MONTHS.map((_, i) => {
        return transactions
          .filter(t => new Date(t.data_vencimento).getMonth() === i && filter(t))
          .reduce((s, t) => s + Number(t.valor), 0);
      });
    };

    const addArrays = (...arrays: number[][]) => MONTHS.map((_, i) => arrays.reduce((s, a) => s + (a[i] || 0), 0));

    const rows: FluxoRow[] = [];

    // ENTRADAS
    rows.push({ label: '(+) ENTRADAS', values: [], isGroup: true });
    const receitaContas = chartAccounts.filter(a => a.tipo === 'receita');
    const entradaValues: number[][] = [];
    receitaContas.forEach(conta => {
      const vals = getMonthlyByVencimento(t => t.pacote === conta.pacote && t.conta_contabil === conta.conta_contabil && t.valor > 0);
      entradaValues.push(vals);
      rows.push({ label: conta.conta_contabil, values: vals, indent: 1 });
    });
    const totalEntradas = addArrays(...entradaValues);
    rows.push({ label: 'Total Entradas', values: totalEntradas, isSummary: true });

    // SAÍDAS
    rows.push({ label: '(-) SAÍDAS', values: [], isGroup: true });
    const despesaPacotes = [...new Set(chartAccounts.filter(a => ['despesa', 'custo', 'deducao'].includes(a.tipo)).map(a => a.pacote))];
    const saidaValues: number[][] = [];
    despesaPacotes.forEach(pacoteNome => {
      const vals = getMonthlyByVencimento(t => t.pacote === pacoteNome && t.valor < 0);
      if (vals.some(v => v !== 0)) {
        saidaValues.push(vals);
        rows.push({ label: pacoteNome, values: vals, indent: 1 });
      }
    });
    const totalSaidas = addArrays(...saidaValues);
    rows.push({ label: 'Total Saídas', values: totalSaidas, isSummary: true });

    // RESULTADO
    rows.push({ label: '= RESULTADO DO PERÍODO', values: [], isGroup: true });
    const resultadoPeriodo = MONTHS.map((_, i) => totalEntradas[i] + totalSaidas[i]);
    rows.push({ label: 'Resultado do Mês', values: resultadoPeriodo, isSummary: true });

    // Saldo acumulado
    const saldoAcumulado: number[] = [];
    let acum = 0;
    resultadoPeriodo.forEach(v => {
      acum += v;
      saldoAcumulado.push(acum);
    });
    rows.push({ label: 'Saldo Acumulado', values: saldoAcumulado, isSummary: true, highlight: true });

    return rows;
  }, [transactions, chartAccounts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <h3 className="font-semibold">Fluxo de Caixa — {year}</h3>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 min-w-[200px] sticky left-0 bg-muted/50">Conta</th>
              {MONTHS.map(m => <th key={m} className="text-right p-3 min-w-[90px]">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {fluxoData.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  'border-b',
                  row.isSummary && 'bg-muted/30 font-semibold',
                  row.isGroup && 'bg-muted/20 font-semibold',
                  row.highlight && 'bg-primary/5',
                )}
              >
                <td
                  className="p-3 sticky left-0 bg-inherit"
                  style={{ paddingLeft: `${(row.indent || 0) * 16 + 12}px` }}
                >
                  {row.label}
                </td>
                {row.isGroup && row.values.length === 0 ? (
                  MONTHS.map((_, i) => <td key={i} className="p-3"></td>)
                ) : (
                  row.values.map((v, i) => (
                    <td
                      key={i}
                      className={cn(
                        'text-right p-3 tabular-nums',
                        v < 0 ? 'text-destructive' : v > 0 ? 'text-success' : 'text-muted-foreground',
                        row.highlight && v < 0 && 'bg-destructive/10',
                      )}
                    >
                      {v !== 0 ? formatCurrency(v) : '—'}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
