import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JobQuestion {
  id: string;
  job_id: string;
  question_text: string;
  question_type: 'text' | 'multiple_choice';
  options: string[] | null;
  position: number;
  required: boolean;
  created_at: string;
}

export function useJobQuestions(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-questions', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_questions')
        .select('*')
        .eq('job_id', jobId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return data as JobQuestion[];
    },
    enabled: !!jobId,
  });
}

export function useUpsertJobQuestions(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questions: Omit<JobQuestion, 'id' | 'created_at'>[]) => {
      // Delete existing questions then insert fresh
      await supabase.from('job_questions').delete().eq('job_id', jobId);

      if (questions.length === 0) return [];

      const { data, error } = await supabase
        .from('job_questions')
        .insert(questions.map((q, i) => ({ ...q, position: i, job_id: jobId })))
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-questions', jobId] });
    },
  });
}

export function useQuestionnaireResponses(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['questionnaire-responses', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questionnaire_responses')
        .select('*, job_questions(question_text, question_type, options)')
        .eq('application_id', applicationId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!applicationId,
  });
}
