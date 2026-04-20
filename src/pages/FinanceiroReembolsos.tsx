import { PageHeader } from '@/components/ui/page-header';
import { FinancialReembolsos } from '@/components/financial/FinancialReembolsos';

export default function FinanceiroReembolsos() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Reembolsos"
        description="Despesas pagas por usuários a serem reembolsadas pela Orion"
      />
      <FinancialReembolsos />
    </div>
  );
}
