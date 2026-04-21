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
      application_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_stage_id: string | null
          from_status: Database["public"]["Enums"]["application_status"] | null
          id: string
          note: string | null
          to_stage_id: string | null
          to_status: Database["public"]["Enums"]["application_status"] | null
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          note?: string | null
          to_stage_id?: string | null
          to_status?: Database["public"]["Enums"]["application_status"] | null
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          note?: string | null
          to_stage_id?: string | null
          to_status?: Database["public"]["Enums"]["application_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "application_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "job_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "job_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          id: string
          job_id: string
          notes: string | null
          party_id: string
          rating: number | null
          salary_expectation: number | null
          source: string
          stage_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id: string
          notes?: string | null
          party_id: string
          rating?: number | null
          salary_expectation?: number | null
          source?: string
          stage_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          party_id?: string
          rating?: number | null
          salary_expectation?: number | null
          source?: string
          stage_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_triggers: {
        Row: {
          created_at: string
          id: string
          location: string | null
          search_term: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          search_term?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          search_term?: string | null
          status?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          conta_contabil: string
          created_at: string | null
          id: string
          ordem: number | null
          pacote: string
          sub_pacote: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          conta_contabil: string
          created_at?: string | null
          id?: string
          ordem?: number | null
          pacote: string
          sub_pacote?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          conta_contabil?: string
          created_at?: string | null
          id?: string
          ordem?: number | null
          pacote?: string
          sub_pacote?: string | null
          tipo?: string
        }
        Relationships: []
      }
      commercial_strategy_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_strategy_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_strategy_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_strategy_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          notes: string | null
          party_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          notes?: string | null
          party_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          notes?: string | null
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_strategy_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "commercial_strategy_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_strategy_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
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
          parent_company_id: string | null
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
          parent_company_id?: string | null
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
          parent_company_id?: string | null
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
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      cv_education: {
        Row: {
          created_at: string | null
          degree: string | null
          end_date: string | null
          field_of_study: string | null
          id: string
          institution: string | null
          party_id: string
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          degree?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          party_id: string
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          degree?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          party_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_education_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_experiences: {
        Row: {
          company: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          party_id: string
          role: string | null
          start_date: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          party_id: string
          role?: string | null
          start_date?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          party_id?: string
          role?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cv_experiences_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_skills: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          level: string | null
          party_id: string
          skill: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          party_id: string
          skill: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          party_id?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_skills_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          body: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipients: Json
          sender_email: string
          sender_user_id: string
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipients?: Json
          sender_email: string
          sender_user_id: string
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipients?: Json
          sender_email?: string
          sender_user_id?: string
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string
          id: string
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      financial_documents: {
        Row: {
          cnpj_emitente: string | null
          created_at: string
          data_vencimento: string | null
          document_type: string
          extracted_data: Json | null
          file_name: string
          file_path: string
          file_size: number | null
          financial_transaction_id: string | null
          id: string
          numero_documento: string | null
          updated_at: string
          valor_documento: number | null
        }
        Insert: {
          cnpj_emitente?: string | null
          created_at?: string
          data_vencimento?: string | null
          document_type?: string
          extracted_data?: Json | null
          file_name: string
          file_path: string
          file_size?: number | null
          financial_transaction_id?: string | null
          id?: string
          numero_documento?: string | null
          updated_at?: string
          valor_documento?: number | null
        }
        Update: {
          cnpj_emitente?: string | null
          created_at?: string
          data_vencimento?: string | null
          document_type?: string
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          financial_transaction_id?: string | null
          id?: string
          numero_documento?: string | null
          updated_at?: string
          valor_documento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          conta_contabil: string
          created_at: string | null
          data_pagamento: string | null
          data_referencia: string
          data_vencimento: string
          debito_automatico: boolean
          deleted_at: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: string
          invoice_id: string | null
          job_id: string | null
          pacote: string
          recorrencia_meses: number | null
          recorrente: boolean | null
          reembolso: boolean
          reembolso_status: string | null
          responsavel_id: string | null
          status: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          conta_contabil: string
          created_at?: string | null
          data_pagamento?: string | null
          data_referencia: string
          data_vencimento: string
          debito_automatico?: boolean
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          pacote: string
          recorrencia_meses?: number | null
          recorrente?: boolean | null
          reembolso?: boolean
          reembolso_status?: string | null
          responsavel_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          conta_contabil?: string
          created_at?: string | null
          data_pagamento?: string | null
          data_referencia?: string
          data_vencimento?: string
          debito_automatico?: boolean
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          pacote?: string
          recorrencia_meses?: number | null
          recorrente?: boolean | null
          reembolso?: boolean
          reembolso_status?: string | null
          responsavel_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_tokens: {
        Row: {
          access_token: string
          created_at: string
          gmail_email: string | null
          id: string
          refresh_token: string
          token_expiry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          gmail_email?: string | null
          id?: string
          refresh_token: string
          token_expiry: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          gmail_email?: string | null
          id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      job_contract_milestones: {
        Row: {
          created_at: string
          description: string | null
          financial_transaction_id: string | null
          id: string
          job_id: string
          milestone_type: Database["public"]["Enums"]["contract_milestone_type"]
          percentage: number | null
          rpo_cycle_month: string | null
          status: Database["public"]["Enums"]["milestone_status"]
          triggered_at: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          financial_transaction_id?: string | null
          id?: string
          job_id: string
          milestone_type: Database["public"]["Enums"]["contract_milestone_type"]
          percentage?: number | null
          rpo_cycle_month?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          triggered_at?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          financial_transaction_id?: string | null
          id?: string
          job_id?: string
          milestone_type?: Database["public"]["Enums"]["contract_milestone_type"]
          percentage?: number | null
          rpo_cycle_month?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
          triggered_at?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_contract_milestones_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_contract_milestones_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          job_id: string
          name: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          job_id: string
          name: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          job_id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_pipeline_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          cidade: string | null
          company: string
          created_at: string
          estado: string | null
          id: string
          search_term: string
          source: string
          title: string
          url: string
        }
        Insert: {
          cidade?: string | null
          company: string
          created_at?: string
          estado?: string | null
          id?: string
          search_term: string
          source: string
          title: string
          url: string
        }
        Update: {
          cidade?: string | null
          company?: string
          created_at?: string
          estado?: string | null
          id?: string
          search_term?: string
          source?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      job_questions: {
        Row: {
          created_at: string
          id: string
          job_id: string
          options: Json | null
          position: number
          question_text: string
          question_type: string
          required: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          options?: Json | null
          position?: number
          question_text: string
          question_type?: string
          required?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          options?: Json | null
          position?: number
          question_text?: string
          question_type?: string
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          admission_date: string | null
          area: string | null
          bonus_anual_final: number | null
          bonus_anual_meta: number | null
          closing_candidate_id: string | null
          closing_notes: string | null
          closing_salary: number | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          fee_percentual: number | null
          filled_at: string | null
          garantia_dias: number | null
          id: string
          job_code: number | null
          location: string | null
          modelo_contrato: Database["public"]["Enums"]["contract_model"] | null
          opportunity_id: string | null
          outplacement_perc_inicio: number | null
          outplacement_perc_sucesso: number | null
          priority: string
          published: boolean
          published_at: string | null
          requirements: string | null
          responsavel_id: string | null
          retainer_marco_1: string | null
          retainer_marco_2: string | null
          retainer_marco_3: string | null
          retainer_parcelas: string | null
          retainer_perc_1: number | null
          retainer_perc_2: number | null
          retainer_perc_3: number | null
          rpo_custo_consultor_complexo: number | null
          rpo_custo_consultor_inicial: number | null
          rpo_custo_consultor_medio: number | null
          rpo_duracao_meses: number | null
          rpo_media_vagas_mes: number | null
          rpo_vagas_complexas_mes: number | null
          rpo_vagas_iniciais_mes: number | null
          rpo_vagas_medias_mes: number | null
          rpo_valor_mensal_cliente: number | null
          salario_meta: number | null
          salary_max: number | null
          salary_min: number | null
          slug: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          veiculo_proprio: boolean | null
        }
        Insert: {
          admission_date?: string | null
          area?: string | null
          bonus_anual_final?: number | null
          bonus_anual_meta?: number | null
          closing_candidate_id?: string | null
          closing_notes?: string | null
          closing_salary?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          fee_percentual?: number | null
          filled_at?: string | null
          garantia_dias?: number | null
          id?: string
          job_code?: number | null
          location?: string | null
          modelo_contrato?: Database["public"]["Enums"]["contract_model"] | null
          opportunity_id?: string | null
          outplacement_perc_inicio?: number | null
          outplacement_perc_sucesso?: number | null
          priority?: string
          published?: boolean
          published_at?: string | null
          requirements?: string | null
          responsavel_id?: string | null
          retainer_marco_1?: string | null
          retainer_marco_2?: string | null
          retainer_marco_3?: string | null
          retainer_parcelas?: string | null
          retainer_perc_1?: number | null
          retainer_perc_2?: number | null
          retainer_perc_3?: number | null
          rpo_custo_consultor_complexo?: number | null
          rpo_custo_consultor_inicial?: number | null
          rpo_custo_consultor_medio?: number | null
          rpo_duracao_meses?: number | null
          rpo_media_vagas_mes?: number | null
          rpo_vagas_complexas_mes?: number | null
          rpo_vagas_iniciais_mes?: number | null
          rpo_vagas_medias_mes?: number | null
          rpo_valor_mensal_cliente?: number | null
          salario_meta?: number | null
          salary_max?: number | null
          salary_min?: number | null
          slug?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          veiculo_proprio?: boolean | null
        }
        Update: {
          admission_date?: string | null
          area?: string | null
          bonus_anual_final?: number | null
          bonus_anual_meta?: number | null
          closing_candidate_id?: string | null
          closing_notes?: string | null
          closing_salary?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          fee_percentual?: number | null
          filled_at?: string | null
          garantia_dias?: number | null
          id?: string
          job_code?: number | null
          location?: string | null
          modelo_contrato?: Database["public"]["Enums"]["contract_model"] | null
          opportunity_id?: string | null
          outplacement_perc_inicio?: number | null
          outplacement_perc_sucesso?: number | null
          priority?: string
          published?: boolean
          published_at?: string | null
          requirements?: string | null
          responsavel_id?: string | null
          retainer_marco_1?: string | null
          retainer_marco_2?: string | null
          retainer_marco_3?: string | null
          retainer_parcelas?: string | null
          retainer_perc_1?: number | null
          retainer_perc_2?: number | null
          retainer_perc_3?: number | null
          rpo_custo_consultor_complexo?: number | null
          rpo_custo_consultor_inicial?: number | null
          rpo_custo_consultor_medio?: number | null
          rpo_duracao_meses?: number | null
          rpo_media_vagas_mes?: number | null
          rpo_vagas_complexas_mes?: number | null
          rpo_vagas_iniciais_mes?: number | null
          rpo_vagas_medias_mes?: number | null
          rpo_valor_mensal_cliente?: number | null
          salario_meta?: number | null
          salary_max?: number | null
          salary_min?: number | null
          slug?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          veiculo_proprio?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_closing_candidate_id_fkey"
            columns: ["closing_candidate_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          data_previsao_fechamento: string
          id: string
          motivo_rejeicao: string | null
          observacoes: string | null
          origem_lead: string
          outplacement_party_id: string | null
          probabilidade: number
          proposal_exclusivity: string | null
          proposal_fee: string | null
          proposal_fee_p1: string | null
          proposal_fee_p2: string | null
          proposal_fee_p3: string | null
          proposal_guarantee: string | null
          proposal_payment_model: string | null
          proposal_retainer_type: string | null
          proposal_sla: string | null
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
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          data_previsao_fechamento: string
          id?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          origem_lead?: string
          outplacement_party_id?: string | null
          probabilidade?: number
          proposal_exclusivity?: string | null
          proposal_fee?: string | null
          proposal_fee_p1?: string | null
          proposal_fee_p2?: string | null
          proposal_fee_p3?: string | null
          proposal_guarantee?: string | null
          proposal_payment_model?: string | null
          proposal_retainer_type?: string | null
          proposal_sla?: string | null
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
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          data_previsao_fechamento?: string
          id?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          origem_lead?: string
          outplacement_party_id?: string | null
          probabilidade?: number
          proposal_exclusivity?: string | null
          proposal_fee?: string | null
          proposal_fee_p1?: string | null
          proposal_fee_p2?: string | null
          proposal_fee_p3?: string | null
          proposal_guarantee?: string | null
          proposal_payment_model?: string | null
          proposal_retainer_type?: string | null
          proposal_sla?: string | null
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
            foreignKeyName: "opportunities_outplacement_party_id_fkey"
            columns: ["outplacement_party_id"]
            isOneToOne: false
            referencedRelation: "party"
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
      opportunity_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          opportunity_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          opportunity_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          opportunity_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_attachments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          observacao: string | null
          opportunity_id: string
          resolution_note: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          observacao?: string | null
          opportunity_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_by_user_id?: string
          mentioned_user_id?: string
          observacao?: string | null
          opportunity_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_mentions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      outplacement_activities: {
        Row: {
          activity_date: string
          activity_type: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          project_id: string
          title: string
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id: string
          title: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "outplacement_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outplacement_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outplacement_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "outplacement_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      outplacement_contacts: {
        Row: {
          ai_validated_at: string | null
          city: string | null
          company_name: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          current_position: string | null
          email: string | null
          id: string
          kanban_stage: string
          linkedin_url: string | null
          name: string
          notes: string | null
          party_id: string | null
          pathly_synced_at: string | null
          phone: string | null
          project_id: string
          state: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          ai_validated_at?: string | null
          city?: string | null
          company_name?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          current_position?: string | null
          email?: string | null
          id?: string
          kanban_stage?: string
          linkedin_url?: string | null
          name: string
          notes?: string | null
          party_id?: string | null
          pathly_synced_at?: string | null
          phone?: string | null
          project_id: string
          state?: string | null
          tier?: string
          updated_at?: string
        }
        Update: {
          ai_validated_at?: string | null
          city?: string | null
          company_name?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          current_position?: string | null
          email?: string | null
          id?: string
          kanban_stage?: string
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          party_id?: string | null
          pathly_synced_at?: string | null
          phone?: string | null
          project_id?: string
          state?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outplacement_contacts_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outplacement_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "outplacement_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      outplacement_market_jobs: {
        Row: {
          applied_at: string | null
          company_name: string
          created_at: string
          created_by: string | null
          id: string
          job_title: string
          job_url: string | null
          location: string | null
          notes: string | null
          pathly_synced_at: string | null
          project_id: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_title: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          pathly_synced_at?: string | null
          project_id: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          job_title?: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          pathly_synced_at?: string | null
          project_id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outplacement_market_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "outplacement_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      outplacement_projects: {
        Row: {
          cidade: string | null
          cidades_interesse: Json | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          estado: string | null
          id: string
          modelo_trabalho: string | null
          notes: string | null
          opportunity_id: string | null
          party_id: string | null
          pathly_plan_id: string | null
          pathly_synced_at: string | null
          preferencia_regiao: string | null
          project_type: string
          responsavel_id: string | null
          situacao_atual: string | null
          start_date: string | null
          status: string
          target_industry: string | null
          target_location: string | null
          target_role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cidades_interesse?: Json | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          estado?: string | null
          id?: string
          modelo_trabalho?: string | null
          notes?: string | null
          opportunity_id?: string | null
          party_id?: string | null
          pathly_plan_id?: string | null
          pathly_synced_at?: string | null
          preferencia_regiao?: string | null
          project_type?: string
          responsavel_id?: string | null
          situacao_atual?: string | null
          start_date?: string | null
          status?: string
          target_industry?: string | null
          target_location?: string | null
          target_role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cidades_interesse?: Json | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          estado?: string | null
          id?: string
          modelo_trabalho?: string | null
          notes?: string | null
          opportunity_id?: string | null
          party_id?: string | null
          pathly_plan_id?: string | null
          pathly_synced_at?: string | null
          preferencia_regiao?: string | null
          project_type?: string
          responsavel_id?: string | null
          situacao_atual?: string | null
          start_date?: string | null
          status?: string
          target_industry?: string | null
          target_location?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outplacement_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outplacement_projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outplacement_projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outplacement_projects_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
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
          current_company: string | null
          current_title: string | null
          cv_parse_status: string | null
          cv_parsed_at: string | null
          email_norm: string | null
          email_raw: string | null
          full_name: string
          headline: string | null
          id: string
          linkedin_url: string | null
          merged_into_party_id: string | null
          notes: string | null
          parsed_summary: string | null
          phone_e164: string | null
          phone_raw: string | null
          photo_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["party_status"]
          tags: Json | null
          total_exp_years: number | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_from: Database["public"]["Enums"]["party_created_from"]
          current_company?: string | null
          current_title?: string | null
          cv_parse_status?: string | null
          cv_parsed_at?: string | null
          email_norm?: string | null
          email_raw?: string | null
          full_name: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          merged_into_party_id?: string | null
          notes?: string | null
          parsed_summary?: string | null
          phone_e164?: string | null
          phone_raw?: string | null
          photo_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["party_status"]
          tags?: Json | null
          total_exp_years?: number | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          created_from?: Database["public"]["Enums"]["party_created_from"]
          current_company?: string | null
          current_title?: string | null
          cv_parse_status?: string | null
          cv_parsed_at?: string | null
          email_norm?: string | null
          email_raw?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          merged_into_party_id?: string | null
          notes?: string | null
          parsed_summary?: string | null
          phone_e164?: string | null
          phone_raw?: string | null
          photo_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["party_status"]
          tags?: Json | null
          total_exp_years?: number | null
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
      questionnaire_responses: {
        Row: {
          answer_option: Json | null
          answer_text: string | null
          application_id: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          answer_option?: Json | null
          answer_text?: string | null
          application_id: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          answer_option?: Json | null
          answer_text?: string | null
          application_id?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "job_questions"
            referencedColumns: ["id"]
          },
        ]
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
      find_similar_companies: {
        Args: { similarity_threshold?: number }
        Returns: {
          company_cidade_a: string
          company_cidade_b: string
          company_estado_a: string
          company_estado_b: string
          company_id_a: string
          company_id_b: string
          company_name_a: string
          company_name_b: string
          company_status_a: string
          company_status_b: string
          similarity_score: number
        }[]
      }
      get_application_counts_by_job: {
        Args: never
        Returns: {
          count: number
          job_id: string
        }[]
      }
      get_company_counts: {
        Args: never
        Returns: {
          company_id: string
          contacts_count: number
          opportunities_count: number
        }[]
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
      merge_companies: {
        Args: { merged_id: string; survivor_id: string }
        Returns: undefined
      }
      merge_exact_duplicate_companies: {
        Args: never
        Returns: {
          merged_count: number
          merged_name: string
          survivor_id: string
        }[]
      }
      normalize_email: { Args: { raw_email: string }; Returns: string }
      normalize_phone_br: { Args: { raw_phone: string }; Returns: string }
      resolve_party:
        | {
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
        | {
            Args: {
              p_city?: string
              p_created_from?: Database["public"]["Enums"]["party_created_from"]
              p_current_company?: string
              p_current_title?: string
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "gestor" | "consultor"
      application_status:
        | "new"
        | "screening"
        | "interviewing"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn"
      contract_milestone_type:
        | "abertura_vaga"
        | "envio_shortlist"
        | "finalizacao_vaga"
        | "inicio_outplacement"
        | "sucesso_outplacement"
        | "rpo_ciclo_mensal"
        | "ajuste_reconciliacao"
      contract_model:
        | "sucesso_mensal"
        | "sucesso_anual"
        | "retainer_mensal"
        | "retainer_anual"
        | "rpo"
        | "outplacement_mentoria"
        | "outplacement_sem_mentoria"
      duplicate_reason: "same_email" | "same_phone" | "similar_name" | "manual"
      duplicate_status: "open" | "dismissed" | "merged"
      job_status: "draft" | "open" | "paused" | "filled" | "cancelled"
      milestone_status: "previsto" | "a_receber" | "recebido" | "cancelado"
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
      application_status: [
        "new",
        "screening",
        "interviewing",
        "offer",
        "hired",
        "rejected",
        "withdrawn",
      ],
      contract_milestone_type: [
        "abertura_vaga",
        "envio_shortlist",
        "finalizacao_vaga",
        "inicio_outplacement",
        "sucesso_outplacement",
        "rpo_ciclo_mensal",
        "ajuste_reconciliacao",
      ],
      contract_model: [
        "sucesso_mensal",
        "sucesso_anual",
        "retainer_mensal",
        "retainer_anual",
        "rpo",
        "outplacement_mentoria",
        "outplacement_sem_mentoria",
      ],
      duplicate_reason: ["same_email", "same_phone", "similar_name", "manual"],
      duplicate_status: ["open", "dismissed", "merged"],
      job_status: ["draft", "open", "paused", "filled", "cancelled"],
      milestone_status: ["previsto", "a_receber", "recebido", "cancelado"],
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
