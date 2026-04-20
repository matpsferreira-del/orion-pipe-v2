import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancialFluxoCaixa } from '@/components/financial/FinancialFluxoCaixa';
import { FinancialYearSelector } from '@/components/financial/FinancialYearSelector';

export default function FinanceiroFluxoCaixa() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Fluxo de Caixa"
        description="Entradas, saídas e saldo acumulado"
        actions={<FinancialYearSelector value={selectedYear} onChange={setSelectedYear} />}
      />
      <FinancialFluxoCaixa year={selectedYear} />
    </div>
  );
}
