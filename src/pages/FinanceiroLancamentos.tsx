import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { FinancialLancamentos } from '@/components/financial/FinancialLancamentos';
import { ChartOfAccountsDialog } from '@/components/financial/ChartOfAccountsDialog';
import { FinancialYearSelector } from '@/components/financial/FinancialYearSelector';

export default function FinanceiroLancamentos() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showChartAccounts, setShowChartAccounts] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Lançamentos Financeiros"
        description="Receitas, despesas, notas fiscais e boletos"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowChartAccounts(true)}>
              <Settings2 className="h-4 w-4 mr-1" /> Plano de Contas
            </Button>
            <FinancialYearSelector value={selectedYear} onChange={setSelectedYear} />
          </div>
        }
      />
      <FinancialLancamentos year={selectedYear} />
      <ChartOfAccountsDialog open={showChartAccounts} onOpenChange={setShowChartAccounts} />
    </div>
  );
}
