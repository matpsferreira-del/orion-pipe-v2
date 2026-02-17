import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { normalizeCnpj, sanitizeText } from '@/utils/importValidation';

interface ImportCnpjDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CnpjMatchRow {
  excelName: string;
  excelCnpj: string;
  matchedCompanyId: string | null;
  matchedCompanyName: string | null;
  existingCnpj: string | null;
  status: 'matched' | 'not_found' | 'already_has_cnpj';
}

const findColumn = (headers: string[], keywords: string[]): string | undefined => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  for (const keyword of keywords) {
    const exactMatch = normalizedHeaders.findIndex(h => h === keyword.toLowerCase());
    if (exactMatch !== -1) return headers[exactMatch];
  }
  for (const keyword of keywords) {
    const partialMatch = normalizedHeaders.findIndex(h => h.includes(keyword.toLowerCase()));
    if (partialMatch !== -1) return headers[partialMatch];
  }
  return undefined;
};

const normalizeForMatch = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

export function ImportCnpjDialog({ open, onOpenChange }: ImportCnpjDialogProps) {
  const [matchRows, setMatchRows] = useState<CnpjMatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number; skipped: number } | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportResult(null);
    setParseWarning(null);
    setMatchRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const headers: string[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
        headers.push(cell ? String(cell.v).trim() : `Coluna ${col + 1}`);
      }

      const empresaCol = findColumn(headers, ['empresa', 'razao_social', 'razão social', 'nome fantasia', 'nome_fantasia', 'company', 'nome da empresa']);
      const cnpjCol = findColumn(headers, ['cnpj', 'cnpj/cpf']);

      if (!empresaCol) {
        setParseWarning(`Coluna "Empresa" não encontrada. Colunas disponíveis: ${headers.join(', ')}`);
        setIsLoading(false);
        return;
      }
      if (!cnpjCol) {
        setParseWarning(`Coluna "CNPJ" não encontrada. Colunas disponíveis: ${headers.join(', ')}`);
        setIsLoading(false);
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
      if (jsonData.length === 0) {
        setParseWarning('O arquivo está vazio.');
        setIsLoading(false);
        return;
      }

      // Fetch existing companies
      const { data: existingCompanies, error } = await supabase
        .from('companies')
        .select('id, nome_fantasia, razao_social, cnpj');

      if (error) throw error;

      // Build match map
      const companyMap = new Map<string, { id: string; name: string; cnpj: string }>();
      for (const c of existingCompanies || []) {
        companyMap.set(normalizeForMatch(c.nome_fantasia), { id: c.id, name: c.nome_fantasia, cnpj: c.cnpj });
        if (c.razao_social && c.razao_social !== c.nome_fantasia) {
          companyMap.set(normalizeForMatch(c.razao_social), { id: c.id, name: c.nome_fantasia, cnpj: c.cnpj });
        }
      }

      const rows: CnpjMatchRow[] = jsonData
        .map((row) => {
          const excelName = sanitizeText(String(row[empresaCol] || '')).trim();
          const excelCnpj = normalizeCnpj(String(row[cnpjCol] || ''));

          if (!excelName || !excelCnpj) return null;

          const match = companyMap.get(normalizeForMatch(excelName));

          if (!match) {
            return { excelName, excelCnpj, matchedCompanyId: null, matchedCompanyName: null, existingCnpj: null, status: 'not_found' as const };
          }

          const hasCnpj = match.cnpj && match.cnpj.replace(/[^\d]/g, '').length >= 11;
          return {
            excelName,
            excelCnpj,
            matchedCompanyId: match.id,
            matchedCompanyName: match.name,
            existingCnpj: match.cnpj || null,
            status: hasCnpj ? 'already_has_cnpj' as const : 'matched' as const,
          };
        })
        .filter(Boolean) as CnpjMatchRow[];

      setMatchRows(rows);
      if (rows.length > 0) {
        const matched = rows.filter(r => r.status === 'matched').length;
        const alreadyHas = rows.filter(r => r.status === 'already_has_cnpj').length;
        const notFound = rows.filter(r => r.status === 'not_found').length;
        toast.success(`${rows.length} linhas processadas: ${matched} para atualizar, ${alreadyHas} já com CNPJ, ${notFound} não encontradas`);
      }
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      toast.error('Erro ao ler o arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const toUpdate = matchRows.filter(r =>
      r.status === 'matched' || (r.status === 'already_has_cnpj' && overwriteExisting)
    );

    if (toUpdate.length === 0) {
      toast.error('Nenhuma empresa para atualizar.');
      return;
    }

    setIsImporting(true);
    let success = 0;
    let errors = 0;

    for (const row of toUpdate) {
      try {
        const { error } = await supabase
          .from('companies')
          .update({ cnpj: row.excelCnpj })
          .eq('id', row.matchedCompanyId!);
        if (error) throw error;
        success++;
      } catch {
        errors++;
      }
    }

    const skipped = matchRows.length - toUpdate.length;
    setImportResult({ success, errors, skipped });
    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ['companies'] });

    if (success > 0) toast.success(`${success} CNPJs atualizados com sucesso!`);
    if (errors > 0) toast.error(`${errors} erros ao atualizar.`);
  };

  const handleClose = () => {
    setMatchRows([]);
    setImportResult(null);
    setParseWarning(null);
    setOverwriteExisting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const matchedCount = matchRows.filter(r => r.status === 'matched').length;
  const alreadyHasCount = matchRows.filter(r => r.status === 'already_has_cnpj').length;
  const notFoundCount = matchRows.filter(r => r.status === 'not_found').length;
  const updatableCount = matchedCount + (overwriteExisting ? alreadyHasCount : 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar CNPJs
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel com colunas de nome da empresa e CNPJ para atualizar empresas existentes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* File Input */}
          <div className="flex items-center gap-4">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isImporting}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {isLoading ? 'Processando...' : 'Selecionar Arquivo'}
            </Button>
          </div>

          {parseWarning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseWarning}</AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {matchRows.length > 0 && !importResult && (
            <>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {matchedCount} encontradas
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {alreadyHasCount} já com CNPJ
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <XCircle className="h-3 w-3" /> {notFoundCount} não encontradas
                </Badge>
              </div>

              {alreadyHasCount > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="overwrite"
                    checked={overwriteExisting}
                    onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                  />
                  <label htmlFor="overwrite" className="text-sm cursor-pointer">
                    Sobrescrever CNPJs existentes ({alreadyHasCount} empresas)
                  </label>
                </div>
              )}

              {/* Preview Table */}
              <div className="flex-1 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa (planilha)</TableHead>
                      <TableHead>CNPJ (planilha)</TableHead>
                      <TableHead>Empresa no sistema</TableHead>
                      <TableHead>CNPJ atual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchRows.map((row, i) => (
                      <TableRow key={i} className={row.status === 'not_found' ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{row.excelName}</TableCell>
                        <TableCell className="font-mono text-xs">{row.excelCnpj}</TableCell>
                        <TableCell>{row.matchedCompanyName || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{row.existingCnpj || '—'}</TableCell>
                        <TableCell>
                          {row.status === 'matched' && (
                            <Badge variant="default" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Atualizar</Badge>
                          )}
                          {row.status === 'already_has_cnpj' && (
                            <Badge variant="secondary" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Já possui</Badge>
                          )}
                          {row.status === 'not_found' && (
                            <Badge variant="outline" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Não encontrada</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Result */}
          {importResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {importResult.success} CNPJs atualizados, {importResult.errors} erros, {importResult.skipped} ignorados.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!importResult && matchRows.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting || updatableCount === 0}>
              {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Atualizar {updatableCount} CNPJs
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
