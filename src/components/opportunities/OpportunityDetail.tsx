import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Building2, User, Calendar, DollarSign, Target, Phone, Mail, Plus, MessageSquare, FileText, Briefcase, Upload, Trash2, Download, XCircle, Paperclip, Loader2 } from 'lucide-react';
import { OpportunityRow, useUpdateOpportunity } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useProfiles } from '@/hooks/useProfiles';
import { useActivitiesByOpportunity } from '@/hooks/useActivities';
import { useOpportunityAttachments, useUploadOpportunityAttachment, useDeleteOpportunityAttachment, getAttachmentUrl } from '@/hooks/useOpportunityAttachments';
import { MentionsSection } from '@/components/opportunities/MentionsSection';
import { pipelineStages } from '@/data/mockData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface OpportunityDetailProps {
  opportunity: OpportunityRow;
  onOpenActivityDialog?: () => void;
  onOpenJobDialog?: () => void;
  onOpenRejectDialog?: () => void;
}

const sourceLabels: Record<string, string> = {
  indicacao: 'Indicação',
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Evento',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

const serviceLabels: Record<string, string> = {
  recrutamento_pontual: 'Recrutamento Pontual',
  programa_recorrente: 'Programa Recorrente',
  rpo: 'RPO',
  hunting: 'Hunting',
  consultoria: 'Consultoria',
  outplacement: 'Outplacement',
};

const activityTypeLabels: Record<string, string> = {
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  email: 'Email',
  proposta: 'Proposta',
  followup: 'Follow-up',
  outro: 'Outro',
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function OpportunityDetail({ opportunity, onOpenActivityDialog, onOpenJobDialog, onOpenRejectDialog }: OpportunityDetailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isOutplacement = opportunity.tipo_servico === 'outplacement';
  
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: profiles = [] } = useProfiles();
  const { data: activities = [] } = useActivitiesByOpportunity(opportunity.id);
  const { data: attachments = [], isLoading: attachmentsLoading } = useOpportunityAttachments(opportunity.id);
  const uploadAttachment = useUploadOpportunityAttachment();
  const deleteAttachment = useDeleteOpportunityAttachment();
  const updateOpportunity = useUpdateOpportunity();

  const company = companies.find(c => c.id === opportunity.company_id);
  const contact = contacts.find(c => c.id === opportunity.contact_id);
  const responsavel = profiles.find(p => p.id === opportunity.responsavel_id);
  const stage = pipelineStages.find(s => s.key === opportunity.stage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const hasSpin = opportunity.spin_situacao_como_contrata || 
                  opportunity.spin_problema_dificuldades || 
                  opportunity.spin_implicacao_impacto || 
                  opportunity.spin_necessidade_cenario;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadAttachment.mutateAsync({
        opportunityId: opportunity.id,
        file,
        uploadedBy: profile?.id,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isRejected = opportunity.stage === 'fechado_perdeu';

  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            {opportunity.tipo_servico === 'outplacement' && !opportunity.company_id
              ? (opportunity.observacoes?.match(/\[PF: (.+?)\]/)?.[1] || 'Outplacement - Pessoa Física')
              : (company?.nome_fantasia || 'N/A')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {opportunity.tipo_servico === 'outplacement' && !opportunity.company_id
              ? 'Outplacement - Pessoa Física'
              : company?.razao_social}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!isRejected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onOpenRejectDialog?.()}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenJobDialog?.()}
          >
            <Briefcase className="h-4 w-4 mr-1" />
            {isOutplacement ? 'Criar Projeto' : 'Criar Vaga'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(
              isOutplacement 
                ? `/oportunidades/${opportunity.id}/proposta-outplacement`
                : `/oportunidades/${opportunity.id}/proposta`
            )}
          >
            <FileText className="h-4 w-4 mr-1" />
            Gerar Proposta
          </Button>
          <Badge variant={isRejected ? 'destructive' : 'outline'} className="text-sm">
            {stage?.label || opportunity.stage}
          </Badge>
        </div>
      </div>

      {/* Rejection reason */}
      {isRejected && (opportunity as any).motivo_rejeicao && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-sm text-destructive font-medium">Motivo da rejeição:</p>
            <p className="text-sm text-muted-foreground">{(opportunity as any).motivo_rejeicao}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Valor Potencial</p>
            <p className="font-semibold text-foreground">{formatCurrency(Number(opportunity.valor_potencial))}</p>
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

      {/* Mentions / @ tags - topo, junto com info principal */}
      <MentionsSection opportunityId={opportunity.id} />

      <Separator />

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="spin">SPIN</TabsTrigger>
          <TabsTrigger value="activities">Atividades ({activities.length})</TabsTrigger>
          <TabsTrigger value="attachments">Arquivos ({attachments.length})</TabsTrigger>
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
              <p><span className="text-muted-foreground">Criada em:</span> {formatDate(opportunity.created_at)}</p>
              <p><span className="text-muted-foreground">Previsão de fechamento:</span> {formatDate(opportunity.data_previsao_fechamento)}</p>
              <p><span className="text-muted-foreground">Origem:</span> {sourceLabels[opportunity.origem_lead] || opportunity.origem_lead}</p>
              <p><span className="text-muted-foreground">Tipo de serviço:</span> {serviceLabels[opportunity.tipo_servico] || opportunity.tipo_servico}</p>
              {responsavel && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {responsavel.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{opportunity.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="spin" className="space-y-4 mt-4">
          {hasSpin ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-pipeline-lead">S - Situação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Como a empresa contrata hoje?</p>
                    <p className="text-foreground">{opportunity.spin_situacao_como_contrata || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tem time interno ou terceiriza?</p>
                    <p className="text-foreground">{opportunity.spin_situacao_time_interno || 'Não informado'}</p>
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
                    <p className="text-foreground">{opportunity.spin_problema_dificuldades || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tempo médio para fechar uma vaga?</p>
                    <p className="text-foreground">{opportunity.spin_problema_tempo_medio || 'Não informado'}</p>
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
                    <p className="text-foreground">{opportunity.spin_implicacao_impacto || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Existe perda de receita?</p>
                    <p className="text-foreground">{opportunity.spin_implicacao_perda || 'Não informado'}</p>
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
                    <p className="text-foreground">{opportunity.spin_necessidade_cenario || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Qual a urgência?</p>
                    <p className="text-foreground">{opportunity.spin_necessidade_urgencia || 'Não informado'}</p>
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
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium">Histórico de Atividades</h4>
            <Button size="sm" onClick={() => onOpenActivityDialog?.()}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Atividade
            </Button>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map(activity => {
                const activityUser = profiles.find(p => p.id === activity.user_id);
                return (
                  <Card key={activity.id}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium text-sm">{activity.titulo}</p>
                          </div>
                          {activity.descricao && (
                            <p className="text-sm text-muted-foreground mt-1 ml-6">{activity.descricao}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 ml-6">
                            {activityUser?.name || 'Usuário'} • {format(new Date(activity.data), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activityTypeLabels[activity.type] || activity.type}
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
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhuma atividade registrada</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Atividade" para adicionar</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium">Propostas e Materiais</h4>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAttachment.isPending}>
                {uploadAttachment.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Enviar Arquivo
              </Button>
            </div>
          </div>

          {attachmentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map(att => {
                const uploader = profiles.find(p => p.id === att.uploaded_by);
                return (
                  <Card key={att.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{att.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(att.file_size)} • {uploader?.name || 'Usuário'} • {format(new Date(att.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(getAttachmentUrl(att.file_path), '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteAttachment.mutate({ id: att.id, filePath: att.file_path, opportunityId: opportunity.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                <Paperclip className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum arquivo anexado</p>
                <p className="text-xs text-muted-foreground mt-1">Anexe propostas, contratos e outros materiais</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
