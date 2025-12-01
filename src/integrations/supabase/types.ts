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
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: string | null
          completion_notes: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          duration: number | null
          id: string
          lead_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          lead_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          lead_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      contact_category_options: {
        Row: {
          category_value: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_value: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_value?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_category_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          category: string
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          vendor_subcategory: string | null
        }
        Insert: {
          category?: string
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          vendor_subcategory?: string | null
        }
        Update: {
          category?: string
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          vendor_subcategory?: string | null
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
      custom_fields: {
        Row: {
          created_at: string
          display_order: number
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean
          options: string[] | null
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_label: string
          field_name: string
          field_type: string
          id?: string
          is_required?: boolean
          options?: string[] | null
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean
          options?: string[] | null
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      inventory: {
        Row: {
          acquisition_price: number | null
          admin_notes: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          arv: number | null
          arv_entered: boolean | null
          assigned_agent_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          calculated_rehab_budget: number | null
          category: string | null
          claimed_by_admin_id: string | null
          commission: number | null
          created_at: string
          description: string | null
          dispo_sheet_link: string | null
          down_payment: number | null
          estimated_repairs: number | null
          finance_type: string | null
          id: string
          interest_rate: number | null
          is_demo_data: boolean | null
          is_wholesale: boolean | null
          market_comps_completed: boolean | null
          market_status: string | null
          max_loan_amount: number | null
          name: string
          payment: number | null
          photo_url: string | null
          photo_urls: Json | null
          price: number | null
          property_approved_at: string | null
          property_type: string | null
          public_approval_status: string | null
          quantity: number
          seller_id: string | null
          share_token: string | null
          show_on_public_page: boolean | null
          sku: string | null
          sqft: number | null
          status: string | null
          transaction_type: string | null
          updated_at: string
          user_id: string
          wholesale_approval_status: string | null
        }
        Insert: {
          acquisition_price?: number | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          arv?: number | null
          arv_entered?: boolean | null
          assigned_agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          calculated_rehab_budget?: number | null
          category?: string | null
          claimed_by_admin_id?: string | null
          commission?: number | null
          created_at?: string
          description?: string | null
          dispo_sheet_link?: string | null
          down_payment?: number | null
          estimated_repairs?: number | null
          finance_type?: string | null
          id?: string
          interest_rate?: number | null
          is_demo_data?: boolean | null
          is_wholesale?: boolean | null
          market_comps_completed?: boolean | null
          market_status?: string | null
          max_loan_amount?: number | null
          name: string
          payment?: number | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number | null
          property_approved_at?: string | null
          property_type?: string | null
          public_approval_status?: string | null
          quantity?: number
          seller_id?: string | null
          share_token?: string | null
          show_on_public_page?: boolean | null
          sku?: string | null
          sqft?: number | null
          status?: string | null
          transaction_type?: string | null
          updated_at?: string
          user_id: string
          wholesale_approval_status?: string | null
        }
        Update: {
          acquisition_price?: number | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          arv?: number | null
          arv_entered?: boolean | null
          assigned_agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          calculated_rehab_budget?: number | null
          category?: string | null
          claimed_by_admin_id?: string | null
          commission?: number | null
          created_at?: string
          description?: string | null
          dispo_sheet_link?: string | null
          down_payment?: number | null
          estimated_repairs?: number | null
          finance_type?: string | null
          id?: string
          interest_rate?: number | null
          is_demo_data?: boolean | null
          is_wholesale?: boolean | null
          market_comps_completed?: boolean | null
          market_status?: string | null
          max_loan_amount?: number | null
          name?: string
          payment?: number | null
          photo_url?: string | null
          photo_urls?: Json | null
          price?: number | null
          property_approved_at?: string | null
          property_type?: string | null
          public_approval_status?: string | null
          quantity?: number
          seller_id?: string | null
          share_token?: string | null
          show_on_public_page?: boolean | null
          sku?: string | null
          sqft?: number | null
          status?: string | null
          transaction_type?: string | null
          updated_at?: string
          user_id?: string
          wholesale_approval_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_claimed_by_admin_id_fkey"
            columns: ["claimed_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_field_options: {
        Row: {
          created_at: string
          display_order: number
          field_type: string
          id: string
          is_active: boolean
          option_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_type: string
          id?: string
          is_active?: boolean
          option_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_type?: string
          id?: string
          is_active?: boolean
          option_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
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
          custom_data: Json | null
          down_payment: string | null
          email: string
          financing_type: string | null
          id: string
          inventory_id: string | null
          is_demo_data: boolean | null
          is_inbound_call: boolean | null
          language_preference: string | null
          last_modified_by: string | null
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
          title_office: string | null
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
          custom_data?: Json | null
          down_payment?: string | null
          email: string
          financing_type?: string | null
          id?: string
          inventory_id?: string | null
          is_demo_data?: boolean | null
          is_inbound_call?: boolean | null
          language_preference?: string | null
          last_modified_by?: string | null
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
          title_office?: string | null
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
          custom_data?: Json | null
          down_payment?: string | null
          email?: string
          financing_type?: string | null
          id?: string
          inventory_id?: string | null
          is_demo_data?: boolean | null
          is_inbound_call?: boolean | null
          language_preference?: string | null
          last_modified_by?: string | null
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
          title_office?: string | null
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          id: string
          link: string | null
          organization_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
          user_role: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string
          link?: string | null
          organization_id?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
          user_role?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string | null
          id?: string
          link?: string | null
          organization_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          organization_id: string
          primary_color: string | null
          public_page_description: string | null
          public_page_title: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          organization_id: string
          primary_color?: string | null
          public_page_description?: string | null
          public_page_title?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          public_page_description?: string | null
          public_page_title?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      owner_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          name: string
          status: string
          token: string
          type_of_owner: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          name: string
          status?: string
          token: string
          type_of_owner: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          name?: string
          status?: string
          token?: string
          type_of_owner?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          phone_number: string | null
          type_of_owner: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone_number?: string | null
          type_of_owner?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone_number?: string | null
          type_of_owner?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inquiries: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          lead_id: string | null
          message: string | null
          organization_id: string
          phone: string
          preferred_date: string | null
          property_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          lead_id?: string | null
          message?: string | null
          organization_id: string
          phone: string
          preferred_date?: string | null
          property_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          lead_id?: string | null
          message?: string | null
          organization_id?: string
          phone?: string
          preferred_date?: string | null
          property_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_inquiries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      public_field_settings: {
        Row: {
          created_at: string
          display_order: number | null
          field_name: string
          id: string
          is_visible: boolean | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          field_name: string
          id?: string
          is_visible?: boolean | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          field_name?: string
          id?: string
          is_visible?: boolean | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_field_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
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
          appointment_type: string | null
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
          appointment_type?: string | null
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
          appointment_type?: string | null
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
      transaction_types: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      vendor_subcategory_options: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          organization_id: string | null
          subcategory_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          subcategory_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          subcategory_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_subcategory_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "agent"
        | "marketing_manager"
        | "marketing"
        | "owner_user"
      contact_category: "client" | "lead" | "vendor" | "partner" | "other"
      vendor_subcategory:
        | "title_company"
        | "inspector"
        | "contractor"
        | "photographer"
        | "stager"
        | "attorney"
        | "lender"
        | "insurance"
        | "other"
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
      app_role: [
        "admin",
        "agent",
        "marketing_manager",
        "marketing",
        "owner_user",
      ],
      contact_category: ["client", "lead", "vendor", "partner", "other"],
      vendor_subcategory: [
        "title_company",
        "inspector",
        "contractor",
        "photographer",
        "stager",
        "attorney",
        "lender",
        "insurance",
        "other",
      ],
    },
  },
} as const
