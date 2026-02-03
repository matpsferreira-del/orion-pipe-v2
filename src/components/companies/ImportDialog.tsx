import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { 
  CompanyImportRow, 
  validateCompanyImportRows, 
  normalizePorte as normalizePorteUtil,
  cleanPhone,
  cleanEmail,
  sanitizeText
} from '@/utils/importValidation';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Re-export the validated type for internal use
type ImportRow = CompanyImportRow;

interface GroupedCompany {
  empresa: string;
  porte: string;
  cidade: string;
  estado: string;
  segmento: string;
  contacts: { nome: string; email: string; telefone: string }[];
  isDuplicate: boolean;
  duplicateReason?: string;
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
  const [rawData, setRawData] = useState<ImportRow[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number; skipped: number } | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [mappedColumns, setMappedColumns] = useState<Record<string, string>>({});
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Check for duplicates when rawData changes
  useEffect(() => {
    if (rawData.length > 0) {
      checkDuplicatesAndGroup();
    }
  }, [rawData]);

  const checkDuplicatesAndGroup = async () => {
    setIsCheckingDuplicates(true);
    
    try {
      // Fetch existing companies and contacts from database
      const { data: existingCompanies } = await supabase
        .from('companies')
        .select('nome_fantasia, razao_social');
      
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('email');

      const existingCompanyNames = new Set(
        (existingCompanies || []).flatMap(c => [
          c.nome_fantasia?.toLowerCase().trim(),
          c.razao_social?.toLowerCase().trim()
        ].filter(Boolean))
      );

      const existingEmails = new Set(
        (existingContacts || [])
          .map(c => c.email?.toLowerCase().trim())
          .filter(Boolean)
      );

      // Group rows by company name
      const companyMap = new Map<string, GroupedCompany>();

      for (const row of rawData) {
        const companyKey = row.empresa.toLowerCase().trim();
        
        if (!companyMap.has(companyKey)) {
          const isDuplicateCompany = existingCompanyNames.has(companyKey);
          
          companyMap.set(companyKey, {
            empresa: row.empresa,
            porte: row.porte,
            cidade: row.cidade,
            estado: row.estado,
            segmento: row.segmento,
            contacts: [],
            isDuplicate: isDuplicateCompany,
            duplicateReason: isDuplicateCompany ? 'Empresa já existe no sistema' : undefined,
          });
        }

        const company = companyMap.get(companyKey)!;
        
        // Add contact if has name or email
        if (row.contato || row.email) {
          const emailLower = row.email?.toLowerCase().trim();
          const isEmailDuplicate = emailLower && existingEmails.has(emailLower);
          
          // Check if this contact is already in the group
          const contactExists = company.contacts.some(
            c => c.email?.toLowerCase().trim() === emailLower
          );
          
          if (!contactExists) {
            company.contacts.push({
              nome: row.contato || 'Contato Principal',
              email: row.email || '',
              telefone: row.telefone || '',
            });
            
            // Mark company as duplicate if any contact email already exists
            if (isEmailDuplicate && !company.isDuplicate) {
              company.isDuplicate = true;
              company.duplicateReason = `Email ${row.email} já existe no sistema`;
            }
          }
        }

        // Update company data if not set (take first non-empty values)
        if (!company.porte && row.porte) company.porte = row.porte;
        if (!company.cidade && row.cidade) company.cidade = row.cidade;
        if (!company.estado && row.estado) company.estado = row.estado;
        if (!company.segmento && row.segmento) company.segmento = row.segmento;
      }

      const grouped = Array.from(companyMap.values());
      const duplicates = grouped.filter(c => c.isDuplicate).length;
      
      setGroupedData(grouped);
      setDuplicateCount(duplicates);
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportResult(null);
    setParseWarning(null);
    setDetectedColumns([]);
    setMappedColumns({});
    setGroupedData([]);
    setDuplicateCount(0);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
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
      
      setDetectedColumns(headers);
      
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
      
      if (jsonData.length === 0) {
        setParseWarning('O arquivo está vazio ou não foi possível ler os dados.');
        setRawData([]);
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

      if (!empresaCol) {
        setParseWarning(`Coluna "Empresa" não encontrada. Colunas disponíveis: ${headers.join(', ')}`);
        setRawData([]);
        setIsLoading(false);
        return;
      }

      // Build raw rows for validation
      const rawRows = jsonData.map((row) => ({
        empresa: sanitizeText(String(row[empresaCol] || '')),
        contato: contatoCol ? sanitizeText(String(row[contatoCol] || '').replace(/[,<>]/g, '')) : '',
        email: emailCol ? sanitizeText(String(row[emailCol] || '').replace(/[<>]/g, '')) : '',
        telefone: telefoneCol ? sanitizeText(String(row[telefoneCol] || '')) : '',
        porte: porteCol ? sanitizeText(String(row[porteCol] || '')) : '',
        cidade: cidadeCol ? sanitizeText(String(row[cidadeCol] || '')) : '',
        estado: estadoCol ? sanitizeText(String(row[estadoCol] || '')) : '',
        segmento: segmentoCol ? sanitizeText(String(row[segmentoCol] || '')) : '',
      }));

      // Validate all rows using zod schema
      const { validRows, errors: validationErrors } = validateCompanyImportRows(rawRows);

      if (validationErrors.length > 0) {
        const errorMessages = validationErrors.slice(0, 5).map(e => 
          `Linha ${e.rowIndex}: ${e.errors.join(', ')}`
        );
        if (validationErrors.length > 5) {
          errorMessages.push(`... e mais ${validationErrors.length - 5} erro(s)`);
        }
        console.warn('Validation errors:', validationErrors);
        toast.warning(`${validationErrors.length} linha(s) com erros de validação ignoradas`);
      }

      if (validRows.length === 0) {
        setParseWarning('Nenhum registro válido encontrado. Verifique se a coluna "Empresa" contém dados válidos.');
      }

      setRawData(validRows);
      
      if (validRows.length > 0) {
        toast.success(`${validRows.length} registros válidos encontrados no arquivo!`);
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

  // Use imported utility functions for cleaning/normalizing
  const normalizePorte = normalizePorteUtil;

  const handleImport = async () => {
    const toImport = groupedData.filter(c => !c.isDuplicate);
    if (toImport.length === 0) {
      toast.error('Nenhuma empresa válida para importar.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const skippedCount = groupedData.filter(c => c.isDuplicate).length;

    for (const company of toImport) {
      try {
        // Sanitize and validate company data before insert
        const companyName = sanitizeText(company.empresa);
        const companySegmento = sanitizeText(company.segmento || '');
        const companyCidade = sanitizeText(company.cidade || '');
        const companyEstado = sanitizeText(company.estado || '');
        const companyPorte = normalizePorte(company.porte);

        // Create company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            razao_social: companyName,
            nome_fantasia: companyName,
            cnpj: `IMPORTADO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            segmento: companySegmento,
            porte: companyPorte,
            cidade: companyCidade,
            estado: companyEstado,
            status: 'prospect',
          })
          .select()
          .single();

        if (companyError) throw companyError;

        // Create all contacts for this company
        for (let i = 0; i < company.contacts.length; i++) {
          const contact = company.contacts[i];
          const contactNome = sanitizeText(contact.nome) || 'Contato Principal';
          const contactEmail = cleanEmail(contact.email) || `contato_${Date.now()}_${i}@importado.tmp`;
          const contactTelefone = cleanPhone(contact.telefone);

          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              company_id: newCompany.id,
              nome: contactNome,
              cargo: 'Responsável',
              email: contactEmail,
              telefone: contactTelefone,
              whatsapp: contactTelefone,
              is_primary: i === 0, // First contact is primary
            });

          if (contactError) {
            console.error('Error creating contact:', contactError);
          }
        }

        successCount++;
      } catch (error) {
        console.error('Error importing company:', company, error);
        errorCount++;
      }
    }

    setImportResult({ success: successCount, errors: errorCount, skipped: skippedCount });
    setIsImporting(false);
    
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });

    if (successCount > 0) {
      toast.success(`${successCount} empresas importadas com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} erros durante a importação.`);
    }
    if (skippedCount > 0) {
      toast.warning(`${skippedCount} empresas ignoradas (duplicadas).`);
    }
  };

  const handleClose = () => {
    setRawData([]);
    setGroupedData([]);
    setImportResult(null);
    setDetectedColumns([]);
    setMappedColumns({});
    setParseWarning(null);
    setDuplicateCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const validCompanies = groupedData.filter(c => !c.isDuplicate);
  const duplicateCompanies = groupedData.filter(c => c.isDuplicate);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Empresas e Contatos
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel (.xlsx). Contatos da mesma empresa serão agrupados automaticamente.
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
              disabled={isLoading || isImporting || isCheckingDuplicates}
            >
              {isLoading || isCheckingDuplicates ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isCheckingDuplicates ? 'Verificando duplicados...' : 'Selecionar Arquivo'}
            </Button>
            {groupedData.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {groupedData.length} empresas ({rawData.length} linhas)
                </span>
                {duplicateCount > 0 && (
                  <Badge variant="destructive">{duplicateCount} duplicadas</Badge>
                )}
              </div>
            )}
          </div>

          {/* Detected Columns Info */}
          {detectedColumns.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="font-medium mb-1">Mapeamento de colunas:</div>
                <div className="text-xs grid grid-cols-4 gap-1">
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

          {/* Duplicates Warning */}
          {duplicateCount > 0 && !importResult && (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>{duplicateCount} empresa(s) já existem no sistema e serão ignoradas na importação.</strong>
                <div className="mt-1 text-xs">
                  {duplicateCompanies.slice(0, 3).map((c, i) => (
                    <span key={i} className="block">• {c.empresa}: {c.duplicateReason}</span>
                  ))}
                  {duplicateCompanies.length > 3 && (
                    <span className="block">• ...e mais {duplicateCompanies.length - 3}</span>
                  )}
                </div>
              </AlertDescription>
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
                {importResult.skipped > 0 && `, ${importResult.skipped} ignoradas (duplicadas)`}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {groupedData.length > 0 && (
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contatos</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Porte</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>UF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.slice(0, 50).map((company, index) => (
                    <TableRow 
                      key={index}
                      className={company.isDuplicate ? 'bg-destructive/10 opacity-60' : ''}
                    >
                      <TableCell>
                        {company.isDuplicate ? (
                          <Badge variant="destructive" className="text-xs">Duplicada</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Nova</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {company.empresa}
                        {company.isDuplicate && (
                          <span className="block text-xs text-destructive">{company.duplicateReason}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {company.contacts.slice(0, 2).map((c, i) => (
                            <div key={i} className="text-muted-foreground">
                              {c.nome} {c.email && `(${c.email})`}
                            </div>
                          ))}
                          {company.contacts.length > 2 && (
                            <div className="text-muted-foreground">+{company.contacts.length - 2} mais</div>
                          )}
                          {company.contacts.length === 0 && (
                            <span className="text-muted-foreground italic">Sem contatos</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{company.segmento || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{company.porte || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{company.cidade || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{company.estado || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {groupedData.length > 50 && (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  Mostrando 50 de {groupedData.length} empresas
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {validCompanies.length > 0 && (
              <span>{validCompanies.length} empresa(s) serão importadas</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validCompanies.length === 0 || isImporting || !!importResult}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>Importar {validCompanies.length} Empresas</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
