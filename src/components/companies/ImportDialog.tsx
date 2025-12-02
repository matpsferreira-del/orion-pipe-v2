import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  empresa: string;
  contato: string;
  email: string;
  telefone: string;
  porte: string;
  cidade: string;
  estado: string;
  segmento: string;
}

// Função para encontrar coluna por palavras-chave (case insensitive)
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

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [data, setData] = useState<ImportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [mappedColumns, setMappedColumns] = useState<Record<string, string>>({});
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('Nenhum arquivo selecionado');
      return;
    }

    console.log('Arquivo selecionado:', file.name, 'Tamanho:', file.size);
    setIsLoading(true);
    setImportResult(null);
    setParseWarning(null);
    setDetectedColumns([]);
    setMappedColumns({});
    
    try {
      const buffer = await file.arrayBuffer();
      console.log('Buffer lido, tamanho:', buffer.byteLength);
      
      const workbook = XLSX.read(buffer, { type: 'array' });
      console.log('Workbook lido, planilhas:', workbook.SheetNames);
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Obter headers da planilha
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const headers: string[] = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
        const cell = worksheet[cellAddress];
        headers.push(cell ? String(cell.v).trim() : `Coluna ${col + 1}`);
      }
      
      console.log('Colunas detectadas:', headers);
      setDetectedColumns(headers);
      
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
      console.log('Total de linhas:', jsonData.length);
      
      if (jsonData.length === 0) {
        setParseWarning('O arquivo está vazio ou não foi possível ler os dados.');
        setData([]);
        setIsLoading(false);
        return;
      }

      // Mapeamento flexível de colunas
      const empresaCol = findColumn(headers, ['empresa', 'razao_social', 'razão social', 'nome fantasia', 'company', 'nome da empresa']);
      const contatoCol = findColumn(headers, ['nome do responsável', 'nome do responsavel', 'responsável', 'responsavel', 'contato', 'nome', 'contact', 'nome do contato']);
      const emailCol = findColumn(headers, ['email', 'e-mail', 'mail']);
      const telefoneCol = findColumn(headers, ['telefone', 'phone', 'tel', 'celular', 'fone', 'whatsapp']);
      const porteCol = findColumn(headers, ['porte', 'tamanho', 'size', 'porte da empresa']);
      const cidadeCol = findColumn(headers, ['cidade', 'city', 'municipio', 'município']);
      const estadoCol = findColumn(headers, ['estado', 'uf', 'state']);
      const segmentoCol = findColumn(headers, ['segmento', 'segment', 'setor', 'ramo', 'área', 'area']);

      const mapped = {
        empresa: empresaCol || 'Não encontrado',
        contato: contatoCol || 'Não encontrado',
        email: emailCol || 'Não encontrado',
        telefone: telefoneCol || 'Não encontrado',
        porte: porteCol || 'Não encontrado',
        cidade: cidadeCol || 'Não encontrado',
        estado: estadoCol || 'Não encontrado',
        segmento: segmentoCol || 'Não encontrado',
      };
      setMappedColumns(mapped);
      console.log('Mapeamento de colunas:', mapped);

      if (!empresaCol) {
        setParseWarning(`Coluna "Empresa" não encontrada. Colunas disponíveis: ${headers.join(', ')}`);
        setData([]);
        setIsLoading(false);
        return;
      }

      const parsedData: ImportRow[] = jsonData.map((row) => ({
        empresa: String(row[empresaCol] || '').trim(),
        contato: contatoCol ? String(row[contatoCol] || '').replace(/[,<>]/g, '').trim() : '',
        email: emailCol ? String(row[emailCol] || '').replace(/[<>]/g, '').trim() : '',
        telefone: telefoneCol ? String(row[telefoneCol] || '').trim() : '',
        porte: porteCol ? String(row[porteCol] || '').trim() : '',
        cidade: cidadeCol ? String(row[cidadeCol] || '').trim() : '',
        estado: estadoCol ? String(row[estadoCol] || '').trim() : '',
        segmento: segmentoCol ? String(row[segmentoCol] || '').trim() : '',
      })).filter(row => row.empresa.length > 0);

      console.log('Dados parseados:', parsedData.length, 'registros válidos');

      if (parsedData.length === 0) {
        setParseWarning('Nenhum registro válido encontrado. Verifique se a coluna "Empresa" contém dados.');
      } else if (!contatoCol) {
        setParseWarning(`Aviso: Coluna de contato não identificada. Os contatos serão criados sem nome.`);
      }

      setData(parsedData);
      
      if (parsedData.length > 0) {
        toast.success(`${parsedData.length} registros encontrados no arquivo!`);
      }
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao ler o arquivo: ${errorMessage}`);
      setParseWarning(`Erro ao processar arquivo: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanPhone = (phone: string): string => {
    return phone.replace(/[^\d]/g, '');
  };

  const cleanEmail = (email: string): string => {
    return email.replace(/[,<>]/g, '').trim().toLowerCase();
  };

  const handleImport = async () => {
    if (data.length === 0) return;

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        // Create company
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            razao_social: row.empresa.trim(),
            nome_fantasia: row.empresa.trim(),
            cnpj: `IMPORTADO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            segmento: row.segmento || '',
            porte: row.porte || '',
            cidade: row.cidade || '',
            estado: row.estado || '',
            status: 'prospect',
          })
          .select()
          .single();

        if (companyError) throw companyError;

        // Create contact (mesmo sem nome, para manter o email/telefone)
        const contactName = row.contato || 'Contato Principal';
        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            company_id: company.id,
            nome: contactName,
            cargo: 'Responsável',
            email: cleanEmail(row.email) || `contato_${Date.now()}@importado.tmp`,
            telefone: cleanPhone(row.telefone),
            whatsapp: cleanPhone(row.telefone),
            is_primary: true,
          });

        if (contactError) throw contactError;

        successCount++;
      } catch (error) {
        console.error('Error importing row:', row, error);
        errorCount++;
      }
    }

    setImportResult({ success: successCount, errors: errorCount });
    setIsImporting(false);
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });

    if (successCount > 0) {
      toast.success(`${successCount} empresas importadas com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} erros durante a importação.`);
    }
  };

  const handleClose = () => {
    setData([]);
    setImportResult(null);
    setDetectedColumns([]);
    setMappedColumns({});
    setParseWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Empresas e Contatos
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel (.xlsx) com as colunas: Empresa, Nome do responsável, Email, Telefone
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* File Input */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isImporting}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Selecionar Arquivo
            </Button>
            {data.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {data.length} registros encontrados
              </span>
            )}
          </div>

          {/* Detected Columns Info */}
          {detectedColumns.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="font-medium mb-1">Colunas detectadas:</div>
                <div className="text-muted-foreground text-xs mb-2">{detectedColumns.join(' | ')}</div>
                <div className="font-medium mb-1">Mapeamento:</div>
                <div className="text-xs grid grid-cols-2 gap-1">
                  <span>Empresa → {mappedColumns.empresa}</span>
                  <span>Contato → {mappedColumns.contato}</span>
                  <span>Email → {mappedColumns.email}</span>
                  <span>Telefone → {mappedColumns.telefone}</span>
                  <span>Porte → {mappedColumns.porte}</span>
                  <span>Cidade → {mappedColumns.cidade}</span>
                  <span>Estado → {mappedColumns.estado}</span>
                  <span>Segmento → {mappedColumns.segmento}</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning */}
          {parseWarning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseWarning}</AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.errors > 0 ? 'destructive' : 'default'}>
              {importResult.errors > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                Importação concluída: {importResult.success} sucesso, {importResult.errors} erros
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {data.length > 0 && (
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Porte</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>UF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 50).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.empresa}</TableCell>
                      <TableCell>{row.contato || <span className="text-muted-foreground italic">-</span>}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.telefone || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.segmento || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.porte || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.cidade || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.estado || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.length > 50 && (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  Mostrando 50 de {data.length} registros
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={data.length === 0 || isImporting || !!importResult}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>Importar {data.length} Empresas</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
