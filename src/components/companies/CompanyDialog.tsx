import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCompany, useUpdateCompany, useCompanies, CompanyInsert, CompanyRow } from '@/hooks/useCompanies';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const porteOptions = [
  { value: 'micro', label: 'Micro' },
  { value: 'pequena', label: 'Pequena' },
  { value: 'media', label: 'Média' },
  { value: 'grande', label: 'Grande' },
  { value: 'enterprise', label: 'Enterprise' },
];

const statusOptions = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'cliente_ativo', label: 'Cliente Ativo' },
  { value: 'cliente_inativo', label: 'Cliente Inativo' },
];

const segmentoOptions = [
  'Tecnologia',
  'Financeiro',
  'Indústria',
  'Varejo',
  'Logística',
  'Saúde',
  'Educação',
  'Serviços',
  'Agronegócio',
  'Outro',
];

const estadoOptions = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyRow | null;
}

export function CompanyDialog({ open, onOpenChange, company }: CompanyDialogProps) {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [site, setSite] = useState('');
  const [segmento, setSegmento] = useState('');
  const [porte, setPorte] = useState('media');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [status, setStatus] = useState('prospect');
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  const isEditing = !!company;

  const { data: companies = [] } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  // Populate form when editing
  useEffect(() => {
    if (company) {
      setRazaoSocial(company.razao_social);
      setNomeFantasia(company.nome_fantasia);
      setCnpj(company.cnpj);
      setSite(company.site || '');
      setSegmento(company.segmento);
      setPorte(company.porte);
      setCidade(company.cidade);
      setEstado(company.estado);
      setStatus(company.status);
      setCnpjError(null);
    } else {
      resetForm();
    }
  }, [company]);

  // Normalize CNPJ for comparison (remove formatting)
  const normalizeCnpj = (value: string) => value.replace(/\D/g, '');

  // Check if CNPJ already exists (excluding current company when editing)
  const cnpjExists = useMemo(() => {
    if (!cnpj) return false;
    const normalizedInput = normalizeCnpj(cnpj);
    return companies.some(c => 
      normalizeCnpj(c.cnpj) === normalizedInput && 
      (!isEditing || c.id !== company?.id)
    );
  }, [cnpj, companies, isEditing, company]);

  const handleCnpjChange = (value: string) => {
    setCnpj(value);
    const normalizedInput = normalizeCnpj(value);
    if (normalizedInput.length >= 14) {
      const exists = companies.some(c => normalizeCnpj(c.cnpj) === normalizedInput);
      if (exists) {
        const existingCompany = companies.find(c => normalizeCnpj(c.cnpj) === normalizedInput);
        setCnpjError(`CNPJ já cadastrado para a empresa "${existingCompany?.nome_fantasia}"`);
      } else {
        setCnpjError(null);
      }
    } else {
      setCnpjError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cnpjExists) {
      return;
    }
    
    const companyData: CompanyInsert = {
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      cnpj,
      site: site || undefined,
      segmento,
      porte,
      cidade,
      estado,
      status,
    };

    if (isEditing && company) {
      updateCompany.mutate({ id: company.id, ...companyData }, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    } else {
      createCompany.mutate(companyData, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    setRazaoSocial('');
    setNomeFantasia('');
    setCnpj('');
    setSite('');
    setSegmento('');
    setPorte('media');
    setCidade('');
    setEstado('');
    setStatus('prospect');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social *</Label>
              <Input
                id="razaoSocial"
                placeholder="Empresa Ltda"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
              <Input
                id="nomeFantasia"
                placeholder="Empresa"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                className={cnpjError ? 'border-destructive' : ''}
                required
              />
              {cnpjError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs ml-2">
                    {cnpjError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Input
                id="site"
                placeholder="www.empresa.com.br"
                value={site}
                onChange={(e) => setSite(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento *</Label>
              <Select value={segmento} onValueChange={setSegmento} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {segmentoOptions.map((seg) => (
                    <SelectItem key={seg} value={seg}>
                      {seg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="porte">Porte *</Label>
              <Select value={porte} onValueChange={setPorte}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {porteOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                placeholder="São Paulo"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select value={estado} onValueChange={setEstado} required>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {estadoOptions.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending || !!cnpjError}>
              {(createCompany.isPending || updateCompany.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Empresa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
