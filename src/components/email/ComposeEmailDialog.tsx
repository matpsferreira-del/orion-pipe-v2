import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Loader2, Send, X, FileText, Eye, Edit, Paperclip, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useSendEmail, type EmailAttachment } from '@/hooks/useSendEmail';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import { useAuth } from '@/contexts/AuthContext';

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipients?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  variables?: Record<string, string>;
  recipientVariables?: Record<string, Record<string, string>>;
  defaultAttachments?: EmailAttachment[];
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}

function toHtmlBody(text: string): string {
  return text.includes('<') ? text : `<p>${text.replace(/\n/g, '<br/>')}</p>`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URI prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  defaultRecipients = [],
  defaultSubject = '',
  defaultBody = '',
  variables = {},
  recipientVariables = {},
  defaultAttachments = [],
}: ComposeEmailDialogProps) {
  const [recipients, setRecipients] = useState<string[]>(defaultRecipients);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [activeTab, setActiveTab] = useState<string>('edit');
  const [previewRecipient, setPreviewRecipient] = useState(defaultRecipients[0] ?? '');
  const [attachments, setAttachments] = useState<EmailAttachment[]>(defaultAttachments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templates = [] } = useEmailTemplates();
  const sendEmail = useSendEmail();
  const { connected, gmailEmail } = useGmailConnection();
  const { profile } = useAuth();

  const baseVariables: Record<string, string> = useMemo(() => ({
    nome_recrutador: profile?.name || '',
    ...variables,
  }), [profile?.name, variables]);

  const getVariablesForRecipient = (recipient: string) => ({
    ...baseVariables,
    ...(recipientVariables[recipient] ?? {}),
  });

  const resolveTextForRecipient = (text: string, recipient: string) => (
    replaceVariables(text, getVariablesForRecipient(recipient))
  );

  const hasRecipientSpecificVariables = useMemo(
    () => recipients.some((recipient) => Object.keys(recipientVariables[recipient] ?? {}).length > 0),
    [recipientVariables, recipients],
  );

  useEffect(() => {
    if (open) {
      setRecipients(defaultRecipients);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setSelectedTemplateId('none');
      setRecipientInput('');
      setActiveTab('edit');
      setPreviewRecipient(defaultRecipients[0] ?? '');
      setAttachments(defaultAttachments);
    }
  }, [open, defaultRecipients, defaultSubject, defaultBody, defaultAttachments]);

  useEffect(() => {
    if (!recipients.length) {
      setPreviewRecipient('');
      return;
    }

    if (!previewRecipient || !recipients.includes(previewRecipient)) {
      setPreviewRecipient(recipients[0]);
    }
  }, [previewRecipient, recipients]);

  const activePreviewRecipient = previewRecipient || recipients[0] || '';
  const resolvedSubject = activePreviewRecipient
    ? resolveTextForRecipient(subject, activePreviewRecipient)
    : replaceVariables(subject, baseVariables);
  const resolvedBody = activePreviewRecipient
    ? resolveTextForRecipient(body, activePreviewRecipient)
    : replaceVariables(body, baseVariables);

  const getSignature = (category: string) => {
    if (category === 'recrutamento') return '\n\n--\nEquipe de Recrutamento Orion';
    if (category === 'comercial') return '\n\n--\nEquipe Comercial Orion';
    return '';
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'none') return;

    const template = templates.find((t) => t.id === templateId);
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
    setRecipients(recipients.filter((recipient) => recipient !== email));
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 20 * 1024 * 1024; // 20MB limit per file

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast.error(`Arquivo "${file.name}" excede o limite de 20MB.`);
        continue;
      }

      try {
        const base64Data = await fileToBase64(file);
        setAttachments(prev => [...prev, {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data,
        }]);
      } catch {
        toast.error(`Erro ao ler arquivo "${file.name}".`);
      }
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!recipients.length) return;

    const attachmentPayload = attachments.length > 0 ? attachments : undefined;

    if (hasRecipientSpecificVariables) {
      const payloads = recipients.map((recipient) => {
        const personalizedSubject = resolveTextForRecipient(subject, recipient);
        const personalizedBody = resolveTextForRecipient(body, recipient);
        const plainBody = personalizedBody.replace(/<[^>]*>/g, '').trim();

        return {
          recipients: [recipient],
          subject: personalizedSubject,
          html_body: toHtmlBody(personalizedBody),
          template_id: selectedTemplateId !== 'none' ? selectedTemplateId : undefined,
          attachments: attachmentPayload,
          valid: Boolean(personalizedSubject.trim() && plainBody),
        };
      });

      const validPayloads = payloads.filter((payload) => payload.valid);
      if (!validPayloads.length) return;

      const results = await Promise.allSettled(
        validPayloads.map(({ valid: _valid, ...payload }) => sendEmail.mutateAsync({ ...payload, silent: true })),
      );

      const successCount = results.filter((result) => result.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      if (successCount > 0 && failureCount === 0) {
        toast.success(
          successCount === 1
            ? 'Email enviado com sucesso!'
            : `${successCount} emails enviados com sucesso!`,
        );
        onOpenChange(false);
        return;
      }

      if (successCount > 0) {
        toast.success(`${successCount} email(s) enviados com sucesso.`);
      }

      if (failureCount > 0) {
        toast.error(`${failureCount} email(s) falharam no envio.`);
      }

      return;
    }

    const plainBody = resolvedBody.replace(/<[^>]*>/g, '').trim();
    if (!resolvedSubject.trim() || !plainBody) return;

    sendEmail.mutate(
      {
        recipients,
        subject: resolvedSubject,
        html_body: toHtmlBody(resolvedBody),
        template_id: selectedTemplateId !== 'none' ? selectedTemplateId : undefined,
        attachments: attachmentPayload,
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

  const previewHtml = toHtmlBody(resolvedBody);
  const unresolvedVars = resolvedBody.match(/\{[a-z_]+\}/g) || [];

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
          <div className="text-xs text-muted-foreground">
            Enviando como: <strong>{gmailEmail}</strong>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-template-select" className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Template
            </Label>
            <select
              id="email-template-select"
              value={selectedTemplateId}
              onChange={(event) => applyTemplate(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="none">Sem template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Para</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {recipients.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeRecipient(email)} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                onChange={(event) => setRecipientInput(event.target.value)}
                placeholder="email@exemplo.com"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addRecipient();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addRecipient}>Adicionar</Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Assunto</Label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Assunto do email"
            />
            {resolvedSubject !== subject && (
              <p className="text-xs text-muted-foreground">
                Pré-visualização: <span className="font-medium">{resolvedSubject}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label>Mensagem</Label>
              {hasRecipientSpecificVariables && recipients.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Prévia de</span>
                  <Select value={activePreviewRecipient} onValueChange={setPreviewRecipient}>
                    <SelectTrigger className="w-[220px] h-8">
                      <SelectValue placeholder="Selecione o destinatário" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((recipient) => (
                        <SelectItem key={recipient} value={recipient}>
                          {recipientVariables[recipient]?.nome_candidato || recipient}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

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
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escreva sua mensagem..."
                  className="min-h-[200px]"
                />
                {unresolvedVars.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis não resolvidas nesta prévia: {unresolvedVars.join(', ')}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="preview" className="mt-2">
                <div className="border rounded-md bg-background p-4 min-h-[200px]">
                  <div className="border-b pb-2 mb-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Assunto</p>
                    <p className="text-sm font-medium">{resolvedSubject || '(sem assunto)'}</p>
                    {hasRecipientSpecificVariables && activePreviewRecipient && (
                      <p className="text-xs text-muted-foreground">
                        Destinatário: {recipientVariables[activePreviewRecipient]?.nome_candidato || activePreviewRecipient}
                      </p>
                    )}
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-foreground [&_p]:my-1 [&_br]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                  {attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Anexos:</p>
                      {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          {att.filename}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Attachments section */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              Anexos
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileAttach}
            />
            <div className="space-y-1">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate flex-1">{att.filename}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeAttachment(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5 mr-1.5" />
              Anexar Arquivo
            </Button>
            <p className="text-[10px] text-muted-foreground">Máx. 20MB por arquivo.</p>
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
