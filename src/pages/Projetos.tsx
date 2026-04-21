import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Loader2, Users, MapPin, Briefcase, Target, MoreVertical, Pencil, Trash2, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  useOutplacementProjects, useDeleteOutplacementProject,
  useOutplacementContacts, OutplacementProject,
} from '@/hooks/useOutplacementProjects';
import { useParties } from '@/hooks/useParties';
import { useCompanies } from '@/hooks/useCompanies';
import { ProjectDialog } from '@/components/projetos/ProjectDialog';
import { ContactList } from '@/components/projetos/ContactList';
import { ContactValidationDialog } from '@/components/projetos/ContactValidationDialog';
import { useValidateContacts, ContactSuggestion } from '@/hooks/useContactValidation';
import { toast } from 'sonner';

const ALL = 'all';

export default function Projetos() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useOutplacementProjects();
  const { data: allContacts = [] } = useOutplacementContacts();
  const { data: parties = [] } = useParties();
  const { data: companies = [] } = useCompanies();
  const del = useDeleteOutplacementProject();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<OutplacementProject | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [view, setView] = useState<'projetos' | 'contatos'>('projetos');
  const [showValidation, setShowValidation] = useState(false);
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const validate = useValidateContacts();

  const partyMap = useMemo(() => Object.fromEntries(parties.map(p => [p.id, p.full_name])), [parties]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.nome_fantasia])), [companies]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p.title])), [projects]);

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) ||
      (partyMap[p.party_id || ''] || '').toLowerCase().includes(q) ||
      (companyMap[p.company_id || ''] || '').toLowerCase().includes(q);
    const matchType = filterType === ALL || p.project_type === filterType;
    const matchStatus = filterStatus === ALL || p.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total: projects.length,
    ativos: projects.filter(p => p.status === 'ativo').length,
    contatos: allContacts.length,
    reunioes: allContacts.filter(c => c.kanban_stage === 'reuniao_agendada').length,
  };

  const filteredContacts = allContacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company_name || '').toLowerCase().includes(q);
  });

  const openEdit = (p: OutplacementProject) => { setEditing(p); setShowDialog(true); };
  const openNew = () => { setEditing(null); setShowDialog(true); };

  const handleValidateAll = async () => {
    if (allContacts.length === 0) {
      toast.info('Nenhum contato para validar');
      return;
    }
    setShowValidation(true);
    setSuggestions([]);
    const result = await validate.mutateAsync(
      allContacts.map(c => ({
        id: c.id, name: c.name,
        current_position: c.current_position,
        company_name: c.company_name,
        linkedin_url: c.linkedin_url,
      }))
    );
    setSuggestions(result);
    if (result.length === 0) toast.success('Todos os contatos estão consistentes!');
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4 md:space-y-6">
        <PageHeader
          title="Projetos"
          description="Outplacement e Consultoria"
          actions={
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Projeto
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm text-muted-foreground">Projetos</span></div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" />
              <span className="text-xs md:text-sm text-muted-foreground">Ativos</span></div>
            <p className="text-2xl font-bold mt-1">{stats.ativos}</p>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs md:text-sm text-muted-foreground">Contatos</span></div>
            <p className="text-2xl font-bold mt-1">{stats.contatos}</p>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-violet-500" />
              <span className="text-xs md:text-sm text-muted-foreground">Reuniões</span></div>
            <p className="text-2xl font-bold mt-1">{stats.reunioes}</p>
          </Card>
        </div>

        {/* View toggle */}
        <div className="flex gap-2 border-b">
          <button onClick={() => setView('projetos')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'projetos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Projetos
          </button>
          <button onClick={() => setView('contatos')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'contatos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Contatos (Geral)
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {view === 'projetos' && (
            <>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os tipos</SelectItem>
                  <SelectItem value="outplacement">Outplacement</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : view === 'projetos' ? (
          filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Nenhum projeto encontrado</p>
              <p className="text-sm mt-1">Crie um novo projeto de outplacement ou consultoria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filtered.map(p => {
                const clientName = p.party_id ? partyMap[p.party_id] : (p.company_id ? companyMap[p.company_id] : null);
                const contactCount = allContacts.filter(c => c.project_id === p.id).length;
                return (
                  <Card key={p.id} className="p-4 hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projetos/${p.id}`)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold line-clamp-2 flex-1">{p.title}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"
                            onClick={() => confirm('Excluir projeto e todos os contatos/atividades?') && del.mutate(p.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className="text-xs">{p.project_type === 'outplacement' ? 'Outplacement' : 'Consultoria'}</Badge>
                      <Badge variant={p.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                    </div>
                    {clientName && <p className="text-sm text-muted-foreground mb-1 truncate">👤 {clientName}</p>}
                    {p.target_role && <p className="text-xs text-muted-foreground truncate">🎯 {p.target_role}</p>}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{contactCount}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              {filteredContacts.length} contato(s) em todos os projetos
            </p>
            {filteredContacts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhum contato cadastrado</p>
              </div>
            ) : (
              <ContactList contacts={filteredContacts} onEdit={() => {}} showProject projectNameMap={projectMap} />
            )}
          </div>
        )}

        <ProjectDialog open={showDialog} onOpenChange={setShowDialog} project={editing} />
      </div>
    </div>
  );
}
