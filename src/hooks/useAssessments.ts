import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSendEmail } from './useSendEmail';
import { toast } from 'sonner';

const DISC_TEST_BASE = 'https://disc-test-drab.vercel.app';

export function getDiscLink(token: string) {
  return `${DISC_TEST_BASE}/?token=${token}`;
}

export function getPersonalitiesLink(token: string) {
  return `${DISC_TEST_BASE}/personalities.html?token=${token}`;
}

export interface DiscResult {
  id: string;
  primary_profile: string | null;
  secondary_profile: string | null;
  combo_title: string | null;
  padrao_classico: string | null;
  estrutural_d: number | null;
  estrutural_i: number | null;
  estrutural_s: number | null;
  estrutural_c: number | null;
}

export interface DiscInvitation {
  id: string;
  token: string;
  party_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  disc_results: DiscResult[] | null;
}

export interface PersonalitiesResult {
  id: string;
  tipo: string | null;
  tipo_completo: string | null;
  nome_tipo: string | null;
  grupo: string | null;
  temperamento: string | null;
}

export interface PersonalitiesInvitation {
  id: string;
  token: string;
  party_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  personalities_results: PersonalitiesResult[] | null;
}

export interface PartyAssessmentsData {
  disc: DiscInvitation[];
  personalities: PersonalitiesInvitation[];
}

export function usePartyAssessments(partyId: string | null | undefined) {
  return useQuery<PartyAssessmentsData>({
    queryKey: ['party-assessments', partyId],
    enabled: !!partyId,
    queryFn: async () => {
      const [discRes, ptRes] = await Promise.all([
        supabase
          .from('disc_invitations')
          .select('id, token, party_id, candidate_name, candidate_email, completed, created_at, completed_at, disc_results(id, primary_profile, secondary_profile, combo_title, padrao_classico, estrutural_d, estrutural_i, estrutural_s, estrutural_c)')
          .eq('party_id', partyId!)
          .order('created_at', { ascending: false }),
        supabase
          .from('personalities_invitations')
          .select('id, token, party_id, candidate_name, candidate_email, completed, created_at, completed_at, personalities_results(id, tipo, tipo_completo, nome_tipo, grupo, temperamento)')
          .eq('party_id', partyId!)
          .order('created_at', { ascending: false }),
      ]);
      if (discRes.error) throw discRes.error;
      if (ptRes.error) throw ptRes.error;
      return {
        disc: (discRes.data ?? []) as unknown as DiscInvitation[],
        personalities: (ptRes.data ?? []) as unknown as PersonalitiesInvitation[],
      };
    },
  });
}

export function useAllAssessments() {
  return useQuery<PartyAssessmentsData>({
    queryKey: ['all-assessments'],
    queryFn: async () => {
      const [discRes, ptRes] = await Promise.all([
        supabase
          .from('disc_invitations')
          .select('id, token, party_id, candidate_name, candidate_email, completed, created_at, completed_at, disc_results(id, primary_profile, secondary_profile, combo_title, padrao_classico, estrutural_d, estrutural_i, estrutural_s, estrutural_c)')
          .order('created_at', { ascending: false }),
        supabase
          .from('personalities_invitations')
          .select('id, token, party_id, candidate_name, candidate_email, completed, created_at, completed_at, personalities_results(id, tipo, tipo_completo, nome_tipo, grupo, temperamento)')
          .order('created_at', { ascending: false }),
      ]);
      if (discRes.error) throw discRes.error;
      if (ptRes.error) throw ptRes.error;
      return {
        disc: (discRes.data ?? []) as unknown as DiscInvitation[],
        personalities: (ptRes.data ?? []) as unknown as PersonalitiesInvitation[],
      };
    },
  });
}

interface CreateInvitationParams {
  party_id: string | null;
  candidate_name: string;
  candidate_email: string | null;
}

export function useCreateDiscInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateInvitationParams): Promise<DiscInvitation> => {
      const { data, error } = await supabase
        .from('disc_invitations')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DiscInvitation;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-assessments'] });
      if (variables.party_id) {
        queryClient.invalidateQueries({ queryKey: ['party-assessments', variables.party_id] });
      }
    },
  });
}

export function useCreatePersonalitiesInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateInvitationParams): Promise<PersonalitiesInvitation> => {
      const { data, error } = await supabase
        .from('personalities_invitations')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PersonalitiesInvitation;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-assessments'] });
      if (variables.party_id) {
        queryClient.invalidateQueries({ queryKey: ['party-assessments', variables.party_id] });
      }
    },
  });
}

interface SendAssessmentLinkParams {
  type: 'DISC' | 'PT';
  invitation: DiscInvitation | PersonalitiesInvitation;
  candidateName: string;
  candidateEmail: string;
}

export function useSendAssessmentLink() {
  const sendEmail = useSendEmail();
  return useMutation({
    mutationFn: async ({ type, invitation, candidateName, candidateEmail }: SendAssessmentLinkParams) => {
      const link = type === 'DISC' ? getDiscLink(invitation.token) : getPersonalitiesLink(invitation.token);
      const testName = type === 'DISC' ? 'DISC' : '16 Tipos de Personalidade';
      await sendEmail.mutateAsync({
        recipients: [candidateEmail],
        subject: `Convite para avaliação ${testName}`,
        html_body: `
          <p>Olá, <strong>${candidateName}</strong>!</p>
          <p>Você foi convidado para realizar o teste de perfil comportamental <strong>${testName}</strong>.</p>
          <p>Clique no link abaixo para iniciar:</p>
          <p><a href="${link}" style="color:#6366f1;font-weight:bold;">${link}</a></p>
          <p>O link é válido por 30 dias.</p>
          <br/>
          <p>Equipe Orion</p>
        `,
        silent: true,
      });
      toast.success(`Link ${testName} enviado para ${candidateEmail}`);
    },
  });
}
