import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskRow } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { isSameDay } from 'date-fns';

interface TaskCalendarProps {
  tasks: TaskRow[];
  selectedDate?: Date;
  onSelectDate?: (date: Date | undefined) => void;
  compact?: boolean;
}

export function TaskCalendar({ tasks, selectedDate, onSelectDate, compact = false }: TaskCalendarProps) {
  const taskDates = useMemo(() => {
    const map = new Map<string, { count: number; hasOverdue: boolean; hasHigh: boolean }>();
    const now = new Date();
    tasks.forEach(t => {
      if (t.status === 'concluida' || t.status === 'cancelada') return;
      const dateKey = new Date(t.due_date).toDateString();
      const existing = map.get(dateKey) || { count: 0, hasOverdue: false, hasHigh: false };
      existing.count++;
      if (new Date(t.due_date) < now && !isSameDay(new Date(t.due_date), now)) existing.hasOverdue = true;
      if (t.priority === 'alta') existing.hasHigh = true;
      map.set(dateKey, existing);
    });
    return map;
  }, [tasks]);

  const tasksForDate = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter(t => {
      if (t.status === 'concluida' || t.status === 'cancelada') return false;
      return isSameDay(new Date(t.due_date), selectedDate);
    });
  }, [tasks, selectedDate]);

  const modifiers = useMemo(() => {
    const withTasks: Date[] = [];
    const overdue: Date[] = [];
    const highPriority: Date[] = [];
    taskDates.forEach((info, dateStr) => {
      const d = new Date(dateStr);
      withTasks.push(d);
      if (info.hasOverdue) overdue.push(d);
      if (info.hasHigh) highPriority.push(d);
    });
    return { withTasks, overdue, highPriority };
  }, [taskDates]);

  const modifiersStyles = {
    withTasks: {
      fontWeight: 700,
      position: 'relative' as const,
    },
    overdue: {
      color: 'hsl(var(--destructive))',
      fontWeight: 700,
    },
    highPriority: {
      borderBottom: '2px solid hsl(var(--destructive))',
    },
  };

  return (
    <Card>
      <CardHeader className={compact ? "pb-1 pt-3 px-3" : "pb-2"}>
        <CardTitle className="text-lg font-semibold">Calendário</CardTitle>
      </CardHeader>
      <CardContent className={compact ? "px-1 pb-2" : "px-2 pb-3"}>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className={cn("p-2 pointer-events-auto", compact && "text-xs")}
        />
        {selectedDate && tasksForDate.length > 0 && (
          <div className="mt-2 px-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {tasksForDate.length} tarefa{tasksForDate.length > 1 ? 's' : ''}
            </p>
            {tasksForDate.slice(0, 4).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  t.priority === 'alta' ? 'bg-destructive' : t.priority === 'media' ? 'bg-warning' : 'bg-muted-foreground'
                )} />
                <span className="truncate">{t.titulo}</span>
              </div>
            ))}
            {tasksForDate.length > 4 && (
              <p className="text-xs text-muted-foreground">+{tasksForDate.length - 4} mais</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
