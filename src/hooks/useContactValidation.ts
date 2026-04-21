import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContactSuggestion {
  contact_id: string;
  name: string;
  linkedin_url?: string | null;
  original: { current_position: string | null; company_name: string | null };
  suggested: { current_position: string | null; company_name: string | null };
  reason: string;
}

interface ContactInput {
  id: string;
  name: string;
  current_position: string | null;
  company_name: string | null;
  linkedin_url?: string | null;
}

export function useValidateContacts() {
  return useMutation({
    mutationFn: async (contacts: ContactInput[]): Promise<ContactSuggestion[]> => {
      const { data, error } = await supabase.functions.invoke('validate-contacts', {
        body: { contacts },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.suggestions || [];
    },
    onError: (e: any) => {
      toast.error(e.message || 'Erro ao validar contatos');
    },
  });
}
