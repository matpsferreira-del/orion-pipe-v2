import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { mockTasks, getCompanyById, getUserById } from '@/data/mockData';
import { cn } from '@/lib/utils';

const priorityColors = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-warning/10 text-warning',
  alta: 'bg-destructive/10 text-destructive',
};

const priorityLabels = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export function TasksList() {
  const pendingTasks = mockTasks
    .filter(t => t.status === 'pendente' || t.status === 'em_andamento')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const formatDate = (date: Date) => {
    const taskDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (taskDate.toDateString() === today.toDateString()) return 'Hoje';
    if (taskDate.toDateString() === tomorrow.toDateString()) return 'Amanhã';
    return taskDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const isOverdue = (date: Date) => {
    return new Date(date) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tarefas Pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingTasks.map((task) => {
            const company = task.companyId ? getCompanyById(task.companyId) : null;
            const responsavel = getUserById(task.responsavelId);
            const overdue = isOverdue(task.dueDate);

            return (
              <div 
                key={task.id} 
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Checkbox 
                  className="mt-0.5"
                  checked={task.status === 'concluida'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {company && (
                      <span className="text-xs text-muted-foreground">
                        {company.nomeFantasia}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {responsavel?.name}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className={cn(priorityColors[task.priority])}>
                    {priorityLabels[task.priority]}
                  </Badge>
                  <span className={cn(
                    'text-xs',
                    overdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}>
                    {formatDate(task.dueDate)}
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
