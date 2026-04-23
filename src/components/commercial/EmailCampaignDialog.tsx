import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Mail, Save, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  EmailTemplate,
  useCreateEmailTemplate,
  useEmailTemplates,
} from '@/hooks/useEmailTemplates';

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

interface AISuggestion {
  name: string;
  subject: string;
  body: string;
}

export function EmailCampaignDialog({ open, onOpenChange, contacts, groupId }: Props) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { data: templates = [] } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Save-template inline form
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // AI generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('profissional');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const withEmail = useMemo(() => contacts.filter(c => c.email_raw && c.email_raw.trim()), [contacts]);
  const withoutEmail = contacts.length - withEmail.length;
  const previewContact = withEmail[0] || contacts[0];

  // Reset state when reopening
  useEffect(() => {
    if (!open) {
      setShowSaveForm(false);
      setNewTemplateName('');
      setAiSuggestions([]);
      setAiPrompt('');
    }
  }, [open]);

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

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (id === 'none') return;
    const t = templates.find(t => t.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim() || !subject.trim() || !body.trim()) {
      toast.error('Nome, assunto e corpo são obrigatórios.');
      return;
    }
    createTemplate.mutate(
      {
        name: newTemplateName.trim(),
        subject,
        body,
        category: 'comercial',
        variables: VARIABLES.map(v => v.tag.replace(/[{}]/g, '')) as any,
        created_by: profile?.id || '',
      },
      {
        onSuccess: () => {
          setShowSaveForm(false);
          setNewTemplateName('');
        },
      }
    );
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-template', {
        body: { prompt: aiPrompt, tone: aiTone, count: 3 },
      });
      if (error) throw error;
      const list: AISuggestion[] = Array.isArray(data?.templates) ? data.templates : [];
      if (list.length === 0) {
        toast.error('A IA não retornou sugestões. Tente refinar o contexto.');
      } else {
        setAiSuggestions(list);
        toast.success(`${list.length} sugestões geradas.`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar templates com IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestion = (s: AISuggestion) => {
    setSubject(s.subject);
    setBody(s.body);
    setSelectedTemplateId('none');
    toast.success(`Template "${s.name}" aplicado.`);
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

    // Resolve profile id once for activity logging
    let profileId: string | null = null;
    if (groupId) {
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes.user) {
        const p = await supabase.from('profiles').select('id').eq('user_id', userRes.user.id).maybeSingle();
        profileId = p.data?.id ?? null;
      }
    }

    for (let i = 0; i < withEmail.length; i++) {
      const c = withEmail[i];
      setProgress({ current: i + 1, total: withEmail.length });
      try {
        const personalizedSubject = applyVars(subject, c);
        // If body already contains HTML tags, keep as-is; otherwise convert newlines to <br/>
        const rawBody = applyVars(body, c);
        const personalizedBody = /<[a-z][\s\S]*>/i.test(rawBody)
          ? rawBody
          : rawBody.replace(/\n/g, '<br/>');

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gmail`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipients: [c.email_raw],
              subject: personalizedSubject,
              html_body: personalizedBody,
              template_id: selectedTemplateId !== 'none' ? selectedTemplateId : undefined,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erro ao enviar');
        }
        success++;

        // Auto-log activity
        if (groupId && c.member_id) {
          try {
            await supabase.from('commercial_strategy_activities' as any).insert({
              group_id: groupId,
              member_id: c.member_id,
              party_id: c.id,
              activity_type: 'email',
              lead_status: 'morno',
              title: `E-mail enviado: ${personalizedSubject || '(sem assunto)'}`,
              description: `Enviado via Gmail para ${c.email_raw}`,
              activity_date: new Date().toISOString(),
              created_by: profileId,
            });
          } catch (logErr) {
            console.warn('Failed to auto-log activity', logErr);
          }
        }
      } catch (e) {
        failed++;
        console.error('Send failed for', c.email_raw, e);
      }
    }

    setIsSending(false);
    setProgress(null);

    if (groupId && success > 0) {
      queryClient.invalidateQueries({ queryKey: ['strategy-activities', 'group', groupId] });
    }

    if (success > 0) {
      toast.success(`${success} e-mail${success !== 1 ? 's' : ''} enviado${success !== 1 ? 's' : ''} com sucesso`);
    }
    if (failed > 0) {
      toast.error(`${failed} e-mail${failed !== 1 ? 's' : ''} falhou${failed !== 1 ? 'aram' : ''} ao ser enviado${failed !== 1 ? 's' : ''}`);
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
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
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
            Os e-mails serão <strong>enviados imediatamente</strong> via sua conta Gmail conectada.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose">Composição</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Gerar com IA
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!previewContact}>Prévia</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>Template salvo</Label>
              <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum (escrever do zero) —</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} <span className="text-muted-foreground text-xs">· {t.category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* Save template */}
            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              {!showSaveForm ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveForm(true)}
                  disabled={!subject.trim() || !body.trim()}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Salvar como template para reutilizar
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Nome do template</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      placeholder="Ex: Primeiro contato — Diretores RH"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveTemplate}
                      disabled={createTemplate.isPending || !newTemplateName.trim()}
                    >
                      {createTemplate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowSaveForm(false); setNewTemplateName(''); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>Contexto (o que quer comunicar?)</Label>
              <Textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={4}
                placeholder="Ex: Apresentar nossa consultoria de recrutamento executivo para diretores de RH de empresas de médio porte. Diferencial: tempo médio de fechamento de 30 dias e garantia de 90 dias."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tom</Label>
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="consultivo">Consultivo</SelectItem>
                    <SelectItem value="direto e objetivo">Direto e objetivo</SelectItem>
                    <SelectItem value="amigável e próximo">Amigável e próximo</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerateAI} disabled={aiLoading} className="w-full">
                  {aiLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" /> Gerar sugestões</>
                  )}
                </Button>
              </div>
            </div>

            {aiSuggestions.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sugestões</Label>
                {aiSuggestions.map((s, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.subject}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleApplySuggestion(s)}>
                        Usar este
                      </Button>
                    </div>
                    <div
                      className="text-xs text-muted-foreground line-clamp-4 prose prose-xs max-w-none"
                      dangerouslySetInnerHTML={{ __html: s.body }}
                    />
                  </div>
                ))}
              </div>
            )}
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
                  {/<[a-z][\s\S]*>/i.test(previewBody) ? (
                    <div
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewBody }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{previewBody || <span className="text-muted-foreground italic">(vazio)</span>}</div>
                  )}
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
              <span className="text-muted-foreground">Enviando {progress.current} de {progress.total}...</span>
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
            <Mail className="h-4 w-4 mr-2" />
            Enviar E-mails ({withEmail.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
