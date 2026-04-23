import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Mail } from 'lucide-react';

export interface CampaignContact {
  id: string;
  full_name: string;
  current_title: string | null;
  current_company: string | null;
  email_raw: string | null;
  /** Optional: member id within the strategy group, used to auto-log activity. */
  member_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contacts: CampaignContact[];
  /** Optional: when provided, automatically log a sent-email activity per recipient. */
  groupId?: string;
}

const VARIABLES = [
  { tag: '{first_name}', label: 'Primeiro nome' },
  { tag: '{full_name}', label: 'Nome completo' },
  { tag: '{company}', label: 'Empresa' },
  { tag: '{cargo}', label: 'Cargo' },
];

function applyVars(template: string, c: CampaignContact): string {
  const firstName = (c.full_name || '').trim().split(/\s+/)[0] || '';
  return template
    .split('{first_name}').join(firstName)
    .split('{full_name}').join(c.full_name || '')
    .split('{company}').join(c.current_company || '')
    .split('{cargo}').join(c.current_title || '');
}

export function EmailCampaignDialog({ open, onOpenChange, contacts, groupId }: Props) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const withEmail = useMemo(() => contacts.filter(c => c.email_raw && c.email_raw.trim()), [contacts]);
  const withoutEmail = contacts.length - withEmail.length;
  const previewContact = withEmail[0] || contacts[0];

  const insertTag = (tag: string) => {
    const ta = bodyRef.current;
    if (!ta) {
      setBody(b => b + tag);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + tag + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Preencha assunto e corpo do e-mail');
      return;
    }
    if (withEmail.length === 0) {
      toast.error('Nenhum contato selecionado possui e-mail');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Não autenticado');
      return;
    }

    setIsSending(true);
    setProgress({ current: 0, total: withEmail.length });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < withEmail.length; i++) {
      const c = withEmail[i];
      setProgress({ current: i + 1, total: withEmail.length });
      try {
        const personalizedSubject = applyVars(subject, c);
        const personalizedBody = applyVars(body, c).replace(/\n/g, '<br/>');

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-gmail-draft`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient: c.email_raw,
              subject: personalizedSubject,
              html_body: personalizedBody,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erro');
        }
        success++;

        // Auto-log activity if a strategy group is in scope and we know the member id
        if (groupId && c.member_id) {
          try {
            const { data: userRes } = await supabase.auth.getUser();
            const profileId = userRes.user
              ? (await supabase.from('profiles').select('id').eq('user_id', userRes.user.id).maybeSingle()).data?.id
              : null;
            await supabase.from('commercial_strategy_activities' as any).insert({
              group_id: groupId,
              member_id: c.member_id,
              party_id: c.id,
              activity_type: 'email',
              lead_status: 'morno',
              title: `E-mail: ${personalizedSubject || '(sem assunto)'}`,
              description: `Rascunho criado no Gmail para ${c.email_raw}`,
              activity_date: new Date().toISOString(),
              created_by: profileId ?? null,
            });
          } catch (logErr) {
            console.warn('Failed to auto-log activity', logErr);
          }
        }
      } catch (e) {
        failed++;
        console.error('Draft failed for', c.email_raw, e);
      }
    }

    setIsSending(false);
    setProgress(null);

    if (success > 0) {
      toast.success(`${success} rascunho${success !== 1 ? 's' : ''} criado${success !== 1 ? 's' : ''} no Gmail com sucesso`);
    }
    if (failed > 0) {
      toast.error(`${failed} rascunho${failed !== 1 ? 's' : ''} falhou${failed !== 1 ? 'aram' : ''} ao ser criado${failed !== 1 ? 's' : ''}`);
    }
    if (withoutEmail > 0) {
      toast.message(`${withoutEmail} contato${withoutEmail !== 1 ? 's' : ''} ignorado${withoutEmail !== 1 ? 's' : ''} por não possuírem e-mail`);
    }
    if (success > 0 && failed === 0) {
      onOpenChange(false);
      setSubject('');
      setBody('');
    }
  };

  const previewSubject = previewContact ? applyVars(subject, previewContact) : subject;
  const previewBody = previewContact ? applyVars(body, previewContact) : body;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Disparo de E-mail em Massa
          </DialogTitle>
          <DialogDescription>
            Este e-mail será enviado para <strong>{withEmail.length}</strong> contato{withEmail.length !== 1 ? 's' : ''}
            {withoutEmail > 0 && ` (${withoutEmail} sem e-mail será${withoutEmail !== 1 ? 'ão' : ''} ignorado${withoutEmail !== 1 ? 's' : ''})`}.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-l-4 border-l-primary">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Os rascunhos serão criados no Gmail. Você precisará enviá-los manualmente.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Composição</TabsTrigger>
            <TabsTrigger value="preview" disabled={!previewContact}>Prévia</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>Assunto</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Olá {first_name}, conversa rápida?" />
            </div>
            <div className="space-y-1.5">
              <Label>Corpo do e-mail</Label>
              <Textarea
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                className="font-mono text-sm"
                placeholder={`Olá {first_name},\n\nVi que você atua como {cargo} na {company}...`}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground mr-1 self-center">Variáveis:</span>
                {VARIABLES.map(v => (
                  <Badge
                    key={v.tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => insertTag(v.tag)}
                    title={v.label}
                  >
                    {v.tag}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-3 pt-3">
            {previewContact ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="text-xs text-muted-foreground">
                  Prévia para: <strong className="text-foreground">{previewContact.full_name}</strong>
                  {previewContact.email_raw && <> · {previewContact.email_raw}</>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Assunto</div>
                  <div className="font-medium">{previewSubject || <span className="text-muted-foreground italic">(vazio)</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Corpo</div>
                  <div className="whitespace-pre-wrap text-sm">{previewBody || <span className="text-muted-foreground italic">(vazio)</span>}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum contato disponível para prévia.</p>
            )}
          </TabsContent>
        </Tabs>

        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Criando rascunho {progress.current} de {progress.total}...</span>
              <span className="font-medium">{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending || withEmail.length === 0}>
            {isSending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Rascunhos no Gmail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
