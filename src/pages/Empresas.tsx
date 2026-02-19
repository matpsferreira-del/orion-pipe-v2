import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCompanies, useDeleteCompany, useCompanyCounts, CompanyRow } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useInvoices } from '@/hooks/useInvoices';
import { useProfiles } from '@/hooks/useProfiles';
import { Plus, Search, Filter, MoreHorizontal, Building2, Eye, Pencil, Trash2, Download, Loader2, UserPlus, Upload, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronRight, ChevronDown as ChevronDownIcon, Network, Merge, ChevronLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CompanyDetail } from '@/components/companies/CompanyDetail';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { ImportDialog } from '@/components/companies/ImportDialog';
import { ImportCnpjDialog } from '@/components/companies/ImportCnpjDialog';
import { CompanyDuplicatesDialog } from '@/components/companies/CompanyDuplicatesDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const PAGE_SIZE = 100;

const statusConfig: Record<string, { label: string; className: string }> = {
  prospect: { label: 'Prospect', className: 'status-badge prospect' },
  cliente_ativo: { label: 'Cliente Ativo', className: 'status-badge active' },
  cliente_inativo: { label: 'Cliente Inativo', className: 'status-badge inactive' },
};

const porteLabels: Record<string, string> = {
  micro: 'Micro',
  pequena: 'Pequena',
  media: 'Média',
  grande: 'Grande',
  enterprise: 'Enterprise',
};

type SortField = 'nome_fantasia' | 'cnpj' | 'segmento' | 'porte' | 'cidade' | 'status' | 'contatos' | 'oportunidades';
type SortDirection = 'asc' | 'desc';

export default function Empresas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSegmento, setFilterSegmento] = useState<string>('all');
  const [filterPorte, setFilterPorte] = useState<string>('all');
  const [filterCidade, setFilterCidade] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<CompanyRow | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCnpjDialogOpen, setImportCnpjDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyRow | null>(null);
  const [expandedHoldings, setExpandedHoldings] = useState<Set<string>>(new Set());
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);

  const [page, setPage] = useState(0);

  const { data: companies = [], isLoading } = useCompanies();
  const { data: companyCounts = [] } = useCompanyCounts();
  // Lazy-loaded: only needed when detail Sheet is open
  const { data: contacts = [] } = useContacts();
  const { data: opportunities = [] } = useOpportunities();
  const { data: invoices = [] } = useInvoices();
  const { data: profiles = [] } = useProfiles();
  const deleteCompany = useDeleteCompany();

  const countsMap = useMemo(() => {
    const map = new Map<string, { contacts: number; opportunities: number }>();
    companyCounts.forEach(c => {
      map.set(c.company_id, { contacts: c.contacts_count, opportunities: c.opportunities_count });
    });
    return map;
  }, [companyCounts]);

  const segmentos = useMemo(() => {
    return [...new Set(companies.map(c => c.segmento).filter(Boolean))];
  }, [companies]);

  const cidades = useMemo(() => {
    return [...new Set(companies.map(c => c.cidade).filter(Boolean))];
  }, [companies]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterSegmento !== 'all') count++;
    if (filterPorte !== 'all') count++;
    if (filterCidade !== 'all') count++;
    return count;
  }, [filterStatus, filterSegmento, filterPorte, filterCidade]);

  const clearAllFilters = () => {
    setFilterStatus('all');
    setFilterSegmento('all');
    setFilterPorte('all');
    setFilterCidade('all');
    setPage(0);
  };

  const filteredAndSortedCompanies = useMemo(() => {
    let result = companies.filter(company => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        company.nome_fantasia.toLowerCase().includes(term) ||
        company.razao_social.toLowerCase().includes(term) ||
        company.cnpj.includes(searchTerm) ||
        company.segmento.toLowerCase().includes(term) ||
        company.cidade.toLowerCase().includes(term) ||
        company.estado.toLowerCase().includes(term) ||
        (company.site && company.site.toLowerCase().includes(term));
      const matchesStatus = filterStatus === 'all' || company.status === filterStatus;
      const matchesSegmento = filterSegmento === 'all' || company.segmento === filterSegmento;
      const matchesPorte = filterPorte === 'all' || company.porte === filterPorte;
      const matchesCidade = filterCidade === 'all' || company.cidade === filterCidade;
      return matchesSearch && matchesStatus && matchesSegmento && matchesPorte && matchesCidade;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortField === 'contatos') {
          aValue = countsMap.get(a.id)?.contacts ?? 0;
          bValue = countsMap.get(b.id)?.contacts ?? 0;
        } else if (sortField === 'oportunidades') {
          aValue = countsMap.get(a.id)?.opportunities ?? 0;
          bValue = countsMap.get(b.id)?.opportunities ?? 0;
        } else {
          aValue = a[sortField] || '';
          bValue = b[sortField] || '';
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const comparison = String(aValue).localeCompare(String(bValue), 'pt-BR', { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [companies, countsMap, searchTerm, filterStatus, filterSegmento, filterPorte, filterCidade, sortField, sortDirection]);

  // Pagination for top-level list
  const totalPages = Math.ceil(filteredAndSortedCompanies.length / PAGE_SIZE);
  const paginatedCompanies = useMemo(() => {
    return filteredAndSortedCompanies.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredAndSortedCompanies, page]);

  const handleSort = (field: SortField) => {
    setPage(0);
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getContactsCount = (companyId: string) => {
    return countsMap.get(companyId)?.contacts ?? 0;
  };

  const getOpportunitiesCount = (companyId: string) => {
    return countsMap.get(companyId)?.opportunities ?? 0;
  };

  const handleDeleteClick = (company: CompanyRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (companyToDelete) {
      deleteCompany.mutate(companyToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setCompanyToDelete(null);
        },
      });
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Empresa': 'Empresa Exemplo LTDA',
        'Nome Fantasia': 'Exemplo',
        'CNPJ': '12.345.678/0001-90',
        'Nome do responsável': 'João Silva',
        'Email': 'joao@empresa.com',
        'Telefone': '(11) 99999-9999',
        'Segmento': 'Tecnologia',
        'Porte': 'media',
        'Cidade': 'São Paulo',
        'Estado': 'SP',
      },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    
    worksheet['!cols'] = [
      { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 25 }, { wch: 30 }, { wch: 18 },
      { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 8 },
    ];
    
    XLSX.writeFile(workbook, 'modelo_importacao_empresas.xlsx');
    toast.success('Modelo baixado com sucesso!');
  };

  const handleExport = () => {
    const dataToExport = filteredAndSortedCompanies.map(company => {
      const companyContacts = contacts.filter(c => c.company_id === company.id);
      const primaryContact = companyContacts.find(c => c.is_primary) || companyContacts[0];
      const parentCompany = company.parent_company_id 
        ? companies.find(c => c.id === company.parent_company_id) 
        : null;

      return {
        'Nome Fantasia': company.nome_fantasia,
        'Razão Social': company.razao_social,
        'CNPJ': company.cnpj,
        'Segmento': company.segmento,
        'Porte': porteLabels[company.porte] || company.porte,
        'Cidade': company.cidade,
        'Estado': company.estado,
        'Status': statusConfig[company.status]?.label || company.status,
        'Site': company.site || '',
        'Holding': parentCompany?.nome_fantasia || '',
        'Contato Principal': primaryContact?.nome || '',
        'Email Contato': primaryContact?.email || '',
        'Telefone Contato': primaryContact?.telefone || '',
        'Nº Contatos': companyContacts.length,
        'Nº Oportunidades': opportunities.filter(o => o.company_id === company.id).length,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');

    worksheet['!cols'] = [
      { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 12 },
      { wch: 18 }, { wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
      { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 15 },
    ];

    XLSX.writeFile(workbook, `empresas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${dataToExport.length} empresas exportadas com sucesso!`);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Empresas"
        description="Gerencie empresas e prospects"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDuplicatesDialogOpen(true)}>
              <Merge className="h-4 w-4 mr-2" />
              Revisar Duplicatas
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownloadTemplate} title="Baixar modelo Excel">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" onClick={() => setImportCnpjDialogOpen(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar CNPJs
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setContactDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
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
            placeholder="Buscar por nome, CNPJ, contato, cidade..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-popover" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-auto py-1 px-2 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Limpar todos
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="cliente_ativo">Cliente Ativo</SelectItem>
                    <SelectItem value="cliente_inativo">Cliente Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Segmento</label>
                <Select value={filterSegmento} onValueChange={setFilterSegmento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os segmentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os segmentos</SelectItem>
                    {segmentos.map(seg => (
                      <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Porte</label>
                <Select value={filterPorte} onValueChange={setFilterPorte}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os portes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os portes</SelectItem>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="pequena">Pequena</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <Select value={filterCidade} onValueChange={setFilterCidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {cidades.map(cidade => (
                      <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            {filterStatus !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {statusConfig[filterStatus]?.label || filterStatus}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatus('all')} />
              </Badge>
            )}
            {filterSegmento !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {filterSegmento}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterSegmento('all')} />
              </Badge>
            )}
            {filterPorte !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {porteLabels[filterPorte] || filterPorte}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterPorte('all')} />
              </Badge>
            )}
            {filterCidade !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {filterCidade}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCidade('all')} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('nome_fantasia')}
              >
                <div className="flex items-center">
                  Empresa
                  <SortIcon field="nome_fantasia" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('cnpj')}
              >
                <div className="flex items-center">
                  CNPJ
                  <SortIcon field="cnpj" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('segmento')}
              >
                <div className="flex items-center">
                  Segmento
                  <SortIcon field="segmento" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('porte')}
              >
                <div className="flex items-center">
                  Porte
                  <SortIcon field="porte" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('cidade')}
              >
                <div className="flex items-center">
                  Localização
                  <SortIcon field="cidade" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('contatos')}
              >
                <div className="flex items-center justify-center">
                  Contatos
                  <SortIcon field="contatos" />
                </div>
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('oportunidades')}
              >
                <div className="flex items-center justify-center">
                  Oportunidades
                  <SortIcon field="oportunidades" />
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma empresa encontrada
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                // Build tree: holdings (no parent) first, then subsidiaries grouped
                const childrenMap = new Map<string, CompanyRow[]>();
                const topLevel: CompanyRow[] = [];
                
                paginatedCompanies.forEach(c => {
                  if (c.parent_company_id) {
                    const siblings = childrenMap.get(c.parent_company_id) || [];
                    siblings.push(c);
                    childrenMap.set(c.parent_company_id, siblings);
                  }
                });
                
                paginatedCompanies.forEach(c => {
                  if (!c.parent_company_id) {
                    topLevel.push(c);
                  }
                });

                // Also show orphaned children (parent not in filtered list)
                paginatedCompanies.forEach(c => {
                  if (c.parent_company_id && !paginatedCompanies.find(p => p.id === c.parent_company_id)) {
                    topLevel.push(c);
                  }
                });

                const renderCompanyRow = (company: CompanyRow, isChild: boolean = false) => {
                  const status = statusConfig[company.status] || statusConfig.prospect;
                  const children = childrenMap.get(company.id) || [];
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedHoldings.has(company.id);

                  return (
                    <React.Fragment key={company.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCompany(company)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2" style={{ paddingLeft: isChild ? '24px' : '0' }}>
                            {hasChildren && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedHoldings(prev => {
                                    const next = new Set(prev);
                                    if (next.has(company.id)) next.delete(company.id);
                                    else next.add(company.id);
                                    return next;
                                  });
                                }}
                              >
                                {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            )}
                            {isChild && !hasChildren && (
                              <span className="w-6 shrink-0 flex items-center justify-center text-muted-foreground">└</span>
                            )}
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              {hasChildren ? <Network className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-primary" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{company.nome_fantasia}</p>
                                {hasChildren && (
                                  <Badge variant="outline" className="text-xs">
                                    Grupo ({children.length})
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{company.razao_social}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{company.cnpj}</TableCell>
                        <TableCell>{company.segmento}</TableCell>
                        <TableCell>{porteLabels[company.porte] || company.porte}</TableCell>
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
                              <DropdownMenuItem onClick={(e) => { 
                                e.stopPropagation(); 
                                setCompanyToEdit(company);
                                setDialogOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive" 
                                onClick={(e) => handleDeleteClick(company, e)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {isExpanded && children.map(child => renderCompanyRow(child, true))}
                    </React.Fragment>
                  );
                };

                return topLevel.map(company => renderCompanyRow(company));
              })()
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredAndSortedCompanies.length)} de {filteredAndSortedCompanies.length} empresas
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Página {page + 1} de {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}


      <Sheet open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Empresa</SheetTitle>
          </SheetHeader>
          {selectedCompany && (
            <CompanyDetail 
              company={selectedCompany} 
              contacts={contacts}
              opportunities={opportunities}
              invoices={invoices}
              profiles={profiles}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Company Dialog */}
      <CompanyDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setCompanyToEdit(null);
        }} 
        company={companyToEdit}
      />

      {/* Contact Dialog */}
      <ContactDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />

      {/* Import Dialog */}
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {/* Import CNPJ Dialog */}
      <ImportCnpjDialog open={importCnpjDialogOpen} onOpenChange={setImportCnpjDialogOpen} />

      {/* Company Duplicates Dialog */}
      <CompanyDuplicatesDialog open={duplicatesDialogOpen} onOpenChange={setDuplicatesDialogOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa "{companyToDelete?.nome_fantasia}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCompany.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
