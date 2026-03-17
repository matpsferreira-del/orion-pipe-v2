import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Bell, Shield, Database, Mail, Settings, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { GmailConnectButton } from '@/components/email/GmailConnectButton';
import { EmailTemplateDialog } from '@/components/email/EmailTemplateDialog';
import { useEmailTemplates, useDeleteEmailTemplate, EmailTemplate } from '@/hooks/useEmailTemplates';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { handleCallback } = useGmailConnection();
  const { data: templates = [] } = useEmailTemplates();
  const deleteTemplate = useDeleteEmailTemplate();

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<EmailTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  // Handle Gmail OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const isCallback = searchParams.get('gmail_callback');
    if (code && isCallback) {
      handleCallback(code).then(() => {
        setSearchParams({}, { replace: true });
      });
    }
  }, [searchParams, handleCallback, setSearchParams]);

  const categoryLabels: Record<string, string> = {
    recrutamento: 'Recrutamento',
    comercial: 'Comercial',
    geral: 'Geral',
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações do sistema"
      />

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="flex w-full max-w-2xl overflow-x-auto">
          <TabsTrigger value="empresa" className="text-xs sm:text-sm flex-shrink-0">Empresa</TabsTrigger>
          <TabsTrigger value="funil" className="text-xs sm:text-sm flex-shrink-0">Funil</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs sm:text-sm flex-shrink-0">Templates Email</TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs sm:text-sm flex-shrink-0">Notificações</TabsTrigger>
          <TabsTrigger value="integracao" className="text-xs sm:text-sm flex-shrink-0">Integrações</TabsTrigger>
          <TabsTrigger value="seguranca" className="text-xs sm:text-sm flex-shrink-0">Segurança</TabsTrigger>
        </TabsList>

        {/* ===== Empresa ===== */}
        <TabsContent value="empresa" className="mt-4 sm:mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>Informações básicas da sua consultoria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial">Razão Social</Label>
                  <Input id="razaoSocial" defaultValue="Consultoria R&S Ltda" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input id="nomeFantasia" defaultValue="RecruitCRM" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" defaultValue="12.345.678/0001-90" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" defaultValue="(11) 99999-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" defaultValue="Av. Paulista, 1000 - São Paulo/SP" />
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Funil ===== */}
        <TabsContent value="funil" className="mt-4 sm:mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Etapas do Funil
              </CardTitle>
              <CardDescription>Configure as etapas do funil comercial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {['Lead Identificado', 'Contato Inicial', 'Diagnóstico (SPIN)', 'Proposta Enviada', 'Negociação', 'Fechado - Ganhou', 'Fechado - Perdeu', 'Pós-venda'].map((stage, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm sm:text-base">{stage}</span>
                    </div>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline">+ Adicionar Etapa</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Templates de Email ===== */}
        <TabsContent value="templates" className="mt-4 sm:mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Templates de Email
                  </CardTitle>
                  <CardDescription>Modelos reutilizáveis com variáveis dinâmicas</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setTemplateToEdit(null); setTemplateDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Template
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum template cadastrado.</p>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="flex items-start justify-between p-3 border rounded-lg gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{t.name}</p>
                        <Badge variant="outline" className="text-[10px]">{categoryLabels[t.category] || t.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                      {t.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.variables.map(v => (
                            <Badge key={v} variant="secondary" className="text-[10px]">{`{${v}}`}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTemplateToEdit(t); setTemplateDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTemplateToDelete(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Notificações ===== */}
        <TabsContent value="notificacoes" className="mt-4 sm:mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências de Notificação
              </CardTitle>
              <CardDescription>Configure como você deseja receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Novas oportunidades</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Receber notificação quando uma nova oportunidade for criada</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Tarefas pendentes</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Lembrete diário de tarefas pendentes</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Faturas vencendo</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Alerta de faturas próximas do vencimento</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Oportunidades paradas</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Alerta de oportunidades sem atividade há mais de 7 dias</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Integrações ===== */}
        <TabsContent value="integracao" className="mt-4 sm:mt-6 space-y-6">
          {/* Gmail Integration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Gmail (Envio de Emails)
              </CardTitle>
              <CardDescription>
                Conecte sua conta Gmail profissional para enviar emails diretamente pela plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GmailConnectButton />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Outras Integrações
              </CardTitle>
              <CardDescription>Conecte seu CRM a outras ferramentas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Mail, color: 'text-green-500', bg: 'bg-green-500/10', title: 'WhatsApp Business', desc: 'Envie mensagens diretamente do CRM', btn: 'Conectar' },
                { icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10', title: 'Importação de NF', desc: 'Importe NF-e automaticamente via XML', btn: 'Configurar' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`h-10 w-10 ${item.bg} rounded-lg flex items-center justify-center shrink-0`}>
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">{item.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0">{item.btn}</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Segurança ===== */}
        <TabsContent value="seguranca" className="mt-4 sm:mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>Configurações de segurança e acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
              </div>
              <Button>Alterar Senha</Button>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Autenticação em dois fatores</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Sessões ativas</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Gerencie dispositivos conectados</p>
                </div>
                <Button variant="outline" size="sm">Ver sessões</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <EmailTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={templateToEdit}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template "{templateToDelete?.name}" será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (templateToDelete) deleteTemplate.mutate(templateToDelete.id);
                setTemplateToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
