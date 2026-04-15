import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  useFinancialTransactions,
  useChartOfAccounts,
  useCreateFinancialTransaction,
  useCreateBulkFinancialTransactions,
  useSoftDeleteFinancialTransaction,
  useUpdateFinancialTransaction,
  type FinancialTransactionInsert,
} from '@/hooks/useFinancial';
import { useJobs } from '@/hooks/useJobs';
import { useFinancialDocuments, useLinkDocumentToTransaction } from '@/hooks/useFinancialDocuments';
import { DocumentUpload } from './DocumentUpload';
import { Plus, Pencil, Trash2, Link2, CalendarIcon, Loader2, FileText, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MONTHS_OPTIONS = [
  { value: 'all', label: 'Todos os meses' },
  { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function FinancialLancamentos({ year }: { year: number }) {
  const { data: transactions = [], isLoading } = useFinancialTransactions(year);
  const { data: chartAccounts = [] } = useChartOfAccounts();
  const createTx = useCreateFinancialTransaction();
  const createBulk = useCreateBulkFinancialTransactions();
  const softDelete = useSoftDeleteFinancialTransaction();
  const updateTx = useUpdateFinancialTransaction();
  const { data: jobs = [] } = useJobs();
  const { data: allDocs = [] } = useFinancialDocuments();
  const linkDoc = useLinkDocumentToTransaction();

  // Form state
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [pacote, setPacote] = useState('');
  const [contaContabil, setContaContabil] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataRef, setDataRef] = useState<Date>(new Date());
  const [dataVenc, setDataVenc] = useState<Date>(new Date());
  const [statusForm, setStatusForm] = useState<'pendente' | 'pago'>('pendente');
  const [recorrente, setRecorrente] = useState(false);
  const [recorrenciaMeses, setRecorrenciaMeses] = useState('');
  const [jobId, setJobId] = useState<string>('none');
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterPacote, setFilterPacote] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Edit/delete
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pacotes = useMemo(() => {
    const tipoFilter = tipo === 'receita' ? ['receita'] : ['deducao', 'custo', 'despesa'];
    return [...new Set(chartAccounts.filter(a => tipoFilter.includes(a.tipo)).map(a => a.pacote))];
  }, [chartAccounts, tipo]);

  const contas = useMemo(() => {
    return chartAccounts.filter(a => a.pacote === pacote);
  }, [chartAccounts, pacote]);

  const allPacotes = useMemo(() => [...new Set(chartAccounts.map(a => a.pacote))], [chartAccounts]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterMonth !== 'all' && new Date(t.data_referencia).getMonth() !== Number(filterMonth)) return false;
      if (filterPacote !== 'all' && t.pacote !== filterPacote) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      return true;
    });
  }, [transactions, filterMonth, filterPacote, filterStatus]);

  const resetForm = () => {
    setPacote('');
    setContaContabil('');
    setDescricao('');
    setValor('');
    setDataRef(new Date());
    setDataVenc(new Date());
    setStatusForm('pendente');
    setRecorrente(false);
    setRecorrenciaMeses('');
    setJobId('none');
    setPendingDocId(null);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!pacote || !contaContabil || !valor) {
      return;
    }

    const numericVal = Math.abs(parseFloat(valor));
    const finalValor = tipo === 'despesa' ? -numericVal : numericVal;
    const selectedJobId = jobId !== 'none' ? jobId : undefined;

    const onSuccessWithDocLink = (data: any) => {
      // If there's a pending document to link
      if (pendingDocId && data?.id) {
        linkDoc.mutate({ documentId: pendingDocId, transactionId: data.id });
      }
      resetForm();
    };

    if (editingId) {
      updateTx.mutate({
        id: editingId,
        pacote,
        conta_contabil: contaContabil,
        descricao: descricao || undefined,
        valor: finalValor,
        data_referencia: format(dataRef, 'yyyy-MM-dd'),
        data_vencimento: format(dataVenc, 'yyyy-MM-dd'),
        status: statusForm,
        job_id: selectedJobId,
      } as any, { onSuccess: resetForm });
      return;
    }

    if (recorrente && recorrenciaMeses && Number(recorrenciaMeses) > 1) {
      const months = Number(recorrenciaMeses);
      const txs: FinancialTransactionInsert[] = [];
      for (let i = 0; i < months; i++) {
        txs.push({
          pacote,
          conta_contabil: contaContabil,
          descricao: descricao ? `${descricao} (${i + 1}/${months})` : undefined,
          valor: finalValor,
          data_referencia: format(addMonths(dataRef, i), 'yyyy-MM-dd'),
          data_vencimento: format(addMonths(dataVenc, i), 'yyyy-MM-dd'),
          status: statusForm,
          recorrente: true,
          recorrencia_meses: months,
        });
      }
      createBulk.mutate(txs, { onSuccess: resetForm });
    } else {
      createTx.mutate({
        pacote,
        conta_contabil: contaContabil,
        descricao: descricao || undefined,
        valor: finalValor,
        data_referencia: format(dataRef, 'yyyy-MM-dd'),
        data_vencimento: format(dataVenc, 'yyyy-MM-dd'),
        status: statusForm,
        recorrente: false,
        job_id: selectedJobId,
      } as any, { onSuccess: onSuccessWithDocLink });
    }
  };

  const handleEdit = (tx: typeof transactions[0]) => {
    setEditingId(tx.id);
    setTipo(tx.valor >= 0 ? 'receita' : 'despesa');
    setPacote(tx.pacote);
    setContaContabil(tx.conta_contabil);
    setDescricao(tx.descricao || '');
    setValor(String(Math.abs(Number(tx.valor))));
    setDataRef(new Date(tx.data_referencia + 'T00:00:00'));
    setDataVenc(new Date(tx.data_vencimento + 'T00:00:00'));
    setStatusForm(tx.status as 'pendente' | 'pago');
    setJobId((tx as any).job_id || 'none');
    setRecorrente(false);
  };

  const handleDocExtracted = (data: Record<string, any>) => {
    // Auto-fill form fields from extracted data
    if (data.valor && !valor) setValor(String(data.valor));
    if (data.data_vencimento && !editingId) {
      try {
        setDataVenc(new Date(data.data_vencimento + 'T00:00:00'));
      } catch {}
    }
    if (data.descricao_servico && !descricao) {
      const desc = data.numero_po
        ? `${data.descricao_servico} (PO: ${data.numero_po})`
        : data.descricao_servico;
      setDescricao(desc);
    }
  };

  // Build a map of transaction_id -> docs count
  const docsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    allDocs.forEach((d: any) => {
      if (d.financial_transaction_id) {
        map[d.financial_transaction_id] = (map[d.financial_transaction_id] || 0) + 1;
      }
    });
    return map;
  }, [allDocs]);

  // Build job lookup
  const jobsMap = useMemo(() => {
    const map: Record<string, string> = {};
    jobs.forEach((j: any) => { map[j.id] = `#${j.job_code || ''} ${j.title}`; });
    return map;
  }, [jobs]);

  const handleDelete = () => {
    if (deleteId) {
      softDelete.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Inline form */}
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">
          {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tipo toggle */}
          <div className="flex gap-1 col-span-1">
            <Button
              type="button"
              size="sm"
              variant={tipo === 'receita' ? 'default' : 'outline'}
              className={cn(tipo === 'receita' && 'bg-success hover:bg-success/90 text-success-foreground', 'flex-1')}
              onClick={() => { setTipo('receita'); setPacote(''); setContaContabil(''); }}
            >
              Receita
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipo === 'despesa' ? 'default' : 'outline'}
              className={cn(tipo === 'despesa' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground', 'flex-1')}
              onClick={() => { setTipo('despesa'); setPacote(''); setContaContabil(''); }}
            >
              Despesa
            </Button>
          </div>

          {/* Pacote */}
          <Select value={pacote} onValueChange={(v) => { setPacote(v); setContaContabil(''); }}>
            <SelectTrigger><SelectValue placeholder="Pacote" /></SelectTrigger>
            <SelectContent>
              {pacotes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Conta Contábil */}
          <Select value={contaContabil} onValueChange={setContaContabil} disabled={!pacote}>
            <SelectTrigger><SelectValue placeholder="Conta Contábil" /></SelectTrigger>
            <SelectContent>
              {contas.map(c => <SelectItem key={c.id} value={c.conta_contabil}>{c.conta_contabil}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Descrição */}
          <Input
            placeholder="Ex: Office 365 - março"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Valor */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          {/* Data Referência */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Competência</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dataRef, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dataRef} onSelect={(d) => d && setDataRef(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data Vencimento */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Vencimento</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dataVenc, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dataVenc} onSelect={(d) => d && setDataVenc(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={statusForm === 'pendente' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setStatusForm('pendente')}
              >
                Pendente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusForm === 'pago' ? 'default' : 'outline'}
                className={cn(statusForm === 'pago' && 'bg-success hover:bg-success/90 text-success-foreground', 'flex-1')}
                onClick={() => setStatusForm('pago')}
              >
                Pago
              </Button>
            </div>
          </div>

          {/* Add button */}
          <Button
            onClick={handleSubmit}
            disabled={!pacote || !contaContabil || !valor || createTx.isPending || createBulk.isPending || updateTx.isPending}
            className={cn(editingId ? 'bg-primary' : 'bg-success hover:bg-success/90 text-success-foreground')}
          >
            {(createTx.isPending || createBulk.isPending || updateTx.isPending) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingId ? (
              <>Salvar</>
            ) : (
              <><Plus className="h-4 w-4 mr-1" /> Adicionar</>
            )}
          </Button>
        </div>

        {/* Job selector + Document Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
              <Briefcase className="h-3 w-3" /> Vincular a Vaga
            </label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma vaga vinculada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {jobs
                  .filter((j: any) => j.status !== 'cancelled')
                  .map((j: any) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.job_code ? `#${j.job_code} — ` : ''}{j.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
              <FileText className="h-3 w-3" /> Anexar NF / Boleto
            </label>
            <DocumentUpload
              transactionId={editingId || undefined}
              onExtracted={handleDocExtracted}
              compact
            />
          </div>
        </div>

        {/* Recorrente */}
        {!editingId && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="recorrente"
                checked={recorrente}
                onCheckedChange={(v) => setRecorrente(!!v)}
              />
              <label htmlFor="recorrente" className="text-sm">Recorrente?</label>
            </div>
            {recorrente && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Repetir por</span>
                <Input
                  type="number"
                  min="2"
                  max="36"
                  className="w-20"
                  value={recorrenciaMeses}
                  onChange={(e) => setRecorrenciaMeses(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">meses</span>
              </div>
            )}
          </div>
        )}

        {editingId && (
          <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar edição</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPacote} onValueChange={setFilterPacote}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Pacote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pacotes</SelectItem>
            {allPacotes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Ref.</TableHead>
              <TableHead>Pacote</TableHead>
              <TableHead>Conta Contábil</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(tx.data_referencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{tx.pacote}</TableCell>
                  <TableCell>{tx.conta_contabil}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {tx.invoice_id && <Link2 className="h-3 w-3 text-primary flex-shrink-0" />}
                      {docsCountMap[tx.id] > 0 && (
                        <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                      {tx.descricao || '—'}
                    </div>
                  </TableCell>
                  <TableCell className={cn('text-right font-medium whitespace-nowrap', tx.valor >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(Number(tx.valor))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(tx.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    {(tx as any).job_id && jobsMap[(tx as any).job_id] ? (
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 truncate max-w-full">
                        <Briefcase className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{jobsMap[(tx as any).job_id]}</span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      tx.status === 'pago' && 'bg-success/10 text-success border-success/20',
                      tx.status === 'pendente' && 'bg-warning/10 text-warning border-warning/20',
                      tx.status === 'cancelado' && 'bg-muted text-muted-foreground',
                    )}>
                      {tx.status === 'pago' ? 'Pago' : tx.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                    </Badge>
                    {tx.invoice_id && (
                      <Badge variant="outline" className="ml-1 text-xs bg-primary/10 text-primary border-primary/20">
                        Auto
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(tx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(tx.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {softDelete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
