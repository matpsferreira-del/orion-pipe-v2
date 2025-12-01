import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProfileRow } from '@/hooks/useProfiles';

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: ProfileRow | null;
  onSuccess: () => void;
}

const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor Comercial' },
  { value: 'consultor', label: 'Consultor' },
];

export function MemberDialog({ open, onOpenChange, member, onSuccess }: MemberDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('consultor');

  const isEditing = !!member;

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email);
      setRole(member.role);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('consultor');
    }
  }, [member, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (!isEditing && (!email.trim() || !password.trim())) {
      toast({ title: 'Email e senha são obrigatórios', variant: 'destructive' });
      return;
    }

    if (!isEditing && password.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({ title: 'Você precisa estar logado', variant: 'destructive' });
        return;
      }

      const response = await supabase.functions.invoke('manage-team-member', {
        body: isEditing
          ? { action: 'update', profileId: member.id, name, role }
          : { action: 'create', email, password, name, role },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: isEditing ? 'Membro atualizado' : 'Membro adicionado',
        description: isEditing 
          ? 'As informações foram atualizadas com sucesso.'
          : `${name} foi adicionado à equipe.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Membro' : 'Novo Membro'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Perfil *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
