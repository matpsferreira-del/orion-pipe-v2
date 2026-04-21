import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Loader2, Users, MapPin, Briefcase, Target, MoreVertical, Pencil, Trash2, Sparkles, RefreshCw, ChevronDown, Download, Upload } from 'lucide-react';
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
  const queryClient = useQueryClient();
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
  const [importing, setImporting] = useState(false);
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

  const handleValidateAll = async (revalidateAll = false) => {
    if (allContacts.length === 0) {
      toast.info('Nenhum contato para validar');
      return;
    }
    const toValidate = revalidateAll
      ? allContacts
      : allContacts.filter(c => !c.ai_validated_at);

    if (toValidate.length === 0) {
      toast.info('Todos os contatos já foram validados pela IA. Use "Revalidar todos" para forçar nova análise.');
      return;
    }

    setShowValidation(true);
    setSuggestions([]);
    toast.info(`Analisando ${toValidate.length} contato(s)${revalidateAll ? ' (revalidação completa)' : ' novo(s)'}...`);

    const result = await validate.mutateAsync(
      toValidate.map(c => ({
        id: c.id, name: c.name,
        current_position: c.current_position,
        company_name: c.company_name,
        linkedin_url: c.linkedin_url,
      }))
    );
    setSuggestions(result);

    // Mark all sent contacts as validated (regardless of suggestion outcome)
    const ids = toValidate.map(c => c.id);
    const { error } = await supabase
      .from('outplacement_contacts')
      .update({ ai_validated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) console.error('Failed to mark contacts as validated:', error);
    else queryClient.invalidateQueries({ queryKey: ['outplacement_contacts'] });

    if (result.length === 0) toast.success('Todos os contatos analisados estão consistentes!');
  };

  const CSV_COLUMNS = [
    'name', 'current_position', 'company_name', 'linkedin_url',
    'email', 'phone', 'city', 'state', 'contact_type', 'tier',
    'kanban_stage', 'notes', 'project_id', 'project_title',
  ] as const;

  const escapeCSV = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const handleExportCSV = () => {
    if (filteredContacts.length === 0) {
      toast.info('Nenhum contato para exportar');
      return;
    }
    const lines = [CSV_COLUMNS.join(',')];
    for (const c of filteredContacts) {
      const row = CSV_COLUMNS.map(k => {
        if (k === 'project_title') return escapeCSV(projectMap[c.project_id] || '');
        return escapeCSV((c as unknown as Record<string, unknown>)[k]);
      });
      lines.push(row.join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos-projetos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredContacts.length} contato(s) exportado(s)`);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else field += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { cur.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
          if (field !== '' || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ''; }
          if (ch === '\r' && text[i + 1] === '\n') i++;
        } else field += ch;
      }
    }
    if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim().replace(/^\uFEFF/, ''));
    return rows.slice(1).filter(r => r.some(c => c.trim() !== '')).map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
      return obj;
    });
  };

  const handleImportCSV = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { toast.error('CSV vazio ou inválido'); return; }

      // Match project: by project_id or project_title
      const titleToId = Object.fromEntries(
        projects.map(p => [p.title.toLowerCase().trim(), p.id])
      );
      const validProjectIds = new Set(projects.map(p => p.id));

      const toInsert: Record<string, unknown>[] = [];
      const errors: string[] = [];

      rows.forEach((r, idx) => {
        const name = (r.name || '').trim();
        if (!name) { errors.push(`Linha ${idx + 2}: nome vazio`); return; }
        let projectId = (r.project_id || '').trim();
        if (!projectId || !validProjectIds.has(projectId)) {
          const title = (r.project_title || '').trim().toLowerCase();
          projectId = titleToId[title] || '';
        }
        if (!projectId) { errors.push(`Linha ${idx + 2} (${name}): projeto não encontrado`); return; }

        toInsert.push({
          project_id: projectId,
          name,
          current_position: r.current_position || null,
          company_name: r.company_name || null,
          linkedin_url: r.linkedin_url || null,
          email: r.email || null,
          phone: r.phone || null,
          city: r.city || null,
          state: r.state || null,
          contact_type: r.contact_type || 'outro',
          tier: r.tier || 'B',
          kanban_stage: r.kanban_stage || 'identificado',
          notes: r.notes || null,
        });
      });

      if (toInsert.length === 0) {
        toast.error(`Nenhum contato válido. ${errors[0] || ''}`);
        return;
      }

      // Insert in chunks
      const chunkSize = 200;
      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('outplacement_contacts').insert(chunk as never);
        if (error) { toast.error('Erro ao importar: ' + error.message); break; }
        inserted += chunk.length;
      }
      queryClient.invalidateQueries({ queryKey: ['outplacement-contacts'] });
      toast.success(`${inserted} contato(s) importado(s)${errors.length ? ` · ${errors.length} ignorado(s)` : ''}`);
    } catch (e) {
      toast.error('Erro ao processar CSV: ' + (e as Error).message);
    } finally {
      setImporting(false);
    }
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
                      {p.pathly_plan_id && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          ✓ Pathly
                        </Badge>
                      )}
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
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {filteredContacts.length} contato(s) em todos os projetos
                {' · '}
                <span className="text-amber-600 font-medium">
                  {allContacts.filter(c => !c.ai_validated_at).length} pendente(s) de validação
                </span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('csv-import-input')?.click()}
                  disabled={importing}
                  className="gap-1.5"
                >
                  <Upload className="h-4 w-4" />
                  {importing ? 'Importando...' : 'Importar CSV'}
                </Button>
                <input
                  id="csv-import-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportCSV(file);
                    e.target.value = '';
                  }}
                />
                <div className="flex items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleValidateAll(false)}
                    disabled={validate.isPending}
                    className="gap-1.5 rounded-r-none border-r-0"
                  >
                    <Sparkles className="h-4 w-4" />
                    {validate.isPending ? 'Validando...' : 'Validar novos com IA'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={validate.isPending}
                        className="rounded-l-none px-2"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleValidateAll(true)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Revalidar todos (forçar)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
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
