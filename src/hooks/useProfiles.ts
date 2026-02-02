import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Public profile data (limited fields for display purposes)
export interface PublicProfileRow {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

// Full profile data (only accessible for own profile or by admins/gestors)
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

// Hook to fetch public profile data (name, avatar, role only) - safe for all authenticated users
export function usePublicProfiles() {
  return useQuery({
    queryKey: ['public-profiles'],
    queryFn: async () => {
      // Query the public_profiles view which only exposes safe fields
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as PublicProfileRow[];
    },
  });
}

// Hook to fetch all profiles - only works for admins/gestors due to RLS
export function useProfiles() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        // If access denied, fall back to public profiles
        if (error.code === 'PGRST116' || error.message.includes('permission')) {
          console.warn('Full profiles access denied, user may not have admin/gestor role');
          return [] as ProfileRow[];
        }
        throw error;
      }
      return data as ProfileRow[];
    },
    enabled: !!user,
  });
}

// Hook to fetch a single profile by user_id - works for own profile or for admins/gestors
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

// Hook to fetch the current user's own profile
export function useCurrentUserProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ProfileRow | null;
    },
    enabled: !!user?.id,
  });
}
