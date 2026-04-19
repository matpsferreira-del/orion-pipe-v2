import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Plus, FileText, Briefcase, Users, Zap, RotateCcw } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DocumentUpload, type UploadedDoc } from '../DocumentUpload';
import { FORMA_PAGAMENTO_OPTIONS } from '@/lib/financial/constants';
import {
  type FinancialTransaction,
  type FinancialTransactionInsert,
  type ChartAccount,
  useCreateFinancialTransaction,
  useCreateBulkFinancialTransactions,
  useUpdateFinancialTransaction,
} from '@/hooks/useFinancial';
import { useJobs } from '@/hooks/useJobs';
import { useProfiles } from '@/hooks/useProfiles';
import { useLinkDocumentToTransaction } from '@/hooks/useFinancialDocuments';

interface Props {
  chartAccounts: ChartAccount[];
  editing: FinancialTransaction | null;
  onDone: () => void;
}

type Tipo = 'receita' | 'despesa';

export function LancamentoForm({ chartAccounts, editing, onDone }: Props) {
  const createTx = useCreateFinancialTransaction();
  const createBulk = useCreateBulkFinancialTransactions();
  const updateTx = useUpdateFinancialTransaction();
  const linkDoc = useLinkDocumentToTransaction();
  const { data: jobs = [] } = useJobs();
  const { data: profiles = [] } = useProfiles();

  // Form state
  const [tipo, setTipo] = useState<Tipo>('despesa');
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

  // Novos campos
  const [debitoAuto, setDebitoAuto] = useState(false);
  const [responsavel, setResponsavel] = useState<string>('orion');
  const [reembolso, setReembolso] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<string>('none');

  // Sync form com editing
  useEffect(() => {
    if (editing) {
      setTipo(editing.valor >= 0 ? 'receita' : 'despesa');
      setPacote(editing.pacote);
      setContaContabil(editing.conta_contabil);
      setDescricao(editing.descricao || '');
      setValor(String(Math.abs(Number(editing.valor))));
      setDataRef(new Date(editing.data_referencia + 'T00:00:00'));
      setDataVenc(new Date(editing.data_vencimento + 'T00:00:00'));
      setStatusForm(editing.status as 'pendente' | 'pago');
      setJobId(editing.job_id || 'none');
      setRecorrente(false);
      setDebitoAuto(editing.debito_automatico || false);
      setResponsavel(editing.responsavel_id || 'orion');
      setReembolso(editing.reembolso || false);
      setFormaPagamento(editing.forma_pagamento || 'none');
    }
  }, [editing]);

  const pacotes = [...new Set(
    chartAccounts
      .filter(a => (tipo === 'receita' ? ['receita'] : ['deducao', 'custo', 'despesa']).includes(a.tipo))
      .map(a => a.pacote),
  )];
  const contas = chartAccounts.filter(a => a.pacote === pacote);

  const reset = () => {
    setPacote(''); setContaContabil(''); setDescricao(''); setValor('');
    setDataRef(new Date()); setDataVenc(new Date()); setStatusForm('pendente');
    setRecorrente(false); setRecorrenciaMeses(''); setJobId('none'); setPendingDocId(null);
    setDebitoAuto(false); setResponsavel('orion'); setReembolso(false); setFormaPagamento('none');
    onDone();
  };

  const buildTx = (overrides?: Partial<FinancialTransactionInsert>): FinancialTransactionInsert => {
    const numericVal = Math.abs(parseFloat(valor));
    const finalValor = tipo === 'despesa' ? -numericVal : numericVal;
    return {
      pacote,
      conta_contabil: contaContabil,
      descricao: descricao || undefined,
      valor: finalValor,
      data_referencia: format(dataRef, 'yyyy-MM-dd'),
      data_vencimento: format(dataVenc, 'yyyy-MM-dd'),
      status: statusForm,
      job_id: jobId !== 'none' ? jobId : undefined,
      debito_automatico: debitoAuto,
      responsavel_id: responsavel !== 'orion' ? responsavel : null,
      reembolso: reembolso && responsavel !== 'orion',
      reembolso_status: reembolso && responsavel !== 'orion' ? 'pendente' : null,
      forma_pagamento: debitoAuto ? 'debito_automatico' : (formaPagamento !== 'none' ? formaPagamento : null),
      ...overrides,
    };
  };

  const handleSubmit = () => {
    if (!pacote || !contaContabil || !valor) return;

    if (editing) {
      updateTx.mutate({ id: editing.id, ...buildTx() }, { onSuccess: reset });
      return;
    }

    if (recorrente && recorrenciaMeses && Number(recorrenciaMeses) > 1) {
      const months = Number(recorrenciaMeses);
      const txs: FinancialTransactionInsert[] = Array.from({ length: months }, (_, i) =>
        buildTx({
          descricao: descricao ? `${descricao} (${i + 1}/${months})` : undefined,
          data_referencia: format(addMonths(dataRef, i), 'yyyy-MM-dd'),
          data_vencimento: format(addMonths(dataVenc, i), 'yyyy-MM-dd'),
          recorrente: true,
          recorrencia_meses: months,
        }),
      );
      createBulk.mutate(txs, { onSuccess: reset });
    } else {
      createTx.mutate(buildTx({ recorrente: false }), {
        onSuccess: (data: any) => {
          if (pendingDocId && data?.id) {
            linkDoc.mutate({ documentId: pendingDocId, transactionId: data.id });
          }
          reset();
        },
      });
    }
  };

  const handleDocExtracted = (data: Record<string, any>) => {
    if (data.classificacao === 'receita') setTipo('receita');
    else if (data.classificacao) setTipo('despesa');

    if (data.valor && !valor) setValor(String(data.valor));
    if (data.data_vencimento && !editing) {
      try { setDataVenc(new Date(data.data_vencimento + 'T12:00:00')); } catch {}
    }
    if (data.data_emissao && !editing) {
      try { setDataRef(new Date(data.data_emissao + 'T12:00:00')); } catch {}
    }
    if (data.descricao_servico && !descricao) {
      const parts = [data.descricao_servico];
      if (data.numero_po) parts.push(`(PO: ${data.numero_po})`);
      if (data.razao_social_emitente) parts.push(`- ${data.razao_social_emitente}`);
      setDescricao(parts.join(' '));
    }

    if (data.pacote && data.conta_contabil) {
      const exact = chartAccounts.find(a => a.pacote === data.pacote && a.conta_contabil === data.conta_contabil);
      if (exact) {
        setPacote(exact.pacote);
        setContaContabil(exact.conta_contabil);
      }
    }
  };

  const handleBulkExtracted = async (docs: UploadedDoc[]) => {
    const txs: FinancialTransactionInsert[] = [];
    const docIds: string[] = [];

    for (const doc of docs) {
      const ed = doc.extractedData;
      const isReceita = ed.classificacao === 'receita';
      const numVal = Math.abs(ed.valor || 0);
      const finalVal = isReceita ? numVal : -numVal;

      let matchedPacote = ed.pacote || '';
      let matchedConta = ed.conta_contabil || '';
      if (matchedPacote && matchedConta) {
        const exact = chartAccounts.find(a => a.pacote === matchedPacote && a.conta_contabil === matchedConta);
        if (!exact) { matchedPacote = ''; matchedConta = ''; }
      }
      if (!matchedPacote) {
        const tipoFilter = isReceita ? ['receita'] : [ed.classificacao || 'despesa', 'despesa'];
        const fallback = chartAccounts.filter(a => tipoFilter.includes(a.tipo))[0];
        matchedPacote = fallback?.pacote || 'Despesa';
        matchedConta = fallback?.conta_contabil || 'Outros';
      }

      const parts = [ed.descricao_servico || doc.file_name];
      if (ed.razao_social_emitente) parts.push(`- ${ed.razao_social_emitente}`);

      txs.push({
        pacote: matchedPacote,
        conta_contabil: matchedConta,
        descricao: parts.join(' '),
        valor: finalVal || 0,
        data_referencia: ed.data_emissao || format(new Date(), 'yyyy-MM-dd'),
        data_vencimento: ed.data_vencimento || format(new Date(), 'yyyy-MM-dd'),
        status: 'pendente',
        recorrente: false,
      });
      docIds.push(doc.id);
    }

    if (txs.length > 0) {
      createBulk.mutate(txs, {
        onSuccess: (results: any) => {
          if (Array.isArray(results)) {
            results.forEach((tx: any, idx: number) => {
              if (tx?.id && docIds[idx]) linkDoc.mutate({ documentId: docIds[idx], transactionId: tx.id });
            });
          }
        },
      });
    }
  };

  const isPending = createTx.isPending || createBulk.isPending || updateTx.isPending;

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      <h3 className="font-semibold text-sm text-foreground">
        {editing ? 'Editar Lançamento' : 'Novo Lançamento'}
      </h3>

      {/* Linha 1: Tipo, Pacote, Conta, Descrição */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex gap-1">
          <Button
            type="button" size="sm"
            variant={tipo === 'receita' ? 'default' : 'outline'}
            className={cn(tipo === 'receita' && 'bg-success hover:bg-success/90 text-success-foreground', 'flex-1')}
            onClick={() => { setTipo('receita'); setPacote(''); setContaContabil(''); }}
          >Receita</Button>
          <Button
            type="button" size="sm"
            variant={tipo === 'despesa' ? 'default' : 'outline'}
            className={cn(tipo === 'despesa' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground', 'flex-1')}
            onClick={() => { setTipo('despesa'); setPacote(''); setContaContabil(''); }}
          >Despesa</Button>
        </div>

        <Select value={pacote} onValueChange={(v) => { setPacote(v); setContaContabil(''); }}>
          <SelectTrigger><SelectValue placeholder="Pacote" /></SelectTrigger>
          <SelectContent>{pacotes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={contaContabil} onValueChange={setContaContabil} disabled={!pacote}>
          <SelectTrigger><SelectValue placeholder="Conta Contábil" /></SelectTrigger>
          <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.conta_contabil}>{c.conta_contabil}</SelectItem>)}</SelectContent>
        </Select>

        <Input placeholder="Ex: Office 365 - março" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>

      {/* Linha 2: Valor, Datas, Status, Submit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
          <Input type="number" min="0" step="0.01" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>

        <DatePicker label="Competência" value={dataRef} onChange={setDataRef} />
        <DatePicker label="Vencimento" value={dataVenc} onChange={setDataVenc} />

        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant={statusForm === 'pendente' ? 'default' : 'outline'} className="flex-1" onClick={() => setStatusForm('pendente')}>Pendente</Button>
            <Button type="button" size="sm" variant={statusForm === 'pago' ? 'default' : 'outline'}
              className={cn(statusForm === 'pago' && 'bg-success hover:bg-success/90 text-success-foreground', 'flex-1')}
              onClick={() => setStatusForm('pago')}>Pago</Button>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={!pacote || !contaContabil || !valor || isPending}
          className={cn(editing ? 'bg-primary' : 'bg-success hover:bg-success/90 text-success-foreground')}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Salvar' : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
        </Button>
      </div>

      {/* Linha 3: Débito automático, Forma pagamento, Responsável, Reembolso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 h-9">
          <Switch id="debito-auto" checked={debitoAuto} onCheckedChange={setDebitoAuto} />
          <Label htmlFor="debito-auto" className="text-sm cursor-pointer flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-primary" /> Débito automático
          </Label>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
          <Select value={debitoAuto ? 'debito_automatico' : formaPagamento} onValueChange={setFormaPagamento} disabled={debitoAuto}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhuma —</SelectItem>
              {FORMA_PAGAMENTO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> Pago por
          </Label>
          <Select value={responsavel} onValueChange={(v) => { setResponsavel(v); if (v === 'orion') setReembolso(false); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="orion">Orion (empresa)</SelectItem>
              {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 h-9">
          <Switch id="reembolso" checked={reembolso} onCheckedChange={setReembolso} disabled={responsavel === 'orion'} />
          <Label htmlFor="reembolso" className={cn('text-sm cursor-pointer flex items-center gap-1', responsavel === 'orion' && 'opacity-50')}>
            <RotateCcw className="h-3.5 w-3.5 text-warning" /> É reembolso
          </Label>
        </div>
      </div>

      {/* Linha 4: Vincular vaga + Anexar documento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
            <Briefcase className="h-3 w-3" /> Vincular a Vaga
          </Label>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {jobs.filter((j: any) => j.status !== 'cancelled').map((j: any) => (
                <SelectItem key={j.id} value={j.id}>{j.job_code ? `#${j.job_code} — ` : ''}{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
            <FileText className="h-3 w-3" /> Anexar NF / Boleto
          </Label>
          <DocumentUpload
            transactionId={editing?.id}
            onExtracted={handleDocExtracted}
            onBulkExtracted={handleBulkExtracted}
            compact
          />
        </div>
      </div>

      {/* Recorrência */}
      {!editing && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="recorrente" checked={recorrente} onCheckedChange={(v) => setRecorrente(!!v)} />
            <Label htmlFor="recorrente" className="text-sm">Recorrente?</Label>
          </div>
          {recorrente && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Repetir por</span>
              <Input type="number" min="2" max="36" className="w-20" value={recorrenciaMeses} onChange={(e) => setRecorrenciaMeses(e.target.value)} />
              <span className="text-sm text-muted-foreground">meses</span>
            </div>
          )}
        </div>
      )}

      {editing && <Button variant="ghost" size="sm" onClick={reset}>Cancelar edição</Button>}
    </div>
  );
}

function DatePicker({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value, 'dd/MM/yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={value} onSelect={(d) => d && onChange(d)} className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}
