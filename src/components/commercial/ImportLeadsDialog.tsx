import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

interface LeadRow {
  full_name: string;
  current_title: string;
  current_company: string;
  linkedin_url: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

export function ImportLeadsDialog({ open, onOpenChange, groupId }: ImportLeadsDialogProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Nome Completo', 'Cargo', 'Nome da Empresa', 'LinkedIn (Pessoa)', 'E-mail', 'Contato Empresa', 'Cidade', 'Estado'];
    const ws = XLSX.utils.aoa_to_sheet([headers, ['João Silva', 'Diretor Jurídico', 'Escritório ABC', 'https://linkedin.com/in/joaosilva', 'joao@abc.com.br', '+55 21 9999-0000', 'Rio de Janeiro', 'Rio de Janeiro']]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'modelo_importacao_leads.xlsx');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws);
      const parsed: LeadRow[] = json
        .filter((r: any) => r['Nome Completo']?.toString().trim())
        .map((r: any) => ({
          full_name: r['Nome Completo']?.toString().trim() || '',
          current_title: r['Cargo']?.toString().trim() || '',
          current_company: r['Nome da Empresa']?.toString().trim() || '',
          linkedin_url: r['LinkedIn (Pessoa)']?.toString().trim() || '',
          email: r['E-mail']?.toString().trim() || '',
          phone: r['Contato Empresa']?.toString().trim() || '',
          city: r['Cidade']?.toString().trim() || '',
          state: r['Estado']?.toString().trim() || '',
        }));
      setRows(parsed);
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    let success = 0, errors = 0;
    for (const row of rows) {
      try {
        const { data: partyId, error: rpcErr } = await supabase.rpc('resolve_party', {
          p_full_name: row.full_name,
          p_email: row.email || '',
          p_linkedin_url: row.linkedin_url || '',
          p_phone: row.phone || '',
          p_city: row.city || '',
          p_state: row.state || '',
          p_current_title: row.current_title || '',
          p_current_company: row.current_company || '',
          p_created_from: 'import',
        });
        if (rpcErr) throw rpcErr;

        await supabase.rpc('ensure_party_role', { p_party_id: partyId, p_role: 'prospect' });

        const { error: memErr } = await supabase
          .from('commercial_strategy_members')
          .insert({ group_id: groupId, party_id: partyId });
        if (memErr && memErr.code !== '23505') throw memErr;
        success++;
      } catch {
        errors++;
      }
    }
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['commercial-strategy-members', groupId] });
    toast.success(`${success} perfis importados${errors ? `, ${errors} erros` : ''}`);
    setRows([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setRows([]); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar Modelo
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                Selecionar Arquivo
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </div>
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Baixe o modelo e preencha com os dados dos leads</p>
              <p className="text-sm mt-1">Campos: Nome Completo, Cargo, Empresa, LinkedIn, E-mail, Telefone, Cidade, Estado</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <p className="text-sm text-muted-foreground mb-3">{rows.length} leads encontrados no arquivo</p>
            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.current_title || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.current_company || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.email || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.city || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 50 && <p className="text-xs text-muted-foreground mt-2">Mostrando 50 de {rows.length}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setRows([]); onOpenChange(false); }}>Cancelar</Button>
          {rows.length > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Importar {rows.length} leads
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
