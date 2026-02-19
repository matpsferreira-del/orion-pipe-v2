import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useContacts, useDeleteContact, ContactRow } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { Plus, Search, Filter, MoreHorizontal, User, Pencil, Trash2, Download, Loader2, Mail, Phone, Building2, Upload, Linkedin, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { ImportContactsDialog } from '@/components/contacts/ImportContactsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

const PAGE_SIZE = 100;

type SortField = 'nome' | 'company' | 'cargo' | 'email' | 'telefone';
type SortDirection = 'asc' | 'desc';

export default function Contatos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [filterPrimary, setFilterPrimary] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<ContactRow | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ContactRow | null>(null);
  const [page, setPage] = useState(0);

  const { data: contacts = [], isLoading } = useContacts();
  const { data: companies = [] } = useCompanies();
  const deleteContact = useDeleteContact();

  // O(1) lookup map for company names
  const companyMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach(c => map.set(c.id, c.nome_fantasia));
    return map;
  }, [companies]);

  const getCompanyName = useCallback((companyId: string) => {
    return companyMap.get(companyId) || 'Empresa não encontrada';
  }, [companyMap]);

  const cargos = useMemo(() => {
    return [...new Set(contacts.map(c => c.cargo).filter(Boolean))];
  }, [contacts]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterCompany !== 'all') count++;
    if (filterCargo !== 'all') count++;
    if (filterPrimary !== 'all') count++;
    return count;
  }, [filterCompany, filterCargo, filterPrimary]);

  const clearAllFilters = () => {
    setFilterCompany('all');
    setFilterCargo('all');
    setFilterPrimary('all');
    setPage(0);
  };

  const filteredAndSortedContacts = useMemo(() => {
    let result = contacts.filter(contact => {
      const term = searchTerm.toLowerCase();
      const companyName = getCompanyName(contact.company_id).toLowerCase();
      const matchesSearch = searchTerm === '' ||
        contact.nome.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term) ||
        (contact.cargo && contact.cargo.toLowerCase().includes(term)) ||
        companyName.includes(term) ||
        (contact.telefone && contact.telefone.toLowerCase().includes(term)) ||
        (contact.whatsapp && contact.whatsapp.toLowerCase().includes(term)) ||
        (contact.linkedin && contact.linkedin.toLowerCase().includes(term));
      const matchesCompany = filterCompany === 'all' || contact.company_id === filterCompany;
      const matchesCargo = filterCargo === 'all' || contact.cargo === filterCargo;
      const matchesPrimary = filterPrimary === 'all' || 
        (filterPrimary === 'primary' && contact.is_primary) ||
        (filterPrimary === 'secondary' && !contact.is_primary);
      return matchesSearch && matchesCompany && matchesCargo && matchesPrimary;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let aValue: string;
        let bValue: string;

        if (sortField === 'company') {
          aValue = getCompanyName(a.company_id);
          bValue = getCompanyName(b.company_id);
        } else {
          aValue = a[sortField] || '';
          bValue = b[sortField] || '';
        }

        const comparison = String(aValue).localeCompare(String(bValue), 'pt-BR', { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [contacts, companyMap, searchTerm, filterCompany, filterCargo, filterPrimary, sortField, sortDirection, getCompanyName]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedContacts.length / PAGE_SIZE);
  const paginatedContacts = useMemo(() => {
    return filteredAndSortedContacts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredAndSortedContacts, page]);

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


  const handleDeleteClick = (contact: ContactRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (contactToDelete) {
      deleteContact.mutate(contactToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setContactToDelete(null);
        },
      });
    }
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
        title="Contatos"
        description="Gerencie os contatos das empresas"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, empresa, telefone..."
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
                <label className="text-sm font-medium">Empresa</label>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.id}>{company.nome_fantasia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo</label>
                <Select value={filterCargo} onValueChange={setFilterCargo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os cargos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {cargos.map(cargo => (
                      <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={filterPrimary} onValueChange={setFilterPrimary}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="primary">Contato Principal</SelectItem>
                    <SelectItem value="secondary">Contato Secundário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2">
            {filterCompany !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {companies.find(c => c.id === filterCompany)?.nome_fantasia || filterCompany}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCompany('all')} />
              </Badge>
            )}
            {filterCargo !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {filterCargo}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCargo('all')} />
              </Badge>
            )}
            {filterPrimary !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {filterPrimary === 'primary' ? 'Principal' : 'Secundário'}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterPrimary('all')} />
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
                onClick={() => handleSort('nome')}
              >
                <div className="flex items-center">
                  Contato
                  <SortIcon field="nome" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('company')}
              >
                <div className="flex items-center">
                  Empresa
                  <SortIcon field="company" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('cargo')}
              >
                <div className="flex items-center">
                  Cargo
                  <SortIcon field="cargo" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center">
                  Email
                  <SortIcon field="email" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('telefone')}
              >
                <div className="flex items-center">
                  Telefone
                  <SortIcon field="telefone" />
                </div>
              </TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginatedContacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{contact.nome}</p>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">Principal</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      {getCompanyName(contact.company_id)}
                    </div>
                  </TableCell>
                  <TableCell>{contact.cargo || '-'}</TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a 
                        href={`mailto:${contact.email}`} 
                        className="flex items-center gap-1 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {contact.telefone ? (
                      <a 
                        href={`tel:${contact.telefone}`} 
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {contact.telefone}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {contact.whatsapp ? (
                      <a 
                        href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-success"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contact.whatsapp}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {contact.linkedin ? (
                      <a 
                        href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Linkedin className="h-3 w-3" />
                        Perfil
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setContactToEdit(contact);
                          setDialogOpen(true);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={(e) => handleDeleteClick(contact, e)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredAndSortedContacts.length)} de {filteredAndSortedContacts.length} contatos
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


      {/* Contact Dialog */}
      <ContactDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setContactToEdit(null);
        }}
        contact={contactToEdit}
      />

      {/* Import Dialog */}
      <ImportContactsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato "{contactToDelete?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContact.isPending ? (
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
