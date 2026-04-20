import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-row items-start justify-between gap-2 sm:gap-4', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}
