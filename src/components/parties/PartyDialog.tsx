import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateParty } from '@/hooks/useParties';
import { PartyRoleType, partyRoleLabels } from '@/types/party';

interface PartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const availableRoles: PartyRoleType[] = ['candidate', 'client_contact', 'prospect', 'hiring_manager'];

export function PartyDialog({ open, onOpenChange }: PartyDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email_raw: '',
    phone_raw: '',
    linkedin_url: '',
    headline: '',
    city: '',
    state: '',
    notes: '',
    tags: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<PartyRoleType[]>([]);

  const createParty = useCreateParty();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createParty.mutateAsync({
      ...formData,
      email_raw: formData.email_raw || undefined,
      phone_raw: formData.phone_raw || undefined,
      linkedin_url: formData.linkedin_url || undefined,
      headline: formData.headline || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      notes: formData.notes || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      created_from: 'crm',
      roles: selectedRoles,
    });

    // Reset form
    setFormData({
      full_name: '',
      email_raw: '',
      phone_raw: '',
      linkedin_url: '',
      headline: '',
      city: '',
      state: '',
      notes: '',
      tags: '',
    });
    setSelectedRoles([]);
    onOpenChange(false);
  };

  const toggleRole = (role: PartyRoleType) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Pessoa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="João da Silva"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email_raw}
                  onChange={(e) => setFormData(prev => ({ ...prev, email_raw: e.target.value }))}
                  placeholder="joao@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone_raw}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_raw: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Título/Cargo</Label>
              <Input
                id="headline"
                value={formData.headline}
                onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                placeholder="Gerente de Projetos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={formData.linkedin_url}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/joaosilva"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="SP"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Papéis</Label>
              <div className="flex flex-wrap gap-4">
                {availableRoles.map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={role}
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => toggleRole(role)}
                    />
                    <Label htmlFor={role} className="text-sm font-normal cursor-pointer">
                      {partyRoleLabels[role]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="engenharia, senior, remoto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionais..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createParty.isPending}>
              {createParty.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
