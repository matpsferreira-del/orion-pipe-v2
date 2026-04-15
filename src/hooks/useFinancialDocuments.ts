import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FinancialDocument {
  id: string;
  financial_transaction_id: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  extracted_data: Record<string, any>;
  numero_documento: string | null;
  valor_documento: number | null;
  cnpj_emitente: string | null;
  data_vencimento: string | null;
  created_at: string;
  updated_at: string;
}

export function useFinancialDocuments(transactionId?: string) {
  return useQuery({
    queryKey: ['financial_documents', transactionId],
    queryFn: async () => {
      let query = supabase
        .from('financial_documents' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (transactionId) {
        query = query.eq('financial_transaction_id', transactionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as FinancialDocument[];
    },
  });
}

export function useUploadFinancialDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      documentType,
      transactionId,
    }: {
      file: File;
      documentType: 'nf' | 'boleto';
      transactionId?: string;
    }) => {
      // 1. Upload file to storage
      const timestamp = Date.now();
      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('financial-documents')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw new Error('Erro ao fazer upload: ' + uploadError.message);

      // 2. Extract data with AI
      let extractedData: Record<string, any> = {};
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'extract-financial-doc',
          { body: { file_path: filePath, document_type: documentType } }
        );

        if (fnError) {
          console.error('AI extraction error:', fnError);
        } else if (fnData?.extracted) {
          extractedData = fnData.extracted;
        }
      } catch (e) {
        console.error('AI extraction failed:', e);
      }

      // 3. Save document record
      const { data: doc, error: insertError } = await supabase
        .from('financial_documents' as any)
        .insert({
          financial_transaction_id: transactionId || null,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          extracted_data: extractedData,
          numero_documento: extractedData.numero_documento || null,
          valor_documento: extractedData.valor || null,
          cnpj_emitente: extractedData.cnpj_emitente || null,
          data_vencimento: extractedData.data_vencimento || null,
        } as any)
        .select()
        .single();

      if (insertError) throw new Error('Erro ao salvar documento: ' + insertError.message);

      return { document: doc, extractedData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_documents'] });
      toast.success('Documento processado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao processar documento');
    },
  });
}

export function useLinkDocumentToTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, transactionId }: { documentId: string; transactionId: string }) => {
      const { error } = await supabase
        .from('financial_documents' as any)
        .update({ financial_transaction_id: transactionId } as any)
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_documents'] });
      toast.success('Documento vinculado ao lançamento!');
    },
    onError: (error: any) => {
      toast.error('Erro ao vincular: ' + error.message);
    },
  });
}

export function useDeleteFinancialDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      // Delete from storage
      await supabase.storage.from('financial-documents').remove([filePath]);
      // Delete record
      const { error } = await supabase
        .from('financial_documents' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial_documents'] });
      toast.success('Documento excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });
}
