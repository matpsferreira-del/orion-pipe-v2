import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, ArrowRight } from 'lucide-react';
import { ContractModel, calcTotal, needsReconciliation } from '@/types/contract';
import { ContractMilestone } from '@/types/contract';

interface ReconciliationSummaryProps {
  modelo: ContractModel;
  salarioMeta: number;
  bonusAnualMeta: number;
  salarioFinal: number;
  bonusAnualFinal: number;
  feePercentual: number;
  milestones: ContractMilestone[];
}

export function ReconciliationSummary({
  modelo,
  salarioMeta,
  bonusAnualMeta,
  salarioFinal,
  bonusAnualFinal,
  feePercentual,
  milestones,
}: ReconciliationSummaryProps) {
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const valorTotalMeta = useMemo(() => calcTotal(modelo, salarioMeta, bonusAnualMeta, feePercentual), [modelo, salarioMeta, bonusAnualMeta, feePercentual]);
  const valorTotalFinal = useMemo(() => calcTotal(modelo, salarioFinal, bonusAnualFinal, feePercentual), [modelo, salarioFinal, bonusAnualFinal, feePercentual]);

  const totalJaFaturado = useMemo(() => {
    return milestones
      .filter(m => m.milestone_type !== 'ajuste_reconciliacao' && m.status !== 'cancelado')
      .reduce((sum, m) => sum + m.valor, 0);
  }, [milestones]);

  const faturaAjuste = valorTotalFinal - totalJaFaturado;
  const showReconciliation = needsReconciliation(modelo);

  if (!showReconciliation) {
    // For success models — just show the total
    return (
      <Card className="bg-muted/50 border-primary/20">
        <CardContent className="py-4 px-5 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Resumo Financeiro
          </h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor total calculado</span>
            <span className="font-semibold">{fmt(valorTotalFinal)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/50 border-primary/20">
      <CardContent className="py-4 px-5 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Resumo de Faturamento — Reconciliação
        </h4>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salário meta</span>
            <span>{fmt(salarioMeta)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salário final</span>
            <span className="font-medium flex items-center gap-1">
              {salarioFinal !== salarioMeta && <ArrowRight className="h-3 w-3" />}
              {fmt(salarioFinal)}
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor total (meta)</span>
            <span>{fmt(valorTotalMeta)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor total (final)</span>
            <span className="font-medium">{fmt(valorTotalFinal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Já faturado</span>
            <span>{fmt(totalJaFaturado)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between text-sm font-semibold">
          <span>Fatura de ajuste</span>
          <span className={faturaAjuste >= 0 ? 'text-green-600' : 'text-red-600'}>
            {fmt(faturaAjuste)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
