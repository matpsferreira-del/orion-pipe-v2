export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          company_id: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          opportunity_id: string | null
          titulo: string
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          opportunity_id?: string | null
          titulo: string
          type?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          opportunity_id?: string | null
          titulo?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cidade: string
          cnpj: string
          created_at: string
          estado: string
          id: string
          nome_fantasia: string
          porte: string
          razao_social: string
          responsavel_id: string | null
          segmento: string
          site: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cidade: string
          cnpj: string
          created_at?: string
          estado: string
          id?: string
          nome_fantasia: string
          porte?: string
          razao_social: string
          responsavel_id?: string | null
          segmento: string
          site?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          cnpj?: string
          created_at?: string
          estado?: string
          id?: string
          nome_fantasia?: string
          porte?: string
          razao_social?: string
          responsavel_id?: string | null
          segmento?: string
          site?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          cargo: string
          company_id: string
          created_at: string
          email: string
          id: string
          is_primary: boolean | null
          linkedin: string | null
          nome: string
          observacoes: string | null
          party_id: string | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          cargo: string
          company_id: string
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean | null
          linkedin?: string | null
          nome: string
          observacoes?: string | null
          party_id?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          cargo?: string
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean | null
          linkedin?: string | null
          nome?: string
          observacoes?: string | null
          party_id?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cnpj_cliente: string
          company_id: string
          created_at: string
          data_emissao: string
          data_vencimento: string
          descricao_servico: string
          forma_pagamento: string
          id: string
          numero_nota: string
          opportunity_id: string | null
          status: string
          valor: number
        }
        Insert: {
          cnpj_cliente: string
          company_id: string
          created_at?: string
          data_emissao: string
          data_vencimento: string
          descricao_servico: string
          forma_pagamento?: string
          id?: string
          numero_nota: string
          opportunity_id?: string | null
          status?: string
          valor?: number
        }
        Update: {
          cnpj_cliente?: string
          company_id?: string
          created_at?: string
          data_emissao?: string
          data_vencimento?: string
          descricao_servico?: string
          forma_pagamento?: string
          id?: string
          numero_nota?: string
          opportunity_id?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          data_previsao_fechamento: string
          id: string
          observacoes: string | null
          origem_lead: string
          probabilidade: number
          responsavel_id: string
          spin_implicacao_impacto: string | null
          spin_implicacao_perda: string | null
          spin_necessidade_cenario: string | null
          spin_necessidade_urgencia: string | null
          spin_problema_dificuldades: string | null
          spin_problema_tempo_medio: string | null
          spin_situacao_como_contrata: string | null
          spin_situacao_time_interno: string | null
          stage: string
          tipo_servico: string
          updated_at: string
          valor_potencial: number
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          data_previsao_fechamento: string
          id?: string
          observacoes?: string | null
          origem_lead?: string
          probabilidade?: number
          responsavel_id: string
          spin_implicacao_impacto?: string | null
          spin_implicacao_perda?: string | null
          spin_necessidade_cenario?: string | null
          spin_necessidade_urgencia?: string | null
          spin_problema_dificuldades?: string | null
          spin_problema_tempo_medio?: string | null
          spin_situacao_como_contrata?: string | null
          spin_situacao_time_interno?: string | null
          stage?: string
          tipo_servico?: string
          updated_at?: string
          valor_potencial?: number
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          data_previsao_fechamento?: string
          id?: string
          observacoes?: string | null
          origem_lead?: string
          probabilidade?: number
          responsavel_id?: string
          spin_implicacao_impacto?: string | null
          spin_implicacao_perda?: string | null
          spin_necessidade_cenario?: string | null
          spin_necessidade_urgencia?: string | null
          spin_problema_dificuldades?: string | null
          spin_problema_tempo_medio?: string | null
          spin_situacao_como_contrata?: string | null
          spin_situacao_time_interno?: string | null
          stage?: string
          tipo_servico?: string
          updated_at?: string
          valor_potencial?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          created_from: Database["public"]["Enums"]["party_created_from"]
          email_norm: string | null
          email_raw: string | null
          full_name: string
          headline: string | null
          id: string
          linkedin_url: string | null
          merged_into_party_id: string | null
          notes: string | null
          phone_e164: string | null
          phone_raw: string | null
          state: string | null
          status: Database["public"]["Enums"]["party_status"]
          tags: Json | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_from: Database["public"]["Enums"]["party_created_from"]
          email_norm?: string | null
          email_raw?: string | null
          full_name: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          merged_into_party_id?: string | null
          notes?: string | null
          phone_e164?: string | null
          phone_raw?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["party_status"]
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_from?: Database["public"]["Enums"]["party_created_from"]
          email_norm?: string | null
          email_raw?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          merged_into_party_id?: string | null
          notes?: string | null
          phone_e164?: string | null
          phone_raw?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["party_status"]
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_merged_into_party_id_fkey"
            columns: ["merged_into_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      party_duplicate_suggestion: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          party_id_a: string
          party_id_b: string
          reason: Database["public"]["Enums"]["duplicate_reason"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["duplicate_status"]
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          party_id_a: string
          party_id_b: string
          reason: Database["public"]["Enums"]["duplicate_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["duplicate_status"]
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          party_id_a?: string
          party_id_b?: string
          reason?: Database["public"]["Enums"]["duplicate_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["duplicate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "party_duplicate_suggestion_party_id_a_fkey"
            columns: ["party_id_a"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_duplicate_suggestion_party_id_b_fkey"
            columns: ["party_id_b"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_duplicate_suggestion_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_duplicate_suggestion_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_identity: {
        Row: {
          created_at: string
          id: string
          identity_type: string
          is_primary: boolean | null
          party_id: string
          value_norm: string
          value_raw: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity_type: string
          is_primary?: boolean | null
          party_id: string
          value_norm: string
          value_raw: string
        }
        Update: {
          created_at?: string
          id?: string
          identity_type?: string
          is_primary?: boolean | null
          party_id?: string
          value_norm?: string
          value_raw?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_identity_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      party_merge_log: {
        Row: {
          created_at: string
          field_resolution: Json
          id: string
          merged_by_user_id: string
          merged_party_id: string
          note: string | null
          survivor_party_id: string
        }
        Insert: {
          created_at?: string
          field_resolution?: Json
          id?: string
          merged_by_user_id: string
          merged_party_id: string
          note?: string | null
          survivor_party_id: string
        }
        Update: {
          created_at?: string
          field_resolution?: Json
          id?: string
          merged_by_user_id?: string
          merged_party_id?: string
          note?: string | null
          survivor_party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_merge_log_merged_by_user_id_fkey"
            columns: ["merged_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_merge_log_merged_by_user_id_fkey"
            columns: ["merged_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_merge_log_survivor_party_id_fkey"
            columns: ["survivor_party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      party_role: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          notes: string | null
          party_id: string
          role: Database["public"]["Enums"]["party_role_type"]
          since_date: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          party_id: string
          role: Database["public"]["Enums"]["party_role_type"]
          since_date?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          party_id?: string
          role?: Database["public"]["Enums"]["party_role_type"]
          since_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_role_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          company_id: string | null
          created_at: string
          descricao: string | null
          due_date: string
          id: string
          opportunity_id: string | null
          priority: string
          responsavel_id: string
          status: string
          titulo: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          due_date: string
          id?: string
          opportunity_id?: string | null
          priority?: string
          responsavel_id: string
          status?: string
          titulo: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          due_date?: string
          id?: string
          opportunity_id?: string | null
          priority?: string
          responsavel_id?: string
          status?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_access: {
        Row: {
          access_level: string
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          access_level?: string
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          access_level?: string
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar: string | null
          id: string | null
          name: string | null
          role: string | null
        }
        Insert: {
          avatar?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Update: {
          avatar?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_party_role: {
        Args: {
          p_confidence?: number
          p_party_id: string
          p_role: Database["public"]["Enums"]["party_role_type"]
        }
        Returns: string
      }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_profile_id: { Args: { _user_id: string }; Returns: string }
      has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_email: { Args: { raw_email: string }; Returns: string }
      normalize_phone_br: { Args: { raw_phone: string }; Returns: string }
      resolve_party: {
        Args: {
          p_city?: string
          p_created_from?: Database["public"]["Enums"]["party_created_from"]
          p_email?: string
          p_full_name: string
          p_headline?: string
          p_linkedin_url?: string
          p_notes?: string
          p_phone?: string
          p_state?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "consultor"
      duplicate_reason: "same_email" | "same_phone" | "similar_name" | "manual"
      duplicate_status: "open" | "dismissed" | "merged"
      party_created_from: "crm" | "ats" | "site" | "import" | "api"
      party_role_type:
        | "candidate"
        | "client_contact"
        | "prospect"
        | "hiring_manager"
        | "interviewer"
        | "alumni"
        | "vendor"
      party_status: "active" | "inactive" | "merged" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "consultor"],
      duplicate_reason: ["same_email", "same_phone", "similar_name", "manual"],
      duplicate_status: ["open", "dismissed", "merged"],
      party_created_from: ["crm", "ats", "site", "import", "api"],
      party_role_type: [
        "candidate",
        "client_contact",
        "prospect",
        "hiring_manager",
        "interviewer",
        "alumni",
        "vendor",
      ],
      party_status: ["active", "inactive", "merged", "blocked"],
    },
  },
} as const
