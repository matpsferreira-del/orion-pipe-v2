import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useContacts, useDeleteContact, ContactRow } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { Plus, Search, Filter, MoreHorizontal, User, Pencil, Trash2, Download, Loader2, Mail, Phone, Building2, Upload, Linkedin } from 'lucide-react';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import { ImportContactsDialog } from '@/components/contacts/ImportContactsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

export default function Contatos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<ContactRow | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ContactRow | null>(null);

  const { data: contacts = [], isLoading } = useContacts();
  const { data: companies = [] } = useCompanies();
  const deleteContact = useDeleteContact();

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = searchTerm === '' ||
        contact.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.cargo && contact.cargo.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCompany = filterCompany === 'all' || contact.company_id === filterCompany;
      return matchesSearch && matchesCompany;
    });
  }, [contacts, searchTerm, filterCompany]);

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.nome_fantasia || 'Empresa não encontrada';
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
            placeholder="Buscar por nome, email ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {companies.map(company => (
              <SelectItem key={company.id} value={company.id}>{company.nome_fantasia}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contato</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
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
                        className="text-green-600 hover:underline"
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
                        className="flex items-center gap-1 text-blue-600 hover:underline"
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
