import { Opportunity } from '@/types/crm';
import { getCompanyById, getContactById, getUserById, pipelineStages, getActivitiesByOpportunity } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, User, Calendar, DollarSign, Target, Phone, Mail } from 'lucide-react';

interface OpportunityDetailProps {
  opportunity: Opportunity;
}

const sourceLabels = {
  indicacao: 'Indicação',
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Evento',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

const serviceLabels = {
  recrutamento_pontual: 'Recrutamento Pontual',
  programa_recorrente: 'Programa Recorrente',
  rpo: 'RPO',
  hunting: 'Hunting',
  consultoria: 'Consultoria',
};

export function OpportunityDetail({ opportunity }: OpportunityDetailProps) {
  const company = getCompanyById(opportunity.companyId);
  const contact = getContactById(opportunity.contactId);
  const responsavel = getUserById(opportunity.responsavelId);
  const stage = pipelineStages.find(s => s.key === opportunity.stage);
  const activities = getActivitiesByOpportunity(opportunity.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{company?.nomeFantasia}</h3>
          <p className="text-sm text-muted-foreground">{company?.razaoSocial}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {stage?.label}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Valor Potencial</p>
            <p className="font-semibold text-foreground">{formatCurrency(opportunity.valorPotencial)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Target className="h-5 w-5 text-success" />
          <div>
            <p className="text-xs text-muted-foreground">Probabilidade</p>
            <p className="font-semibold text-foreground">{opportunity.probabilidade}%</p>
          </div>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="spin">SPIN Selling</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          {/* Company Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">CNPJ:</span> {company?.cnpj}</p>
              <p><span className="text-muted-foreground">Segmento:</span> {company?.segmento}</p>
              <p><span className="text-muted-foreground">Localização:</span> {company?.cidade}/{company?.estado}</p>
            </CardContent>
          </Card>

          {/* Contact Info */}
          {contact && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contato Principal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{contact.nome}</p>
                <p className="text-muted-foreground">{contact.cargo}</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{contact.email}</span>
                </div>
                {contact.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{contact.telefone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Opportunity Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Detalhes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Criada em:</span> {formatDate(opportunity.createdAt)}</p>
              <p><span className="text-muted-foreground">Previsão de fechamento:</span> {formatDate(opportunity.dataPrevisaoFechamento)}</p>
              <p><span className="text-muted-foreground">Origem:</span> {sourceLabels[opportunity.origemLead]}</p>
              <p><span className="text-muted-foreground">Tipo de serviço:</span> {serviceLabels[opportunity.tipoServico]}</p>
              {responsavel && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {responsavel.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="font-medium">{responsavel.name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {opportunity.observacoes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{opportunity.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="spin" className="space-y-4 mt-4">
          {opportunity.spin ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-pipeline-lead">S - Situação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Como a empresa contrata hoje?</p>
                    <p className="text-foreground">{opportunity.spin.situacao.comoContrata}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tem time interno ou terceiriza?</p>
                    <p className="text-foreground">{opportunity.spin.situacao.timeInterno}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-pipeline-contact">P - Problema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Quais dificuldades no recrutamento?</p>
                    <p className="text-foreground">{opportunity.spin.problema.dificuldades}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tempo médio para fechar uma vaga?</p>
                    <p className="text-foreground">{opportunity.spin.problema.tempoMedio}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-pipeline-diagnostic">I - Implicação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Qual o impacto das vagas em aberto?</p>
                    <p className="text-foreground">{opportunity.spin.implicacao.impactoNegocios}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Existe perda de receita?</p>
                    <p className="text-foreground">{opportunity.spin.implicacao.perdaReceita}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-pipeline-won">N - Necessidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Cenário ideal de recrutamento?</p>
                    <p className="text-foreground">{opportunity.spin.necessidade.cenarioIdeal}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Qual a urgência?</p>
                    <p className="text-foreground">{opportunity.spin.necessidade.urgencia}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Diagnóstico SPIN não preenchido</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map(activity => {
                const user = getUserById(activity.userId);
                return (
                  <Card key={activity.id}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{activity.titulo}</p>
                          {activity.descricao && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.descricao}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {user?.name} • {formatDate(activity.data)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Nenhuma atividade registrada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
