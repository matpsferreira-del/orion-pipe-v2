import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useFinancialTransactions, useChartOfAccounts, useSoftDeleteFinancialTransaction,
  type FinancialTransaction,
} from '@/hooks/useFinancial';
import { useJobs } from '@/hooks/useJobs';
import { useProfiles } from '@/hooks/useProfiles';
import { LancamentoForm } from './lancamentos/LancamentoForm';
import { LancamentoFilters } from './lancamentos/LancamentoFilters';
import { LancamentoTable } from './lancamentos/LancamentoTable';

export function FinancialLancamentos({ year }: { year: number }) {
  const { data: transactions = [], isLoading } = useFinancialTransactions(year);
  const { data: chartAccounts = [] } = useChartOfAccounts();
  const { data: jobs = [] } = useJobs();
  const { data: profiles = [] } = useProfiles();
  const softDelete = useSoftDeleteFinancialTransaction();

  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterPacote, setFilterPacote] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDebito, setFilterDebito] = useState(false);

  const allPacotes = useMemo(() => [...new Set(chartAccounts.map(a => a.pacote))], [chartAccounts]);

  const filtered = useMemo(() => transactions.filter(t => {
    if (filterMonth !== 'all' && new Date(t.data_referencia).getMonth() !== Number(filterMonth)) return false;
    if (filterPacote !== 'all' && t.pacote !== filterPacote) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterDebito && !t.debito_automatico) return false;
    return true;
  }), [transactions, filterMonth, filterPacote, filterStatus, filterDebito]);

  const jobsMap = useMemo(() => {
    const map: Record<string, string> = {};
    jobs.forEach((j: any) => { map[j.id] = `#${j.job_code || ''} ${j.title}`; });
    return map;
  }, [jobs]);

  const profilesMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p: any) => { map[p.id] = p.name; });
    return map;
  }, [profiles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <LancamentoForm chartAccounts={chartAccounts} editing={editing} onDone={() => setEditing(null)} />

      <LancamentoFilters
        filterMonth={filterMonth} setFilterMonth={setFilterMonth}
        filterPacote={filterPacote} setFilterPacote={setFilterPacote}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterDebito={filterDebito} setFilterDebito={setFilterDebito}
        pacotes={allPacotes}
      />

      <LancamentoTable
        transactions={filtered}
        jobsMap={jobsMap}
        profilesMap={profilesMap}
        onEdit={setEditing}
        onDelete={setDeleteId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este lançamento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && softDelete.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {softDelete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
