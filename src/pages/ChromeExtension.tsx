import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2, Briefcase, User, Link as LinkIcon, Building, BadgeCheck } from 'lucide-react';

export default function ChromeExtension() {
  const [searchParams] = useSearchParams();
  const [nome, setNome] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresaAtual, setEmpresaAtual] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nome.trim() || !selectedJobId) throw new Error('Preencha todos os campos');

      // 1. Resolve or create the party
      const { data: partyId, error: partyError } = await supabase.rpc('resolve_party', {
        p_full_name: nome.trim(),
        p_linkedin_url: linkedinUrl.trim() || null,
        p_created_from: 'ats' as const,
        p_current_title: cargo.trim() || null,
        p_current_company: empresaAtual.trim() || null,
      });
      if (partyError) throw partyError;

      // 2. Ensure candidate role
      await supabase.rpc('ensure_party_role', {
        p_party_id: partyId,
        p_role: 'candidate' as const,
      });

      // 3. Find the "Mapeado" stage for this job
      const { data: stages, error: stagesError } = await supabase
        .from('job_pipeline_stages')
        .select('id, name')
        .eq('job_id', selectedJobId);
      if (stagesError) throw stagesError;

      const mapeadoStage = stages?.find(s => s.name.toLowerCase() === 'mapeado');
      if (!mapeadoStage) throw new Error('Etapa "Mapeado" não encontrada nesta vaga. Crie a etapa primeiro.');

      // 4. Insert application
      const { error: appError } = await supabase.from('applications').insert({
        job_id: selectedJobId,
        party_id: partyId,
        stage_id: mapeadoStage.id,
        source: 'hunting',
        status: 'new',
      });
      if (appError) throw appError;
    },
    onSuccess: () => setSaved(true),
  });

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Salvo com sucesso!</h2>
          <p className="text-sm text-muted-foreground">
            {nome} foi adicionado ao mapeamento da vaga.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSaved(false);
              setSelectedJobId('');
            }}
          >
            Salvar outro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h1 className="text-sm font-semibold text-foreground tracking-tight">Orion · Mapeamento</h1>
      </div>

      {/* Form */}
      <div className="flex-1 p-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="nome" className="text-xs font-medium flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Nome
          </Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do candidato"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkedin" className="text-xs font-medium flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
            URL do LinkedIn
          </Label>
          <Input
            id="linkedin"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cargo" className="text-xs font-medium flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" />
            Cargo Atual
          </Label>
          <Input
            id="cargo"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ex: Gerente Financeiro"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="empresa" className="text-xs font-medium flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
            Empresa Atual
          </Label>
          <Input
            id="empresa"
            value={empresaAtual}
            onChange={(e) => setEmpresaAtual(e.target.value)}
            placeholder="Ex: XP Inc"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            Vaga
          </Label>
          {loadingJobs ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando vagas...
            </div>
          ) : (
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione uma vaga" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_code ? `#${job.job_code} · ` : ''}{job.title}
                  </SelectItem>
                ))}
                {jobs.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                    Nenhuma vaga aberta
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <Button
          className="w-full"
          disabled={!nome.trim() || !selectedJobId || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar no Mapeamento'
          )}
        </Button>
        {saveMutation.isError && (
          <p className="text-xs text-destructive mt-2 text-center">
            {(saveMutation.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
