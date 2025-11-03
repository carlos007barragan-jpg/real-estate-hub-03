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
      agents: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          answered_by: string | null
          call_sid: string
          created_at: string
          direction: string | null
          duration: number | null
          from_number: string
          id: string
          is_demo_data: boolean | null
          lead_id: string
          recording_duration: number | null
          recording_url: string | null
          status: string
          to_number: string
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_by?: string | null
          call_sid: string
          created_at?: string
          direction?: string | null
          duration?: number | null
          from_number: string
          id?: string
          is_demo_data?: boolean | null
          lead_id: string
          recording_duration?: number | null
          recording_url?: string | null
          status?: string
          to_number: string
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_by?: string | null
          call_sid?: string
          created_at?: string
          direction?: string | null
          duration?: number | null
          from_number?: string
          id?: string
          is_demo_data?: boolean | null
          lead_id?: string
          recording_duration?: number | null
          recording_url?: string | null
          status?: string
          to_number?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_settings: {
        Row: {
          auto_roundrobin_unanswered: boolean
          created_at: string
          enable_round_robin: boolean
          fallback_phone_1: string | null
          fallback_phone_2: string | null
          id: string
          last_assigned_agent_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_roundrobin_unanswered?: boolean
          created_at?: string
          enable_round_robin?: boolean
          fallback_phone_1?: string | null
          fallback_phone_2?: string | null
          id?: string
          last_assigned_agent_index?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_roundrobin_unanswered?: boolean
          created_at?: string
          enable_round_robin?: boolean
          fallback_phone_1?: string | null
          fallback_phone_2?: string | null
          id?: string
          last_assigned_agent_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_demo_data: boolean | null
          lead_id: string
          mime_type: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_demo_data?: boolean | null
          lead_id: string
          mime_type: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_demo_data?: boolean | null
          lead_id?: string
          mime_type?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_phone: string | null
          area: string | null
          assigned_to: string | null
          bathrooms: number | null
          bedrooms: number | null
          budget: string | null
          close_date: string | null
          commission: string | null
          created_at: string
          current_address: string | null
          down_payment: string | null
          email: string
          financing_type: string | null
          id: string
          is_demo_data: boolean | null
          is_inbound_call: boolean | null
          language_preference: string | null
          lead_lifecycle: string
          lead_temperature: string | null
          marital_status: string | null
          name: string
          phone: string
          pipeline: string | null
          pipeline_stage: string
          preferred_contact_method: string | null
          property_address: string | null
          property_of_interest: string | null
          property_type: string | null
          social_status: string | null
          source: string
          source_call_sid: string | null
          spouse_email: string | null
          spouse_name: string | null
          spouse_phone: string | null
          sqft: string | null
          status: string
          timeframe: string | null
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          agent_phone?: string | null
          area?: string | null
          assigned_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          budget?: string | null
          close_date?: string | null
          commission?: string | null
          created_at?: string
          current_address?: string | null
          down_payment?: string | null
          email: string
          financing_type?: string | null
          id?: string
          is_demo_data?: boolean | null
          is_inbound_call?: boolean | null
          language_preference?: string | null
          lead_lifecycle?: string
          lead_temperature?: string | null
          marital_status?: string | null
          name: string
          phone: string
          pipeline?: string | null
          pipeline_stage?: string
          preferred_contact_method?: string | null
          property_address?: string | null
          property_of_interest?: string | null
          property_type?: string | null
          social_status?: string | null
          source: string
          source_call_sid?: string | null
          spouse_email?: string | null
          spouse_name?: string | null
          spouse_phone?: string | null
          sqft?: string | null
          status?: string
          timeframe?: string | null
          updated_at?: string
          user_id: string
          value?: string | null
        }
        Update: {
          agent_phone?: string | null
          area?: string | null
          assigned_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          budget?: string | null
          close_date?: string | null
          commission?: string | null
          created_at?: string
          current_address?: string | null
          down_payment?: string | null
          email?: string
          financing_type?: string | null
          id?: string
          is_demo_data?: boolean | null
          is_inbound_call?: boolean | null
          language_preference?: string | null
          lead_lifecycle?: string
          lead_temperature?: string | null
          marital_status?: string | null
          name?: string
          phone?: string
          pipeline?: string | null
          pipeline_stage?: string
          preferred_contact_method?: string | null
          property_address?: string | null
          property_of_interest?: string | null
          property_type?: string | null
          social_status?: string | null
          source?: string
          source_call_sid?: string | null
          spouse_email?: string | null
          spouse_name?: string | null
          spouse_phone?: string | null
          sqft?: string | null
          status?: string
          timeframe?: string | null
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          author: string
          content: string
          created_at: string
          id: string
          is_demo_data: boolean | null
          lead_id: string
          note_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author: string
          content: string
          created_at?: string
          id?: string
          is_demo_data?: boolean | null
          lead_id: string
          note_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          id?: string
          is_demo_data?: boolean | null
          lead_id?: string
          note_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          id: string
          is_demo_data: boolean | null
          lead_id: string
          message: string
          message_sid: string | null
          status: string
          to_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo_data?: boolean | null
          lead_id: string
          message: string
          message_sid?: string | null
          status?: string
          to_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo_data?: boolean | null
          lead_id?: string
          message?: string
          message_sid?: string | null
          status?: string
          to_number?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_demo_data: boolean | null
          lead_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo_data?: boolean | null
          lead_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_demo_data?: boolean | null
          lead_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "marketing_manager"
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
      app_role: ["admin", "agent", "marketing_manager"],
    },
  },
} as const
