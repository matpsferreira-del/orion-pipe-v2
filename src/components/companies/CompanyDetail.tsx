import { CompanyRow } from '@/hooks/useCompanies';
import { ContactRow } from '@/hooks/useContacts';
import { OpportunityRow } from '@/hooks/useOpportunities';
import { InvoiceRow } from '@/hooks/useInvoices';
import { ProfileRow } from '@/hooks/useProfiles';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Globe, Mail, Phone, User, Target, Receipt, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pipelineStages } from '@/data/mockData';

interface CompanyDetailProps {
  company: CompanyRow;
  contacts: ContactRow[];
  opportunities: OpportunityRow[];
  invoices: InvoiceRow[];
  profiles: ProfileRow[];
}

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

export function CompanyDetail({ company, contacts, opportunities, invoices, profiles }: CompanyDetailProps) {
  const companyContacts = contacts.filter(c => c.company_id === company.id);
  const companyOpportunities = opportunities.filter(o => o.company_id === company.id);
  const companyInvoices = invoices.filter(i => i.company_id === company.id);
  const responsavel = company.responsavel_id 
    ? profiles.find(p => p.id === company.responsavel_id) 
    : null;
  const status = statusConfig[company.status] || statusConfig.prospect;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const totalFaturado = companyInvoices
    .filter(i => i.status === 'recebido')
    .reduce((sum, i) => sum + Number(i.valor), 0);

  const totalPipeline = companyOpportunities
    .filter(o => !['fechado_ganhou', 'fechado_perdeu'].includes(o.stage))
    .reduce((sum, o) => sum + Number(o.valor_potencial), 0);

  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">{company.nome_fantasia}</h3>
            <p className="text-sm text-muted-foreground">{company.razao_social}</p>
          </div>
        </div>
        <span className={cn(status.className)}>{status.label}</span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Total Faturado</p>
          <p className="text-lg font-semibold text-success">{formatCurrency(totalFaturado)}</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Pipeline Ativo</p>
          <p className="text-lg font-semibold text-primary">{formatCurrency(totalPipeline)}</p>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="contacts">Contatos ({companyContacts.length})</TabsTrigger>
          <TabsTrigger value="opportunities">Oportunidades ({companyOpportunities.length})</TabsTrigger>
          <TabsTrigger value="invoices">Faturas ({companyInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{company.cnpj}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Segmento</p>
                  <p className="font-medium">{company.segmento}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Porte</p>
                  <p className="font-medium">{porteLabels[company.porte] || company.porte}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Localização</p>
                  <p className="font-medium">{company.cidade}/{company.estado}</p>
                </div>
              </div>
              {company.site && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={`https://${company.site}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {company.site}
                  </a>
                </div>
              )}
              {responsavel && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {responsavel.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="font-medium">{responsavel.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          {companyContacts.length > 0 ? (
            <div className="space-y-3">
              {companyContacts.map(contact => (
                <Card key={contact.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {contact.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{contact.nome}</p>
                          {contact.is_primary && (
                            <Badge variant="secondary" className="text-xs">Principal</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{contact.cargo}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{contact.email}</span>
                          </div>
                          {contact.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{contact.telefone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhum contato cadastrado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          {companyOpportunities.length > 0 ? (
            <div className="space-y-3">
              {companyOpportunities.map(opp => {
                const stage = pipelineStages.find(s => s.key === opp.stage);
                return (
                  <Card key={opp.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Target className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{formatCurrency(Number(opp.valor_potencial))}</p>
                            <p className="text-sm text-muted-foreground">{opp.probabilidade}% de probabilidade</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{stage?.label || opp.stage}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Previsão: {formatDate(opp.data_previsao_fechamento)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma oportunidade</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {companyInvoices.length > 0 ? (
            <div className="space-y-3">
              {companyInvoices.map(invoice => (
                <Card key={invoice.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Receipt className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{invoice.numero_nota}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {invoice.descricao_servico}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(Number(invoice.valor))}</p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            invoice.status === 'recebido' && 'bg-success/10 text-success border-success/20',
                            invoice.status === 'a_receber' && 'bg-warning/10 text-warning border-warning/20',
                            invoice.status === 'em_atraso' && 'bg-destructive/10 text-destructive border-destructive/20'
                          )}
                        >
                          {invoice.status === 'recebido' ? 'Recebido' : 
                           invoice.status === 'a_receber' ? 'A Receber' : 'Em Atraso'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma fatura</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
