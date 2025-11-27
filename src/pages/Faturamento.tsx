import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { mockInvoices, getCompanyById } from '@/data/mockData';
import { Invoice } from '@/types/crm';
import { Plus, Search, Filter, MoreHorizontal, Upload, Download, DollarSign, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  a_receber: { label: 'A Receber', className: 'bg-warning/10 text-warning border-warning/20' },
  recebido: { label: 'Recebido', className: 'bg-success/10 text-success border-success/20' },
  em_atraso: { label: 'Em Atraso', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
};

const paymentLabels = {
  boleto: 'Boleto',
  pix: 'PIX',
  transferencia: 'Transferência',
  cartao: 'Cartão',
  outro: 'Outro',
};

export default function Faturamento() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredInvoices = useMemo(() => {
    return mockInvoices.filter(invoice => {
      const company = getCompanyById(invoice.companyId);
      const matchesSearch = searchTerm === '' ||
        invoice.numeroNota.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company?.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.cnpjCliente.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const received = mockInvoices
      .filter(i => i.status === 'recebido')
      .reduce((sum, i) => sum + i.valor, 0);
    const pending = mockInvoices
      .filter(i => i.status === 'a_receber')
      .reduce((sum, i) => sum + i.valor, 0);
    const overdue = mockInvoices
      .filter(i => i.status === 'em_atraso')
      .reduce((sum, i) => sum + i.valor, 0);
    const total = mockInvoices.reduce((sum, i) => sum + i.valor, 0);

    return { received, pending, overdue, total };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Faturamento"
        description="Controle de notas fiscais e recebimentos"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar NF
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fatura
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Faturado"
          value={formatCurrency(stats.total)}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title="Recebido"
          value={formatCurrency(stats.received)}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="A Receber"
          value={formatCurrency(stats.pending)}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Em Atraso"
          value={formatCurrency(stats.overdue)}
          icon={AlertCircle}
          variant="default"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, empresa ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
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
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nota Fiscal</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => {
              const company = getCompanyById(invoice.companyId);
              const status = statusConfig[invoice.status];

              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.numeroNota}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{company?.nomeFantasia}</p>
                      <p className="text-xs text-muted-foreground">{invoice.cnpjCliente}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-muted-foreground">{invoice.descricaoServico}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(invoice.dataEmissao)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(invoice.dataVencimento)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(invoice.valor)}</TableCell>
                  <TableCell className="text-muted-foreground">{paymentLabels[invoice.formaPagamento]}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(status.className)}>
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
                        <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem>Marcar como recebido</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Cancelar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
