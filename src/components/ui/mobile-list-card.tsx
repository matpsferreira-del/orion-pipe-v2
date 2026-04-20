import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileListCardProps {
  /** Title row content (e.g., name + badge) */
  title: ReactNode;
  /** Subtitle (e.g., company, role) */
  subtitle?: ReactNode;
  /** Right-aligned trailing content in title row (e.g., action menu) */
  trailing?: ReactNode;
  /** Compact metadata rows shown below */
  meta?: ReactNode;
  /** Click handler for the whole card */
  onClick?: () => void;
  className?: string;
  /** Optional left icon/avatar */
  leading?: ReactNode;
}

/**
 * MobileListCard - displays list rows as touch-friendly cards on mobile.
 * Use inside `<div className="md:hidden">` blocks while keeping desktop tables in `<div className="hidden md:block">`.
 */
export function MobileListCard({
  title,
  subtitle,
  trailing,
  meta,
  leading,
  onClick,
  className,
}: MobileListCardProps) {
  return (
    <div
      className={cn('mobile-list-card', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start gap-3">
        {leading && <div className="shrink-0 mt-0.5">{leading}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 text-sm font-medium text-foreground">{title}</div>
            {trailing && <div className="shrink-0" onClick={(e) => e.stopPropagation()}>{trailing}</div>}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</div>
          )}
          {meta && <div className="mt-2 space-y-1 text-xs text-muted-foreground">{meta}</div>}
        </div>
      </div>
    </div>
  );
}
