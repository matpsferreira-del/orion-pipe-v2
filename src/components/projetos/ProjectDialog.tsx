import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useParties } from '@/hooks/useParties';
import { useCompanies } from '@/hooks/useCompanies';
import { BRAZIL_STATES, BRAZIL_CITIES } from '@/data/brazilLocations';
import {
  OutplacementProject,
  useCreateOutplacementProject,
  useUpdateOutplacementProject,
} from '@/hooks/useOutplacementProjects';

interface ProjectPreset {
  opportunity_id?: string | null;
  party_id?: string | null;
  company_id?: string | null;
  responsavel_id?: string | null;
  title?: string;
  target_role?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: OutplacementProject | null;
  preset?: ProjectPreset;
}

const NONE = 'none';

interface CidadeInteresse {
  estado: string;
  cidade: string;
}

export function ProjectDialog({ open, onOpenChange, project, preset }: Props) {
  const { profile } = useAuth();
  const { data: parties = [] } = useParties();
  const { data: companies = [] } = useCompanies();
  const create = useCreateOutplacementProject();
  const update = useUpdateOutplacementProject();

  const [form, setForm] = useState({
    title: '',
    project_type: 'outplacement',
    status: 'ativo',
    party_id: NONE,
    company_id: NONE,
    target_role: '',
    target_industry: '',
    description: '',
    start_date: '',
    end_date: '',
    // Campos alinhados com Pathly
    situacao_atual: '',
    modelo_trabalho: '',
    estado: '',
    cidade: '',
    preferencia_regiao: '',
  });

  const [cidadesInteresse, setCidadesInteresse] = useState<CidadeInteresse[]>([]);
  const [novoEstado, setNovoEstado] = useState('');
  const [novaCidade, setNovaCidade] = useState('');

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title,
        project_type: project.project_type,
        status: project.status,
        party_id: project.party_id || NONE,
        company_id: project.company_id || NONE,
        target_role: project.target_role || '',
        target_industry: project.target_industry || '',
        description: project.description || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        situacao_atual: project.situacao_atual || '',
        modelo_trabalho: project.modelo_trabalho || '',
        estado: project.estado || '',
        cidade: project.cidade || '',
        preferencia_regiao: project.preferencia_regiao || '',
      });
      setCidadesInteresse(Array.isArray(project.cidades_interesse) ? project.cidades_interesse : []);
    } else {
      setForm({
        title: preset?.title || '',
        project_type: 'outplacement',
        status: 'ativo',
        party_id: preset?.party_id || NONE,
        company_id: preset?.company_id || NONE,
        target_role: preset?.target_role || '',
        target_industry: '',
        description: '', start_date: '', end_date: '',
        situacao_atual: '', modelo_trabalho: '',
        estado: '', cidade: '', preferencia_regiao: '',
      });
      setCidadesInteresse([]);
    }
    setNovoEstado('');
    setNovaCidade('');
  }, [project, open, preset]);

  const cidadesPrincipais = useMemo(
    () => (form.estado ? BRAZIL_CITIES[form.estado] || [] : []),
    [form.estado]
  );
  const cidadesAdicionais = useMemo(
    () => (novoEstado ? BRAZIL_CITIES[novoEstado] || [] : []),
    [novoEstado]
  );

  const adicionarCidadeInteresse = () => {
    if (!novoEstado || !novaCidade) return;
    if (cidadesInteresse.some(c => c.estado === novoEstado && c.cidade === novaCidade)) return;
    setCidadesInteresse([...cidadesInteresse, { estado: novoEstado, cidade: novaCidade }]);
    setNovoEstado('');
    setNovaCidade('');
  };

  const removerCidadeInteresse = (idx: number) => {
    setCidadesInteresse(cidadesInteresse.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    // target_location é mantido sincronizado com cidade/estado para retrocompatibilidade
    const targetLocation = form.cidade && form.estado
      ? `${form.cidade}, ${form.estado}`
      : null;

    const payload = {
      title: form.title.trim(),
      project_type: form.project_type,
      status: form.status,
      party_id: form.party_id === NONE ? null : form.party_id,
      company_id: form.company_id === NONE ? null : form.company_id,
      opportunity_id: preset?.opportunity_id ?? null,
      responsavel_id: preset?.responsavel_id ?? null,
      target_role: form.target_role.trim() || null,
      target_industry: form.target_industry.trim() || null,
      target_location: targetLocation,
      description: form.description.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      situacao_atual: form.situacao_atual || null,
      modelo_trabalho: form.modelo_trabalho || null,
      estado: form.estado || null,
      cidade: form.cidade || null,
      preferencia_regiao: form.preferencia_regiao || null,
      cidades_interesse: cidadesInteresse,
    };
    if (project) {
      await update.mutateAsync({ id: project.id, ...payload });
    } else {
      if (!profile?.id) return;
      const selectedParty = form.party_id !== NONE ? parties.find(p => p.id === form.party_id) : null;
      await create.mutateAsync({
        ...payload,
        created_by: profile.id,
        _party_name: selectedParty?.full_name,
        _party_email: selectedParty?.email_raw ?? undefined,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ===== Informações Básicas ===== */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-primary">Informações Básicas</h3>

            <div>
              <Label>Título do Projeto *</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Outplacement - João Silva"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.project_type} onValueChange={v => setForm({ ...form, project_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outplacement">Outplacement</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cliente PF (Pessoa)</Label>
                <Select value={form.party_id} onValueChange={v => setForm({ ...form, party_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente PJ (Empresa)</Label>
                <Select value={form.company_id} onValueChange={v => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ===== Perfil Profissional (alinhado Pathly) ===== */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-primary">Perfil Profissional</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cargo Atual / Alvo</Label>
                <Input
                  value={form.target_role}
                  onChange={e => setForm({ ...form, target_role: e.target.value })}
                  placeholder="Ex: Desenvolvedor Sênior"
                />
              </div>
              <div>
                <Label>Área de Atuação</Label>
                <Input
                  value={form.target_industry}
                  onChange={e => setForm({ ...form, target_industry: e.target.value })}
                  placeholder="Ex: Tecnologia"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Situação Atual</Label>
                <Select
                  value={form.situacao_atual || NONE}
                  onValueChange={v => setForm({ ...form, situacao_atual: v === NONE ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não informado</SelectItem>
                    <SelectItem value="empregado">Empregado</SelectItem>
                    <SelectItem value="desempregado">Desempregado</SelectItem>
                    <SelectItem value="em_transicao">Em transição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modelo de Trabalho</Label>
                <Select
                  value={form.modelo_trabalho || NONE}
                  onValueChange={v => setForm({ ...form, modelo_trabalho: v === NONE ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não informado</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                    <SelectItem value="remoto">Remoto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ===== Localização (alinhado Pathly) ===== */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-primary">Localização</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select
                  value={form.estado || NONE}
                  onValueChange={v => setForm({ ...form, estado: v === NONE ? '' : v, cidade: '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value={NONE}>Selecione</SelectItem>
                    {BRAZIL_STATES.map(s => (
                      <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade</Label>
                <Select
                  value={form.cidade || NONE}
                  onValueChange={v => setForm({ ...form, cidade: v === NONE ? '' : v })}
                  disabled={!form.estado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.estado ? 'Selecione...' : 'Escolha o estado primeiro'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value={NONE}>Selecione</SelectItem>
                    {cidadesPrincipais.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Preferência de Região</Label>
              <Select
                value={form.preferencia_regiao || NONE}
                onValueChange={v => setForm({ ...form, preferencia_regiao: v === NONE ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informado</SelectItem>
                  <SelectItem value="mesma_regiao">Mesma região</SelectItem>
                  <SelectItem value="outras_regioes">Outras regiões</SelectItem>
                  <SelectItem value="indiferente">Indiferente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cidades de Interesse</Label>
              <div className="flex gap-2">
                <Select
                  value={novoEstado || NONE}
                  onValueChange={v => { setNovoEstado(v === NONE ? '' : v); setNovaCidade(''); }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value={NONE}>Estado</SelectItem>
                    {BRAZIL_STATES.map(s => (
                      <SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={novaCidade || NONE}
                  onValueChange={v => setNovaCidade(v === NONE ? '' : v)}
                  disabled={!novoEstado}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Cidade" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value={NONE}>Cidade</SelectItem>
                    {cidadesAdicionais.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={adicionarCidadeInteresse}
                  disabled={!novoEstado || !novaCidade}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {cidadesInteresse.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {cidadesInteresse.map((c, idx) => (
                    <div
                      key={`${c.estado}-${c.cidade}-${idx}`}
                      className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                    >
                      <span>{c.cidade} / {c.estado}</span>
                      <button
                        type="button"
                        onClick={() => removerCidadeInteresse(idx)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ===== Datas e Descrição ===== */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-primary">Cronograma e Observações</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Término Previsto</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Descrição / Observações</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.title.trim() || create.isPending || update.isPending}>
            {project ? 'Salvar' : 'Criar Projeto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
