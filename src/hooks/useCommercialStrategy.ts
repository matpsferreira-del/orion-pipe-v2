import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCommercialStrategy() {
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['commercial-strategy-groups'],
    queryFn: async () => {
      const { data: groupsData, error } = await supabase
        .from('commercial_strategy_groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get member counts
      const { data: members } = await supabase
        .from('commercial_strategy_members')
        .select('group_id');

      const counts: Record<string, number> = {};
      members?.forEach((m: any) => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });

      return groupsData.map((g: any) => ({ ...g, member_count: counts[g.id] || 0 }));
    },
  });

  const createGroup = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const { error } = await supabase.from('commercial_strategy_groups').insert(data);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commercial-strategy-groups'] }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('commercial_strategy_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commercial-strategy-groups'] }),
  });

  return { groups, isLoading, createGroup, deleteGroup };
}

export function useStrategyGroupMembers(groupId: string) {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['strategy-group-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_strategy_members')
        .select('*, party(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const addMember = useMutation({
    mutationFn: async (data: { group_id: string; party_id: string; notes?: string }) => {
      const { error } = await supabase.from('commercial_strategy_members').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['commercial-strategy-groups'] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('commercial_strategy_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy-group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['commercial-strategy-groups'] });
    },
  });

  return { members, isLoading, addMember, removeMember };
}
