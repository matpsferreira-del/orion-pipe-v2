import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
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
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [data, setData] = useState<ImportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportResult(null);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      const parsedData: ImportRow[] = jsonData.map((row) => ({
        empresa: row['Empresa'] || row['empresa'] || '',
        contato: row['Nome do responsável'] || row['Nome do Responsável'] || row['contato'] || row['Contato'] || '',
        email: (row['Email'] || row['email'] || '').replace(/[<>]/g, '').trim(),
        telefone: row['Telefone'] || row['telefone'] || '',
      })).filter(row => row.empresa && row.contato);

      setData(parsedData);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.');
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
            segmento: 'Outros',
            porte: 'media',
            cidade: 'Não informado',
            estado: 'RJ',
            status: 'prospect',
          })
          .select()
          .single();

        if (companyError) throw companyError;

        // Create contact
        const { error: contactError } = await supabase
          .from('contacts')
          .insert({
            company_id: company.id,
            nome: row.contato.replace(/,/g, '').trim(),
            cargo: 'Responsável',
            email: cleanEmail(row.email),
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 50).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.empresa}</TableCell>
                      <TableCell>{row.contato}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell className="text-muted-foreground">{row.telefone}</TableCell>
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
