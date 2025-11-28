import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as ProfileRow[];
    },
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ProfileRow | null;
    },
    enabled: !!userId,
  });
}
