import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateInvoice, InvoiceInsert } from '@/hooks/useInvoices';
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
}

export function InvoiceDialog({ open, onOpenChange }: InvoiceDialogProps) {
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

  const handleCompanyChange = (id: string) => {
    setCompanyId(id);
    const company = companies.find(c => c.id === id);
    if (company) {
      setCnpjCliente(company.cnpj);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const invoice: InvoiceInsert = {
      company_id: companyId,
      numero_nota: numeroNota,
      cnpj_cliente: cnpjCliente,
      descricao_servico: descricaoServico,
      valor: parseFloat(valor) || 0,
      data_emissao: dataEmissao,
      data_vencimento: dataVencimento,
      forma_pagamento: formaPagamento,
    };

    createInvoice.mutate(invoice, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
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
                placeholder="00.000.000/0001-00"
                value={cnpjCliente}
                onChange={(e) => setCnpjCliente(e.target.value)}
                required
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
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Fatura
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
