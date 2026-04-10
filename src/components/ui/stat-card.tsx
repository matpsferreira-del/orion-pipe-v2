import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'accent';
  className?: string;
}

function formatCompactValue(value: string | number): string {
  if (typeof value === 'string') {
    // Try to extract numeric from currency strings like "R$ 1.234.567,89"
    const match = value.match(/^(R\$\s?)([\d.,]+)(.*)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        if (num >= 1_000_000_000) return `${prefix}${(num / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
        if (num >= 1_000_000) return `${prefix}${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
        if (num >= 10_000) return `${prefix}${(num / 1_000).toFixed(1).replace('.', ',')}k`;
      }
    }
    return value;
  }
  if (typeof value === 'number') {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
    return value.toLocaleString('pt-BR');
  }
  return String(value);
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  const iconColors = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
  };

  const displayValue = formatCompactValue(value);

  return (
    <div className={cn('metric-card', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="stat-value text-foreground truncate" title={String(value)}>{displayValue}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'inline-flex items-center text-xs sm:text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="ml-1 text-muted-foreground font-normal hidden sm:inline">vs mês anterior</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2 sm:p-3 rounded-lg shrink-0', iconColors[variant])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
