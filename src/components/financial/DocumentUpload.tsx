import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUploadFinancialDocument } from '@/hooks/useFinancialDocuments';
import { Upload, FileText, Loader2, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const classificacaoLabels: Record<string, { label: string; className: string }> = {
  receita: { label: 'Receita', className: 'bg-success/10 text-success border-success/20' },
  custo: { label: 'Custo', className: 'bg-warning/10 text-warning border-warning/20' },
  despesa: { label: 'Despesa', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  deducao: { label: 'Dedução', className: 'bg-muted text-muted-foreground' },
};

const docTypeLabels: Record<string, string> = {
  nf: 'Nota Fiscal',
  boleto: 'Boleto',
};

export interface UploadedDoc {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  extractedData: Record<string, any>;
}

interface DocumentUploadProps {
  transactionId?: string;
  onExtracted?: (data: Record<string, any>) => void;
  onBulkExtracted?: (docs: UploadedDoc[]) => void;
  compact?: boolean;
}

export function DocumentUpload({ transactionId, onExtracted, onBulkExtracted, compact = false }: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadFinancialDocument();
  const [sessionDocs, setSessionDocs] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) return;

    setUploading(true);
    const newDocs: UploadedDoc[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setUploadProgress(`Processando ${i + 1} de ${pdfFiles.length}: ${file.name}`);

      try {
        const result = await uploadMutation.mutateAsync({
          file,
          documentType: 'nf',
          transactionId,
        });

        const docRecord = result.document as any;
        const doc: UploadedDoc = {
          id: docRecord?.id || crypto.randomUUID(),
          file_name: file.name,
          file_path: docRecord?.file_path || '',
          document_type: result.extractedData?.document_type || 'nf',
          extractedData: result.extractedData || {},
        };
        newDocs.push(doc);

        // For single file, call onExtracted for backward compat
        if (pdfFiles.length === 1 && result.extractedData && onExtracted) {
          onExtracted(result.extractedData);
        }
      } catch (err) {
        console.error('Upload error for', file.name, err);
      }
    }

    setSessionDocs(prev => [...prev, ...newDocs]);

    // For multiple files, call onBulkExtracted
    if (pdfFiles.length > 1 && onBulkExtracted && newDocs.length > 0) {
      onBulkExtracted(newDocs);
    }

    setUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('financial-documents')
      .createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleRemoveDoc = (docId: string) => {
    setSessionDocs(prev => prev.filter(d => d.id !== docId));
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {uploading ? 'Processando...' : 'Upload NF/Boleto'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {uploading && uploadProgress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {uploadProgress}
          </div>
        )}

        {sessionDocs.length > 0 && (
          <div className="space-y-1">
            {sessionDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="truncate flex-1">{doc.file_name}</span>
                <Badge variant="outline" className="text-[10px] px-1">
                  {docTypeLabels[doc.document_type] || doc.document_type}
                </Badge>
                {doc.file_path && (
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDownload(doc.file_path)}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveDoc(doc.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full (non-compact) mode
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Upload de Documento Financeiro
      </h3>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 max-w-xs"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processando com IA...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar PDFs (NF ou Boleto)
            </>
          )}
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFileSelect} />
      </div>

      <p className="text-xs text-muted-foreground">
        Selecione um ou mais PDFs. A IA identifica automaticamente o tipo e classifica cada documento.
      </p>

      {uploading && uploadProgress && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {uploadProgress}
        </div>
      )}

      {sessionDocs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">
            Documentos desta sessão ({sessionDocs.length})
          </h4>
          {sessionDocs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 bg-muted/30 rounded-md px-3 py-2">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {docTypeLabels[doc.document_type] || doc.document_type}
                  </Badge>
                  {doc.extractedData?.classificacao && (
                    <Badge variant="outline" className={classificacaoLabels[doc.extractedData.classificacao]?.className || ''}>
                      {classificacaoLabels[doc.extractedData.classificacao]?.label || doc.extractedData.classificacao}
                    </Badge>
                  )}
                  {doc.extractedData?.valor && <span>{formatCurrency(doc.extractedData.valor)}</span>}
                </div>
              </div>
              {doc.file_path && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc.file_path)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveDoc(doc.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
