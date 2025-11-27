import { Opportunity } from '@/types/crm';
import { getCompanyById, getContactById, getUserById } from '@/data/mockData';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  opportunity: Opportunity;
  onClick: () => void;
}

export function KanbanCard({ opportunity, onClick }: KanbanCardProps) {
  const company = getCompanyById(opportunity.companyId);
  const contact = getContactById(opportunity.contactId);
  const responsavel = getUserById(opportunity.responsavelId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const isNearDeadline = () => {
    const deadline = new Date(opportunity.dataPrevisaoFechamento);
    const today = new Date();
    const diff = deadline.getTime() - today.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 7 && days >= 0;
  };

  const isOverdue = () => {
    return new Date(opportunity.dataPrevisaoFechamento) < new Date();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('opportunityId', opportunity.id);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
  };

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm text-foreground truncate flex-1">
          {company?.nomeFantasia}
        </h4>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {opportunity.probabilidade}%
        </span>
      </div>

      {contact && (
        <p className="text-xs text-muted-foreground truncate mb-3">
          {contact.nome} • {contact.cargo}
        </p>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-primary font-medium">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(opportunity.valorPotencial)}
        </div>
        <div className={cn(
          'flex items-center gap-1',
          isOverdue() ? 'text-destructive' : isNearDeadline() ? 'text-warning' : 'text-muted-foreground'
        )}>
          <Calendar className="h-3 w-3" />
          {formatDate(opportunity.dataPrevisaoFechamento)}
        </div>
      </div>

      {responsavel && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {responsavel.avatar}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {responsavel.name}
          </span>
        </div>
      )}
    </div>
  );
}
