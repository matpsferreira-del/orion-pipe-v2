import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SimilarCompanyPair {
  company_id_a: string;
  company_name_a: string;
  company_cidade_a: string;
  company_estado_a: string;
  company_status_a: string;
  company_id_b: string;
  company_name_b: string;
  company_cidade_b: string;
  company_estado_b: string;
  company_status_b: string;
  similarity_score: number;
}

export interface CompanyGroup {
  id: string; // group identifier
  companies: {
    id: string;
    name: string;
    cidade: string;
    estado: string;
    status: string;
  }[];
  maxSimilarity: number;
}

function buildGroups(pairs: SimilarCompanyPair[]): CompanyGroup[] {
  // Union-find to group companies connected by similarity
  const parent: Record<string, string> = {};
  const find = (x: string): string => {
    if (!parent[x]) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a: string, b: string) => {
    parent[find(a)] = find(b);
  };

  const companyData: Record<string, { id: string; name: string; cidade: string; estado: string; status: string }> = {};
  const groupSimilarity: Record<string, number> = {};

  for (const pair of pairs) {
    union(pair.company_id_a, pair.company_id_b);
    companyData[pair.company_id_a] = {
      id: pair.company_id_a,
      name: pair.company_name_a,
      cidade: pair.company_cidade_a,
      estado: pair.company_estado_a,
      status: pair.company_status_a,
    };
    companyData[pair.company_id_b] = {
      id: pair.company_id_b,
      name: pair.company_name_b,
      cidade: pair.company_cidade_b,
      estado: pair.company_estado_b,
      status: pair.company_status_b,
    };
  }

  const groups: Record<string, Set<string>> = {};
  for (const id of Object.keys(companyData)) {
    const root = find(id);
    if (!groups[root]) groups[root] = new Set();
    groups[root].add(id);
  }

  // Calculate max similarity per group
  for (const pair of pairs) {
    const root = find(pair.company_id_a);
    groupSimilarity[root] = Math.max(groupSimilarity[root] || 0, pair.similarity_score);
  }

  return Object.entries(groups)
    .filter(([, ids]) => ids.size > 1)
    .map(([root, ids]) => ({
      id: root,
      companies: Array.from(ids).map(id => companyData[id]).sort((a, b) => a.name.localeCompare(b.name)),
      maxSimilarity: groupSimilarity[root] || 0,
    }))
    .sort((a, b) => b.maxSimilarity - a.maxSimilarity);
}

export function useCompanyDuplicates() {
  return useQuery({
    queryKey: ['company-duplicates'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_similar_companies', {
        similarity_threshold: 0.4,
      });
      if (error) throw error;
      return buildGroups((data || []) as unknown as SimilarCompanyPair[]);
    },
  });
}

export function useMergeCompanies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ survivorId, mergedIds }: { survivorId: string; mergedIds: string[] }) => {
      for (const mergedId of mergedIds) {
        const { error } = await supabase.rpc('merge_companies', {
          survivor_id: survivorId,
          merged_id: mergedId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Empresas mescladas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao mesclar empresas: ' + error.message);
    },
  });
}
