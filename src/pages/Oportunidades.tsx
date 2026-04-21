import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { pipelineStages } from '@/data/mockData';
import { useOpportunities, useDeleteOpportunity, useUpdateOpportunity, OpportunityRow } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useProfiles } from '@/hooks/useProfiles';
import { OpportunityDialog } from '@/components/opportunities/OpportunityDialog';
import { ActivityDialog } from '@/components/activities/ActivityDialog';
import { JobDialog } from '@/components/jobs/JobDialog';
import { ProjectDialog } from '@/components/projetos/ProjectDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Filter, MoreHorizontal, Target, Eye, Pencil, Trash2, Download, Loader2, Presentation, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { MobileListCard } from '@/components/ui/mobile-list-card';

const sourceLabels: Record<string, string> = {
  indicacao: 'Indicação',
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Evento',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

const serviceLabels: Record<string, string> = {
  recrutamento_pontual: 'Pontual',
  programa_recorrente: 'Recorrente',
  rpo: 'RPO',
  hunting: 'Hunting',
  consultoria: 'Consultoria',
  outplacement: 'Outplacement',
};

// Helper to extract PF name from observacoes for outplacement
const getDisplayName = (opp: OpportunityRow, companyName?: string) => {
  if (opp.tipo_servico === 'outplacement' && !opp.company_id) {
    const match = opp.observacoes?.match(/\[PF: (.+?)\]/);
    return match ? match[1] : 'Pessoa Física';
  }
  return companyName || 'N/A';
};


export default function Oportunidades() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRow | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityRow | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: opportunities = [], isLoading } = useOpportunities();
  const { data: companies = [] } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: profiles = [] } = useProfiles();
  const deleteOpportunity = useDeleteOpportunity();
  const updateOpportunity = useUpdateOpportunity();
  const navigate = useNavigate();

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const company = companies.find(c => c.id === opp.company_id);
      const contact = contacts.find(c => c.id === opp.contact_id);
      const responsavel = profiles.find(p => p.id === opp.responsavel_id);
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        (company?.nome_fantasia.toLowerCase().includes(term)) ||
        (company?.razao_social.toLowerCase().includes(term)) ||
        (contact?.nome.toLowerCase().includes(term)) ||
        (contact?.email.toLowerCase().includes(term)) ||
        (responsavel?.name.toLowerCase().includes(term)) ||
        (serviceLabels[opp.tipo_servico] || opp.tipo_servico).toLowerCase().includes(term) ||
        (sourceLabels[opp.origem_lead] || opp.origem_lead).toLowerCase().includes(term);
      const matchesStage = filterStage === 'all' || opp.stage === filterStage;
      const matchesResponsavel = filterResponsavel === 'all' || opp.responsavel_id === filterResponsavel;
      return matchesSearch && matchesStage && matchesResponsavel;
    });
  }, [opportunities, companies, searchTerm, filterStage, filterResponsavel]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta oportunidade?')) {
      deleteOpportunity.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Oportunidades"
        description="Lista completa de oportunidades de negócio"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden sm:flex" onClick={() => navigate('/ppt-institucional')}>
              <Presentation className="h-4 w-4 mr-2" />
              PPT Institucional
            </Button>
            <Button variant="outline" className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Oportunidade</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {pipelineStages.map(stage => (
              <SelectItem key={stage.key} value={stage.key}>{stage.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map(profile => (
              <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-2">
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-card">
            Nenhuma oportunidade encontrada
          </div>
        ) : (
          filteredOpportunities.map((opp) => {
            const company = companies.find(c => c.id === opp.company_id);
            const contact = contacts.find(c => c.id === opp.contact_id);
            const responsavel = profiles.find(p => p.id === opp.responsavel_id);
            const stage = pipelineStages.find(s => s.key === opp.stage);
            return (
              <MobileListCard
                key={opp.id}
                onClick={() => setSelectedOpportunity(opp)}
                leading={
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                }
                title={
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate">{getDisplayName(opp, company?.nome_fantasia)}</span>
                  </div>
                }
                subtitle={
                  <span>{stage?.label} • {formatCurrency(Number(opp.valor_potencial))}</span>
                }
                trailing={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedOpportunity(opp)}>
                        <Eye className="h-4 w-4 mr-2" />Ver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingOpportunity(opp)}>
                        <Pencil className="h-4 w-4 mr-2" />Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(opp.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
                meta={
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <Badge variant="secondary" className="text-[10px]">{serviceLabels[opp.tipo_servico] || opp.tipo_servico}</Badge>
                    <span>{opp.probabilidade}% • {formatDate(opp.data_previsao_fechamento)}</span>
                    {responsavel && (
                      <span className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {responsavel.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {responsavel.name}
                      </span>
                    )}
                  </div>
                }
              />
            );
          })
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead className="hidden lg:table-cell">Contato</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden md:table-cell">Probabilidade</TableHead>
              <TableHead className="hidden lg:table-cell">Tipo</TableHead>
              <TableHead className="hidden xl:table-cell">Origem</TableHead>
              <TableHead className="hidden xl:table-cell">Previsão</TableHead>
              <TableHead className="hidden lg:table-cell">Responsável</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOpportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma oportunidade encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredOpportunities.map((opp) => {
                const company = companies.find(c => c.id === opp.company_id);
                const contact = contacts.find(c => c.id === opp.contact_id);
                const responsavel = profiles.find(p => p.id === opp.responsavel_id);
                const stage = pipelineStages.find(s => s.key === opp.stage);

                return (
                  <TableRow 
                    key={opp.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOpportunity(opp)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium truncate">{getDisplayName(opp, company?.nome_fantasia)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div>
                        <p className="text-sm">{contact?.nome || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{contact?.cargo || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{stage?.label || opp.stage}</Badge>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{formatCurrency(Number(opp.valor_potencial))}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={opp.probabilidade} className="w-16 h-2" />
                        <span className="text-sm text-muted-foreground">{opp.probabilidade}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary">{serviceLabels[opp.tipo_servico] || opp.tipo_servico}</Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">{sourceLabels[opp.origem_lead] || opp.origem_lead}</TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">{formatDate(opp.data_previsao_fechamento)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {responsavel && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {responsavel.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{responsavel.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedOpportunity(opp); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingOpportunity(opp); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive" 
                            onClick={(e) => { e.stopPropagation(); handleDelete(opp.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                          {opp.stage !== 'fechado_perdeu' && (
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const motivo = prompt('Motivo da rejeição:');
                                if (motivo) {
                                  updateOpportunity.mutate({ id: opp.id, data: { stage: 'fechado_perdeu', observacoes: (opp.observacoes || '') + `\n[Rejeitada] ${motivo}` } as any });
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeitar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Oportunidade</SheetTitle>
          </SheetHeader>
          {selectedOpportunity && (
            <OpportunityDetail
              opportunity={selectedOpportunity}
              onOpenActivityDialog={() => setShowActivityDialog(true)}
              onOpenJobDialog={() => setShowJobDialog(true)}
              onOpenRejectDialog={() => setShowRejectDialog(true)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Dialogs rendered outside Sheet to prevent Radix nesting issues */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Oportunidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição desta oportunidade. Ela será movida para "Fechado Perdeu".
            </p>
            <Textarea
              placeholder="Motivo da rejeição..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || updateOpportunity.isPending}
              onClick={async () => {
                if (!selectedOpportunity) return;
                await updateOpportunity.mutateAsync({
                  id: selectedOpportunity.id,
                  data: {
                    stage: 'fechado_perdeu',
                    observacoes: (selectedOpportunity.observacoes || '') + `\n[Rejeitada] ${rejectReason}`.trim(),
                  } as any,
                });
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedOpportunity && (
        <>
          <ActivityDialog
            open={showActivityDialog}
            onOpenChange={setShowActivityDialog}
            preSelectedCompanyId={selectedOpportunity.company_id}
            preSelectedOpportunityId={selectedOpportunity.id}
          />
          <JobDialog
            open={showJobDialog}
            onOpenChange={setShowJobDialog}
            preSelectedCompanyId={selectedOpportunity.company_id || undefined}
            preSelectedContactId={selectedOpportunity.contact_id || undefined}
            preSelectedResponsavelId={selectedOpportunity.responsavel_id}
            preSelectedOpportunityId={selectedOpportunity.id}
            preSelectedClosingCandidateId={selectedOpportunity.outplacement_party_id || undefined}
            isOutplacementProject={selectedOpportunity.tipo_servico === 'outplacement'}
            outplacementClientName={selectedOpportunity.tipo_servico === 'outplacement' && !selectedOpportunity.company_id
              ? (selectedOpportunity.observacoes?.match(/\[PF: (.+?)\]/)?.[1] || '')
              : undefined
            }
          />
        </>
      )}

      <OpportunityDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
      <OpportunityDialog
        open={!!editingOpportunity}
        onOpenChange={(open) => { if (!open) setEditingOpportunity(null); }}
        opportunity={editingOpportunity ?? undefined}
      />
    </div>
  );
}
