import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MONTHS_OPTIONS } from '@/lib/financial/constants';

interface Props {
  filterMonth: string; setFilterMonth: (v: string) => void;
  filterPacote: string; setFilterPacote: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  filterDebito: boolean; setFilterDebito: (v: boolean) => void;
  pacotes: string[];
}

export function LancamentoFilters({
  filterMonth, setFilterMonth,
  filterPacote, setFilterPacote,
  filterStatus, setFilterStatus,
  filterDebito, setFilterDebito,
  pacotes,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filterMonth} onValueChange={setFilterMonth}>
        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MONTHS_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filterPacote} onValueChange={setFilterPacote}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Pacote" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os pacotes</SelectItem>
          {pacotes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos status</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="pago">Pago</SelectItem>
          <SelectItem value="cancelado">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 ml-2 px-3 py-1.5 border rounded-md bg-card">
        <Switch id="filter-debito" checked={filterDebito} onCheckedChange={setFilterDebito} />
        <Label htmlFor="filter-debito" className="text-sm cursor-pointer">Só débito automático</Label>
      </div>
    </div>
  );
}
