import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancialDRE } from '@/components/financial/FinancialDRE';
import { FinancialYearSelector } from '@/components/financial/FinancialYearSelector';

export default function FinanceiroDRE() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="DRE — Demonstrativo de Resultado"
        description="Resultado do exercício mês a mês"
        actions={<FinancialYearSelector value={selectedYear} onChange={setSelectedYear} />}
      />
      <FinancialDRE year={selectedYear} />
    </div>
  );
}
