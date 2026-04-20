import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, DollarSign, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllOpportunityMentions } from '@/hooks/useOpportunityMentions';

interface ExtendedOpportunity {
  id: string;
  companyId: string | null;
  contactId: string | null;
  responsavelId: string;
  stage: string;
  valorPotencial: number;
  probabilidade: number;
  createdAt: Date;
  dataPrevisaoFechamento: Date;
  origemLead: string;
  tipoServico: string;
  observacoes?: string;
  _company?: { nome_fantasia: string } | null;
  _contact?: { nome: string; cargo: string } | null;
  _responsavel?: { name: string; avatar?: string | null } | null;
}

interface KanbanCardProps {
  opportunity: ExtendedOpportunity;
  onClick: () => void;
}

export function KanbanCard({ opportunity, onClick }: KanbanCardProps) {
  const company = opportunity._company;
  const contact = opportunity._contact;
  const responsavel = opportunity._responsavel;

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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-medium text-[13px] sm:text-sm text-foreground line-clamp-2 flex-1 leading-tight">
          {opportunity.tipoServico === 'outplacement' && !opportunity.companyId
            ? (opportunity.observacoes?.match(/\[PF: (.+?)\]/)?.[1] || 'Outplacement')
            : (company?.nome_fantasia || 'Empresa não encontrada')}
        </h4>
        <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          {opportunity.probabilidade}%
        </span>
      </div>

      {contact && (
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate mb-2">
          {contact.nome} • {contact.cargo}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] sm:text-xs gap-2">
        <div className="flex items-center gap-0.5 text-primary font-medium min-w-0">
          <DollarSign className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatCurrency(opportunity.valorPotencial)}</span>
        </div>
        <div className={cn(
          'flex items-center gap-1 shrink-0',
          isOverdue() ? 'text-destructive' : isNearDeadline() ? 'text-warning' : 'text-muted-foreground'
        )}>
          <Calendar className="h-3 w-3" />
          {formatDate(opportunity.dataPrevisaoFechamento)}
        </div>
      </div>

      {responsavel && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
          <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
            <AvatarFallback className="text-[9px] sm:text-[10px] bg-primary/10 text-primary">
              {responsavel.avatar || getInitials(responsavel.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
            {responsavel.name}
          </span>
        </div>
      )}
    </div>
  );
}
