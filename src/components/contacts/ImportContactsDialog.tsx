import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, AlertTriangle, Check, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  validateContactImportRows,
  normalizePorte as normalizePorteUtil,
  cleanPhone as cleanPhoneUtil,
  cleanEmail as cleanEmailUtil,
  sanitizeText
} from '@/utils/importValidation';

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  contato: string;
  empresa: string;
  cargo: string;
  email: string;
  telefone: string;
  whatsapp: string;
  linkedin: string;
  nomeFantasia: string;
  // Company fields for auto-creation
  cnpj: string;
  cidade: string;
  estado: string;
  segmento: string;
  porte: string;
  // Status fields
  isDuplicate?: boolean;
  duplicateReason?: string;
  companyId?: string;
  companyNotFound?: boolean;
  willCreateCompany?: boolean;
  mergedCount?: number;
}

export function ImportContactsDialog({ open, onOpenChange }: ImportContactsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const { data: companies = [] } = useCompanies();
  const { data: existingContacts = [] } = useContacts();

  const findColumn = (headers: string[], keywords: string[]): string | null => {
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      for (const keyword of keywords) {
        if (normalizedHeader.includes(keyword.toLowerCase())) {
          return header;
        }
      }
    }
    return null;
  };

  const findCompanyByName = (empresaName: string): { id: string; found: boolean } | null => {
    if (!empresaName || empresaName.trim() === '') return null;
    
    const normalizedName = empresaName.toLowerCase().trim();
    const company = companies.find(c => 
      c.nome_fantasia.toLowerCase().trim() === normalizedName ||
      c.razao_social.toLowerCase().trim() === normalizedName
    );
    
    return company ? { id: company.id, found: true } : { id: '', found: false };
  };

  const checkDuplicates = (rows: ImportRow[]): ImportRow[] => {
    // Build sets for duplicate detection
    const existingEmails = new Set(
      existingContacts
        .filter(c => c.email && !c.email.includes('@importado.tmp'))
        .map(c => c.email.toLowerCase().trim())
    );

    // Build name+company key set for existing contacts
    const existingNameCompanyKeys = new Set<string>();
    for (const c of existingContacts) {
      if (c.nome && c.company_id) {
        const companyMatch = companies.find(co => co.id === c.company_id);
        if (companyMatch) {
          existingNameCompanyKeys.add(`${c.nome.toLowerCase().trim()}|${companyMatch.nome_fantasia.toLowerCase().trim()}`);
          existingNameCompanyKeys.add(`${c.nome.toLowerCase().trim()}|${companyMatch.razao_social.toLowerCase().trim()}`);
        }
      }
    }

    return rows.map(row => {
      // Try matching by empresa (razao social) or nomeFantasia
      const companyResult = findCompanyByName(row.empresa) || 
        (row.nomeFantasia ? findCompanyByName(row.nomeFantasia) : null);
      const willCreateCompany = !companyResult?.found && row.empresa.trim() !== '';
      
      // Check email duplicates (split by '; ' for consolidated emails)
      const emails = row.email ? row.email.split(/\s*;\s*/).filter(Boolean) : [];
      const hasEmailDuplicate = emails.some(e => existingEmails.has(e.toLowerCase().trim()));

      // Check name+company duplicate
      const nameKey = (row.contato || '').toLowerCase().trim();
      const empresaKey = (row.empresa || '').toLowerCase().trim();
      const fantasiaKey = (row.nomeFantasia || '').toLowerCase().trim();
      const hasNameCompanyDuplicate = nameKey && (
        (empresaKey && existingNameCompanyKeys.has(`${nameKey}|${empresaKey}`)) ||
        (fantasiaKey && existingNameCompanyKeys.has(`${nameKey}|${fantasiaKey}`))
      );

      if (hasEmailDuplicate || hasNameCompanyDuplicate) {
        return { 
          ...row, 
          isDuplicate: true, 
          duplicateReason: hasEmailDuplicate ? 'Email já existe' : 'Contato já existe nesta empresa',
          companyId: companyResult?.id || '',
          companyNotFound: false,
          willCreateCompany: false
        };
      }
      
      return { 
        ...row, 
        isDuplicate: false,
        companyId: companyResult?.id || '',
        companyNotFound: false, // Don't block import for missing company name
        willCreateCompany
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          setParseError('Arquivo vazio ou sem dados válidos');
          return;
        }

        const headers = Object.keys(jsonData[0]);
        setDetectedColumns(headers);

        // Find first "contato" column for name
        const contatoCol = findColumn(headers, ['nome', 'responsável', 'responsavel', 'name']);
        // If no nome column found, use first column that has 'contato'
        const firstContatoCol = !contatoCol ? headers.find(h => h.toLowerCase().includes('contato') && !h.toLowerCase().includes('_1') && !h.toLowerCase().includes('_2')) : contatoCol;
        
        const empresaCol = findColumn(headers, ['empresa', 'company', 'companhia', 'razao', 'razão social']);
        const cargoCol = findColumn(headers, ['cargo', 'position', 'função', 'funcao', 'role']);
        const emailCol = findColumn(headers, ['email', 'e-mail', 'mail']);
        
        // Check for telefone column, or use second "contato" column if exists (XLSX may rename duplicates to "Contato_1")
        let telefoneCol = findColumn(headers, ['telefone', 'phone', 'tel', 'fone', 'celular']);
        if (!telefoneCol) {
          // Look for duplicate contato columns (XLSX renames duplicates to columnName_1, columnName_2, etc)
          const duplicateContatoCol = headers.find(h => 
            (h.toLowerCase().includes('contato_') || h.toLowerCase().includes('contato ')) ||
            (h.toLowerCase().includes('contato') && h !== firstContatoCol)
          );
          if (duplicateContatoCol) {
            telefoneCol = duplicateContatoCol;
          }
        }
        
        const whatsappCol = findColumn(headers, ['whatsapp', 'whats', 'wpp', 'zap']);
        const linkedinCol = findColumn(headers, ['linkedin', 'linked']);
        const nomeFantasiaCol = findColumn(headers, ['nome fantasia', 'fantasia', 'nome_fantasia']);
        const cnpjCol = findColumn(headers, ['cnpj']);
        const cidadeCol = findColumn(headers, ['cidade', 'city']);
        const estadoCol = findColumn(headers, ['estado', 'uf', 'state']);
        const segmentoCol = findColumn(headers, ['segmento', 'segment', 'setor']);
        const porteCol = findColumn(headers, ['porte', 'size', 'tamanho']);

        // Build raw rows for validation
        const rawRows = jsonData.map((row) => ({
          contato: firstContatoCol ? sanitizeText(String(row[firstContatoCol] || '')) : '',
          empresa: empresaCol ? sanitizeText(String(row[empresaCol] || '')) : '',
          cargo: cargoCol ? sanitizeText(String(row[cargoCol] || '')) : '',
          email: emailCol ? sanitizeText(String(row[emailCol] || '')) : '',
          telefone: telefoneCol ? sanitizeText(String(row[telefoneCol] || '')) : '',
          whatsapp: whatsappCol ? sanitizeText(String(row[whatsappCol] || '')) : '',
          linkedin: linkedinCol ? sanitizeText(String(row[linkedinCol] || '')) : '',
          nomeFantasia: nomeFantasiaCol ? sanitizeText(String(row[nomeFantasiaCol] || '')) : '',
          cnpj: cnpjCol ? sanitizeText(String(row[cnpjCol] || '')) : '',
          cidade: cidadeCol ? sanitizeText(String(row[cidadeCol] || '')) : '',
          estado: estadoCol ? sanitizeText(String(row[estadoCol] || '')) : '',
          segmento: segmentoCol ? sanitizeText(String(row[segmentoCol] || '')) : '',
          porte: porteCol ? sanitizeText(String(row[porteCol] || '')) : '',
        }));

        // Validate all rows using zod schema
        const { validRows: validated, errors: validationErrors } = validateContactImportRows(rawRows);

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

        // Convert validated rows to ImportRow format with additional status fields
        const importRows: ImportRow[] = validated.map(row => ({
          contato: row.contato || '',
          empresa: row.empresa || '',
          cargo: row.cargo || '',
          email: row.email || '',
          telefone: row.telefone || '',
          whatsapp: row.whatsapp || '',
          linkedin: row.linkedin || '',
          nomeFantasia: row.nomeFantasia || '',
          cnpj: row.cnpj || '',
          cidade: row.cidade || '',
          estado: row.estado || '',
          segmento: row.segmento || '',
          porte: row.porte || '',
          isDuplicate: false,
          duplicateReason: undefined,
          companyId: undefined,
          companyNotFound: false,
          willCreateCompany: false,
        }));
        
        if (importRows.length === 0) {
          setParseError('Nenhum contato válido encontrado (nome ou email obrigatório)');
          return;
        }

        const consolidated = consolidateContacts(importRows);
        const checkedRows = checkDuplicates(consolidated);
        setParsedData(checkedRows);
      } catch {
        setParseError('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Use imported utility functions for cleaning/normalizing
  const cleanPhone = cleanPhoneUtil;
  const cleanEmail = cleanEmailUtil;
  const normalizePorte = normalizePorteUtil;

  const consolidateContacts = (rows: ImportRow[]): ImportRow[] => {
    const groups = new Map<string, ImportRow[]>();

    for (const row of rows) {
      const nameKey = (row.contato || '').toLowerCase().trim();
      if (!nameKey) {
        // No name, keep as-is
        const soloKey = `__solo_${groups.size}`;
        groups.set(soloKey, [row]);
        continue;
      }
      const cnpjDigits = (row.cnpj || '').replace(/[^\d]/g, '');
      const companyKey = cnpjDigits.length >= 11
        ? cnpjDigits
        : (row.empresa || '').toLowerCase().trim();
      const key = `${nameKey}|${companyKey}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }

    const result: ImportRow[] = [];
    for (const groupRows of groups.values()) {
      if (groupRows.length === 1) {
        result.push({ ...groupRows[0], mergedCount: 1 });
        continue;
      }
      const base = { ...groupRows[0] };
      const emails = new Set<string>();
      const phones = new Set<string>();
      const whatsapps = new Set<string>();

      for (const r of groupRows) {
        if (r.email?.trim()) emails.add(r.email.trim());
        if (r.telefone?.trim()) phones.add(r.telefone.trim());
        if (r.whatsapp?.trim()) whatsapps.add(r.whatsapp.trim());
        if (!base.cargo && r.cargo) base.cargo = r.cargo;
        if (!base.linkedin && r.linkedin) base.linkedin = r.linkedin;
        if (!base.nomeFantasia && r.nomeFantasia) base.nomeFantasia = r.nomeFantasia;
        if (!base.cnpj && r.cnpj) base.cnpj = r.cnpj;
        if (!base.cidade && r.cidade) base.cidade = r.cidade;
        if (!base.estado && r.estado) base.estado = r.estado;
        if (!base.segmento && r.segmento) base.segmento = r.segmento;
        if (!base.porte && r.porte) base.porte = r.porte;
        if (!base.empresa && r.empresa) base.empresa = r.empresa;
      }

      base.email = Array.from(emails).join(' ; ');
      base.telefone = Array.from(phones).join(' ; ');
      base.whatsapp = Array.from(whatsapps).join(' ; ');
      base.mergedCount = groupRows.length;
      result.push(base);
    }
    return result;
  };

  const handleImport = async () => {
    const validContacts = parsedData.filter(row => !row.isDuplicate);
    
    if (validContacts.length === 0) {
      toast.error('Nenhum contato válido para importar');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    let companiesCreated = 0;
    const createdCompanies = new Map<string, string>(); // empresa name -> id

    try {
      // Get user once for granting access
      const { data: { user } } = await supabase.auth.getUser();

      // Process in batches of 50
      const BATCH_SIZE = 50;
      
      for (let i = 0; i < validContacts.length; i += BATCH_SIZE) {
        const batch = validContacts.slice(i, i + BATCH_SIZE);
        const contactsToInsert: Array<{
          company_id: string;
          nome: string;
          cargo: string;
          email: string;
          telefone: string;
          whatsapp: string;
          linkedin: string;
          is_primary: boolean;
        }> = [];

        for (const row of batch) {
          let companyId = row.companyId;

          // Create company if needed
          if (row.willCreateCompany && row.empresa) {
            const empresaKey = row.empresa.toLowerCase().trim();
            
            if (createdCompanies.has(empresaKey)) {
              companyId = createdCompanies.get(empresaKey)!;
            } else {
              const companyData = {
                nome_fantasia: sanitizeText(row.nomeFantasia || row.empresa),
                razao_social: sanitizeText(row.empresa),
                cnpj: sanitizeText(row.cnpj) || `IMPORTADO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                cidade: sanitizeText(row.cidade || ''),
                estado: sanitizeText(row.estado || ''),
                segmento: sanitizeText(row.segmento || ''),
                porte: normalizePorte(row.porte),
                status: 'prospect',
              };

              const { data: newCompany, error: companyError } = await supabase
                .from('companies')
                .insert(companyData)
                .select('id')
                .single();

              if (companyError) {
                console.error('Erro ao criar empresa:', companyError);
                errorCount++;
                continue;
              }

              companyId = newCompany.id;
              createdCompanies.set(empresaKey, companyId);
              // Also map by nomeFantasia key
              if (row.nomeFantasia) {
                createdCompanies.set(row.nomeFantasia.toLowerCase().trim(), companyId);
              }
              companiesCreated++;

              // Grant user access
              if (user) {
                await supabase.from('user_company_access').insert({
                  user_id: user.id,
                  company_id: companyId,
                  access_level: 'owner',
                });
              }
            }
          }

          if (!companyId) {
            // If no company and no empresa name, skip
            if (!row.empresa.trim()) {
              errorCount++;
              continue;
            }
            errorCount++;
            continue;
          }

          // Handle consolidated '; ' separated values - take first value for phone fields
          const firstPhone = (row.telefone || '').split(/\s*;\s*/)[0] || '';
          const firstWhatsapp = (row.whatsapp || '').split(/\s*;\s*/)[0] || '';

          contactsToInsert.push({
            company_id: companyId,
            nome: sanitizeText(row.contato) || `Contato ${Date.now()}`,
            cargo: sanitizeText(row.cargo || ''),
            email: cleanEmail(row.email.split(/\s*;\s*/)[0] || '') || `contato_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@importado.tmp`,
            telefone: cleanPhone(firstPhone),
            whatsapp: cleanPhone(firstWhatsapp),
            linkedin: sanitizeText(row.linkedin || ''),
            is_primary: false,
          });
        }

        // Batch insert contacts
        if (contactsToInsert.length > 0) {
          const { data: inserted, error } = await supabase
            .from('contacts')
            .insert(contactsToInsert)
            .select('id');
          
          if (error) {
            console.error('Erro ao inserir lote de contatos:', error);
            errorCount += contactsToInsert.length;
          } else {
            successCount += inserted?.length || contactsToInsert.length;
          }
        }

        // Yield to UI thread between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-access'] });
      
      const messages: string[] = [];
      if (companiesCreated > 0) messages.push(`${companiesCreated} empresa(s) criada(s)`);
      if (successCount > 0) messages.push(`${successCount} contato(s) importado(s)`);
      
      if (messages.length > 0) {
        toast.success(`Importação concluída! ${messages.join(', ')}.`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} contato(s) com erro na importação`);
      }

      handleClose();
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar contatos');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setParseError(null);
    setDetectedColumns([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = [
      { Contato: 'João Silva', Cargo: 'Diretor', Empresa: 'Tech Solutions LTDA', 'Nome Fantasia': 'Tech Solutions', Email: 'joao@tech.com', Telefone: '11999998888', WhatsApp: '11999998888', LinkedIn: 'https://linkedin.com/in/joaosilva', CNPJ: '12.345.678/0001-90', Cidade: 'São Paulo', Estado: 'SP', Segmento: 'Tecnologia', Porte: 'media' },
      { Contato: 'Maria Santos', Cargo: 'RH', Empresa: 'Nova Empresa LTDA', 'Nome Fantasia': 'Nova Empresa', Email: 'maria@nova.com', Telefone: '11988887777', WhatsApp: '', LinkedIn: '', CNPJ: '', Cidade: 'Rio de Janeiro', Estado: 'RJ', Segmento: 'Varejo', Porte: 'grande' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    XLSX.writeFile(wb, 'modelo_importacao_contatos.xlsx');
  };

  const duplicateCount = parsedData.filter(r => r.isDuplicate).length;
  const companyNotFoundCount = 0; // No longer blocking imports for missing company
  const willCreateCompanyCount = parsedData.filter(r => r.willCreateCompany && !r.isDuplicate).length;
  const validCount = parsedData.filter(r => !r.isDuplicate).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Contatos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <span className="text-sm text-muted-foreground">
              Use o modelo para garantir o formato correto
            </span>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="contact-file-upload"
            />
            <label htmlFor="contact-file-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar ou arraste um arquivo Excel
              </p>
              {file && (
                <p className="text-sm font-medium text-foreground mt-2">
                  Arquivo: {file.name}
                </p>
              )}
            </label>
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {detectedColumns.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Colunas detectadas:</span>{' '}
              {detectedColumns.join(', ')}
            </div>
          )}

          {parsedData.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {parsedData.length} contatos encontrados
                </Badge>
                {parsedData.some(r => (r.mergedCount || 1) > 1) && (
                  <Badge variant="outline" className="border-violet-500 text-violet-600">
                    {parsedData.filter(r => (r.mergedCount || 1) > 1).length} consolidado(s)
                  </Badge>
                )}
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  {validCount} válidos
                </Badge>
                {duplicateCount > 0 && (
                  <Badge variant="destructive">
                    {duplicateCount} duplicados
                  </Badge>
                )}
                {companyNotFoundCount > 0 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    {companyNotFoundCount} sem empresa
                  </Badge>
                )}
                {willCreateCompanyCount > 0 && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    {willCreateCompanyCount} nova(s) empresa(s)
                  </Badge>
                )}
              </div>

              {willCreateCompanyCount > 0 && (
                <Alert className="border-blue-500 bg-blue-50">
                  <Check className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    {willCreateCompanyCount} empresa(s) serão criadas automaticamente durante a importação.
                  </AlertDescription>
                </Alert>
              )}

              {(duplicateCount > 0 || companyNotFoundCount > 0) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {duplicateCount > 0 && `${duplicateCount} contato(s) já existem e serão ignorados. `}
                    {companyNotFoundCount > 0 && `${companyNotFoundCount} contato(s) não tem empresa informada e serão ignorados.`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, idx) => (
                      <TableRow 
                        key={idx}
                        className={row.isDuplicate ? 'bg-destructive/10' : row.companyNotFound ? 'bg-amber-500/10' : row.willCreateCompany ? 'bg-blue-50' : ''}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {row.isDuplicate ? (
                              <Badge variant="destructive" className="text-xs">Duplicado</Badge>
                            ) : row.companyNotFound ? (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Sem empresa</Badge>
                            ) : row.willCreateCompany ? (
                              <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Nova empresa</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">OK</Badge>
                            )}
                            {(row.mergedCount || 1) > 1 && (
                              <Badge variant="outline" className="text-xs border-violet-500 text-violet-600">{row.mergedCount} mesclados</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{row.contato || '-'}</TableCell>
                        <TableCell>{row.empresa || '-'}</TableCell>
                        <TableCell>{row.cargo || '-'}</TableCell>
                        <TableCell className="text-sm">{row.email || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={validCount === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>Importar {validCount} contato(s)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
