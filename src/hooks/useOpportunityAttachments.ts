import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OpportunityAttachment {
  id: string;
  opportunity_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useOpportunityAttachments(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ['opportunity-attachments', opportunityId],
    enabled: !!opportunityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunity_attachments')
        .select('*')
        .eq('opportunity_id', opportunityId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OpportunityAttachment[];
    },
  });
}

export function useUploadOpportunityAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, file, uploadedBy }: { opportunityId: string; file: File; uploadedBy?: string }) => {
      const safeName = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${opportunityId}/${Date.now()}_${safeName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('opportunity-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('opportunity_attachments')
        .insert({
          opportunity_id: opportunityId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: uploadedBy || null,
        });
      if (dbError) throw dbError;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-attachments', vars.opportunityId] });
      toast.success('Arquivo enviado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar arquivo: ' + error.message);
    },
  });
}

export function useDeleteOpportunityAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, opportunityId }: { id: string; filePath: string; opportunityId: string }) => {
      await supabase.storage.from('opportunity-attachments').remove([filePath]);
      const { error } = await supabase.from('opportunity_attachments').delete().eq('id', id);
      if (error) throw error;
      return opportunityId;
    },
    onSuccess: (opportunityId) => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-attachments', opportunityId] });
      toast.success('Arquivo removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover arquivo: ' + error.message);
    },
  });
}

export function getAttachmentUrl(filePath: string) {
  const { data } = supabase.storage.from('opportunity-attachments').getPublicUrl(filePath);
  return data.publicUrl;
}
