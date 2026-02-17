import { useState } from 'react';
import { CompanyRow, useCompanies } from '@/hooks/useCompanies';
import { ContactRow } from '@/hooks/useContacts';
import { OpportunityRow } from '@/hooks/useOpportunities';
import { InvoiceRow } from '@/hooks/useInvoices';
import { ProfileRow } from '@/hooks/useProfiles';
import { useActivitiesByCompany, ActivityRow } from '@/hooks/useActivities';
import { useTasksByCompany, TaskRow as TaskRowType } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Globe, Mail, Phone, User, Target, Receipt, Building2, Plus, Calendar, Clock, MessageSquare, PhoneCall, Send, FileText, MoreHorizontal, CheckCircle2, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pipelineStages } from '@/data/mockData';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivityDialog } from '@/components/activities/ActivityDialog';

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

const activityTypeIcons: Record<string, React.ElementType> = {
  ligacao: PhoneCall,
  reuniao: Calendar,
  email: Send,
  proposta: FileText,
  followup: Clock,
  outro: MessageSquare,
};

const activityTypeLabels: Record<string, string> = {
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  email: 'Email',
  proposta: 'Proposta',
  followup: 'Follow-up',
  outro: 'Outro',
};

export function CompanyDetail({ company, contacts, opportunities, invoices, profiles }: CompanyDetailProps) {
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  
  const { data: allCompanies = [] } = useCompanies();
  const { data: activities = [] } = useActivitiesByCompany(company.id);
  const { data: tasks = [] } = useTasksByCompany(company.id);
  
  const subsidiaries = allCompanies.filter(c => c.parent_company_id === company.id);
  const parentCompany = company.parent_company_id 
    ? allCompanies.find(c => c.id === company.parent_company_id) 
    : null;
  
  const companyContacts = contacts.filter(c => c.company_id === company.id);
  const companyOpportunities = opportunities.filter(o => o.company_id === company.id);
  const companyInvoices = invoices.filter(i => i.company_id === company.id);
  const responsavel = company.responsavel_id 
    ? profiles.find(p => p.id === company.responsavel_id) 
    : null;
  const status = statusConfig[company.status] || statusConfig.prospect;

  const pendingTasks = tasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatActivityDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Hoje';
    if (isTomorrow(d)) return 'Amanhã';
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  };

  const getUserName = (userId: string) => {
    return profiles.find(p => p.id === userId)?.name || 'Usuário';
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="grupo">Grupo ({subsidiaries.length})</TabsTrigger>
          <TabsTrigger value="activities">Atividades ({activities.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contatos ({companyContacts.length})</TabsTrigger>
          <TabsTrigger value="opportunities">Oport. ({companyOpportunities.length})</TabsTrigger>
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

          {/* Pending Tasks Quick View */}
          {pendingTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Próximas Tarefas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{task.titulo}</span>
                    <span className={cn(
                      "text-xs",
                      isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && "text-destructive"
                    )}>
                      {formatActivityDate(task.due_date)}
                    </span>
                  </div>
                ))}
                {pendingTasks.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{pendingTasks.length - 3} tarefas
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="grupo" className="mt-4 space-y-4">
          {parentCompany && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Pertence ao Grupo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{parentCompany.nome_fantasia}</p>
                    <p className="text-xs text-muted-foreground">{parentCompany.razao_social}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {subsidiaries.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Empresas do Grupo ({subsidiaries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subsidiaries.map(sub => {
                  const subStatus = statusConfig[sub.status] || statusConfig.prospect;
                  return (
                    <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{sub.nome_fantasia}</p>
                          <p className="text-xs text-muted-foreground">{sub.cidade}/{sub.estado}</p>
                        </div>
                      </div>
                      <span className={cn(subStatus.className, 'text-xs')}>{subStatus.label}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : !parentCompany ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Network className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma empresa vinculada a este grupo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Para vincular, edite outra empresa e selecione esta como holding
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="activities" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setActivityDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map(activity => {
                const Icon = activityTypeIcons[activity.type] || MessageSquare;
                return (
                  <Card key={activity.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{activity.titulo}</p>
                            <Badge variant="outline" className="text-xs">
                              {activityTypeLabels[activity.type] || activity.type}
                            </Badge>
                          </div>
                          {activity.descricao && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {activity.descricao}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatActivityDate(activity.data)}
                            </span>
                            <span>• {getUserName(activity.user_id)}</span>
                          </div>
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
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade registrada</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setActivityDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Atividade
                </Button>
              </CardContent>
            </Card>
          )}
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

      {/* Activity Dialog */}
      <ActivityDialog 
        open={activityDialogOpen} 
        onOpenChange={setActivityDialogOpen}
        preSelectedCompanyId={company.id}
      />
    </div>
  );
}
