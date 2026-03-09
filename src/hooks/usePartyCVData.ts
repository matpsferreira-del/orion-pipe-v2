import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CVExperienceRow {
  id: string;
  party_id: string;
  company: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  description: string | null;
  created_at: string | null;
}

export interface CVSkillRow {
  id: string;
  party_id: string;
  skill: string;
  level: string | null;
  category: string | null;
  created_at: string | null;
}

export interface CVEducationRow {
  id: string;
  party_id: string;
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
}

export interface PartyCVSummary {
  parsed_summary: string | null;
  total_exp_years: number | null;
  cv_parse_status: string | null;
  cv_parsed_at: string | null;
}

export function usePartyCVData(partyId: string | undefined) {
  const experiencesQuery = useQuery({
    queryKey: ['cv-experiences', partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cv_experiences')
        .select('*')
        .eq('party_id', partyId!)
        .order('is_current', { ascending: false })
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as CVExperienceRow[];
    },
    enabled: !!partyId,
  });

  const skillsQuery = useQuery({
    queryKey: ['cv-skills', partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cv_skills')
        .select('*')
        .eq('party_id', partyId!)
        .order('category', { ascending: true });
      if (error) throw error;
      return data as CVSkillRow[];
    },
    enabled: !!partyId,
  });

  const educationQuery = useQuery({
    queryKey: ['cv-education', partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cv_education')
        .select('*')
        .eq('party_id', partyId!)
        .order('end_date', { ascending: false });
      if (error) throw error;
      return data as CVEducationRow[];
    },
    enabled: !!partyId,
  });

  const summaryQuery = useQuery({
    queryKey: ['party-cv-summary', partyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('party')
        .select('parsed_summary, total_exp_years, cv_parse_status, cv_parsed_at')
        .eq('id', partyId!)
        .single();
      if (error) throw error;
      return data as PartyCVSummary;
    },
    enabled: !!partyId,
  });

  return {
    experiences: experiencesQuery.data || [],
    skills: skillsQuery.data || [],
    education: educationQuery.data || [],
    summary: summaryQuery.data,
    isLoading: experiencesQuery.isLoading || skillsQuery.isLoading || educationQuery.isLoading || summaryQuery.isLoading,
  };
}
