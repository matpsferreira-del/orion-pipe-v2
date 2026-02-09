import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Mail, Phone, Linkedin, Users, AlertTriangle } from 'lucide-react';
import { useParties, useDuplicateSuggestions } from '@/hooks/useParties';
import { PartyRoleType, partyRoleLabels } from '@/types/party';
import { PartyDialog } from '@/components/parties/PartyDialog';
import { PartyDetailDialog } from '@/components/parties/PartyDetailDialog';
import { DuplicatesDialog } from '@/components/parties/DuplicatesDialog';

export default function Pessoas() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<PartyRoleType | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);

  const { data: parties, isLoading } = useParties({
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: 'active',
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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Banco de Talentos"
        description="Gestão unificada de pessoas (candidatos, contatos, prospects)"
        actions={
          <div className="flex gap-2">
            {duplicateCount > 0 && (
              <Button variant="outline" onClick={() => setIsDuplicatesOpen(true)}>
                <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                {duplicateCount} Duplicatas
              </Button>
            )}
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Pessoa
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, telefone, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as PartyRoleType | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="candidate">Candidatos</SelectItem>
            <SelectItem value="client_contact">Contatos Cliente</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="hiring_manager">Gestores de Contratação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando...
                </TableCell>
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
                      <p className="font-medium">{party.full_name}</p>
                      {party.headline && (
                        <p className="text-sm text-muted-foreground">{party.headline}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {party.email_norm && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{party.email_norm}</span>
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
                          <a
                            href={party.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {party.city || party.state ? (
                      <span className="text-sm">
                        {[party.city, party.state].filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getRoleBadges(party.party_role)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {party.tags && Array.isArray(party.tags) && party.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <PartyDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <PartyDetailDialog
        partyId={selectedPartyId}
        open={!!selectedPartyId}
        onOpenChange={(open) => !open && setSelectedPartyId(null)}
      />

      <DuplicatesDialog
        open={isDuplicatesOpen}
        onOpenChange={setIsDuplicatesOpen}
      />
    </div>
  );
}
