// Party Types for unified person model

export type PartyCreatedFrom = 'crm' | 'ats' | 'site' | 'import' | 'api';
export type PartyRoleType = 'candidate' | 'client_contact' | 'prospect' | 'hiring_manager' | 'interviewer' | 'alumni' | 'vendor';
export type PartyStatus = 'active' | 'inactive' | 'merged' | 'blocked';
export type DuplicateReason = 'same_email' | 'same_phone' | 'similar_name' | 'manual';
export type DuplicateStatus = 'open' | 'dismissed' | 'merged';

export interface Party {
  id: string;
  full_name: string;
  email_raw: string | null;
  email_norm: string | null;
  phone_raw: string | null;
  phone_e164: string | null;
  linkedin_url: string | null;
  headline: string | null;
  city: string | null;
  state: string | null;
  country: string;
  tags: string[];
  notes: string | null;
  status: PartyStatus;
  created_from: PartyCreatedFrom;
  merged_into_party_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartyRole {
  id: string;
  party_id: string;
  role: PartyRoleType;
  since_date: string | null;
  confidence: number;
  notes: string | null;
  created_at: string;
}

export interface PartyIdentity {
  id: string;
  party_id: string;
  identity_type: 'email' | 'phone' | 'cpf' | 'linkedin' | 'other';
  value_raw: string;
  value_norm: string;
  is_primary: boolean;
  created_at: string;
}

export interface PartyDuplicateSuggestion {
  id: string;
  party_id_a: string;
  party_id_b: string;
  reason: DuplicateReason;
  confidence: number;
  status: DuplicateStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined data
  party_a?: Party;
  party_b?: Party;
}

export interface PartyMergeLog {
  id: string;
  survivor_party_id: string;
  merged_party_id: string;
  merged_by_user_id: string;
  field_resolution: Record<string, unknown>;
  note: string | null;
  created_at: string;
}

// Helper to get role display name
export const partyRoleLabels: Record<PartyRoleType, string> = {
  candidate: 'Candidato',
  client_contact: 'Contato Cliente',
  prospect: 'Prospect',
  hiring_manager: 'Gestor de Contratação',
  interviewer: 'Entrevistador',
  alumni: 'Ex-funcionário',
  vendor: 'Fornecedor',
};

export const partyStatusLabels: Record<PartyStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  merged: 'Mesclado',
  blocked: 'Bloqueado',
};

export const duplicateReasonLabels: Record<DuplicateReason, string> = {
  same_email: 'Mesmo e-mail',
  same_phone: 'Mesmo telefone',
  similar_name: 'Nome similar',
  manual: 'Identificação manual',
};
