import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCompanies, useDeleteCompany, CompanyRow } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useInvoices } from '@/hooks/useInvoices';
import { useProfiles } from '@/hooks/useProfiles';
import { Plus, Search, Filter, MoreHorizontal, Building2, Eye, Pencil, Trash2, Download, Loader2, UserPlus, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CompanyDetail } from '@/components/companies/CompanyDetail';
import { CompanyDialog } from '@/components/companies/CompanyDialog';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { ImportDialog } from '@/components/companies/ImportDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

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

export default function Empresas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSegmento, setFilterSegmento] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyRow | null>(null);

  const { data: companies = [], isLoading } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: opportunities = [] } = useOpportunities();
  const { data: invoices = [] } = useInvoices();
  const { data: profiles = [] } = useProfiles();
  const deleteCompany = useDeleteCompany();

  const segmentos = useMemo(() => {
    return [...new Set(companies.map(c => c.segmento))];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const matchesSearch = searchTerm === '' ||
        company.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.cnpj.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || company.status === filterStatus;
      const matchesSegmento = filterSegmento === 'all' || company.segmento === filterSegmento;
      return matchesSearch && matchesStatus && matchesSegmento;
    });
  }, [companies, searchTerm, filterStatus, filterSegmento]);

  const getContactsCount = (companyId: string) => {
    return contacts.filter(c => c.company_id === companyId).length;
  };

  const getOpportunitiesCount = (companyId: string) => {
    return opportunities.filter(o => o.company_id === companyId).length;
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
        'Nome do responsável': 'João Silva',
        'Email': 'joao@empresa.com',
        'Telefone': '(11) 99999-9999',
        'Porte': 'media',
        'Cidade': 'São Paulo',
        'Estado': 'SP',
      },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Empresa
      { wch: 25 }, // Nome do responsável
      { wch: 30 }, // Email
      { wch: 18 }, // Telefone
      { wch: 12 }, // Porte
      { wch: 20 }, // Cidade
      { wch: 8 },  // Estado
    ];
    
    XLSX.writeFile(workbook, 'modelo_importacao_empresas.xlsx');
    toast.success('Modelo baixado com sucesso!');
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
            <Button variant="ghost" size="icon" onClick={handleDownloadTemplate} title="Baixar modelo Excel">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline">
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
            {filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma empresa encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => {
                const status = statusConfig[company.status] || statusConfig.prospect;
                
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
                          <p className="font-medium text-foreground">{company.nome_fantasia}</p>
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
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Company Detail Sheet */}
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
      <CompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Contact Dialog */}
      <ContactDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />

      {/* Import Dialog */}
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

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
