import { useMemo } from 'react';
import { Loader2, AlertCircle, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePendingReimbursements, useMarkReimbursementPaid } from '@/hooks/useFinancial';
import { useProfiles } from '@/hooks/useProfiles';
import { formatCurrency, formatDateBR } from '@/lib/financial/formatters';
import { cn } from '@/lib/utils';

export function FinancialReembolsos() {
  const { data: reimbursements = [], isLoading } = usePendingReimbursements();
  const { data: profiles = [] } = useProfiles();
  const markPaid = useMarkReimbursementPaid();

  const profilesMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p: any) => { m[p.id] = p.name; });
    return m;
  }, [profiles]);

  const groupedByPerson = useMemo(() => {
    const map = new Map<string, { name: string; total: number; items: typeof reimbursements }>();
    for (const r of reimbursements) {
      if (!r.responsavel_id) continue;
      const existing = map.get(r.responsavel_id) || {
        name: profilesMap[r.responsavel_id] || 'Membro',
        total: 0,
        items: [],
      };
      existing.total += Math.abs(Number(r.valor));
      existing.items.push(r);
      map.set(r.responsavel_id, existing);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [reimbursements, profilesMap]);

  const totalPending = reimbursements.reduce((s, r) => s + Math.abs(Number(r.valor)), 0);
  const today = new Date().toISOString().split('T')[0];
  const overdue = reimbursements.filter(r => r.data_vencimento < today).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Total a reembolsar</div>
            <div className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Pessoas aguardando</div>
            <div className="text-2xl font-bold">{groupedByPerson.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-destructive" /> Vencidos
            </div>
            <div className="text-2xl font-bold text-destructive">{overdue}</div>
          </CardContent>
        </Card>
      </div>

      {reimbursements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum reembolso pendente. ✨
          </CardContent>
        </Card>
      ) : (
        groupedByPerson.map(([userId, group]) => (
          <Card key={userId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {group.name}
                </CardTitle>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-base font-bold">
                  {formatCurrency(group.total)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map(item => {
                    const isOverdue = item.data_vencimento < today;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDateBR(item.data_referencia)}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate">{item.descricao || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.pacote} › {item.conta_contabil}
                        </TableCell>
                        <TableCell className={cn('whitespace-nowrap', isOverdue && 'text-destructive font-medium')}>
                          {formatDateBR(item.data_vencimento)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-destructive">
                          {formatCurrency(Math.abs(Number(item.valor)))}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-success/10 text-success border-success/20 hover:bg-success hover:text-success-foreground"
                            onClick={() => markPaid.mutate(item.id)}
                            disabled={markPaid.isPending}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Reembolsar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
