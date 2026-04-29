import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useAllAssessments,
  useCreateDiscInvitation,
  useCreatePersonalitiesInvitation,
  useSendAssessmentLink,
  getDiscLink,
  getPersonalitiesLink,
  DiscInvitation,
  PersonalitiesInvitation,
} from '@/hooks/useAssessments';
import { Search, Copy, ExternalLink, Plus, Clock, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';

const DISC_TEST_BASE = 'https://disc-test-drab.vercel.app';

function getReportUrl(type: 'DISC' | 'PT', invitationId: string) {
  return `${DISC_TEST_BASE}/report?type=${type}&id=${invitationId}`;
}

function copyLink(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Link copiado!'));
}

type AssessmentRow = {
  id: string;
  type: 'DISC' | 'PT';
  token: string;
  party_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  profile: string | null;
};

function toRows(
  disc: DiscInvitation[],
  personalities: PersonalitiesInvitation[],
): AssessmentRow[] {
  const discRows: AssessmentRow[] = disc.map((inv) => ({
    id: inv.id,
    type: 'DISC',
    token: inv.token,
    party_id: inv.party_id,
    candidate_name: inv.candidate_name,
    candidate_email: inv.candidate_email,
    completed: inv.completed,
    created_at: inv.created_at,
    completed_at: inv.completed_at,
    profile: inv.disc_results?.[0]?.combo_title ?? inv.disc_results?.[0]?.primary_profile ?? null,
  }));

  const ptRows: AssessmentRow[] = personalities.map((inv) => ({
    id: inv.id,
    type: 'PT',
    token: inv.token,
    party_id: inv.party_id,
    candidate_name: inv.candidate_name,
    candidate_email: inv.candidate_email,
    completed: inv.completed,
    created_at: inv.created_at,
    completed_at: inv.completed_at,
    profile: inv.personalities_results?.[0]?.tipo_completo ?? null,
  }));

  return [...discRows, ...ptRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

interface CreateLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

function CreateLinkDialog({ open, onClose }: CreateLinkDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'DISC' | 'PT'>('DISC');
  const [loading, setLoading] = useState(false);

  const createDisc = useCreateDiscInvitation();
  const createPt = useCreatePersonalitiesInvitation();
  const sendLink = useSendAssessmentLink();

  async function handleCreate() {
    if (!name.trim()) { toast.error('Informe o nome do candidato'); return; }
    setLoading(true);
    try {
      const params = {
        party_id: null,
        candidate_name: name.trim(),
        candidate_email: email.trim() || null,
      };
      const inv = type === 'DISC'
        ? await createDisc.mutateAsync(params)
        : await createPt.mutateAsync(params);

      const link = type === 'DISC' ? getDiscLink(inv.token) : getPersonalitiesLink(inv.token);

      if (email.trim()) {
        await sendLink.mutateAsync({
          type,
          invitation: inv,
          candidateName: name.trim(),
          candidateEmail: email.trim(),
        });
      } else {
        copyLink(link);
        toast.success('Link gerado e copiado! (candidato sem email cadastrado)');
      }
      setName(''); setEmail('');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerar link de avaliação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {(['DISC', 'PT'] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={type === t ? 'default' : 'outline'}
                onClick={() => setType(t)}
                className="flex-1"
              >
                {t === 'DISC' ? 'DISC' : '16 Tipos'}
              </Button>
            ))}
          </div>
          <div>
            <Label>Nome do candidato *</Label>
            <Input
              className="mt-1.5"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>E-mail <span className="text-muted-foreground text-xs">(opcional — envia link automaticamente)</span></Label>
            <Input
              className="mt-1.5"
              type="email"
              placeholder="candidato@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {email ? <><Send className="h-3.5 w-3.5 mr-1" /> Enviar link</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Gerar e copiar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Avaliacoes() {
  const { data, isLoading } = useAllAssessments();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'DISC' | 'PT'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    return toRows(data.disc, data.personalities);
  }, [data]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || r.candidate_name?.toLowerCase().includes(q)
        || r.candidate_email?.toLowerCase().includes(q)
        || r.profile?.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || r.type === typeFilter;
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'pending' && !r.completed)
        || (statusFilter === 'completed' && r.completed);
      return matchSearch && matchType && matchStatus;
    });
  }, [rows, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.completed).length;
    const disc = rows.filter((r) => r.type === 'DISC');
    const pt = rows.filter((r) => r.type === 'PT');
    return {
      total,
      done,
      discDone: disc.filter((r) => r.completed).length,
      discTotal: disc.length,
      ptDone: pt.filter((r) => r.completed).length,
      ptTotal: pt.length,
    };
  }, [rows]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Avaliações"
        description="Inventários comportamentais DISC e 16 Tipos de Personalidade"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar link
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total enviados', value: stats.total },
          { label: 'Concluídos', value: `${stats.done}/${stats.total}` },
          { label: 'DISC', value: `${stats.discDone}/${stats.discTotal}` },
          { label: '16 Tipos', value: `${stats.ptDone}/${stats.ptTotal}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou perfil…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'DISC', 'PT'] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? 'default' : 'outline'}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'Todos' : t === 'PT' ? '16 Tipos' : t}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'completed'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : 'Concluídos'}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma avaliação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const link = row.type === 'DISC'
                  ? getDiscLink(row.token)
                  : getPersonalitiesLink(row.token);
                return (
                  <TableRow key={`${row.type}-${row.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{row.candidate_name || '—'}</p>
                        {row.candidate_email && (
                          <p className="text-xs text-muted-foreground">{row.candidate_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.type === 'DISC' ? 'DISC' : '16 Tipos'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.completed ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Concluído
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Pendente
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.profile ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!row.completed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(link)}
                            title="Copiar link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {row.completed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getReportUrl(row.type, row.id), '_blank')}
                            title="Ver relatório"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateLinkDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
