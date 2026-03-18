import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFinancialTransactions, useChartOfAccounts } from '@/hooks/useFinancial';
import { Loader2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

interface DRERow {
  label: string;
  values: number[];
  total: number;
  isGroup?: boolean;
  isSummary?: boolean;
  indent?: number;
  groupKey?: string;
}

export function FinancialDRE({ year }: { year: number }) {
  const { data: transactions = [], isLoading } = useFinancialTransactions(year);
  const { data: chartAccounts = [] } = useChartOfAccounts();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const dreData = useMemo(() => {
    const getMonthlyValues = (filter: (t: typeof transactions[0]) => boolean): number[] => {
      return MONTHS.map((_, i) => {
        return transactions
          .filter(t => new Date(t.data_referencia).getMonth() === i && filter(t))
          .reduce((s, t) => s + Number(t.valor), 0);
      });
    };

    const sumArray = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
    const addArrays = (...arrays: number[][]) => MONTHS.map((_, i) => arrays.reduce((s, a) => s + (a[i] || 0), 0));
    const negArray = (arr: number[]) => arr.map(v => -v);

    const rows: DRERow[] = [];

    // RECEITA OPERACIONAL BRUTA
    const receitaContas = chartAccounts.filter(a => a.tipo === 'receita');
    const receitaValues: number[][] = [];
    receitaContas.forEach(conta => {
      const vals = getMonthlyValues(t => t.pacote === conta.pacote && t.conta_contabil === conta.conta_contabil && t.valor > 0);
      receitaValues.push(vals);
    });
    const robValues = addArrays(...receitaValues);
    const robTotal = sumArray(robValues);
    rows.push({ label: 'RECEITA OPERACIONAL BRUTA', values: robValues, total: robTotal, isGroup: true, groupKey: 'rob' });
    receitaContas.forEach((conta, i) => {
      rows.push({ label: conta.conta_contabil, values: receitaValues[i], total: sumArray(receitaValues[i]), indent: 1, groupKey: 'rob' });
    });

    // DEDUÇÕES (Simples Nacional = 7% sobre ROB)
    const simplesValues = robValues.map(v => -(v * 0.07));
    const totalDeducoes = simplesValues;
    rows.push({ label: '(-) DEDUÇÕES', values: totalDeducoes, total: sumArray(totalDeducoes), isGroup: true, groupKey: 'deducoes' });
    rows.push({ label: 'Simples Nacional (7%)', values: simplesValues, total: sumArray(simplesValues), indent: 1, groupKey: 'deducoes' });

    // ROL
    const rolValues = addArrays(robValues, totalDeducoes);
    rows.push({ label: '= RECEITA OPERACIONAL LÍQUIDA (ROL)', values: rolValues, total: sumArray(rolValues), isSummary: true });

    // CUSTOS
    const custoContas = chartAccounts.filter(a => a.tipo === 'custo');
    const custoValues: number[][] = [];
    custoContas.forEach(conta => {
      const vals = getMonthlyValues(t => t.pacote === conta.pacote && t.conta_contabil === conta.conta_contabil);
      custoValues.push(vals);
    });
    const totalCustos = addArrays(...custoValues);
    rows.push({ label: '(-) CUSTOS (CMV)', values: totalCustos, total: sumArray(totalCustos), isGroup: true, groupKey: 'custos' });
    custoContas.forEach((conta, i) => {
      rows.push({ label: conta.conta_contabil, values: custoValues[i], total: sumArray(custoValues[i]), indent: 1, groupKey: 'custos' });
    });

    // LUCRO BRUTO
    const lucroBrutoValues = addArrays(rolValues, totalCustos);
    rows.push({ label: '= LUCRO BRUTO', values: lucroBrutoValues, total: sumArray(lucroBrutoValues), isSummary: true });

    // DESPESAS ADMINISTRATIVAS
    const despesaPacotes = [...new Set(chartAccounts.filter(a => a.tipo === 'despesa').map(a => a.pacote))];
    const allDespesaValues: number[][] = [];

    despesaPacotes.forEach(pacoteNome => {
      const pacoteContas = chartAccounts.filter(a => a.tipo === 'despesa' && a.pacote === pacoteNome);
      const pacoteGroupKey = `desp_${pacoteNome}`;

      const subGroupValues: number[][] = [];
      pacoteContas.forEach(conta => {
        const vals = getMonthlyValues(t => t.pacote === conta.pacote && t.conta_contabil === conta.conta_contabil);
        subGroupValues.push(vals);
      });
      const subTotal = addArrays(...subGroupValues);
      allDespesaValues.push(subTotal);
      // Group header with totals inline
      rows.push({ label: pacoteNome, values: subTotal, total: sumArray(subTotal), isGroup: true, indent: 1, groupKey: pacoteGroupKey });
      pacoteContas.forEach((conta, i) => {
        rows.push({ label: conta.conta_contabil, values: subGroupValues[i], total: sumArray(subGroupValues[i]), indent: 2, groupKey: pacoteGroupKey });
      });
    });

    const totalDespesas = addArrays(...allDespesaValues);
    rows.push({ label: '(-) DESPESAS ADMINISTRATIVAS', values: totalDespesas, total: sumArray(totalDespesas), isGroup: true, groupKey: 'despesas' });
    // Move despesas group header before its sub-groups by finding first desp_ item
    const despHeaderIdx = rows.length - 1;
    const firstDespIdx = rows.findIndex(r => r.groupKey?.startsWith('desp_'));
    if (firstDespIdx >= 0 && firstDespIdx < despHeaderIdx) {
      const [despHeader] = rows.splice(despHeaderIdx, 1);
      rows.splice(firstDespIdx, 0, despHeader);
    }

    // RESULTADO
    const resultadoValues = addArrays(lucroBrutoValues, totalDespesas);
    rows.push({ label: '= RESULTADO OPERACIONAL (EBITDA)', values: resultadoValues, total: sumArray(resultadoValues), isSummary: true });
    rows.push({ label: '= RESULTADO LÍQUIDO', values: resultadoValues, total: sumArray(resultadoValues), isSummary: true });

    return rows;
  }, [transactions, chartAccounts]);

  const handleExport = () => {
    const header = ['', ...MONTHS, 'Total'].join(',');
    const csvRows = dreData
      .filter(r => {
        if (r.groupKey && collapsed[r.groupKey] && !r.isGroup && !r.isSummary) return false;
        return true;
      })
      .map(r => {
        const indent = r.indent ? '  '.repeat(r.indent) : '';
        return [
          `"${indent}${r.label}"`,
          ...r.values.map(v => v.toFixed(2)),
          r.total.toFixed(2),
        ].join(',');
      });
    
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRE_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Demonstrativo de Resultado do Exercício — {year}</h3>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Exportar DRE
        </Button>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 min-w-[250px] sticky left-0 bg-muted/50">Conta</th>
              {MONTHS.map(m => <th key={m} className="text-right p-3 min-w-[90px]">{m}</th>)}
              <th className="text-right p-3 min-w-[100px] font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {dreData.map((row, idx) => {
              // Hide children of collapsed groups
              if (row.groupKey && collapsed[row.groupKey] && !row.isGroup) return null;

              const isCollapsible = row.isGroup && row.groupKey;

              return (
                <tr
                  key={idx}
                  className={cn(
                    'border-b',
                    row.isSummary && 'bg-muted/30 font-semibold',
                    row.isGroup && 'bg-muted/20',
                  )}
                >
                  <td
                    className={cn(
                      'p-3 sticky left-0 bg-inherit',
                      row.isGroup && 'font-semibold cursor-pointer',
                      row.isSummary && 'font-semibold',
                    )}
                    style={{ paddingLeft: `${(row.indent || 0) * 16 + 12}px` }}
                    onClick={() => isCollapsible && toggleGroup(row.groupKey!)}
                  >
                    <span className="flex items-center gap-1">
                      {isCollapsible && (
                        collapsed[row.groupKey!]
                          ? <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      )}
                      {row.label}
                    </span>
                  </td>
                  {row.values.length === 0 ? (
                    <>
                      {MONTHS.map((_, i) => <td key={i} className="p-3"></td>)}
                      <td className="p-3"></td>
                    </>
                  ) : (
                    <>
                      {row.values.map((v, i) => (
                        <td key={i} className={cn('text-right p-3 tabular-nums', v < 0 ? 'text-destructive' : v > 0 ? 'text-success' : 'text-muted-foreground')}>
                          {v !== 0 ? formatCurrency(v) : '—'}
                        </td>
                      ))}
                      <td className={cn('text-right p-3 font-bold tabular-nums', row.total < 0 ? 'text-destructive' : row.total > 0 ? 'text-success' : 'text-muted-foreground')}>
                        {formatCurrency(row.total)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
