import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

interface ParsedRow {
  full_name: string;
  current_title: string;
  current_company: string;
  linkedin_url: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: 'pending' | 'success' | 'error' | 'duplicate';
  error?: string;
}

export function ImportStrategyMembersDialog({ open, onOpenChange, groupId, groupName }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const downloadTemplate = () => {
    const headers = ['Full Name', 'Job Title', 'Company Name', 'LinkedIn (Pessoa)', 'Email', 'Phone', 'City', 'State'];
    const sample = [
      ['João Silva', 'Partner', 'Escritório ABC', 'https://linkedin.com/in/joaosilva', 'joao@abc.com.br', '+55 21 99999-0000', 'Rio de Janeiro', 'RJ'],
      ['Maria Santos', 'Head de RH', 'Empresa XYZ', 'https://linkedin.com/in/mariasantos', 'maria@xyz.com', '', 'São Paulo', 'SP'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws['!cols'] = headers.map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao_estrategia.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

      const rows: ParsedRow[] = [];
      for (const row of json) {
        const fullName = (row['Full Name'] || row['full_name'] || row['Nome'] || '').trim();
        const linkedinUrl = (row['LinkedIn (Pessoa)'] || row['LinkedIn'] || row['linkedin_url'] || '').trim();

        if (!fullName && !linkedinUrl) continue;

        rows.push({
          full_name: fullName || 'Sem nome',
          current_title: (row['Job Title'] || row['Cargo'] || row['current_title'] || '').trim(),
          current_company: (row['Company Name'] || row['Empresa'] || row['current_company'] || '').trim(),
          linkedin_url: linkedinUrl,
          email: (row['Email'] || row['email'] || '').trim(),
          phone: (row['Phone'] || row['Telefone'] || row['phone'] || '').trim().replace(/^'/, ''),
          city: (row['City'] || row['Cidade'] || row['city'] || '').trim(),
          state: (row['State'] || row['Estado'] || row['state'] || '').trim(),
          status: 'pending',
        });
      }

      setParsedRows(rows);
      setImportDone(false);
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);

    const updated = [...parsedRows];
    let successCount = 0;
    let errorCount = 0;
    let dupCount = 0;

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      try {
        const { data: partyId, error: rpcError } = await supabase.rpc('resolve_party', {
          p_full_name: row.full_name,
          p_email: row.email || undefined,
          p_phone: row.phone || undefined,
          p_linkedin_url: row.linkedin_url || undefined,
          p_city: row.city || undefined,
          p_state: row.state || undefined,
          p_created_from: 'import' as const,
          p_current_title: row.current_title || undefined,
          p_current_company: row.current_company || undefined,
        });

        if (rpcError) throw rpcError;

        await supabase.rpc('ensure_party_role', { p_party_id: partyId, p_role: 'prospect' as const });

        const { error: memberError } = await supabase
          .from('commercial_strategy_members')
          .insert({ group_id: groupId, party_id: partyId });

        if (memberError) {
          if (memberError.code === '23505') {
            updated[i] = { ...row, status: 'duplicate' };
            dupCount++;
          } else {
            throw memberError;
          }
        } else {
          updated[i] = { ...row, status: 'success' };
          successCount++;
        }
      } catch (err: any) {
        updated[i] = { ...row, status: 'error', error: err.message };
        errorCount++;
      }
      setParsedRows([...updated]);
    }

    setImporting(false);
    setImportDone(true);
    queryClient.invalidateQueries({ queryKey: ['commercial-strategy-members', groupId] });

    const parts = [];
    if (successCount) parts.push(`${successCount} importados`);
    if (dupCount) parts.push(`${dupCount} duplicados`);
    if (errorCount) parts.push(`${errorCount} erros`);
    toast.success(`Importação concluída: ${parts.join(', ')}`);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setParsedRows([]);
      setImportDone(false);
    }
    onOpenChange(val);
  };

  const statusIcon = (s: ParsedRow['status']) => {
    switch (s) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'duplicate': return <Badge variant="secondary" className="text-xs">Duplicado</Badge>;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Perfis — {groupName}</DialogTitle>
        </DialogHeader>

        {parsedRows.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Faça upload de uma planilha Excel (.xlsx) com os perfis</p>
              <p className="text-xs text-muted-foreground">Colunas: Full Name, Job Title, Company Name, LinkedIn, Email, Phone, City, State</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadTemplate} className="gap-1.5">
                <Download className="h-4 w-4" />
                Baixar Modelo
              </Button>
              <Button onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Upload className="h-4 w-4" />
                Upload Planilha
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {parsedRows.length} perfis encontrados na planilha
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Cargo</TableHead>
                    <TableHead className="hidden md:table-cell">Empresa</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 100).map((row, i) => (
                    <TableRow key={i} className={row.status === 'error' ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{row.full_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{row.current_title || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{row.current_company || '—'}</TableCell>
                      <TableCell>{statusIcon(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedRows.length > 100 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Exibindo 100 de {parsedRows.length} registros
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setParsedRows([]); setImportDone(false); }}>
                {importDone ? 'Nova Importação' : 'Cancelar'}
              </Button>
              {!importDone && (
                <Button onClick={handleImport} disabled={importing} className="gap-1.5">
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {importing ? 'Importando...' : `Importar ${parsedRows.length} Perfis`}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
