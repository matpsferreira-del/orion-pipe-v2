import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Briefcase, User, Link as LinkIcon, Building, BadgeCheck, Crosshair, ArrowRight, Target } from 'lucide-react';

export default function ChromeExtension() {
  const [searchParams] = useSearchParams();
  const [nome, setNome] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaAtual, setEmpresaAtual] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const paramNome = searchParams.get('nome');
    const paramUrl = searchParams.get('url');
    const paramCargo = searchParams.get('cargo');
    const paramEmpresa = searchParams.get('empresa');
    if (paramNome) setNome(decodeURIComponent(paramNome));
    if (paramUrl) setLinkedinUrl(decodeURIComponent(paramUrl));
    if (paramCargo) setCargo(decodeURIComponent(paramCargo));
    if (paramEmpresa) setEmpresaAtual(decodeURIComponent(paramEmpresa));
  }, [searchParams]);

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['chrome-ext-open-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, job_code')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['chrome-ext-strategy-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_strategy_groups')
        .select('id, name')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error('Preencha o nome');
      if (!selectedJobId && !selectedGroupId) throw new Error('Selecione uma vaga ou estratégia');

      const { data: partyId, error: partyError } = await supabase.rpc('resolve_party', {
        p_full_name: nome.trim(),
        p_linkedin_url: linkedinUrl.trim() || null,
        p_created_from: 'ats' as const,
        p_current_title: cargo.trim() || null,
        p_current_company: empresaAtual.trim() || null,
      });
      if (partyError) throw partyError;

      // Save to job if selected
      if (selectedJobId) {
        await supabase.rpc('ensure_party_role', {
          p_party_id: partyId,
          p_role: 'candidate' as const,
        });

        const { data: stages, error: stagesError } = await supabase
          .from('job_pipeline_stages')
          .select('id, name')
          .eq('job_id', selectedJobId);
        if (stagesError) throw stagesError;

        const mapeadoStage = stages?.find(s => s.name.toLowerCase() === 'mapeado' || s.name.toLowerCase() === 'mapeados');
        if (!mapeadoStage) throw new Error('Etapa "Mapeado" não encontrada nesta vaga.');

        const { error: appError } = await supabase.from('applications').insert({
          job_id: selectedJobId,
          party_id: partyId,
          stage_id: mapeadoStage.id,
          source: 'hunting',
          status: 'new',
        });
        if (appError) throw appError;
      }

      // Save to strategy if selected
      if (selectedGroupId) {
        await supabase.rpc('ensure_party_role', {
          p_party_id: partyId,
          p_role: 'prospect' as const,
        });

        const { error: memberError } = await supabase
          .from('commercial_strategy_members')
          .insert({ group_id: selectedGroupId, party_id: partyId });
        if (memberError && memberError.code !== '23505') throw memberError;
      }
    },
    onSuccess: () => setSaved(true),
  });

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Perfil salvo!</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{nome}</span> foi adicionado com sucesso.
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => {
                setSaved(false);
                setSelectedJobId('');
                setSelectedGroupId('');
              }}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Mapear outro perfil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = nome.trim() && (selectedJobId || selectedGroupId);

  return (
    <div className="min-h-screen bg-muted/30 flex items-start justify-center p-4 md:p-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Crosshair className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Mapeamento de Perfis
            </h1>
            <p className="text-xs text-muted-foreground">Adicione perfis a vagas ou estratégias comerciais</p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-5 md:p-6 space-y-5">
            {/* Candidate Info */}
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4">Dados do Perfil</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-xs font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary/60" />
                    Nome Completo
                  </Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do perfil" className="h-10 text-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="linkedin" className="text-xs font-medium flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary/60" />
                    URL do LinkedIn
                  </Label>
                  <Input id="linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className="h-10 text-sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cargo" className="text-xs font-medium flex items-center gap-1.5">
                      <BadgeCheck className="h-3.5 w-3.5 text-primary/60" />
                      Cargo Atual
                    </Label>
                    <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Gerente Financeiro" className="h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="empresa" className="text-xs font-medium flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-primary/60" />
                      Empresa Atual
                    </Label>
                    <Input id="empresa" value={empresaAtual} onChange={(e) => setEmpresaAtual(e.target.value)} placeholder="Ex: XP Inc" className="h-10 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Destination: Job */}
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4">Vincular a</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary/60" />
                    Vaga Aberta
                  </Label>
                  {loadingJobs ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Carregando vagas...
                    </div>
                  ) : (
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecione uma vaga (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.job_code ? `#${job.job_code} · ` : ''}{job.title}
                          </SelectItem>
                        ))}
                        {jobs.length === 0 && (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhuma vaga aberta</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Destination: Strategy */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-primary/60" />
                    Estratégia Comercial
                  </Label>
                  {loadingGroups ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Carregando estratégias...
                    </div>
                  ) : (
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecione uma estratégia (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                        {groups.length === 0 && (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">Nenhuma estratégia criada</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full h-11 text-sm font-semibold shadow-sm"
          disabled={!isValid || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
          ) : (
            <><Crosshair className="h-4 w-4 mr-2" />Salvar Mapeamento</>
          )}
        </Button>

        {saveMutation.isError && (
          <p className="text-xs text-destructive text-center -mt-3">
            {(saveMutation.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}