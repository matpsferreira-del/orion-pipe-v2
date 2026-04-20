import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Mail, Phone, Linkedin, Users, AlertTriangle, Globe, MapPin } from 'lucide-react';
import { useParties, useDuplicateSuggestions } from '@/hooks/useParties';
import { PartyRoleType, partyRoleLabels, PartyCreatedFrom } from '@/types/party';
import { PartyDialog } from '@/components/parties/PartyDialog';
import { PartyDetailDialog } from '@/components/parties/PartyDetailDialog';
import { DuplicatesDialog } from '@/components/parties/DuplicatesDialog';
import { MobileListCard } from '@/components/ui/mobile-list-card';

export default function Pessoas() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<PartyRoleType | 'all'>('all');
  const [originFilter, setOriginFilter] = useState<PartyCreatedFrom | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);

  const { data: parties, isLoading } = useParties({
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: 'active',
    createdFrom: originFilter !== 'all' ? originFilter : undefined,
  });

  const { data: duplicates } = useDuplicateSuggestions();
  const duplicateCount = duplicates?.length || 0;

  const getRoleBadges = (roles: { role: PartyRoleType }[]) => {
    if (!roles || roles.length === 0) return null;
    return roles.map(r => (
      <Badge key={r.role} variant="secondary" className="text-xs">
        {partyRoleLabels[r.role]}
      </Badge>
    ));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <PageHeader
        title="Banco de Talentos"
        description="Gestão unificada de pessoas"
        actions={
          <div className="flex gap-2">
            {duplicateCount > 0 && (
              <Button variant="outline" onClick={() => setIsDuplicatesOpen(true)}>
                <AlertTriangle className="h-4 w-4 mr-1 sm:mr-2 text-destructive" />
                <span className="hidden sm:inline">{duplicateCount} Duplicatas</span>
                <span className="sm:hidden">{duplicateCount}</span>
              </Button>
            )}
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Pessoa</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as PartyRoleType | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="candidate">Candidatos</SelectItem>
            <SelectItem value="client_contact">Contatos Cliente</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="hiring_manager">Gestores</SelectItem>
          </SelectContent>
        </Select>
        <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as PartyCreatedFrom | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            <SelectItem value="site">Via Portal</SelectItem>
            <SelectItem value="crm">CRM</SelectItem>
            <SelectItem value="ats">ATS (manual)</SelectItem>
            <SelectItem value="import">Importação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : parties?.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-card">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma pessoa encontrada</p>
          </div>
        ) : (
          parties?.map((party) => (
            <MobileListCard
              key={party.id}
              onClick={() => setSelectedPartyId(party.id)}
              leading={
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              }
              title={
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="truncate">{party.full_name}</span>
                  {party.created_from === 'site' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                      <Globe className="h-2.5 w-2.5" />Portal
                    </Badge>
                  )}
                </div>
              }
              subtitle={party.headline || (party.city || party.state ? [party.city, party.state].filter(Boolean).join(', ') : undefined)}
              meta={
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    {party.email_norm && (
                      <a href={`mailto:${party.email_norm}`} className="flex items-center gap-1 text-primary truncate" onClick={(e) => e.stopPropagation()}>
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[150px]">{party.email_norm}</span>
                      </a>
                    )}
                    {party.phone_e164 && (
                      <a href={`tel:${party.phone_e164}`} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3 w-3" />{party.phone_raw}
                      </a>
                    )}
                    {party.linkedin_url && (
                      <a href={party.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary" onClick={(e) => e.stopPropagation()}>
                        <Linkedin className="h-3 w-3" />LinkedIn
                      </a>
                    )}
                  </div>
                  {party.party_role && party.party_role.length > 0 && (
                    <div className="flex flex-wrap gap-1">{getRoleBadges(party.party_role)}</div>
                  )}
                </div>
              }
            />
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Contato</TableHead>
              <TableHead className="hidden md:table-cell">Localização</TableHead>
              <TableHead className="hidden lg:table-cell">Papéis</TableHead>
              <TableHead className="hidden xl:table-cell">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : parties?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma pessoa encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              parties?.map((party) => (
                <TableRow
                  key={party.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedPartyId(party.id)}
                >
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{party.full_name}</p>
                        {party.created_from === 'site' && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0">
                            <Globe className="h-3 w-3" />
                            <span className="hidden sm:inline">Via Portal</span>
                          </Badge>
                        )}
                      </div>
                      {party.headline && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">{party.headline}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      {party.email_norm && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[180px]">{party.email_norm}</span>
                        </div>
                      )}
                      {party.phone_e164 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{party.phone_raw}</span>
                        </div>
                      )}
                      {party.linkedin_url && (
                        <div className="flex items-center gap-1 text-sm">
                          <Linkedin className="h-3 w-3 text-muted-foreground" />
                          <a href={party.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {party.city || party.state ? (
                      <span className="text-sm">{[party.city, party.state].filter(Boolean).join(', ')}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">{getRoleBadges(party.party_role)}</div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {party.tags && Array.isArray(party.tags) && party.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PartyDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <PartyDetailDialog partyId={selectedPartyId} open={!!selectedPartyId} onOpenChange={(open) => !open && setSelectedPartyId(null)} />
      <DuplicatesDialog open={isDuplicatesOpen} onOpenChange={setIsDuplicatesOpen} />
    </div>
  );
}
