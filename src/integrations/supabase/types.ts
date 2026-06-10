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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          usage_count?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          active: boolean
          agency: string | null
          bank_name: string
          business_unit_id: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          active?: boolean
          agency?: string | null
          bank_name: string
          business_unit_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          active?: boolean
          agency?: string | null
          bank_name?: string
          business_unit_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_entries: {
        Row: {
          amount: number
          bank_account_id: string | null
          conciliation_status: Database["public"]["Enums"]["conciliation_status"]
          created_at: string
          description: string | null
          direction: string | null
          document_number: string | null
          id: string
          import_batch_id: string | null
          raw_payload: Json | null
          suggested_match_id: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          conciliation_status?: Database["public"]["Enums"]["conciliation_status"]
          created_at?: string
          description?: string | null
          direction?: string | null
          document_number?: string | null
          id?: string
          import_batch_id?: string | null
          raw_payload?: Json | null
          suggested_match_id?: string | null
          transaction_date: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          conciliation_status?: Database["public"]["Enums"]["conciliation_status"]
          created_at?: string
          description?: string | null
          direction?: string | null
          document_number?: string | null
          id?: string
          import_batch_id?: string | null
          raw_payload?: Json | null
          suggested_match_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_entries_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      business_areas: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      business_units: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          business_unit_id: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          latitude: number | null
          location_status: string | null
          location_updated_at: string | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          type: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          business_unit_id?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          location_status?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          business_unit_id?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          location_status?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliation_matches: {
        Row: {
          bank_statement_entry_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          financial_entry_id: string
          id: string
          match_score: number | null
          match_type: Database["public"]["Enums"]["match_type"]
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          bank_statement_entry_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          financial_entry_id: string
          id?: string
          match_score?: number | null
          match_type?: Database["public"]["Enums"]["match_type"]
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          bank_statement_entry_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          financial_entry_id?: string
          id?: string
          match_score?: number | null
          match_type?: Database["public"]["Enums"]["match_type"]
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "conciliation_matches_bank_statement_entry_id_fkey"
            columns: ["bank_statement_entry_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliation_matches_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          active: boolean
          business_unit: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_unit?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_unit?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      devis: {
        Row: {
          accept_token: string
          accepted_at: string | null
          accepted_ip: string | null
          approved_at: string | null
          assumptions_secondary: Json | null
          business_unit: string | null
          client_id: string | null
          commercial_responsible: string | null
          created_at: string
          created_by: string | null
          deadline_date: string | null
          description: string | null
          devis_number: string | null
          down_payment_amount: number
          final_charge_generated: boolean | null
          id: string
          initial_charge_generated: boolean | null
          meeting_date: string | null
          meeting_report: string | null
          meeting_summary: string | null
          notes: string | null
          payment_terms_secondary: string | null
          pricing_status: string | null
          pricing_total: number | null
          proposal_structure: string | null
          proposal_structure_secondary: string | null
          reference_number: string | null
          rejected_at: string | null
          rejected_ip: string | null
          responsible_sector: string | null
          scope_description: string | null
          scope_description_secondary: string | null
          scope_items_secondary: Json | null
          secondary_language: string | null
          sent_at: string | null
          service_type: string | null
          source_language: string
          status: Database["public"]["Enums"]["devis_status"]
          title: string
          title_secondary: string | null
          total_amount: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_amount_confirmed: boolean
          validation_client_confirmed: boolean
          validation_deadline_defined: boolean
          validation_sector_defined: boolean
          validation_service_confirmed: boolean
        }
        Insert: {
          accept_token?: string
          accepted_at?: string | null
          accepted_ip?: string | null
          approved_at?: string | null
          assumptions_secondary?: Json | null
          business_unit?: string | null
          client_id?: string | null
          commercial_responsible?: string | null
          created_at?: string
          created_by?: string | null
          deadline_date?: string | null
          description?: string | null
          devis_number?: string | null
          down_payment_amount?: number
          final_charge_generated?: boolean | null
          id?: string
          initial_charge_generated?: boolean | null
          meeting_date?: string | null
          meeting_report?: string | null
          meeting_summary?: string | null
          notes?: string | null
          payment_terms_secondary?: string | null
          pricing_status?: string | null
          pricing_total?: number | null
          proposal_structure?: string | null
          proposal_structure_secondary?: string | null
          reference_number?: string | null
          rejected_at?: string | null
          rejected_ip?: string | null
          responsible_sector?: string | null
          scope_description?: string | null
          scope_description_secondary?: string | null
          scope_items_secondary?: Json | null
          secondary_language?: string | null
          sent_at?: string | null
          service_type?: string | null
          source_language?: string
          status?: Database["public"]["Enums"]["devis_status"]
          title: string
          title_secondary?: string | null
          total_amount?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_amount_confirmed?: boolean
          validation_client_confirmed?: boolean
          validation_deadline_defined?: boolean
          validation_sector_defined?: boolean
          validation_service_confirmed?: boolean
        }
        Update: {
          accept_token?: string
          accepted_at?: string | null
          accepted_ip?: string | null
          approved_at?: string | null
          assumptions_secondary?: Json | null
          business_unit?: string | null
          client_id?: string | null
          commercial_responsible?: string | null
          created_at?: string
          created_by?: string | null
          deadline_date?: string | null
          description?: string | null
          devis_number?: string | null
          down_payment_amount?: number
          final_charge_generated?: boolean | null
          id?: string
          initial_charge_generated?: boolean | null
          meeting_date?: string | null
          meeting_report?: string | null
          meeting_summary?: string | null
          notes?: string | null
          payment_terms_secondary?: string | null
          pricing_status?: string | null
          pricing_total?: number | null
          proposal_structure?: string | null
          proposal_structure_secondary?: string | null
          reference_number?: string | null
          rejected_at?: string | null
          rejected_ip?: string | null
          responsible_sector?: string | null
          scope_description?: string | null
          scope_description_secondary?: string | null
          scope_items_secondary?: Json | null
          secondary_language?: string | null
          sent_at?: string | null
          service_type?: string | null
          source_language?: string
          status?: Database["public"]["Enums"]["devis_status"]
          title?: string
          title_secondary?: string | null
          total_amount?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_amount_confirmed?: boolean
          validation_client_confirmed?: boolean
          validation_deadline_defined?: boolean
          validation_sector_defined?: boolean
          validation_service_confirmed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_pricing_items: {
        Row: {
          created_at: string | null
          description: string | null
          devis_id: string
          id: string
          name: string
          quantity: number | null
          service_price_id: string | null
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          devis_id: string
          id?: string
          name: string
          quantity?: number | null
          service_price_id?: string | null
          total_price: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          devis_id?: string
          id?: string
          name?: string
          quantity?: number | null
          service_price_id?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_pricing_items_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_pricing_items_service_price_id_fkey"
            columns: ["service_price_id"]
            isOneToOne: false
            referencedRelation: "service_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_service_areas: {
        Row: {
          area_slug: string
          created_at: string | null
          devis_id: string
          id: string
        }
        Insert: {
          area_slug: string
          created_at?: string | null
          devis_id: string
          id?: string
        }
        Update: {
          area_slug?: string
          created_at?: string | null
          devis_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_service_areas_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entry_allocations: {
        Row: {
          amount: number
          category_id: string | null
          cost_center_id: string | null
          created_at: string
          entry_id: string
          id: string
          notes: string | null
          percent: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          entry_id: string
          id?: string
          notes?: string | null
          percent?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          notes?: string | null
          percent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_allocations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_allocations_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_allocations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount_in: number | null
          amount_out: number | null
          amount_signed: number | null
          area_slug: string | null
          bank_account_id: string | null
          business_unit: string | null
          category_id: string | null
          client_id: string | null
          competence_date: string | null
          competence_month: string | null
          conciliation_group_id: string | null
          conciliation_status: Database["public"]["Enums"]["conciliation_status"]
          cost_center_id: string | null
          counterparty_name: string | null
          created_at: string
          currency: string
          devis_id: string | null
          devis_number: string | null
          document_reference: string | null
          due_date: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["entry_type"] | null
          exchange_rate: number
          fx_status: string | null
          fx_variation: number | null
          id: string
          import_batch_id: string | null
          installment_number: number | null
          installment_total: number | null
          movement_account: string | null
          movement_description: string | null
          notes: string | null
          open_amount: number | null
          original_amount: number | null
          paid_amount: number | null
          paid_at: string | null
          payment_account_id: string | null
          payment_method_id: string | null
          payment_status: string | null
          reference_code: string | null
          responsible_sector: string | null
          source_file_name: string | null
          source_sheet_name: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          supplier_id: string | null
          total_brl: number | null
          transfer_pair_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_in?: number | null
          amount_out?: number | null
          amount_signed?: number | null
          area_slug?: string | null
          bank_account_id?: string | null
          business_unit?: string | null
          category_id?: string | null
          client_id?: string | null
          competence_date?: string | null
          competence_month?: string | null
          conciliation_group_id?: string | null
          conciliation_status?: Database["public"]["Enums"]["conciliation_status"]
          cost_center_id?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          devis_id?: string | null
          devis_number?: string | null
          document_reference?: string | null
          due_date?: string | null
          entry_date: string
          entry_type?: Database["public"]["Enums"]["entry_type"] | null
          exchange_rate?: number
          fx_status?: string | null
          fx_variation?: number | null
          id?: string
          import_batch_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          movement_account?: string | null
          movement_description?: string | null
          notes?: string | null
          open_amount?: number | null
          original_amount?: number | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_account_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          reference_code?: string | null
          responsible_sector?: string | null
          source_file_name?: string | null
          source_sheet_name?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          supplier_id?: string | null
          total_brl?: number | null
          transfer_pair_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_in?: number | null
          amount_out?: number | null
          amount_signed?: number | null
          area_slug?: string | null
          bank_account_id?: string | null
          business_unit?: string | null
          category_id?: string | null
          client_id?: string | null
          competence_date?: string | null
          competence_month?: string | null
          conciliation_group_id?: string | null
          conciliation_status?: Database["public"]["Enums"]["conciliation_status"]
          cost_center_id?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          devis_id?: string | null
          devis_number?: string | null
          document_reference?: string | null
          due_date?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["entry_type"] | null
          exchange_rate?: number
          fx_status?: string | null
          fx_variation?: number | null
          id?: string
          import_batch_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          movement_account?: string | null
          movement_description?: string | null
          notes?: string | null
          open_amount?: number | null
          original_amount?: number | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_account_id?: string | null
          payment_method_id?: string | null
          payment_status?: string | null
          reference_code?: string | null
          responsible_sector?: string | null
          source_file_name?: string | null
          source_sheet_name?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          supplier_id?: string | null
          total_brl?: number | null
          transfer_pair_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          bank_statement_entry_id: string | null
          conciliation_match_id: string | null
          created_at: string
          created_by: string | null
          financial_entry_id: string
          id: string
          notes: string | null
          paid_at: string
          payment_method_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bank_statement_entry_id?: string | null
          conciliation_match_id?: string | null
          created_at?: string
          created_by?: string | null
          financial_entry_id: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bank_statement_entry_id?: string | null
          conciliation_match_id?: string | null
          created_at?: string
          created_by?: string | null
          financial_entry_id?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_bank_statement_entry_id_fkey"
            columns: ["bank_statement_entry_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_conciliation_match_id_fkey"
            columns: ["conciliation_match_id"]
            isOneToOne: false
            referencedRelation: "conciliation_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          error_count: number | null
          error_log: Json | null
          file_name: string
          id: string
          imported_at: string
          imported_by: string | null
          row_count: number | null
          source_kind: string
          status: Database["public"]["Enums"]["import_status"]
          success_count: number | null
        }
        Insert: {
          error_count?: number | null
          error_log?: Json | null
          file_name: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          row_count?: number | null
          source_kind: string
          status?: Database["public"]["Enums"]["import_status"]
          success_count?: number | null
        }
        Update: {
          error_count?: number | null
          error_log?: Json | null
          file_name?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          row_count?: number | null
          source_kind?: string
          status?: Database["public"]["Enums"]["import_status"]
          success_count?: number | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_prices: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          last_market_update: string | null
          market_price: number | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_market_update?: string | null
          market_price?: number | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_market_update?: string | null
          market_price?: number | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          actual_end_date: string | null
          assigned_to: string | null
          business_unit: string | null
          client_id: string | null
          created_at: string
          description: string | null
          devis_id: string | null
          expected_end_date: string | null
          final_charge_generated: boolean | null
          id: string
          responsible_sector: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["service_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          assigned_to?: string | null
          business_unit?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          devis_id?: string | null
          expected_end_date?: string | null
          final_charge_generated?: boolean | null
          id?: string
          responsible_sector?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          assigned_to?: string | null
          business_unit?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          devis_id?: string | null
          expected_end_date?: string | null
          final_charge_generated?: boolean | null
          id?: string
          responsible_sector?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          id: string
          settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      auto_advance_sent_devis: { Args: never; Returns: undefined }
      bi_kpis_comercial: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      bi_kpis_operacao: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      create_devis_initial_charge: {
        Args: { _devis_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      financeiro_analitico: {
        Args: {
          _bank?: string
          _business?: string
          _competence?: string
          _origin?: string
          _realized?: string
          _search?: string
          _status?: string
          _type?: string
        }
        Returns: {
          competence: string
          total_in: number
          total_out: number
        }[]
      }
      financeiro_summary: {
        Args: {
          _bank?: string
          _business?: string
          _competence?: string
          _origin?: string
          _realized?: string
          _search?: string
          _status?: string
          _type?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_devis_number: { Args: { _prefix: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      validate_api_key: {
        Args: { _key_hash: string }
        Returns: {
          id: string
          name: string
          scopes: string[]
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "financeiro"
        | "comercial"
        | "operacao"
        | "gestao"
        | "bi_viewer"
        | "gerencial"
      conciliation_status: "pendente" | "conciliado" | "divergente" | "ignorado"
      devis_status:
        | "rascunho"
        | "enviado"
        | "aprovado"
        | "rejeitado"
        | "convertido"
        | "reuniao_realizada"
        | "proposta_em_geracao"
        | "aguardando_validacao"
        | "pronta_para_envio"
        | "enviada_ao_cliente"
        | "aguardando_aceite"
        | "aceita"
        | "rejeitada"
        | "cobranca_pendente"
        | "entrada_recebida"
        | "enviado_para_operacao"
      entry_type: "receita" | "despesa" | "transferencia"
      import_status: "processando" | "concluido" | "erro" | "parcial"
      match_status: "sugerido" | "confirmado" | "rejeitado"
      match_type: "automatico" | "manual"
      service_status:
        | "pendente"
        | "em_andamento"
        | "concluido"
        | "cancelado"
        | "a_iniciar"
        | "aguardando_cliente"
        | "aguardando_aprovacao"
      source_type:
        | "manual"
        | "importacao_planilha"
        | "importacao_extrato"
        | "sistema"
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
        "financeiro",
        "comercial",
        "operacao",
        "gestao",
        "bi_viewer",
        "gerencial",
      ],
      conciliation_status: ["pendente", "conciliado", "divergente", "ignorado"],
      devis_status: [
        "rascunho",
        "enviado",
        "aprovado",
        "rejeitado",
        "convertido",
        "reuniao_realizada",
        "proposta_em_geracao",
        "aguardando_validacao",
        "pronta_para_envio",
        "enviada_ao_cliente",
        "aguardando_aceite",
        "aceita",
        "rejeitada",
        "cobranca_pendente",
        "entrada_recebida",
        "enviado_para_operacao",
      ],
      entry_type: ["receita", "despesa", "transferencia"],
      import_status: ["processando", "concluido", "erro", "parcial"],
      match_status: ["sugerido", "confirmado", "rejeitado"],
      match_type: ["automatico", "manual"],
      service_status: [
        "pendente",
        "em_andamento",
        "concluido",
        "cancelado",
        "a_iniciar",
        "aguardando_cliente",
        "aguardando_aprovacao",
      ],
      source_type: [
        "manual",
        "importacao_planilha",
        "importacao_extrato",
        "sistema",
      ],
    },
  },
} as const
