import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { mockCompanies, mockContacts, getUserById, getOpportunitiesByCompany } from '@/data/mockData';
import { Company } from '@/types/crm';
import { Plus, Search, Filter, MoreHorizontal, Building2, Eye, Pencil, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CompanyDetail } from '@/components/companies/CompanyDetail';

const statusConfig = {
  prospect: { label: 'Prospect', className: 'status-badge prospect' },
  cliente_ativo: { label: 'Cliente Ativo', className: 'status-badge active' },
  cliente_inativo: { label: 'Cliente Inativo', className: 'status-badge inactive' },
};

const porteLabels = {
  micro: 'Micro',
  pequena: 'Pequena',
  media: 'Média',
  grande: 'Grande',
  enterprise: 'Enterprise',
};

export default function Empresas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSegmento, setFilterSegmento] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const segmentos = useMemo(() => {
    return [...new Set(mockCompanies.map(c => c.segmento))];
  }, []);

  const filteredCompanies = useMemo(() => {
    return mockCompanies.filter(company => {
      const matchesSearch = searchTerm === '' ||
        company.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.cnpj.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || company.status === filterStatus;
      const matchesSegmento = filterSegmento === 'all' || company.segmento === filterSegmento;
      return matchesSearch && matchesStatus && matchesSegmento;
    });
  }, [searchTerm, filterStatus, filterSegmento]);

  const getContactsCount = (companyId: string) => {
    return mockContacts.filter(c => c.companyId === companyId).length;
  };

  const getOpportunitiesCount = (companyId: string) => {
    return getOpportunitiesByCompany(companyId).length;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Empresas"
        description="Gerencie empresas e prospects"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, razão social ou CNPJ..."
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
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="cliente_ativo">Cliente Ativo</SelectItem>
            <SelectItem value="cliente_inativo">Cliente Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSegmento} onValueChange={setFilterSegmento}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            {segmentos.map(seg => (
              <SelectItem key={seg} value={seg}>{seg}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Porte</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Contatos</TableHead>
              <TableHead className="text-center">Oportunidades</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => {
              const responsavel = company.responsavelId ? getUserById(company.responsavelId) : null;
              const status = statusConfig[company.status];
              
              return (
                <TableRow 
                  key={company.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCompany(company)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{company.nomeFantasia}</p>
                        <p className="text-xs text-muted-foreground">{responsavel?.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{company.cnpj}</TableCell>
                  <TableCell>{company.segmento}</TableCell>
                  <TableCell>{porteLabels[company.porte]}</TableCell>
                  <TableCell className="text-muted-foreground">{company.cidade}/{company.estado}</TableCell>
                  <TableCell>
                    <span className={cn(status.className)}>{status.label}</span>
                  </TableCell>
                  <TableCell className="text-center">{getContactsCount(company.id)}</TableCell>
                  <TableCell className="text-center">{getOpportunitiesCount(company.id)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedCompany(company); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Company Detail Sheet */}
      <Sheet open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Empresa</SheetTitle>
          </SheetHeader>
          {selectedCompany && <CompanyDetail company={selectedCompany} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
