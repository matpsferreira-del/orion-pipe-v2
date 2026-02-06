import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, MapPin, Calendar, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobRow } from '@/hooks/useJobs';
import { jobStatusLabels, jobStatusColors, priorityLabels, priorityColors, JobPriority } from '@/types/ats';

interface JobCardProps {
  job: JobRow;
  companyName?: string;
  responsavelName?: string;
  applicationsCount?: number;
  onClick?: () => void;
}

export function JobCard({ job, companyName, responsavelName, applicationsCount = 0, onClick }: JobCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const hasSalary = job.salary_min || job.salary_max;
  const salaryText = hasSalary
    ? job.salary_min && job.salary_max
      ? `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max)}`
      : job.salary_min
        ? `A partir de ${formatCurrency(job.salary_min)}`
        : `Até ${formatCurrency(job.salary_max!)}`
    : null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold line-clamp-1">
            {job.title}
          </CardTitle>
          <div className="flex gap-1.5 flex-shrink-0">
            <Badge variant="outline" className={cn('text-xs', priorityColors[job.priority as JobPriority])}>
              {priorityLabels[job.priority as JobPriority]}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', jobStatusColors[job.status])}>
              {jobStatusLabels[job.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {companyName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{companyName}</span>
          </div>
        )}

        {job.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{job.location}</span>
          </div>
        )}

        {salaryText && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>{salaryText}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{applicationsCount} candidato{applicationsCount !== 1 ? 's' : ''}</span>
          </div>

          {job.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(job.deadline)}</span>
            </div>
          )}
        </div>

        {responsavelName && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials(responsavelName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {responsavelName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
