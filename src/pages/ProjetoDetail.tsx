import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Loader2, Search, Pencil, Sparkles, Download } from 'lucide-react';
import {
  useOutplacementProject, useOutplacementContacts, useOutplacementMarketJobs, OutplacementContact,
} from '@/hooks/useOutplacementProjects';
import { useParties } from '@/hooks/useParties';
import { useCompanies } from '@/hooks/useCompanies';
import { ProjectDialog } from '@/components/projetos/ProjectDialog';
import { ProjectContactDialog } from '@/components/projetos/ContactDialog';
import { ContactList } from '@/components/projetos/ContactList';
import { ContactKanban } from '@/components/projetos/ContactKanban';
import { MarketJobsTab } from '@/components/projetos/MarketJobsTab';
import { ActivitiesTab } from '@/components/projetos/ActivitiesTab';
import { ContactValidationDialog } from '@/components/projetos/ContactValidationDialog';
import { useValidateContacts, ContactSuggestion } from '@/hooks/useContactValidation';
import { exportProjetoMapeamento } from '@/lib/exportProjeto';
import { toast } from 'sonner';

export default function ProjetoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useOutplacementProject(id);
  const { data: contacts = [] } = useOutplacementContacts(id);
  const { data: marketJobs = [] } = useOutplacementMarketJobs(id);
  const { data: parties = [] } = useParties();
  const { data: companies = [] } = useCompanies();

  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<OutplacementContact | null>(null);
  const [search, setSearch] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const validate = useValidateContacts();

  const handleValidateAll = async () => {
    if (contacts.length === 0) {
      toast.info('Nenhum contato para validar');
      return;
    }
    setShowValidation(true);
    setSuggestions([]);
    const result = await validate.mutateAsync(
      contacts.map(c => ({
        id: c.id, name: c.name,
        current_position: c.current_position,
        company_name: c.company_name,
        linkedin_url: c.linkedin_url,
      }))
    );
    setSuggestions(result);
    if (result.length === 0) toast.success('Todos os contatos estão consistentes!');
  };

  const handleValidateNew = async (newId: string) => {
    const target = contacts.find(c => c.id === newId);
    if (!target) return;
    const result = await validate.mutateAsync([{
      id: target.id, name: target.name,
      current_position: target.current_position,
      company_name: target.company_name,
      linkedin_url: target.linkedin_url,
    }]);
    if (result.length > 0) {
      setSuggestions(result);
      setShowValidation(true);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.current_position || '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Projeto não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/projetos')} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const clientName = project.party_id
    ? parties.find(p => p.id === project.party_id)?.full_name
    : project.company_id
      ? companies.find(c => c.id === project.company_id)?.nome_fantasia
      : null;

  const openEditContact = (c: OutplacementContact) => { setEditingContact(c); setShowContactDialog(true); };
  const openNewContact = () => { setEditingContact(null); setShowContactDialog(true); };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projetos')} className="h-8 w-8 mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{project.title}</h1>
              <Badge variant="outline" className="text-xs">{project.project_type === 'outplacement' ? 'Outplacement' : 'Consultoria'}</Badge>
              <Badge variant={project.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">{project.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              {clientName && <span>👤 {clientName}</span>}
              {project.target_role && <span>🎯 {project.target_role}</span>}
              {project.target_location && <span>📍 {project.target_location}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportProjetoMapeamento(project, contacts, marketJobs);
                toast.success('Exportação iniciada');
              }}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowProjectDialog(true)} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="mapeamento">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="mapeamento" className="text-xs sm:text-sm">Mapeamento</TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs sm:text-sm">Kanban</TabsTrigger>
            <TabsTrigger value="vagas" className="text-xs sm:text-sm">Vagas Mercado</TabsTrigger>
            <TabsTrigger value="atividades" className="text-xs sm:text-sm">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="mapeamento" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar contatos..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleValidateAll} disabled={validate.isPending} className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  {validate.isPending ? 'Validando...' : 'Validar com IA'}
                </Button>
                <Button size="sm" onClick={openNewContact} className="gap-1.5"><Plus className="h-4 w-4" />Novo Contato</Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredContacts.length} contato(s){contacts.length !== filteredContacts.length && ` de ${contacts.length}`}
            </p>
            {filteredContacts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="font-medium">Nenhum contato mapeado</p>
                <p className="text-sm mt-1">Adicione decisores, recrutadores e RH</p>
              </div>
            ) : (
              <ContactList contacts={filteredContacts} onEdit={openEditContact} />
            )}
          </TabsContent>

          <TabsContent value="kanban" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={openNewContact} className="gap-1.5"><Plus className="h-4 w-4" />Novo Contato</Button>
            </div>
            <ContactKanban contacts={contacts} onEdit={openEditContact} />
          </TabsContent>

          <TabsContent value="vagas" className="mt-4">
            <MarketJobsTab project={project} />
          </TabsContent>

          <TabsContent value="atividades" className="mt-4">
            <ActivitiesTab project={project} />
          </TabsContent>
        </Tabs>

        <ProjectDialog open={showProjectDialog} onOpenChange={setShowProjectDialog} project={project} />
        <ProjectContactDialog open={showContactDialog} onOpenChange={setShowContactDialog}
          projectId={project.id} contact={editingContact} onCreated={handleValidateNew} />
        <ContactValidationDialog
          open={showValidation}
          onOpenChange={setShowValidation}
          suggestions={suggestions}
          isLoading={validate.isPending}
        />
      </div>
    </div>
  );
}
