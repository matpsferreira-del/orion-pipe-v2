import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, X, FileText, Eye, Edit } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import { useAuth } from '@/contexts/AuthContext';

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipients?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  variables?: Record<string, string>;
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  defaultRecipients = [],
  defaultSubject = '',
  defaultBody = '',
  variables = {},
}: ComposeEmailDialogProps) {
  const [recipients, setRecipients] = useState<string[]>(defaultRecipients);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [activeTab, setActiveTab] = useState<string>('edit');

  const { data: templates = [] } = useEmailTemplates();
  const sendEmail = useSendEmail();
  const { connected, gmailEmail } = useGmailConnection();
  const { profile } = useAuth();

  const allVars: Record<string, string> = useMemo(() => ({
    nome_recrutador: profile?.name || '',
    ...variables,
  }), [profile?.name, variables]);

  useEffect(() => {
    if (open) {
      setRecipients(defaultRecipients);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setSelectedTemplateId('none');
      setRecipientInput('');
      setActiveTab('edit');
    }
  }, [open, defaultRecipients, defaultSubject, defaultBody]);

  // Resolved (variables replaced) versions for preview and sending
  const resolvedSubject = useMemo(() => replaceVariables(subject, allVars), [subject, allVars]);
  const resolvedBody = useMemo(() => replaceVariables(body, allVars), [body, allVars]);

  const getSignature = (category: string) => {
    if (category === 'recrutamento') return '\n\n--\nEquipe de Recrutamento Orion';
    if (category === 'comercial') return '\n\n--\nEquipe Comercial Orion';
    return '';
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'none') return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    let filledBody = template.body;
    const signature = getSignature(template.category);
    if (signature) {
      const isHtml = filledBody.includes('<');
      if (isHtml) {
        filledBody += `<br/><br/>--<br/>Equipe de ${template.category === 'recrutamento' ? 'Recrutamento' : 'Comercial'} Orion`;
      } else {
        filledBody += signature;
      }
    }

    setSubject(template.subject);
    setBody(filledBody);
  };

  const addRecipient = () => {
    const email = recipientInput.trim();
    if (email && !recipients.includes(email)) {
      setRecipients([...recipients, email]);
    }
    setRecipientInput('');
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSend = () => {
    if (!recipients.length) return;
    const plainBody = resolvedBody.replace(/<[^>]*>/g, '').trim();
    if (!resolvedSubject.trim() || !plainBody) return;

    const htmlBody = resolvedBody.includes('<')
      ? resolvedBody
      : `<p>${resolvedBody.replace(/\n/g, '<br/>')}</p>`;

    sendEmail.mutate(
      {
        recipients,
        subject: resolvedSubject,
        html_body: htmlBody,
        template_id: selectedTemplateId !== 'none' ? selectedTemplateId : undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  if (!connected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gmail não conectado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Para enviar emails pela plataforma, conecte sua conta Gmail nas
            <strong> Configurações → Integrações</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Build preview HTML
  const previewHtml = resolvedBody.includes('<')
    ? resolvedBody
    : `<p>${resolvedBody.replace(/\n/g, '<br/>')}</p>`;

  // Check for unresolved variables
  const unresolvedVars = (resolvedBody.match(/\{[a-z_]+\}/g) || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compor Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sender info */}
          <div className="text-xs text-muted-foreground">
            Enviando como: <strong>{gmailEmail}</strong>
          </div>

          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Template
            </Label>
            <Select value={selectedTemplateId} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem template</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      {t.name}
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients */}
          <div className="space-y-1.5">
            <Label>Para</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {recipients.map(email => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeRecipient(email)} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                onChange={e => setRecipientInput(e.target.value)}
                placeholder="email@exemplo.com"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addRecipient}>Adicionar</Button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Assunto</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Assunto do email"
            />
            {resolvedSubject !== subject && (
              <p className="text-xs text-muted-foreground">
                Pré-visualização: <span className="font-medium">{resolvedSubject}</span>
              </p>
            )}
          </div>

          {/* Body with Edit / Preview tabs */}
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="text-xs gap-1">
                  <Edit className="h-3 w-3" /> Editar
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1">
                  <Eye className="h-3 w-3" /> Pré-visualizar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="mt-2">
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  className="min-h-[200px]"
                />
                {unresolvedVars.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ Variáveis não resolvidas: {unresolvedVars.join(', ')}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="preview" className="mt-2">
                <div className="border rounded-md bg-background p-4 min-h-[200px]">
                  {/* Subject preview */}
                  <div className="border-b pb-2 mb-3">
                    <p className="text-xs text-muted-foreground">Assunto</p>
                    <p className="text-sm font-medium">{resolvedSubject || '(sem assunto)'}</p>
                  </div>
                  {/* Body preview - rendered HTML */}
                  <div
                    className="prose prose-sm max-w-none text-foreground [&_p]:my-1 [&_br]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={sendEmail.isPending || !recipients.length || !resolvedSubject.trim()}
          >
            {sendEmail.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
