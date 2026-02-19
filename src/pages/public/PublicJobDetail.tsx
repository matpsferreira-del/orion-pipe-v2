import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2, MapPin, DollarSign, Calendar, ArrowLeft,
  CheckCircle2, Briefcase, Loader2, Send
} from 'lucide-react';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  email: z.string().trim().email('E-mail inválido').max(255),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  linkedin_url: z.string().trim().url('URL inválida').max(255).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  state: z.string().trim().max(2).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface PublicJob {
  id: string;
  title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  deadline: string | null;
  description: string | null;
  requirements: string | null;
  slug: string;
  companies: { nome_fantasia: string } | null;
}

function usePublicJob(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-job', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, location, salary_min, salary_max, deadline, description, requirements, slug, companies(nome_fantasia)')
        .eq('slug', slug)
        .eq('published', true)
        .eq('status', 'open')
        .single();

      if (error) return null;
      return data as unknown as PublicJob;
    },
    enabled: !!slug,
  });
}

export default function PublicJobDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: job, isLoading } = usePublicJob(slug);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/public-apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({
          job_slug: slug,
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || null,
          linkedin_url: values.linkedin_url || null,
          city: values.city || null,
          state: values.state || null,
          notes: values.notes || null,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || 'Erro ao enviar candidatura. Tente novamente.');
        return;
      }

      setAlreadyApplied(result.already_applied === true);
      setSubmitted(true);
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Briefcase className="h-16 w-16 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold text-foreground">Vaga não encontrada</h2>
        <p className="text-muted-foreground max-w-sm">
          Esta vaga pode ter sido encerrada ou o link está incorreto.
        </p>
        <Button asChild variant="outline">
          <Link to="/vagas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ver todas as vagas
          </Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {alreadyApplied ? 'Você já está inscrito!' : 'Candidatura enviada!'}
          </h2>
          <p className="text-muted-foreground max-w-sm">
            {alreadyApplied
              ? 'Você já havia se candidatado a esta vaga anteriormente. Entraremos em contato em breve.'
              : `Sua candidatura para ${job.title} foi recebida com sucesso. Entraremos em contato em breve!`
            }
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/vagas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ver outras vagas
          </Link>
        </Button>
      </div>
    );
  }

  const hasSalary = job.salary_min || job.salary_max;
  const salaryText = hasSalary
    ? job.salary_min && job.salary_max
      ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`
      : job.salary_min
        ? `A partir de ${formatCurrency(job.salary_min)}`
        : `Até ${formatCurrency(job.salary_max!)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/vagas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Todas as vagas
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Left: Job info */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-3">{job.title}</h1>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {job.companies?.nome_fantasia && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {job.companies.nome_fantasia}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </span>
                )}
                {salaryText && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    {salaryText}
                  </span>
                )}
                {job.deadline && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Inscrições até {formatDate(job.deadline)}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {job.description && (
              <div>
                <h2 className="text-base font-semibold text-foreground mb-3">Sobre a vaga</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </p>
              </div>
            )}

            {job.requirements && (
              <div>
                <h2 className="text-base font-semibold text-foreground mb-3">Requisitos</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {job.requirements}
                </p>
              </div>
            )}
          </div>

          {/* Right: Application form */}
          <div className="lg:col-span-2">
            <div className="border border-border rounded-xl p-6 bg-card sticky top-20">
              <h2 className="text-base font-semibold text-foreground mb-1">Candidatar-se</h2>
              <p className="text-xs text-muted-foreground mb-5">
                Preencha os dados abaixo para enviar sua candidatura.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">
                    Nome completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Seu nome"
                    {...register('full_name')}
                    className={errors.full_name ? 'border-destructive' : ''}
                  />
                  {errors.full_name && (
                    <p className="text-xs text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    E-mail <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    {...register('phone')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    placeholder="https://linkedin.com/in/seu-perfil"
                    {...register('linkedin_url')}
                    className={errors.linkedin_url ? 'border-destructive' : ''}
                  />
                  {errors.linkedin_url && (
                    <p className="text-xs text-destructive">{errors.linkedin_url.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" placeholder="São Paulo" {...register('city')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" placeholder="SP" maxLength={2} {...register('state')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Apresentação</Label>
                  <Textarea
                    id="notes"
                    placeholder="Fale um pouco sobre você e por que se interessa por esta vaga..."
                    rows={4}
                    {...register('notes')}
                    className="resize-none"
                  />
                  {errors.notes && (
                    <p className="text-xs text-destructive">{errors.notes.message}</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-xs text-destructive">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar candidatura
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Seus dados são tratados com confidencialidade.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
