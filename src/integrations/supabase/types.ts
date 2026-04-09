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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_generations: {
        Row: {
          alternative_codes: Json | null
          completion_tokens: number | null
          confidence_scores: Json | null
          created_at: string | null
          generation_time_ms: number | null
          id: string
          model_used: string | null
          note_id: string | null
          prompt_tokens: number | null
          reasoning: Json | null
          user_id: string
        }
        Insert: {
          alternative_codes?: Json | null
          completion_tokens?: number | null
          confidence_scores?: Json | null
          created_at?: string | null
          generation_time_ms?: number | null
          id?: string
          model_used?: string | null
          note_id?: string | null
          prompt_tokens?: number | null
          reasoning?: Json | null
          user_id: string
        }
        Update: {
          alternative_codes?: Json | null
          completion_tokens?: number | null
          confidence_scores?: Json | null
          created_at?: string | null
          generation_time_ms?: number | null
          id?: string
          model_used?: string | null
          note_id?: string | null
          prompt_tokens?: number | null
          reasoning?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics: {
        Row: {
          avg_generation_time_ms: number | null
          consults_count: number | null
          created_at: string
          date: string
          id: string
          notes_count: number | null
          total_rvu: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_generation_time_ms?: number | null
          consults_count?: number | null
          created_at?: string
          date?: string
          id?: string
          notes_count?: number | null
          total_rvu?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_generation_time_ms?: number | null
          consults_count?: number | null
          created_at?: string
          date?: string
          id?: string
          notes_count?: number | null
          total_rvu?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing_outcomes: {
        Row: {
          ai_reasoning: string | null
          ai_risk_score: number | null
          cpt_codes: string[]
          created_at: string | null
          denial_reason: string | null
          em_level: string | null
          encounter_date: string
          encounter_type: string | null
          icd10_codes: string[]
          id: string
          modifiers: string[] | null
          outcome: string | null
          payer_type: string | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          ai_risk_score?: number | null
          cpt_codes: string[]
          created_at?: string | null
          denial_reason?: string | null
          em_level?: string | null
          encounter_date: string
          encounter_type?: string | null
          icd10_codes: string[]
          id?: string
          modifiers?: string[] | null
          outcome?: string | null
          payer_type?: string | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          ai_risk_score?: number | null
          cpt_codes?: string[]
          created_at?: string | null
          denial_reason?: string | null
          em_level?: string | null
          encounter_date?: string
          encounter_type?: string | null
          icd10_codes?: string[]
          id?: string
          modifiers?: string[] | null
          outcome?: string | null
          payer_type?: string | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_records: {
        Row: {
          applied_modifiers: Json | null
          cpt_codes: string[] | null
          created_at: string
          denial_risk_factors: Json | null
          denial_risk_score: number | null
          em_level: string | null
          encounter_type: string | null
          facility: string | null
          icd10_codes: string[] | null
          id: string
          is_telehealth: boolean | null
          mdm_complexity: string | null
          note_id: string
          place_of_service: string | null
          referring_npi: string | null
          referring_provider: string | null
          rvu: number | null
          status: string | null
          submitted_at: string | null
          user_id: string
          validation_status: Json | null
        }
        Insert: {
          applied_modifiers?: Json | null
          cpt_codes?: string[] | null
          created_at?: string
          denial_risk_factors?: Json | null
          denial_risk_score?: number | null
          em_level?: string | null
          encounter_type?: string | null
          facility?: string | null
          icd10_codes?: string[] | null
          id?: string
          is_telehealth?: boolean | null
          mdm_complexity?: string | null
          note_id: string
          place_of_service?: string | null
          referring_npi?: string | null
          referring_provider?: string | null
          rvu?: number | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
          validation_status?: Json | null
        }
        Update: {
          applied_modifiers?: Json | null
          cpt_codes?: string[] | null
          created_at?: string
          denial_risk_factors?: Json | null
          denial_risk_score?: number | null
          em_level?: string | null
          encounter_type?: string | null
          facility?: string | null
          icd10_codes?: string[] | null
          id?: string
          is_telehealth?: boolean | null
          mdm_complexity?: string | null
          note_id?: string
          place_of_service?: string | null
          referring_npi?: string | null
          referring_provider?: string | null
          rvu?: number | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
          validation_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          cpt_code: string
          cpt_description: string | null
          created_at: string | null
          date_of_service: string
          diagnosis: string | null
          encounter_type: string | null
          facility: string | null
          id: string
          is_telehealth: boolean | null
          modifiers: string[] | null
          patient_dob: string | null
          patient_mrn: string | null
          patient_name: string
          place_of_service: string | null
          referring_npi: string | null
          referring_provider: string | null
          rvu: number | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cpt_code: string
          cpt_description?: string | null
          created_at?: string | null
          date_of_service: string
          diagnosis?: string | null
          encounter_type?: string | null
          facility?: string | null
          id?: string
          is_telehealth?: boolean | null
          modifiers?: string[] | null
          patient_dob?: string | null
          patient_mrn?: string | null
          patient_name: string
          place_of_service?: string | null
          referring_npi?: string | null
          referring_provider?: string | null
          rvu?: number | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cpt_code?: string
          cpt_description?: string | null
          created_at?: string | null
          date_of_service?: string
          diagnosis?: string | null
          encounter_type?: string | null
          facility?: string | null
          id?: string
          is_telehealth?: boolean | null
          modifiers?: string[] | null
          patient_dob?: string | null
          patient_mrn?: string | null
          patient_name?: string
          place_of_service?: string | null
          referring_npi?: string | null
          referring_provider?: string | null
          rvu?: number | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clinical_notes: {
        Row: {
          ai_confidence: Json | null
          assessment: string | null
          body_part: string | null
          chief_complaint: string | null
          clinical_indication: string | null
          comparison_studies: string | null
          created_at: string
          generated_note: string | null
          hpi: string | null
          id: string
          modality: string | null
          note_type: Database["public"]["Enums"]["note_type"]
          patient_id: string | null
          plan: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signed_at: string | null
          signed_by: string | null
          status: string | null
          structured_category: string | null
          technique: string | null
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: Json | null
          assessment?: string | null
          body_part?: string | null
          chief_complaint?: string | null
          clinical_indication?: string | null
          comparison_studies?: string | null
          created_at?: string
          generated_note?: string | null
          hpi?: string | null
          id?: string
          modality?: string | null
          note_type?: Database["public"]["Enums"]["note_type"]
          patient_id?: string | null
          plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          structured_category?: string | null
          technique?: string | null
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: Json | null
          assessment?: string | null
          body_part?: string | null
          chief_complaint?: string | null
          clinical_indication?: string | null
          comparison_studies?: string | null
          created_at?: string
          generated_note?: string | null
          hpi?: string | null
          id?: string
          modality?: string | null
          note_type?: Database["public"]["Enums"]["note_type"]
          patient_id?: string | null
          plan?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string | null
          structured_category?: string | null
          technique?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          billing_entity_name: string | null
          billing_entity_npi: string | null
          billing_entity_tax_id: string | null
          created_at: string | null
          facility_npi: string | null
          id: string
          is_default: boolean | null
          name: string
          nickname: string | null
          place_of_service_code: string | null
          tax_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          billing_entity_name?: string | null
          billing_entity_npi?: string | null
          billing_entity_tax_id?: string | null
          created_at?: string | null
          facility_npi?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          nickname?: string | null
          place_of_service_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          billing_entity_name?: string | null
          billing_entity_npi?: string | null
          billing_entity_tax_id?: string | null
          created_at?: string | null
          facility_npi?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          nickname?: string | null
          place_of_service_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean | null
          feature_key: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          enabled?: boolean | null
          feature_key: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          enabled?: boolean | null
          feature_key?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fee_schedule: {
        Row: {
          charge_amount: number
          cpt_code: string
          created_at: string | null
          description: string | null
          facility_id: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          charge_amount?: number
          cpt_code: string
          created_at?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          charge_amount?: number
          cpt_code?: string
          created_at?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_schedule_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_summaries: {
        Row: {
          active_medications: Json | null
          created_at: string | null
          id: string
          key_diagnoses: Json | null
          last_notes_summary: string | null
          last_updated: string | null
          note_count: number | null
          patient_id: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          active_medications?: Json | null
          created_at?: string | null
          id?: string
          key_diagnoses?: Json | null
          last_notes_summary?: string | null
          last_updated?: string | null
          note_count?: number | null
          patient_id?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          active_medications?: Json | null
          created_at?: string | null
          id?: string
          key_diagnoses?: Json | null
          last_notes_summary?: string | null
          last_updated?: string | null
          note_count?: number | null
          patient_id?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_summaries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          city: string | null
          created_at: string
          diagnosis: string | null
          dob: string | null
          facility_id: string
          hospital: string | null
          id: string
          insurance_group: string | null
          insurance_id: string | null
          insurance_name: string | null
          insurance_plan_type: string | null
          mrn: string | null
          name: string
          payer_id: string | null
          phone: string | null
          room: string | null
          sex: string | null
          state: string | null
          status: string
          subscriber_name: string | null
          subscriber_relationship: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          city?: string | null
          created_at?: string
          diagnosis?: string | null
          dob?: string | null
          facility_id: string
          hospital?: string | null
          id?: string
          insurance_group?: string | null
          insurance_id?: string | null
          insurance_name?: string | null
          insurance_plan_type?: string | null
          mrn?: string | null
          name: string
          payer_id?: string | null
          phone?: string | null
          room?: string | null
          sex?: string | null
          state?: string | null
          status?: string
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          city?: string | null
          created_at?: string
          diagnosis?: string | null
          dob?: string | null
          facility_id?: string
          hospital?: string | null
          id?: string
          insurance_group?: string | null
          insurance_id?: string | null
          insurance_name?: string | null
          insurance_plan_type?: string | null
          mrn?: string | null
          name?: string
          payer_id?: string | null
          phone?: string | null
          room?: string | null
          sex?: string | null
          state?: string | null
          status?: string
          subscriber_name?: string | null
          subscriber_relationship?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_address: string | null
          created_at: string
          full_name: string | null
          id: string
          npi_number: string | null
          place_of_service_default: string | null
          preferences: Json | null
          specialty: string | null
          tax_id: string | null
          taxonomy_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          npi_number?: string | null
          place_of_service_default?: string | null
          preferences?: Json | null
          specialty?: string | null
          tax_id?: string | null
          taxonomy_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          npi_number?: string | null
          place_of_service_default?: string | null
          preferences?: Json | null
          specialty?: string | null
          tax_id?: string | null
          taxonomy_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_activity_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_activity_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_activity_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deny_audit_modification: { Args: never; Returns: boolean }
      get_user_sessions_secure: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_activity_at: string
          user_agent: string
          user_id: string
        }[]
      }
      get_user_specialty: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "provider" | "user"
      note_type:
        | "hp"
        | "consult"
        | "progress"
        | "xray"
        | "ct"
        | "mri"
        | "ultrasound"
        | "mammography"
        | "fluoroscopy"
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
      app_role: ["admin", "provider", "user"],
      note_type: [
        "hp",
        "consult",
        "progress",
        "xray",
        "ct",
        "mri",
        "ultrasound",
        "mammography",
        "fluoroscopy",
      ],
    },
  },
} as const
