import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, GraduationCap, Search, AlertCircle } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { usePathlyActivePlans } from "@/hooks/usePathlyPlans";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Projetos() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Projetos</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe os projetos por tipo de serviço prestado.
        </p>
      </div>

      <Tabs defaultValue="outplacement" className="w-full">
        <TabsList>
          <TabsTrigger value="outplacement" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Outplacement
          </TabsTrigger>
          <TabsTrigger value="mentoria" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Mentoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outplacement" className="mt-4">
          <OutplacementTab />
        </TabsContent>
        <TabsContent value="mentoria" className="mt-4">
          <MentoriaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OutplacementTab() {
  const { data: jobs, isLoading } = useJobs();
  const [search, setSearch] = useState("");

  const projects = useMemo(() => {
    const list = (jobs ?? []).filter(
      (j) => !j.company_id || j.title?.toLowerCase().startsWith("outplacement"),
    );
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((j) => j.title?.toLowerCase().includes(q));
  }, [jobs, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar projeto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nenhum projeto de outplacement"
          description="Projetos sem empresa cliente vinculada aparecerão aqui."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <Badge variant={job.status === "open" ? "default" : "secondary"}>
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {job.location && <p>{job.location}</p>}
                {job.created_at && (
                  <p>
                    Criado em{" "}
                    {format(new Date(job.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MentoriaTab() {
  const { data: plans, isLoading, error } = usePathlyActivePlans();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium">Não foi possível carregar os planos do Pathly</p>
            <p className="text-sm text-muted-foreground">
              Verifique se a edge function <code>orion-bridge</code> está publicada no
              projeto Pathly e se os secrets <code>ORION_BRIDGE_SECRET</code> e{" "}
              <code>PATHLY_FUNCTIONS_URL</code> estão configurados corretamente.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Detalhe: {(error as Error).message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Nenhum plano de mentoria ativo"
        description="Os planos ativos do Pathly aparecerão aqui assim que forem criados."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">
                {plan.mentee_name || "Mentorado sem nome"}
              </CardTitle>
              {plan.status && (
                <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                  {plan.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {plan.mentee_email && <p>{plan.mentee_email}</p>}
            {plan.plan_type && <p>Plano: {plan.plan_type}</p>}
            {plan.started_at && (
              <p>
                Início:{" "}
                {format(new Date(plan.started_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
