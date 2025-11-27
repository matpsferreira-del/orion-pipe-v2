import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { mockOpportunities, mockUsers, pipelineStages, getCompanyById, getContactById, getUserById } from '@/data/mockData';
import { Opportunity } from '@/types/crm';
import { Plus, Search, Filter, MoreHorizontal, Target, Eye, Pencil, Trash2, Download } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';

const sourceLabels = {
  indicacao: 'Indicação',
  inbound: 'Inbound',
  outbound: 'Outbound',
  evento: 'Evento',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

const serviceLabels = {
  recrutamento_pontual: 'Pontual',
  programa_recorrente: 'Recorrente',
  rpo: 'RPO',
  hunting: 'Hunting',
  consultoria: 'Consultoria',
};

export default function Oportunidades() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  const filteredOpportunities = useMemo(() => {
    return mockOpportunities.filter(opp => {
      const company = getCompanyById(opp.companyId);
      const matchesSearch = searchTerm === '' ||
        company?.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = filterStage === 'all' || opp.stage === filterStage;
      const matchesResponsavel = filterResponsavel === 'all' || opp.responsavelId === filterResponsavel;
      return matchesSearch && matchesStage && matchesResponsavel;
    });
  }, [searchTerm, filterStage, filterResponsavel]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Oportunidades"
        description="Lista completa de oportunidades de negócio"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Oportunidade
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {mockUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Probabilidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOpportunities.map((opp) => {
              const company = getCompanyById(opp.companyId);
              const contact = getContactById(opp.contactId);
              const responsavel = getUserById(opp.responsavelId);
              const stage = pipelineStages.find(s => s.key === opp.stage);

              return (
                <TableRow 
                  key={opp.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedOpportunity(opp)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{company?.nomeFantasia}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{contact?.nome}</p>
                      <p className="text-xs text-muted-foreground">{contact?.cargo}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{stage?.label}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(opp.valorPotencial)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={opp.probabilidade} className="w-16 h-2" />
                      <span className="text-sm text-muted-foreground">{opp.probabilidade}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{serviceLabels[opp.tipoServico]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sourceLabels[opp.origemLead]}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(opp.dataPrevisaoFechamento)}</TableCell>
                  <TableCell>
                    {responsavel && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {responsavel.avatar}
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
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Opportunity Detail Sheet */}
      <Sheet open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da Oportunidade</SheetTitle>
          </SheetHeader>
          {selectedOpportunity && (
            <OpportunityDetail opportunity={selectedOpportunity} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
