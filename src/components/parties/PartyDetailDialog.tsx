import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mail, Phone, Linkedin, MapPin, Calendar, Edit2, Save, X, 
  UserPlus, Building2, Briefcase, FileText, Globe 
} from 'lucide-react';
import { useParty, useUpdateParty, useAddPartyRole, useRemovePartyRole } from '@/hooks/useParties';
import { PartyRoleType, partyRoleLabels, partyStatusLabels } from '@/types/party';
import { usePartyApplications, useApplicationHistory } from '@/hooks/useApplications';
import { applicationStatusLabels, sourceLabels } from '@/types/ats';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ComposeEmailDialog } from '@/components/email/ComposeEmailDialog';

interface PartyDetailDialogProps {
  partyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const availableRoles: PartyRoleType[] = ['candidate', 'client_contact', 'prospect', 'hiring_manager', 'interviewer', 'alumni', 'vendor'];

export function PartyDetailDialog({ partyId, open, onOpenChange }: PartyDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const { data: party, isLoading } = useParty(partyId || undefined);
  const { data: partyApplications, isLoading: appsLoading } = usePartyApplications(partyId || undefined);
  const updateParty = useUpdateParty();
  const addRole = useAddPartyRole();
  const removeRole = useRemovePartyRole();

  const handleEdit = () => {
    if (party) {
      setEditData({
        full_name: party.full_name,
        email_raw: party.email_raw || '',
        phone_raw: party.phone_raw || '',
        linkedin_url: party.linkedin_url || '',
        photo_url: (party as any).photo_url || '',
        headline: party.headline || '',
        city: party.city || '',
        state: party.state || '',
        notes: party.notes || '',
        tags: Array.isArray(party.tags) ? party.tags.join(', ') : '',
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!party) return;

    await updateParty.mutateAsync({
      id: party.id,
      full_name: editData.full_name,
      email_raw: editData.email_raw || null,
      phone_raw: editData.phone_raw || null,
      linkedin_url: editData.linkedin_url || null,
      photo_url: editData.photo_url || null,
      headline: editData.headline || null,
      city: editData.city || null,
      state: editData.state || null,
      notes: editData.notes || null,
      tags: editData.tags ? editData.tags.split(',').map(t => t.trim()) : [],
    } as any);

    setIsEditing(false);
  };

  const handleAddRole = async (role: PartyRoleType) => {
    if (!party) return;
    await addRole.mutateAsync({ partyId: party.id, role });
  };

  const handleRemoveRole = async (role: PartyRoleType) => {
    if (!party) return;
    await removeRole.mutateAsync({ partyId: party.id, role });
  };

  const currentRoles = party?.party_role?.map(r => r.role) || [];
  const availableToAdd = availableRoles.filter(r => !currentRoles.includes(r));

  if (isLoading || !party) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            Carregando...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              {isEditing ? (
                <Input
                  value={editData.full_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="text-xl font-semibold"
                />
              ) : (
                <DialogTitle className="text-xl">{party.full_name}</DialogTitle>
              )}
              {!isEditing && party.headline && (
                <p className="text-muted-foreground mt-1">{party.headline}</p>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateParty.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Status and Roles */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant={party.status === 'active' ? 'default' : 'secondary'}>
            {partyStatusLabels[party.status]}
          </Badge>
          {party.party_role?.map(r => (
            <Badge 
              key={r.role} 
              variant="outline"
              className="cursor-pointer hover:bg-destructive/10"
              onClick={() => !isEditing && handleRemoveRole(r.role)}
            >
              {partyRoleLabels[r.role]}
              {!isEditing && <X className="h-3 w-3 ml-1" />}
            </Badge>
          ))}
          {availableToAdd.length > 0 && (
            <Select onValueChange={(v) => handleAddRole(v as PartyRoleType)}>
              <SelectTrigger className="h-7 w-auto">
                <UserPlus className="h-3 w-3 mr-1" />
                <span className="text-xs">Adicionar papel</span>
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map(role => (
                  <SelectItem key={role} value={role}>
                    {partyRoleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="ats">ATS</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
            <TabsTrigger value="files">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {isEditing ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      value={editData.email_raw}
                      onChange={(e) => setEditData(prev => ({ ...prev, email_raw: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={editData.phone_raw}
                      onChange={(e) => setEditData(prev => ({ ...prev, phone_raw: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Título/Cargo</Label>
                  <Input
                    value={editData.headline}
                    onChange={(e) => setEditData(prev => ({ ...prev, headline: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input
                    value={editData.linkedin_url}
                    onChange={(e) => setEditData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL da Foto</Label>
                  <Input
                    value={editData.photo_url}
                    onChange={(e) => setEditData(prev => ({ ...prev, photo_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={editData.city}
                      onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={editData.state}
                      onChange={(e) => setEditData(prev => ({ ...prev, state: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input
                    value={editData.tags}
                    onChange={(e) => setEditData(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={editData.notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Contact Info */}
                <div className="grid gap-3">
                  {party.email_norm && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <button onClick={() => setEmailDialogOpen(true)} className="text-primary hover:underline">
                        {party.email_norm}
                      </button>
                    </div>
                  )}
                  {party.phone_raw && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${party.phone_e164}`} className="hover:underline">
                        {party.phone_raw}
                      </a>
                    </div>
                  )}
                  {party.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={party.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Perfil LinkedIn
                      </a>
                    </div>
                  )}
                  {(party.city || party.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{[party.city, party.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Criado em {format(new Date(party.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {party.tags && Array.isArray(party.tags) && party.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {party.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {party.notes && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Observações</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{party.notes}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ats" className="mt-4">
            {appsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando candidaturas...</div>
            ) : partyApplications && partyApplications.length > 0 ? (
              <div className="space-y-3">
                {partyApplications.map((app) => (
                  <ApplicationHistoryCard key={app.id} app={app} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma candidatura encontrada.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="crm" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Vínculos com empresas e oportunidades aparecerão aqui.</p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" disabled>
                  Vincular a Empresa
                </Button>
                <Button variant="outline" disabled>
                  Criar Oportunidade
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Arquivos (CV, portfólio) aparecerão aqui.</p>
              <Button variant="outline" className="mt-4" disabled>
                Upload de Arquivo
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {party?.email_raw && (
      <ComposeEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        defaultRecipients={[party.email_raw]}
        variables={{ nome_candidato: party.full_name }}
      />
    )}
    </>
  );
}
