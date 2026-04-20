import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { FinancialYearSelector } from '@/components/financial/FinancialYearSelector';

export default function FinanceiroDashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Dashboard Financeiro"
        description="Visão geral de KPIs, margens, burn rate e runway"
        actions={<FinancialYearSelector value={selectedYear} onChange={setSelectedYear} />}
      />
      <FinancialDashboard year={selectedYear} />
    </div>
  );
}
