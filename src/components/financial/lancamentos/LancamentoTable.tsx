import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Link2, FileText, Briefcase, Zap, RotateCcw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateBR } from '@/lib/financial/formatters';
import type { FinancialTransaction } from '@/hooks/useFinancial';

interface Props {
  transactions: FinancialTransaction[];
  jobsMap: Record<string, string>;
  profilesMap: Record<string, string>;
  onEdit: (tx: FinancialTransaction) => void;
  onDelete: (id: string) => void;
}

export function LancamentoTable({ transactions, jobsMap, profilesMap, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="border rounded-lg bg-card p-8 text-center text-muted-foreground">
        Nenhum lançamento encontrado.
      </div>
    );
  }

  return (
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
            <TableHead>Pago por</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateBR(tx.data_referencia)}
              </TableCell>
              <TableCell>{tx.pacote}</TableCell>
              <TableCell>{tx.conta_contabil}</TableCell>
              <TableCell className="max-w-[220px] truncate text-muted-foreground">
                <div className="flex items-center gap-1">
                  {tx.invoice_id && <Link2 className="h-3 w-3 text-primary flex-shrink-0" />}
                  {tx.debito_automatico && <span title="Débito automático"><Zap className="h-3 w-3 text-primary flex-shrink-0" /></span>}
                  {tx.reembolso && <span title="Reembolso"><RotateCcw className="h-3 w-3 text-warning flex-shrink-0" /></span>}
                  <span className="truncate">{tx.descricao || '—'}</span>
                </div>
              </TableCell>
              <TableCell className={cn('text-right font-medium whitespace-nowrap tabular-nums', tx.valor >= 0 ? 'text-success' : 'text-destructive')}>
                {formatCurrency(Number(tx.valor))}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateBR(tx.data_vencimento)}
              </TableCell>
              <TableCell>
                {tx.responsavel_id ? (
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {profilesMap[tx.responsavel_id] || 'Membro'}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Orion</span>
                )}
                {tx.job_id && jobsMap[tx.job_id] && (
                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 mt-1 max-w-[140px]">
                    <Briefcase className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{jobsMap[tx.job_id]}</span>
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <Badge variant="outline" className={cn(
                    'w-fit',
                    tx.status === 'pago' && 'bg-success/10 text-success border-success/20',
                    tx.status === 'pendente' && 'bg-warning/10 text-warning border-warning/20',
                    tx.status === 'cancelado' && 'bg-muted text-muted-foreground',
                  )}>
                    {tx.status === 'pago' ? 'Pago' : tx.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                  </Badge>
                  {tx.reembolso_status === 'pendente' && (
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20 w-fit">
                      Reembolso pend.
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(tx.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
