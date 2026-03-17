import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { FinancialLancamentos } from '@/components/financial/FinancialLancamentos';
import { FinancialDRE } from '@/components/financial/FinancialDRE';
import { FinancialFluxoCaixa } from '@/components/financial/FinancialFluxoCaixa';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Financeiro() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleTabChange = (value: string) => {
    if (value === 'dashboard') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Financeiro"
        description="Controle financeiro completo — Lançamentos, DRE e Fluxo de Caixa"
        actions={
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="fluxo-caixa">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FinancialDashboard year={selectedYear} />
        </TabsContent>
        <TabsContent value="lancamentos">
          <FinancialLancamentos year={selectedYear} />
        </TabsContent>
        <TabsContent value="dre">
          <FinancialDRE year={selectedYear} />
        </TabsContent>
        <TabsContent value="fluxo-caixa">
          <FinancialFluxoCaixa year={selectedYear} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
