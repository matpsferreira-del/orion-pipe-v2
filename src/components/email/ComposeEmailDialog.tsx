import { useState, useEffect } from 'react';
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
import { Loader2, Send, X, FileText } from 'lucide-react';
import { useEmailTemplates, EmailTemplate } from '@/hooks/useEmailTemplates';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import { useAuth } from '@/contexts/AuthContext';

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRecipients?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  /** Variables to auto-fill in templates */
  variables?: Record<string, string>;
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

  const { data: templates = [] } = useEmailTemplates();
  const sendEmail = useSendEmail();
  const { connected, gmailEmail } = useGmailConnection();
  const { profile } = useAuth();

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      setRecipients(defaultRecipients);
      setSubject(defaultSubject);
      setBody(defaultBody);
      setSelectedTemplateId('none');
      setRecipientInput('');
    }
  }, [open, defaultRecipients, defaultSubject, defaultBody]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'none') return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    let filledSubject = template.subject;
    let filledBody = template.body;

    // Auto-fill variables
    const allVars: Record<string, string> = {
      nome_recrutador: profile?.name || '',
      ...variables,
    };

    Object.entries(allVars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      filledSubject = filledSubject.replace(regex, value);
      filledBody = filledBody.replace(regex, value);
    });

    setSubject(filledSubject);
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
    // Strip HTML tags for plain text check
    const plainBody = body.replace(/<[^>]*>/g, '').trim();
    if (!subject.trim() || !plainBody) return;

    sendEmail.mutate(
      {
        recipients,
        subject,
        html_body: body.includes('<') ? body : `<p>${body.replace(/\n/g, '<br/>')}</p>`,
        template_id: selectedTemplateId !== 'none' ? selectedTemplateId : undefined,
      },
      { onSuccess: () => onOpenChange(false) }
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
                      <Badge variant="outline" className="text-[10px]">
                        {t.category}
                      </Badge>
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
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeRecipient(email)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                onChange={e => setRecipientInput(e.target.value)}
                placeholder="email@exemplo.com"
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addRecipient(); }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addRecipient}>
                Adicionar
              </Button>
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
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Escreva sua mensagem..."
              className="min-h-[200px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendEmail.isPending || !recipients.length || !subject.trim()}
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
