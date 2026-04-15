import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUploadFinancialDocument, useFinancialDocuments, useDeleteFinancialDocument } from '@/hooks/useFinancialDocuments';
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

interface DocumentUploadProps {
  transactionId?: string;
  onExtracted?: (data: Record<string, any>) => void;
  compact?: boolean;
}

export function DocumentUpload({ transactionId, onExtracted, compact = false }: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadFinancialDocument();
  const deleteMutation = useDeleteFinancialDocument();
  const { data: documents = [] } = useFinancialDocuments(transactionId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      return;
    }

    // AI will auto-detect the type
    const result = await uploadMutation.mutateAsync({
      file,
      documentType: 'nf', // placeholder, AI will classify
      transactionId,
    });

    if (result.extractedData && onExtracted) {
      onExtracted(result.extractedData);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from('financial-documents')
      .createSignedUrl(filePath, 300);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {uploadMutation.isPending ? 'Processando...' : 'Upload NF/Boleto'}
          </Button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
        </div>

        {documents.length > 0 && (
          <div className="space-y-1">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                <span className="truncate flex-1">{doc.file_name}</span>
                <Badge variant="outline" className="text-[10px] px-1">
                  {docTypeLabels[doc.document_type] || doc.document_type}
                </Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDownload(doc.file_path, doc.file_name)}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Upload de Documento Financeiro
      </h3>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 max-w-xs"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processando com IA...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar PDF (NF ou Boleto)
            </>
          )}
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
      </div>

      <p className="text-xs text-muted-foreground">
        A IA identifica automaticamente se é nota fiscal ou boleto, e classifica como receita, custo ou despesa.
      </p>

      {uploadMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Extraindo e classificando documento com inteligência artificial...
        </div>
      )}

      {/* Extracted data preview */}
      {uploadMutation.data?.extractedData && Object.keys(uploadMutation.data.extractedData).length > 0 && (
        <div className="bg-success/5 border border-success/20 rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" />
            Dados extraídos automaticamente
          </div>
          <div className="flex items-center gap-2 mb-2">
            {uploadMutation.data.extractedData.document_type && (
              <Badge variant="outline" className="text-xs">
                {docTypeLabels[uploadMutation.data.extractedData.document_type] || uploadMutation.data.extractedData.document_type}
              </Badge>
            )}
            {uploadMutation.data.extractedData.classificacao && (
              <Badge variant="outline" className={classificacaoLabels[uploadMutation.data.extractedData.classificacao]?.className || ''}>
                {classificacaoLabels[uploadMutation.data.extractedData.classificacao]?.label || uploadMutation.data.extractedData.classificacao}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {uploadMutation.data.extractedData.numero_documento && (
              <div>
                <span className="text-muted-foreground">Nº Documento:</span>{' '}
                <span className="font-medium">{uploadMutation.data.extractedData.numero_documento}</span>
              </div>
            )}
            {uploadMutation.data.extractedData.valor && (
              <div>
                <span className="text-muted-foreground">Valor:</span>{' '}
                <span className="font-medium">{formatCurrency(uploadMutation.data.extractedData.valor)}</span>
              </div>
            )}
            {uploadMutation.data.extractedData.cnpj_emitente && (
              <div>
                <span className="text-muted-foreground">CNPJ Emitente:</span>{' '}
                <span className="font-medium">{uploadMutation.data.extractedData.cnpj_emitente}</span>
              </div>
            )}
            {uploadMutation.data.extractedData.razao_social_emitente && (
              <div>
                <span className="text-muted-foreground">Emitente:</span>{' '}
                <span className="font-medium">{uploadMutation.data.extractedData.razao_social_emitente}</span>
              </div>
            )}
            {uploadMutation.data.extractedData.data_vencimento && (
              <div>
                <span className="text-muted-foreground">Vencimento:</span>{' '}
                <span className="font-medium">
                  {new Date(uploadMutation.data.extractedData.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {uploadMutation.data.extractedData.descricao_servico && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Descrição:</span>{' '}
                <span className="font-medium">{uploadMutation.data.extractedData.descricao_servico}</span>
              </div>
            )}
            {uploadMutation.data.extractedData.numero_po && (
              <div>
                <span className="text-muted-foreground">P.O.:</span>{' '}
                <span className="font-medium">{uploadMutation.data.extractedData.numero_po}</span>
              </div>
            )}
          </div>
          {/* Show individual items if multiple */}
          {uploadMutation.data.extractedData.itens && uploadMutation.data.extractedData.itens.length > 1 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {uploadMutation.data.extractedData.itens.length} itens identificados — cada um será criado como lançamento separado
              </p>
              {uploadMutation.data.extractedData.itens.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-background/50 rounded px-2 py-1 text-xs">
                  <span className="truncate flex-1">{item.descricao}</span>
                  <span className="font-medium ml-2 whitespace-nowrap">{formatCurrency(item.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase">Documentos Anexados</h4>
          {documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 bg-muted/30 rounded-md px-3 py-2">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {docTypeLabels[doc.document_type] || doc.document_type}
                  </Badge>
                  {doc.numero_documento && <span>Nº {doc.numero_documento}</span>}
                  {doc.valor_documento && <span>{formatCurrency(doc.valor_documento)}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc.file_path, doc.file_name)}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => deleteMutation.mutate({ id: doc.id, filePath: doc.file_path })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
