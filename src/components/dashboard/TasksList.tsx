import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskRow } from '@/hooks/useTasks';
import { ProfileRow } from '@/hooks/useProfiles';
import { CompanyRow } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-warning/10 text-warning',
  alta: 'bg-destructive/10 text-destructive',
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

interface TasksListProps {
  tasks: TaskRow[];
  profiles: ProfileRow[];
  companies: CompanyRow[];
}

export function TasksList({ tasks, profiles, companies }: TasksListProps) {
  const pendingTasks = tasks
    .filter(t => t.status === 'pendente' || t.status === 'em_andamento')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  const formatDate = (date: string) => {
    const taskDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (taskDate.toDateString() === today.toDateString()) return 'Hoje';
    if (taskDate.toDateString() === tomorrow.toDateString()) return 'Amanhã';
    return taskDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const isOverdue = (date: string) => {
    return new Date(date) < new Date();
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return null;
    const company = companies.find(c => c.id === companyId);
    return company?.nome_fantasia || null;
  };

  const getUserName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.name || 'Usuário';
  };

  if (pendingTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tarefas Pendentes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Nenhuma tarefa pendente
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tarefas Pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingTasks.map((task) => {
            const companyName = getCompanyName(task.company_id);
            const responsavelName = getUserName(task.responsavel_id);
            const overdue = isOverdue(task.due_date);

            return (
              <div 
                key={task.id} 
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Checkbox 
                  className="mt-0.5"
                  checked={task.status === 'concluida'}
                  disabled
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {companyName && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {companyName}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {responsavelName}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className={cn(priorityColors[task.priority] || priorityColors.media)}>
                    {priorityLabels[task.priority] || 'Média'}
                  </Badge>
                  <span className={cn(
                    'text-xs',
                    overdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}>
                    {formatDate(task.due_date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
