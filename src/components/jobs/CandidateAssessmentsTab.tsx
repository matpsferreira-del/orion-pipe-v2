import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  usePartyAssessments,
  useCreateDiscInvitation,
  useCreatePersonalitiesInvitation,
  useSendAssessmentLink,
  getDiscLink,
  getPersonalitiesLink,
  DiscInvitation,
  PersonalitiesInvitation,
} from '@/hooks/useAssessments';
import { Copy, ExternalLink, Send, Clock, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const DISC_TEST_BASE = 'https://disc-test-drab.vercel.app';

function getReportUrl(type: 'DISC' | 'PT', invitationId: string) {
  return `${DISC_TEST_BASE}/report?type=${type}&id=${invitationId}`;
}

function copyToClipboard(text: string, label = 'Link copiado!') {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

function DiscCard({ inv }: { inv: DiscInvitation }) {
  const result = inv.disc_results?.[0];
  const link = getDiscLink(inv.token);

  if (!inv.completed) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">DISC — Pendente</p>
            <p className="text-xs text-muted-foreground">
              Enviado em {new Date(inv.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => copyToClipboard(link)}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copiar link
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">DISC — Concluído</span>
          <Badge variant="outline" className="text-xs">
            {result?.combo_title || result?.primary_profile || '—'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => window.open(getReportUrl('DISC', inv.id), '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          Relatório
        </Button>
      </div>
      {result && (
        <div className="grid grid-cols-4 gap-1 mt-2">
          {(['D', 'I', 'S', 'C'] as const).map((l) => {
            const key = `estrutural_${l.toLowerCase()}` as keyof typeof result;
            const val = result[key] as number | null;
            const colors: Record<string, string> = { D: '#FF6B4A', I: '#FFD166', S: '#06D6A0', C: '#118AB2' };
            return (
              <div key={l} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold" style={{ color: colors[l] }}>{l}</span>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${val ?? 0}%`, backgroundColor: colors[l] }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{val ?? 0}%</span>
              </div>
            );
          })}
        </div>
      )}
      {result?.padrao_classico && (
        <p className="text-xs text-muted-foreground mt-1.5">Padrão: {result.padrao_classico}</p>
      )}
    </div>
  );
}

function PersonalitiesCard({ inv }: { inv: PersonalitiesInvitation }) {
  const result = inv.personalities_results?.[0];
  const link = getPersonalitiesLink(inv.token);

  if (!inv.completed) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">16 Tipos — Pendente</p>
            <p className="text-xs text-muted-foreground">
              Enviado em {new Date(inv.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => copyToClipboard(link)}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copiar link
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">16 Tipos — Concluído</span>
          {result?.tipo_completo && (
            <Badge variant="outline" className="text-xs font-mono">{result.tipo_completo}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => window.open(getReportUrl('PT', inv.id), '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          Relatório
        </Button>
      </div>
      {result?.nome_tipo && (
        <p className="text-xs text-muted-foreground mt-1">
          {result.nome_tipo} · {result.grupo}
        </p>
      )}
    </div>
  );
}

interface Props {
  partyId: string;
  candidateName: string;
  candidateEmail: string | null | undefined;
}

export function CandidateAssessmentsTab({ partyId, candidateName, candidateEmail }: Props) {
  const { data, isLoading } = usePartyAssessments(partyId);
  const createDisc = useCreateDiscInvitation();
  const createPt = useCreatePersonalitiesInvitation();
  const sendLink = useSendAssessmentLink();
  const [sendingDisc, setSendingDisc] = useState(false);
  const [sendingPt, setSendingPt] = useState(false);

  async function handleSendDisc() {
    setSendingDisc(true);
    try {
      const inv = await createDisc.mutateAsync({
        party_id: partyId,
        candidate_name: candidateName,
        candidate_email: candidateEmail || null,
      });
      const link = getDiscLink(inv.token);
      if (candidateEmail) {
        await sendLink.mutateAsync({
          type: 'DISC',
          invitation: inv,
          candidateName,
          candidateEmail,
        });
      } else {
        copyToClipboard(link, 'Link DISC copiado! (sem email cadastrado)');
      }
    } finally {
      setSendingDisc(false);
    }
  }

  async function handleSendPt() {
    setSendingPt(true);
    try {
      const inv = await createPt.mutateAsync({
        party_id: partyId,
        candidate_name: candidateName,
        candidate_email: candidateEmail || null,
      });
      const link = getPersonalitiesLink(inv.token);
      if (candidateEmail) {
        await sendLink.mutateAsync({
          type: 'PT',
          invitation: inv,
          candidateName,
          candidateEmail,
        });
      } else {
        copyToClipboard(link, 'Link 16 Tipos copiado! (sem email cadastrado)');
      }
    } finally {
      setSendingPt(false);
    }
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando avaliações…</div>;
  }

  const discList = data?.disc ?? [];
  const ptList = data?.personalities ?? [];
  const hasAny = discList.length > 0 || ptList.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSendDisc}
          disabled={sendingDisc}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {sendingDisc ? 'Enviando…' : 'Enviar DISC'}
          {candidateEmail && <Send className="h-3 w-3 ml-1 opacity-50" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSendPt}
          disabled={sendingPt}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {sendingPt ? 'Enviando…' : 'Enviar 16 Tipos'}
          {candidateEmail && <Send className="h-3 w-3 ml-1 opacity-50" />}
        </Button>
      </div>

      <Separator />

      {!hasAny && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma avaliação enviada ainda.
        </div>
      )}

      {discList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DISC</p>
          {discList.map((inv) => (
            <DiscCard key={inv.id} inv={inv} />
          ))}
        </div>
      )}

      {ptList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">16 Tipos</p>
          {ptList.map((inv) => (
            <PersonalitiesCard key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  );
}
