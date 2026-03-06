import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks, useUpdateTask, useDeleteTask, TaskRow } from '@/hooks/useTasks';
import { useCompanies } from '@/hooks/useCompanies';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Filter, Calendar, Clock, Building2, Trash2, Loader2, Bell, CheckCircle2, AlertCircle, Clock4, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast, isThisWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const priorityConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  media: { label: 'Média', className: 'bg-warning/10 text-warning border-warning/20' },
  alta: { label: 'Alta', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function Tarefas() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);

  const { data: tasks = [], isLoading } = useTasks();
  const { data: companies = [] } = useCompanies();
  const { data: profiles = [] } = useProfiles();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return null;
    return companies.find(c => c.id === companyId)?.nome_fantasia;
  };

  const getResponsavelName = (responsavelId: string) => {
    return profiles.find(p => p.id === responsavelId)?.name || 'Desconhecido';
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'concluida' || status === 'cancelada') return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = searchTerm === '' ||
        task.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tasks, searchTerm, filterPriority, filterStatus]);

  const groupedTasks = useMemo(() => {
    const pending = filteredTasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento');
    const completed = filteredTasks.filter(t => t.status === 'concluida' || t.status === 'cancelada');
    const overdue = pending.filter(t => isOverdue(t.due_date, t.status));
    const today = pending.filter(t => isToday(new Date(t.due_date)));
    const tomorrow = pending.filter(t => isTomorrow(new Date(t.due_date)));
    const thisWeek = pending.filter(t => {
      const date = new Date(t.due_date);
      return isThisWeek(date) && !isToday(date) && !isTomorrow(date) && !isPast(date);
    });
    const later = pending.filter(t => {
      const date = new Date(t.due_date);
      return !isThisWeek(date) && !isPast(date);
    });
    return { overdue, today, tomorrow, thisWeek, later, completed };
  }, [filteredTasks]);

  const handleToggleComplete = async (task: TaskRow) => {
    const newStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
    await updateTask.mutateAsync({ id: task.id, status: newStatus });
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask.mutateAsync(taskId);
  };

  const handleEdit = (task: TaskRow) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingTask(null);
  };

  const TaskCard = ({ task }: { task: TaskRow }) => {
    const priority = priorityConfig[task.priority] || priorityConfig.media;
    const companyName = getCompanyName(task.company_id);
    const responsavelName = getResponsavelName(task.responsavel_id);
    const overdue = isOverdue(task.due_date, task.status);
    const isCompleted = task.status === 'concluida';

    return (
      <div className={cn(
        "p-3 sm:p-4 rounded-lg border bg-card transition-all hover:shadow-sm",
        overdue && "border-destructive/50 bg-destructive/5",
        isCompleted && "opacity-60"
      )}>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => handleToggleComplete(task)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(task)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "font-medium text-sm sm:text-base",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {task.titulo}
              </span>
              <Badge variant="outline" className={cn("text-xs", priority.className)}>
                {priority.label}
              </Badge>
              {overdue && (
                <Badge variant="destructive" className="text-xs">Atrasada</Badge>
              )}
            </div>
            {task.descricao && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.descricao}</p>
            )}
            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              {companyName && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{companyName}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className={cn("h-3 w-3", overdue && "text-destructive")} />
                <span className={cn(overdue && "text-destructive font-medium")}>
                  {formatDueDate(task.due_date)}
                </span>
              </div>
              <span className="hidden sm:inline">• {responsavelName}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => handleEdit(task)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const TaskSection = ({ title, tasks, icon: Icon, className }: { 
    title: string; tasks: TaskRow[]; icon: React.ElementType; className?: string;
  }) => {
    if (tasks.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className={cn("flex items-center gap-2 text-sm font-medium", className)}>
          <Icon className="h-4 w-4" />
          <span>{title}</span>
          <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
        </div>
        <div className="space-y-2">
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      </div>
    );
  };

  const stats = {
    total: tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length,
    overdue: groupedTasks.overdue.length,
    today: groupedTasks.today.length,
    completed: tasks.filter(t => t.status === 'concluida').length,
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Tarefas"
        description="Gerencie suas atividades e follow-ups"
        actions={
          <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card><CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock4 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div><p className="text-xl sm:text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            </div>
            <div><p className="text-xl sm:text-2xl font-bold text-destructive">{stats.overdue}</p><p className="text-xs text-muted-foreground">Atrasadas</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            </div>
            <div><p className="text-xl sm:text-2xl font-bold">{stats.today}</p><p className="text-xs text-muted-foreground">Para Hoje</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            </div>
            <div><p className="text-xl sm:text-2xl font-bold text-success">{stats.completed}</p><p className="text-xs text-muted-foreground">Concluídas</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main content with calendar sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pendentes ({stats.total})</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">Concluídas ({stats.completed})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {stats.total === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="font-medium text-lg">Tudo em dia!</h3>
                <p className="text-muted-foreground mt-1">Você não tem tarefas pendentes</p>
              </CardContent></Card>
            ) : (
              <>
                <TaskSection title="Atrasadas" tasks={groupedTasks.overdue} icon={AlertCircle} className="text-destructive" />
                <TaskSection title="Hoje" tasks={groupedTasks.today} icon={Bell} className="text-warning" />
                <TaskSection title="Amanhã" tasks={groupedTasks.tomorrow} icon={Calendar} />
                <TaskSection title="Esta Semana" tasks={groupedTasks.thisWeek} icon={Clock} />
                <TaskSection title="Futuras" tasks={groupedTasks.later} icon={Calendar} className="text-muted-foreground" />
              </>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 sm:mt-6">
            {groupedTasks.completed.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Clock4 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Nenhuma tarefa concluída</h3>
                <p className="text-muted-foreground mt-1">Complete algumas tarefas para vê-las aqui</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {groupedTasks.completed.map(task => <TaskCard key={task.id} task={task} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Mini Calendar Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <TaskCalendar
              tasks={tasks}
              selectedDate={calendarDate}
              onSelectDate={setCalendarDate}
            />
          </div>
        </div>
      </div>

      <TaskDialog open={dialogOpen} onOpenChange={handleDialogClose} editTask={editingTask} />
    </div>
  );
}
