import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCompanies } from '@/hooks/useCompanies';
import { useCreateContact, useUpdateContact, ContactInsert, ContactRow } from '@/hooks/useContacts';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCompanyId?: string;
  contact?: ContactRow | null;
}

export function ContactDialog({ open, onOpenChange, preSelectedCompanyId, contact }: ContactDialogProps) {
  const [companyId, setCompanyId] = useState(preSelectedCompanyId || '');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const isEditing = !!contact;

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  // Populate form when editing or reset when preSelectedCompanyId changes
  useEffect(() => {
    if (contact) {
      setCompanyId(contact.company_id);
      setNome(contact.nome);
      setCargo(contact.cargo || '');
      setEmail(contact.email);
      setTelefone(contact.telefone || '');
      setWhatsapp(contact.whatsapp || '');
      setLinkedin(contact.linkedin || '');
      setObservacoes(contact.observacoes || '');
      setIsPrimary(contact.is_primary || false);
    } else if (preSelectedCompanyId) {
      setCompanyId(preSelectedCompanyId);
    } else {
      resetForm();
    }
  }, [contact, preSelectedCompanyId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const contactData: ContactInsert = {
      company_id: companyId,
      nome,
      cargo,
      email,
      telefone: telefone || undefined,
      whatsapp: whatsapp || undefined,
      linkedin: linkedin || undefined,
      observacoes: observacoes || undefined,
      is_primary: isPrimary,
    };

    if (isEditing && contact) {
      updateContact.mutate({ id: contact.id, ...contactData }, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    } else {
      createContact.mutate(contactData, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    setCompanyId(preSelectedCompanyId || '');
    setNome('');
    setCargo('');
    setEmail('');
    setTelefone('');
    setWhatsapp('');
    setLinkedin('');
    setObservacoes('');
    setIsPrimary(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company">Empresa *</Label>
            {companiesLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando empresas...</span>
              </div>
            ) : companies.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma empresa cadastrada. Cadastre uma empresa primeiro.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo *</Label>
              <Input
                id="cargo"
                placeholder="Ex: Diretor de RH"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/in/usuario"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o contato..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
            />
            <Label htmlFor="isPrimary">Contato principal da empresa</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createContact.isPending || updateContact.isPending || !companyId || companies.length === 0}
            >
              {(createContact.isPending || updateContact.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Contato'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
