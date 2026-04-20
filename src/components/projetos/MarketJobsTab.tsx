import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, ExternalLink, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useOutplacementMarketJobs, useCreateOutplacementMarketJob,
  useDeleteOutplacementMarketJob, useUpdateOutplacementMarketJob,
  MARKET_JOB_STATUS_LABELS, OutplacementProject,
} from '@/hooks/useOutplacementProjects';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  project: OutplacementProject;
}

export function MarketJobsTab({ project }: Props) {
  const { profile } = useAuth();
  const { data: jobs = [], isLoading } = useOutplacementMarketJobs(project.id);
  const create = useCreateOutplacementMarketJob();
  const update = useUpdateOutplacementMarketJob();
  const del = useDeleteOutplacementMarketJob();

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ job_title: '', company_name: '', location: '', job_url: '', source: 'manual' });
  const [triggering, setTriggering] = useState(false);

  const handleAdd = async () => {
    if (!form.job_title.trim() || !form.company_name.trim()) return;
    await create.mutateAsync({
      project_id: project.id,
      job_title: form.job_title.trim(),
      company_name: form.company_name.trim(),
      location: form.location.trim() || null,
      job_url: form.job_url.trim() || null,
      source: form.source,
      created_by: profile?.id || null,
    });
    setForm({ job_title: '', company_name: '', location: '', job_url: '', source: 'manual' });
    setShowDialog(false);
  };

  const triggerManus = async () => {
    setTriggering(true);
    try {
      const { error } = await supabase.from('automation_triggers').insert({
        search_term: project.target_role || project.title,
        location: project.target_location || null,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Busca disparada para Manus IA! Vagas serão importadas em breve.');
    } catch (e) {
      toast.error('Erro ao disparar automação');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {jobs.length} vaga{jobs.length !== 1 ? 's' : ''} mapeada{jobs.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={triggerManus} disabled={triggering} className="gap-1.5">
            {triggering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Buscar via Manus IA
          </Button>
          <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <p className="font-medium">Nenhuma vaga mapeada</p>
          <p className="text-sm mt-1">Adicione manualmente ou dispare a busca via Manus IA</p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="bg-card border rounded-lg p-3 space-y-2">
                <div>
                  <h4 className="font-semibold text-sm">{j.job_title}</h4>
                  <p className="text-xs text-muted-foreground">{j.company_name}</p>
                  {j.location && <p className="text-xs text-muted-foreground">{j.location}</p>}
                </div>
                <Select value={j.status} onValueChange={v => update.mutate({ id: j.id, status: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MARKET_JOB_STATUS_LABELS).map(([k, v]) =>
                      <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-1 pt-1 border-t">
                  <Badge variant="outline" className="text-xs">{j.source || 'manual'}</Badge>
                  <div className="flex gap-1">
                    {j.job_url && (
                      <a href={j.job_url} target="_blank" rel="noopener noreferrer" className="text-primary p-2">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                      onClick={() => confirm('Remover?') && del.mutate(j.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block border rounded-lg overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(j => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.job_title}</TableCell>
                    <TableCell className="text-sm">{j.company_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{j.location || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{j.source || 'manual'}</Badge></TableCell>
                    <TableCell>
                      <Select value={j.status} onValueChange={v => update.mutate({ id: j.id, status: v })}>
                        <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(MARKET_JOB_STATUS_LABELS).map(([k, v]) =>
                            <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {j.job_url && (
                          <a href={j.job_url} target="_blank" rel="noopener noreferrer" className="text-primary p-1.5">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                          onClick={() => confirm('Remover?') && del.mutate(j.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Vaga do Mercado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cargo *</Label><Input value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} /></div>
            <div><Label>Empresa *</Label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label>Localização</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>URL da Vaga</Label><Input value={form.job_url} onChange={e => setForm({ ...form, job_url: e.target.value })} /></div>
            <div>
              <Label>Fonte</Label>
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="gupy">Gupy</SelectItem>
                  <SelectItem value="vagas">Vagas.com</SelectItem>
                  <SelectItem value="catho">Catho</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!form.job_title.trim() || !form.company_name.trim()}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
