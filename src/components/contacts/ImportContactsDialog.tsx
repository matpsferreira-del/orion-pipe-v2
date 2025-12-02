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
  isDuplicate?: boolean;
  duplicateReason?: string;
  companyId?: string;
  companyNotFound?: boolean;
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
    const existingEmails = new Set(
      existingContacts
        .filter(c => c.email && !c.email.includes('@importado.tmp'))
        .map(c => c.email.toLowerCase().trim())
    );

    return rows.map(row => {
      const companyResult = findCompanyByName(row.empresa);
      
      if (row.email && existingEmails.has(row.email.toLowerCase().trim())) {
        return { 
          ...row, 
          isDuplicate: true, 
          duplicateReason: 'Email já existe',
          companyId: companyResult?.id || '',
          companyNotFound: companyResult ? !companyResult.found : true
        };
      }
      
      return { 
        ...row, 
        isDuplicate: false,
        companyId: companyResult?.id || '',
        companyNotFound: companyResult ? !companyResult.found : true
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

        const contatoCol = findColumn(headers, ['contato', 'nome', 'responsável', 'responsavel', 'name']);
        const empresaCol = findColumn(headers, ['empresa', 'company', 'companhia', 'razao', 'fantasia']);
        const cargoCol = findColumn(headers, ['cargo', 'position', 'função', 'funcao', 'role']);
        const emailCol = findColumn(headers, ['email', 'e-mail', 'mail']);
        const telefoneCol = findColumn(headers, ['telefone', 'phone', 'tel', 'fone']);
        const whatsappCol = findColumn(headers, ['whatsapp', 'whats', 'wpp', 'zap']);
        const linkedinCol = findColumn(headers, ['linkedin', 'linked', 'in']);

        const rows: ImportRow[] = jsonData.map((row) => ({
          contato: contatoCol ? String(row[contatoCol] || '').trim() : '',
          empresa: empresaCol ? String(row[empresaCol] || '').trim() : '',
          cargo: cargoCol ? String(row[cargoCol] || '').trim() : '',
          email: emailCol ? String(row[emailCol] || '').trim() : '',
          telefone: telefoneCol ? String(row[telefoneCol] || '').trim() : '',
          whatsapp: whatsappCol ? String(row[whatsappCol] || '').trim() : '',
          linkedin: linkedinCol ? String(row[linkedinCol] || '').trim() : '',
        }));

        const validRows = rows.filter(r => r.contato || r.email);
        
        if (validRows.length === 0) {
          setParseError('Nenhum contato válido encontrado (nome ou email obrigatório)');
          return;
        }

        const checkedRows = checkDuplicates(validRows);
        setParsedData(checkedRows);
      } catch {
        setParseError('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const cleanPhone = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '').slice(0, 15);
  };

  const cleanEmail = (email: string): string => {
    if (!email) return '';
    return email.toLowerCase().trim();
  };

  const handleImport = async () => {
    const validContacts = parsedData.filter(row => !row.isDuplicate && !row.companyNotFound);
    
    if (validContacts.length === 0) {
      toast.error('Nenhum contato válido para importar');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of validContacts) {
        const contactData = {
          company_id: row.companyId!,
          nome: row.contato || `Contato ${Date.now()}`,
          cargo: row.cargo || '',
          email: row.email || `contato_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@importado.tmp`,
          telefone: cleanPhone(row.telefone) || '',
          whatsapp: cleanPhone(row.whatsapp) || '',
          linkedin: row.linkedin || '',
          is_primary: false,
        };

        const { error } = await supabase.from('contacts').insert(contactData);
        
        if (error) {
          console.error('Erro ao inserir contato:', error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      if (successCount > 0) {
        toast.success(`${successCount} contato(s) importado(s) com sucesso!`);
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
      { Contato: 'João Silva', Empresa: 'Tech Solutions', Cargo: 'Diretor', Email: 'joao@tech.com', Telefone: '11999998888', WhatsApp: '11999998888', LinkedIn: 'https://linkedin.com/in/joaosilva' },
      { Contato: 'Maria Santos', Empresa: 'Tech Solutions', Cargo: 'RH', Email: 'maria@tech.com', Telefone: '11988887777', WhatsApp: '', LinkedIn: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    XLSX.writeFile(wb, 'modelo_importacao_contatos.xlsx');
  };

  const duplicateCount = parsedData.filter(r => r.isDuplicate).length;
  const companyNotFoundCount = parsedData.filter(r => r.companyNotFound && !r.isDuplicate).length;
  const validCount = parsedData.filter(r => !r.isDuplicate && !r.companyNotFound).length;

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
                    {companyNotFoundCount} empresa não encontrada
                  </Badge>
                )}
              </div>

              {(duplicateCount > 0 || companyNotFoundCount > 0) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {duplicateCount > 0 && `${duplicateCount} contato(s) já existem e serão ignorados. `}
                    {companyNotFoundCount > 0 && `${companyNotFoundCount} contato(s) têm empresa não cadastrada e serão ignorados.`}
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
                        className={row.isDuplicate ? 'bg-destructive/10' : row.companyNotFound ? 'bg-amber-500/10' : ''}
                      >
                        <TableCell>
                          {row.isDuplicate ? (
                            <Badge variant="destructive" className="text-xs">Duplicado</Badge>
                          ) : row.companyNotFound ? (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Sem empresa</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">OK</Badge>
                          )}
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
