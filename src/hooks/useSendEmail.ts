import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendEmailParams {
  recipients: string[];
  subject: string;
  html_body: string;
  template_id?: string;
  silent?: boolean;
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async ({ silent: _silent, ...params }: SendEmailParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gmail`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar email');
      return data;
    },
    onSuccess: (_data, variables) => {
      if (!variables.silent) toast.success('Email enviado com sucesso!');
    },
    onError: (err: Error, variables) => {
      if (!variables.silent) toast.error(err.message);
    },
  });
}
