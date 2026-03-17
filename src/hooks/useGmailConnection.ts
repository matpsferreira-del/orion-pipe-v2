import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGmailConnection() {
  const [connected, setConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: null,
        headers: { 'Content-Type': 'application/json' },
      });

      // Use query param approach — invoke with GET-like params via URL
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=status`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      setConnected(result.connected);
      setGmailEmail(result.gmail_email);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const startAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Faça login primeiro.'); return; }

      const redirectUri = `${window.location.origin}/configuracoes?gmail_callback=true`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=get-auth-url&redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error('Erro ao gerar URL de autorização.');
      }
    } catch {
      toast.error('Erro ao iniciar autorização Gmail.');
    }
  }, []);

  const handleCallback = useCallback(async (code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const redirectUri = `${window.location.origin}/configuracoes?gmail_callback=true`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=callback`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setConnected(true);
        setGmailEmail(data.gmail_email);
        toast.success(`Gmail conectado: ${data.gmail_email}`);
        return true;
      } else {
        toast.error('Erro ao conectar Gmail.');
        return false;
      }
    } catch {
      toast.error('Erro ao processar callback.');
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-auth?action=disconnect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      setConnected(false);
      setGmailEmail(null);
      toast.success('Gmail desconectado.');
    } catch {
      toast.error('Erro ao desconectar.');
    }
  }, []);

  return { connected, gmailEmail, loading, startAuth, handleCallback, disconnect, checkStatus };
}
