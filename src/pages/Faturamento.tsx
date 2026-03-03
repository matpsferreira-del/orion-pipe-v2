import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice, InvoiceRow } from '@/hooks/useInvoices';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceDialog } from '@/components/invoices/InvoiceDialog';
import { Plus, Search, Filter, MoreHorizontal, Upload, Download, DollarSign, Clock, AlertCircle, CheckCircle2, Loader2, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  a_receber: { label: 'A Receber', className: 'bg-warning/10 text-warning border-warning/20' },
  recebido: { label: 'Recebido', className: 'bg-success/10 text-success border-success/20' },
  em_atraso: { label: 'Em Atraso', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
};

const paymentLabels: Record<string, string> = {
  boleto: 'Boleto',
  pix: 'PIX',
  transferencia: 'Transferência',
  cartao: 'Cartão',
  outro: 'Outro',
};

export default function Faturamento() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<InvoiceRow | null>(null);

  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { data: invoices = [], isLoading } = useInvoices();
  const { data: companies = [] } = useCompanies();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoiceMutation = useDeleteInvoice();

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const company = companies.find(c => c.id === invoice.company_id);
      const matchesSearch = searchTerm === '' ||
        invoice.numero_nota.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company?.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.cnpj_cliente.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, companies, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const received = invoices.filter(i => i.status === 'recebido').reduce((sum, i) => sum + Number(i.valor), 0);
    const pending = invoices.filter(i => i.status === 'a_receber').reduce((sum, i) => sum + Number(i.valor), 0);
    const overdue = invoices.filter(i => i.status === 'em_atraso').reduce((sum, i) => sum + Number(i.valor), 0);
    const total = invoices.reduce((sum, i) => sum + Number(i.valor), 0);
    return { received, pending, overdue, total };
  }, [invoices]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const handleMarkAsReceived = (id: string) => updateStatus.mutate({ id, status: 'recebido' });
  const handleEdit = (invoice: InvoiceRow) => { setEditingInvoice(invoice); setShowDialog(true); };
  const handleDelete = () => {
    if (deleteInvoice) {
      deleteInvoiceMutation.mutate(deleteInvoice.id, { onSuccess: () => setDeleteInvoice(null) });
    }
  };
  const handleDialogClose = (open: boolean) => { setShowDialog(open); if (!open) setEditingInvoice(null); };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Faturamento"
        description="Controle de notas fiscais e recebimentos"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="sm:hidden">
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem><Upload className="h-4 w-4 mr-2" />Importar NF</DropdownMenuItem>
                <DropdownMenuItem><Download className="h-4 w-4 mr-2" />Exportar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="hidden sm:flex">
              <Upload className="h-4 w-4 mr-2" />Importar NF
            </Button>
            <Button variant="outline" className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />Exportar
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Fatura</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Faturado" value={formatCurrency(stats.total)} icon={DollarSign} variant="primary" />
        <StatCard title="Recebido" value={formatCurrency(stats.received)} icon={CheckCircle2} variant="success" />
        <StatCard title="A Receber" value={formatCurrency(stats.pending)} icon={Clock} variant="warning" />
        <StatCard title="Em Atraso" value={formatCurrency(stats.overdue)} icon={AlertCircle} variant="default" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="a_receber">A Receber</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="em_atraso">Em Atraso</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nota Fiscal</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden lg:table-cell">Descrição</TableHead>
              <TableHead className="hidden xl:table-cell">Emissão</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma fatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const company = companies.find(c => c.id === invoice.company_id);
                const status = statusConfig[invoice.status] || statusConfig.a_receber;

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.numero_nota}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate">{company?.nome_fantasia || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground hidden sm:block">{invoice.cnpj_cliente}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] hidden lg:table-cell">
                      <p className="truncate text-muted-foreground">{invoice.descricao_servico}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden xl:table-cell">{formatDate(invoice.data_emissao)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(invoice.data_vencimento)}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{formatCurrency(Number(invoice.valor))}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{paymentLabels[invoice.forma_pagamento] || invoice.forma_pagamento}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(status.className, "whitespace-nowrap")}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invoice.status !== 'recebido' && (
                            <DropdownMenuItem onClick={() => handleMarkAsReceived(invoice.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />Marcar como recebido
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                <Pencil className="h-4 w-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteInvoice(invoice)}>
                                <Trash2 className="h-4 w-4 mr-2" />Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceDialog open={showDialog} onOpenChange={handleDialogClose} invoice={editingInvoice} />

      <AlertDialog open={!!deleteInvoice} onOpenChange={(open) => !open && setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a fatura <strong>{deleteInvoice?.numero_nota}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteInvoiceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
