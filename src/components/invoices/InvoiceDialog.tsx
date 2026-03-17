import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateInvoice, useUpdateInvoice, InvoiceInsert, InvoiceRow } from '@/hooks/useInvoices';
import { useCompanies } from '@/hooks/useCompanies';
import { Loader2 } from 'lucide-react';

const paymentOptions = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'outro', label: 'Outro' },
];

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceRow | null;
}

export function InvoiceDialog({ open, onOpenChange, invoice }: InvoiceDialogProps) {
  const [companyId, setCompanyId] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  const [cnpjCliente, setCnpjCliente] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');
  const [valor, setValor] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('boleto');

  const { data: companies = [] } = useCompanies();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const isEditing = !!invoice;

  useEffect(() => {
    if (invoice) {
      setCompanyId(invoice.company_id);
      setNumeroNota(invoice.numero_nota);
      setCnpjCliente(invoice.cnpj_cliente);
      setDescricaoServico(invoice.descricao_servico);
      setValor(String(invoice.valor));
      setDataEmissao(invoice.data_emissao);
      setDataVencimento(invoice.data_vencimento);
      setFormaPagamento(invoice.forma_pagamento);
    } else {
      resetForm();
    }
  }, [invoice, open]);

  const handleCompanyChange = (id: string) => {
    setCompanyId(id);
    const company = companies.find(c => c.id === id);
    if (company) {
      setCnpjCliente(company.cnpj);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: InvoiceInsert = {
      company_id: companyId,
      numero_nota: numeroNota,
      cnpj_cliente: cnpjCliente,
      descricao_servico: descricaoServico,
      valor: parseFloat(valor) || 0,
      data_emissao: dataEmissao,
      data_vencimento: dataVencimento,
      forma_pagamento: formaPagamento,
    };

    if (isEditing) {
      updateInvoice.mutate({ id: invoice.id, ...data }, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    } else {
      const company = companies.find(c => c.id === companyId);
      createInvoice.mutate({ ...data, _companyName: company?.nome_fantasia }, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    setCompanyId('');
    setNumeroNota('');
    setCnpjCliente('');
    setDescricaoServico('');
    setValor('');
    setDataEmissao('');
    setDataVencimento('');
    setFormaPagamento('boleto');
  };

  const isPending = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Fatura' : 'Nova Fatura'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Cliente *</Label>
              <Select value={companyId} onValueChange={handleCompanyChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numeroNota">Número da Nota *</Label>
              <Input
                id="numeroNota"
                placeholder="NF-2024-001"
                value={numeroNota}
                onChange={(e) => setNumeroNota(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ Cliente *</Label>
              <Input
                id="cnpj"
                placeholder="Selecione um cliente"
                value={cnpjCliente}
                readOnly
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="15000.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do Serviço *</Label>
            <Textarea
              id="descricao"
              placeholder="Serviço de recrutamento e seleção..."
              value={descricaoServico}
              onChange={(e) => setDescricaoServico(e.target.value)}
              required
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataEmissao">Data de Emissão *</Label>
              <Input
                id="dataEmissao"
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataVencimento">Data de Vencimento *</Label>
              <Input
                id="dataVencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pagamento">Forma de Pagamento *</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentOptions.map((opt) => (
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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Fatura'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
