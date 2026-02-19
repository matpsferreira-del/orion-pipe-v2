import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Party, PartyRole, PartyDuplicateSuggestion, PartyCreatedFrom, PartyRoleType } from '@/types/party';
import { useToast } from '@/hooks/use-toast';

// Fetch all active parties
export function useParties(filters?: { 
  role?: PartyRoleType; 
  search?: string;
  status?: Party['status'];
  createdFrom?: PartyCreatedFrom;
}) {
  return useQuery({
    queryKey: ['parties', filters],
    queryFn: async () => {
      let query = supabase
        .from('party')
        .select(`
          *,
          party_role (*)
        `)
        .order('full_name', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.neq('status', 'merged');
      }

      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email_norm.ilike.%${filters.search}%,phone_raw.ilike.%${filters.search}%,city.ilike.%${filters.search}%,state.ilike.%${filters.search}%,headline.ilike.%${filters.search}%,linkedin_url.ilike.%${filters.search}%`);
      }

      if (filters?.createdFrom) {
        query = query.eq('created_from', filters.createdFrom);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Filter by role if specified
      let result = data as (Party & { party_role: PartyRole[] })[];
      
      if (filters?.role) {
        result = result.filter(p => 
          p.party_role?.some(r => r.role === filters.role)
        );
      }

      return result;
    },
  });
}

// Fetch a single party by ID
export function useParty(partyId: string | undefined) {
  return useQuery({
    queryKey: ['party', partyId],
    queryFn: async () => {
      if (!partyId) return null;
      
      const { data, error } = await supabase
        .from('party')
        .select(`
          *,
          party_role (*),
          party_identity (*)
        `)
        .eq('id', partyId)
        .single();
      
      if (error) throw error;
      return data as Party & { party_role: PartyRole[] };
    },
    enabled: !!partyId,
  });
}

// Create a new party
export function useCreateParty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (party: {
      full_name: string;
      email_raw?: string;
      phone_raw?: string;
      linkedin_url?: string;
      headline?: string;
      city?: string;
      state?: string;
      tags?: string[];
      notes?: string;
      created_from: PartyCreatedFrom;
      roles?: PartyRoleType[];
    }) => {
      const { roles, ...partyData } = party;
      
      const { data, error } = await supabase
        .from('party')
        .insert({
          ...partyData,
          tags: partyData.tags || [],
        })
        .select()
        .single();
      
      if (error) throw error;

      // Add roles if specified
      if (roles && roles.length > 0) {
        const roleInserts = roles.map(role => ({
          party_id: data.id,
          role,
        }));

        const { error: roleError } = await supabase
          .from('party_role')
          .insert(roleInserts);

        if (roleError) throw roleError;
      }

      return data as Party;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      toast({
        title: 'Pessoa criada',
        description: 'Registro criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar pessoa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update a party
export function useUpdateParty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<Party> & { id: string }) => {
      const { data, error } = await supabase
        .from('party')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Party;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', data.id] });
      toast({
        title: 'Pessoa atualizada',
        description: 'Registro atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar pessoa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Add role to party
export function useAddPartyRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      partyId, 
      role,
      confidence = 100 
    }: { 
      partyId: string; 
      role: PartyRoleType;
      confidence?: number;
    }) => {
      const { data, error } = await supabase
        .from('party_role')
        .upsert({
          party_id: partyId,
          role,
          confidence,
        }, {
          onConflict: 'party_id,role',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as PartyRole;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', variables.partyId] });
      toast({
        title: 'Papel adicionado',
        description: 'Papel adicionado à pessoa.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar papel',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Remove role from party
export function useRemovePartyRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      partyId, 
      role 
    }: { 
      partyId: string; 
      role: PartyRoleType;
    }) => {
      const { error } = await supabase
        .from('party_role')
        .delete()
        .eq('party_id', partyId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['party', variables.partyId] });
      toast({
        title: 'Papel removido',
        description: 'Papel removido da pessoa.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover papel',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Fetch duplicate suggestions
export function useDuplicateSuggestions() {
  return useQuery({
    queryKey: ['duplicate-suggestions'],
    queryFn: async () => {
      // First get the suggestions
      const { data: suggestions, error } = await supabase
        .from('party_duplicate_suggestion')
        .select('*')
        .eq('status', 'open')
        .order('confidence', { ascending: false });
      
      if (error) throw error;
      if (!suggestions || suggestions.length === 0) return [];

      // Get all unique party IDs
      const partyIds = [...new Set([
        ...suggestions.map(s => s.party_id_a),
        ...suggestions.map(s => s.party_id_b),
      ])];

      // Fetch all parties at once
      const { data: parties } = await supabase
        .from('party')
        .select('*')
        .in('id', partyIds);

      const partyMap = new Map((parties || []).map(p => [p.id, p]));

      // Map suggestions with parties
      return suggestions.map(s => ({
        ...s,
        party_a: partyMap.get(s.party_id_a) as Party | undefined,
        party_b: partyMap.get(s.party_id_b) as Party | undefined,
      })) as PartyDuplicateSuggestion[];
    },
  });
}

// Dismiss duplicate suggestion
export function useDismissDuplicate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from('party_duplicate_suggestion')
        .update({ 
          status: 'dismissed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-suggestions'] });
      toast({
        title: 'Duplicata descartada',
        description: 'A sugestão foi marcada como não duplicada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao descartar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Merge parties
export function useMergeParties() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      survivorId, 
      mergedId,
      suggestionId,
      note 
    }: { 
      survivorId: string; 
      mergedId: string;
      suggestionId?: string;
      note?: string;
    }) => {
      // Get current user profile for audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Get both parties for field resolution
      const { data: parties } = await supabase
        .from('party')
        .select('*')
        .in('id', [survivorId, mergedId]);

      const survivor = parties?.find(p => p.id === survivorId);
      const merged = parties?.find(p => p.id === mergedId);

      if (!survivor || !merged) throw new Error('Parties não encontradas');

      // Update contacts that reference the merged party
      const { error: contactsError } = await supabase
        .from('contacts')
        .update({ party_id: survivorId })
        .eq('party_id', mergedId);

      if (contactsError) throw contactsError;

      // Move roles from merged to survivor
      const { data: mergedRoles } = await supabase
        .from('party_role')
        .select('role, confidence')
        .eq('party_id', mergedId);

      if (mergedRoles && mergedRoles.length > 0) {
        for (const role of mergedRoles) {
          await supabase
            .from('party_role')
            .upsert({
              party_id: survivorId,
              role: role.role,
              confidence: role.confidence,
            }, {
              onConflict: 'party_id,role',
            });
        }
      }

      // Move identities from merged to survivor
      await supabase
        .from('party_identity')
        .update({ party_id: survivorId })
        .eq('party_id', mergedId);

      // Mark merged party as merged
      const { error: updateError } = await supabase
        .from('party')
        .update({ 
          status: 'merged',
          merged_into_party_id: survivorId,
        })
        .eq('id', mergedId);

      if (updateError) throw updateError;

      // Update survivor with any missing data from merged
      const updates: Partial<Party> = {};
      if (!survivor.email_raw && merged.email_raw) updates.email_raw = merged.email_raw;
      if (!survivor.phone_raw && merged.phone_raw) updates.phone_raw = merged.phone_raw;
      if (!survivor.linkedin_url && merged.linkedin_url) updates.linkedin_url = merged.linkedin_url;
      if (!survivor.headline && merged.headline) updates.headline = merged.headline;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('party')
          .update(updates)
          .eq('id', survivorId);
      }

      // Create merge log
      const { error: logError } = await supabase
        .from('party_merge_log')
        .insert({
          survivor_party_id: survivorId,
          merged_party_id: mergedId,
          merged_by_user_id: profile.id,
          field_resolution: { survivor, merged, updates },
          note,
        });

      if (logError) throw logError;

      // Update suggestion if provided
      if (suggestionId) {
        await supabase
          .from('party_duplicate_suggestion')
          .update({ 
            status: 'merged',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', suggestionId);
      }

      return survivorId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-suggestions'] });
      toast({
        title: 'Pessoas mescladas',
        description: 'Os registros foram unificados com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao mesclar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Resolve party (find or create)
export function useResolveParty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      full_name: string;
      email?: string;
      phone?: string;
      linkedin_url?: string;
      city?: string;
      state?: string;
      created_from?: PartyCreatedFrom;
      headline?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('resolve_party', {
          p_full_name: params.full_name,
          p_email: params.email || null,
          p_phone: params.phone || null,
          p_linkedin_url: params.linkedin_url || null,
          p_city: params.city || null,
          p_state: params.state || null,
          p_created_from: params.created_from || 'crm',
          p_headline: params.headline || null,
          p_notes: params.notes || null,
        });

      if (error) throw error;
      return data as string; // Returns party ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] });
    },
  });
}
