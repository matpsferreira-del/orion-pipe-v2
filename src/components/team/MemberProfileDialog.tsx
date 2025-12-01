import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ProfileRow } from '@/hooks/useProfiles';
import { Mail, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: ProfileRow | null;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor Comercial',
  consultor: 'Consultor',
};

const roleColors: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive',
  gestor: 'bg-primary/10 text-primary',
  consultor: 'bg-success/10 text-success',
};

export function MemberProfileDialog({ open, onOpenChange, member }: MemberProfileDialogProps) {
  if (!member) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil do Membro</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {member.avatar || getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">{member.name}</h3>
            <Badge variant="secondary" className={roleColors[member.role] || roleColors.consultor}>
              {roleLabels[member.role] || member.role}
            </Badge>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{member.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">ID do Usuário</p>
              <p className="font-medium text-sm font-mono">{member.user_id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Membro desde</p>
              <p className="font-medium">
                {format(new Date(member.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
