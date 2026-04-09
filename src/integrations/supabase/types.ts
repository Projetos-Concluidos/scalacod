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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          failed_count: number | null
          flow_id: string | null
          id: string
          message_template: string | null
          name: string
          scheduled_at: string | null
          segment_filter: Json | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          total_recipients: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          flow_id?: string | null
          id?: string
          message_template?: string | null
          name: string
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          total_recipients?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          flow_id?: string | null
          id?: string
          message_template?: string | null
          name?: string
          scheduled_at?: string | null
          segment_filter?: Json | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          total_recipients?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkouts: {
        Row: {
          banner_images: Json | null
          checkout_category: string
          coinzz_offer_hash: string | null
          config: Json | null
          created_at: string | null
          cta_config: Json | null
          custom_css: string | null
          download_url: string | null
          font_family: string | null
          google_ads_id: string | null
          google_analytics_id: string | null
          google_conversion_id: string | null
          hyppe_offer_data: Json | null
          id: string
          is_active: boolean | null
          meta_capi_token: string | null
          name: string
          offer_id: string | null
          order_bump_enabled: boolean | null
          pixel_facebook: string | null
          pixel_id: string | null
          primary_color: string | null
          product_cover_url: string | null
          product_description: string | null
          product_offer_price: number | null
          product_price: number | null
          product_type: string | null
          provider_priority: string | null
          scarcity_timer_config: Json | null
          slug: string | null
          thank_you_page_url: string | null
          type: string | null
          updated_at: string | null
          upsell_enabled: boolean | null
          user_id: string
          whatsapp_support: string | null
        }
        Insert: {
          banner_images?: Json | null
          checkout_category?: string
          coinzz_offer_hash?: string | null
          config?: Json | null
          created_at?: string | null
          cta_config?: Json | null
          custom_css?: string | null
          download_url?: string | null
          font_family?: string | null
          google_ads_id?: string | null
          google_analytics_id?: string | null
          google_conversion_id?: string | null
          hyppe_offer_data?: Json | null
          id?: string
          is_active?: boolean | null
          meta_capi_token?: string | null
          name: string
          offer_id?: string | null
          order_bump_enabled?: boolean | null
          pixel_facebook?: string | null
          pixel_id?: string | null
          primary_color?: string | null
          product_cover_url?: string | null
          product_description?: string | null
          product_offer_price?: number | null
          product_price?: number | null
          product_type?: string | null
          provider_priority?: string | null
          scarcity_timer_config?: Json | null
          slug?: string | null
          thank_you_page_url?: string | null
          type?: string | null
          updated_at?: string | null
          upsell_enabled?: boolean | null
          user_id: string
          whatsapp_support?: string | null
        }
        Update: {
          banner_images?: Json | null
          checkout_category?: string
          coinzz_offer_hash?: string | null
          config?: Json | null
          created_at?: string | null
          cta_config?: Json | null
          custom_css?: string | null
          download_url?: string | null
          font_family?: string | null
          google_ads_id?: string | null
          google_analytics_id?: string | null
          google_conversion_id?: string | null
          hyppe_offer_data?: Json | null
          id?: string
          is_active?: boolean | null
          meta_capi_token?: string | null
          name?: string
          offer_id?: string | null
          order_bump_enabled?: boolean | null
          pixel_facebook?: string | null
          pixel_id?: string | null
          primary_color?: string | null
          product_cover_url?: string | null
          product_description?: string | null
          product_offer_price?: number | null
          product_price?: number | null
          product_type?: string | null
          provider_priority?: string | null
          scarcity_timer_config?: Json | null
          slug?: string | null
          thank_you_page_url?: string | null
          type?: string | null
          updated_at?: string | null
          upsell_enabled?: boolean | null
          user_id?: string
          whatsapp_support?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_notes: {
        Row: {
          author_name: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          author_name?: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_agent: string | null
          contact_avatar: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          id: string
          labels: Json | null
          last_message: string | null
          last_message_at: string | null
          lead_id: string | null
          status: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
          whatsapp_instance: string | null
        }
        Insert: {
          assigned_agent?: string | null
          contact_avatar?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          id?: string
          labels?: Json | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_instance?: string | null
        }
        Update: {
          assigned_agent?: string | null
          contact_avatar?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          id?: string
          labels?: Json | null
          last_message?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_instance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          flow_id: string
          id: string
          nodes_executed: number | null
          order_id: string | null
          status: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          flow_id: string
          id?: string
          nodes_executed?: number | null
          order_id?: string | null
          status?: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          flow_id?: string
          id?: string
          nodes_executed?: number | null
          order_id?: string | null
          status?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_templates: {
        Row: {
          category: string | null
          components: Json | null
          created_at: string | null
          flow_id: string
          id: string
          language: string | null
          status: string | null
          template_id_meta: string | null
          template_name: string
        }
        Insert: {
          category?: string | null
          components?: Json | null
          created_at?: string | null
          flow_id: string
          id?: string
          language?: string | null
          status?: string | null
          template_id_meta?: string | null
          template_name: string
        }
        Update: {
          category?: string | null
          components?: Json | null
          created_at?: string | null
          flow_id?: string
          id?: string
          language?: string | null
          status?: string | null
          template_id_meta?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_templates_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          created_at: string | null
          description: string | null
          edges: Json | null
          flow_type: string | null
          folder_id: string | null
          id: string
          is_active: boolean | null
          is_official: boolean | null
          message_count: number | null
          name: string
          node_count: number | null
          nodes: Json | null
          template_status: string | null
          trigger_event: string | null
          trigger_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          flow_type?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          message_count?: number | null
          name: string
          node_count?: number | null
          nodes?: Json | null
          template_status?: string | null
          trigger_event?: string | null
          trigger_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          edges?: Json | null
          flow_type?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          message_count?: number | null
          name?: string
          node_count?: number | null
          nodes?: Json | null
          template_status?: string | null
          trigger_event?: string | null
          trigger_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_settings: {
        Row: {
          content: Json
          id: string
          section_key: string
          updated_at: string | null
        }
        Insert: {
          content?: Json
          id?: string
          section_key: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          id?: string
          section_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          accumulated_revenue: number | null
          created_at: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          order_id: string | null
          phone: string
          status: string | null
          tags: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accumulated_revenue?: number | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          order_id?: string | null
          phone: string
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accumulated_revenue?: number | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          order_id?: string | null
          phone?: string
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue: {
        Row: {
          created_at: string
          error_message: string | null
          flow_id: string | null
          id: string
          max_retries: number
          message: string
          order_id: string | null
          phone: string
          process_after: string
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          flow_id?: string | null
          id?: string
          max_retries?: number
          message: string
          order_id?: string | null
          phone: string
          process_after?: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          flow_id?: string | null
          id?: string
          max_retries?: number
          message?: string
          order_id?: string | null
          phone?: string
          process_after?: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          direction: string | null
          id: string
          media_url: string | null
          message_id_whatsapp: string | null
          status: string | null
          timestamp: string
          type: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_id_whatsapp?: string | null
          status?: string | null
          timestamp: string
          type?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_id_whatsapp?: string | null
          status?: string | null
          timestamp?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          alert_frustrated_orders: boolean | null
          alert_low_tokens: boolean | null
          created_at: string | null
          email_delivered: boolean | null
          email_frustrated: boolean | null
          email_new_lead: boolean | null
          email_new_order: boolean | null
          email_weekly_report: boolean | null
          id: string
          push_delivered: boolean | null
          push_enabled: boolean | null
          push_frustrated: boolean | null
          push_new_lead: boolean | null
          push_new_order: boolean | null
          push_payment_approved: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_frustrated_orders?: boolean | null
          alert_low_tokens?: boolean | null
          created_at?: string | null
          email_delivered?: boolean | null
          email_frustrated?: boolean | null
          email_new_lead?: boolean | null
          email_new_order?: boolean | null
          email_weekly_report?: boolean | null
          id?: string
          push_delivered?: boolean | null
          push_enabled?: boolean | null
          push_frustrated?: boolean | null
          push_new_lead?: boolean | null
          push_new_order?: boolean | null
          push_payment_approved?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_frustrated_orders?: boolean | null
          alert_low_tokens?: boolean | null
          created_at?: string | null
          email_delivered?: boolean | null
          email_frustrated?: boolean | null
          email_new_lead?: boolean | null
          email_new_order?: boolean | null
          email_weekly_report?: boolean | null
          id?: string
          push_delivered?: boolean | null
          push_enabled?: boolean | null
          push_frustrated?: boolean | null
          push_new_lead?: boolean | null
          push_new_order?: boolean | null
          push_payment_approved?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          affiliate_code: string | null
          checkout_type: string | null
          created_at: string | null
          expedition_checkout_url: string | null
          hash: string | null
          id: string
          is_active: boolean | null
          name: string
          original_price: number | null
          price: number
          product_id: string
          scheduling_checkout_url: string | null
          user_id: string
        }
        Insert: {
          affiliate_code?: string | null
          checkout_type?: string | null
          created_at?: string | null
          expedition_checkout_url?: string | null
          hash?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          original_price?: number | null
          price: number
          product_id: string
          scheduling_checkout_url?: string | null
          user_id: string
        }
        Update: {
          affiliate_code?: string | null
          checkout_type?: string | null
          created_at?: string | null
          expedition_checkout_url?: string | null
          hash?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          product_id?: string
          scheduling_checkout_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bumps: {
        Row: {
          created_at: string | null
          current_price: number | null
          description: string | null
          hash: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          label_bump: string | null
          name: string
          offer_id: string
          price: number | null
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_price?: number | null
          description?: string | null
          hash?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          label_bump?: string | null
          name: string
          offer_id: string
          price?: number | null
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_price?: number | null
          description?: string | null
          hash?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          label_bump?: string | null
          name?: string
          offer_id?: string
          price?: number | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_bumps_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bumps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          from_status: string | null
          id: string
          order_id: string
          raw_payload: Json | null
          source: string
          to_status: string
        }
        Insert: {
          created_at?: string | null
          from_status?: string | null
          id?: string
          order_id: string
          raw_payload?: Json | null
          source: string
          to_status: string
        }
        Update: {
          created_at?: string | null
          from_status?: string | null
          id?: string
          order_id?: string
          raw_payload?: Json | null
          source?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          affiliate_code: string | null
          affiliate_commission: number | null
          affiliate_email: string | null
          affiliate_name: string | null
          checkout_id: string | null
          client_address: string
          client_address_city: string
          client_address_comp: string | null
          client_address_country: string | null
          client_address_district: string
          client_address_number: string
          client_address_state: string
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string
          client_zip_code: string
          coinzz_order_hash: string | null
          coinzz_payment_status: string | null
          coinzz_shipping_status: string | null
          created_at: string | null
          delivery_date: string | null
          delivery_man: string | null
          delivery_type_code: string | null
          delivery_type_name: string | null
          first_order: boolean | null
          gateway_fee: number | null
          hyppe_order_id: string | null
          id: string
          label_a4_url: string | null
          label_thermal_url: string | null
          local_operation_code: string | null
          logistic_operator: string | null
          logistics_type: string | null
          logzz_order_id: string | null
          mp_payment_status: string | null
          mp_payment_status_detail: string | null
          offer_id: string | null
          order_final_price: number
          order_number: string | null
          order_quantity: number | null
          payment_method: string | null
          products: Json | null
          second_order: boolean | null
          shipping_value: number | null
          status: string
          status_description: string | null
          total_installments: number | null
          tracking_code: string | null
          updated_at: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_commission?: number | null
          affiliate_email?: string | null
          affiliate_name?: string | null
          checkout_id?: string | null
          client_address: string
          client_address_city: string
          client_address_comp?: string | null
          client_address_country?: string | null
          client_address_district: string
          client_address_number: string
          client_address_state: string
          client_document?: string | null
          client_email?: string | null
          client_name: string
          client_phone: string
          client_zip_code: string
          coinzz_order_hash?: string | null
          coinzz_payment_status?: string | null
          coinzz_shipping_status?: string | null
          created_at?: string | null
          delivery_date?: string | null
          delivery_man?: string | null
          delivery_type_code?: string | null
          delivery_type_name?: string | null
          first_order?: boolean | null
          gateway_fee?: number | null
          hyppe_order_id?: string | null
          id?: string
          label_a4_url?: string | null
          label_thermal_url?: string | null
          local_operation_code?: string | null
          logistic_operator?: string | null
          logistics_type?: string | null
          logzz_order_id?: string | null
          mp_payment_status?: string | null
          mp_payment_status_detail?: string | null
          offer_id?: string | null
          order_final_price: number
          order_number?: string | null
          order_quantity?: number | null
          payment_method?: string | null
          products?: Json | null
          second_order?: boolean | null
          shipping_value?: number | null
          status?: string
          status_description?: string | null
          total_installments?: number | null
          tracking_code?: string | null
          updated_at?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_commission?: number | null
          affiliate_email?: string | null
          affiliate_name?: string | null
          checkout_id?: string | null
          client_address?: string
          client_address_city?: string
          client_address_comp?: string | null
          client_address_country?: string | null
          client_address_district?: string
          client_address_number?: string
          client_address_state?: string
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string
          client_zip_code?: string
          coinzz_order_hash?: string | null
          coinzz_payment_status?: string | null
          coinzz_shipping_status?: string | null
          created_at?: string | null
          delivery_date?: string | null
          delivery_man?: string | null
          delivery_type_code?: string | null
          delivery_type_name?: string | null
          first_order?: boolean | null
          gateway_fee?: number | null
          hyppe_order_id?: string | null
          id?: string
          label_a4_url?: string | null
          label_thermal_url?: string | null
          local_operation_code?: string | null
          logistic_operator?: string | null
          logistics_type?: string | null
          logzz_order_id?: string | null
          mp_payment_status?: string | null
          mp_payment_status_detail?: string | null
          offer_id?: string | null
          order_final_price?: number
          order_number?: string | null
          order_quantity?: number | null
          payment_method?: string | null
          products?: Json | null
          second_order?: boolean | null
          shipping_value?: number | null
          status?: string
          status_description?: string | null
          total_installments?: number | null
          tracking_code?: string | null
          updated_at?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pixel_events: {
        Row: {
          checkout_id: string | null
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          checkout_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          checkout_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pixel_events_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pixel_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          limits: Json | null
          mp_plan_id: string | null
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          sort_order: number | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          limits?: Json | null
          mp_plan_id?: string | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          slug: string
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          limits?: Json | null
          mp_plan_id?: string | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variations: {
        Row: {
          created_at: string | null
          hash: string | null
          height: number | null
          id: string
          is_active: boolean | null
          length: number | null
          name: string
          product_id: string
          sku: string | null
          stock_qty: number | null
          weight: number | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          hash?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          length?: number | null
          name: string
          product_id: string
          sku?: string | null
          stock_qty?: number | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          hash?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          length?: number | null
          name?: string
          product_id?: string
          sku?: string | null
          stock_qty?: number | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categories: Json | null
          created_at: string | null
          description: string | null
          hash: string | null
          height: number | null
          id: string
          is_active: boolean | null
          length: number | null
          main_image_url: string | null
          name: string
          updated_at: string | null
          user_id: string
          warranty_days: number | null
          weight: number | null
          width: number | null
        }
        Insert: {
          categories?: Json | null
          created_at?: string | null
          description?: string | null
          hash?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          length?: number | null
          main_image_url?: string | null
          name: string
          updated_at?: string | null
          user_id: string
          warranty_days?: number | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          categories?: Json | null
          created_at?: string | null
          description?: string | null
          hash?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          length?: number | null
          main_image_url?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
          warranty_days?: number | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          onboarding_dismissed: boolean | null
          onboarding_dismissed_at: string | null
          plan: string | null
          plan_id: string | null
          store_name: string | null
          subscription_ends_at: string | null
          subscription_id: string | null
          subscription_status: string | null
          token_balance: number | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          onboarding_dismissed?: boolean | null
          onboarding_dismissed_at?: string | null
          plan?: string | null
          plan_id?: string | null
          store_name?: string | null
          subscription_ends_at?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          token_balance?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          onboarding_dismissed?: boolean | null
          onboarding_dismissed_at?: string | null
          plan?: string | null
          plan_id?: string | null
          store_name?: string | null
          subscription_ends_at?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          token_balance?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          shortcut: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          shortcut: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          shortcut?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_attempts: {
        Row: {
          action: string
          created_at: string | null
          id: string
          identifier: string
          key: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          identifier: string
          key: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          identifier?: string
          key?: string
        }
        Relationships: []
      }
      remarketing_campaigns: {
        Row: {
          checkout_id: string | null
          created_at: string
          description: string | null
          discount_enabled: boolean
          discount_progressive: boolean
          discount_type: string
          flow_type: string
          id: string
          is_active: boolean
          name: string
          total_converted: number
          total_enrolled: number
          total_revenue_recovered: number
          trigger_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checkout_id?: string | null
          created_at?: string
          description?: string | null
          discount_enabled?: boolean
          discount_progressive?: boolean
          discount_type?: string
          flow_type?: string
          id?: string
          is_active?: boolean
          name: string
          total_converted?: number
          total_enrolled?: number
          total_revenue_recovered?: number
          trigger_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checkout_id?: string | null
          created_at?: string
          description?: string | null
          discount_enabled?: boolean
          discount_progressive?: boolean
          discount_type?: string
          flow_type?: string
          id?: string
          is_active?: boolean
          name?: string
          total_converted?: number
          total_enrolled?: number
          total_revenue_recovered?: number
          trigger_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarketing_campaigns_checkout_id_fkey"
            columns: ["checkout_id"]
            isOneToOne: false
            referencedRelation: "checkouts"
            referencedColumns: ["id"]
          },
        ]
      }
      remarketing_enrollments: {
        Row: {
          campaign_id: string
          converted_at: string | null
          converted_order_id: string | null
          created_at: string
          current_step: number
          enrolled_at: string
          id: string
          order_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          order_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          converted_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarketing_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "remarketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remarketing_enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      remarketing_steps: {
        Row: {
          campaign_id: string
          created_at: string
          delay_days: number
          discount_value: number | null
          id: string
          message_template: string
          send_hour: string
          step_order: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delay_days?: number
          discount_value?: number | null
          id?: string
          message_template?: string
          send_hour?: string
          step_order?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delay_days?: number
          discount_value?: number | null
          id?: string
          message_template?: string
          send_hour?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarketing_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "remarketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          business_hours: Json | null
          business_hours_enabled: boolean | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          mp_payment_id: string | null
          paid_at: string | null
          status: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          mp_card_last4: string | null
          mp_payer_email: string | null
          mp_preapproval_id: string | null
          mp_preapproval_plan_id: string | null
          plan_id: string | null
          status: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mp_card_last4?: string | null
          mp_payer_email?: string | null
          mp_preapproval_id?: string | null
          mp_preapproval_plan_id?: string | null
          plan_id?: string | null
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mp_card_last4?: string | null
          mp_payer_email?: string | null
          mp_preapproval_id?: string | null
          mp_preapproval_plan_id?: string | null
          plan_id?: string | null
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      team_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          owner_id: string
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          owner_id: string
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          owner_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          owner_id: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          owner_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          owner_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_id: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      token_packs: {
        Row: {
          badge_label: string | null
          badge_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          original_price: number | null
          price: number
          slug: string
          sort_order: number | null
          tokens: number
          updated_at: string | null
        }
        Insert: {
          badge_label?: string | null
          badge_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          original_price?: number | null
          price: number
          slug: string
          sort_order?: number | null
          tokens: number
          updated_at?: string | null
        }
        Update: {
          badge_label?: string | null
          badge_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          slug?: string
          sort_order?: number | null
          tokens?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          mp_payment_id: string | null
          pack_id: string
          paid_at: string | null
          status: string | null
          tokens: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          mp_payment_id?: string | null
          pack_id: string
          paid_at?: string | null
          status?: string | null
          tokens: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          mp_payment_id?: string | null
          pack_id?: string
          paid_at?: string | null
          status?: string | null
          tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          campaigns_this_month: number | null
          id: string
          month_year: string | null
          orders_this_month: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          campaigns_this_month?: number | null
          id?: string
          month_year?: string | null
          orders_this_month?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          campaigns_this_month?: number | null
          id?: string
          month_year?: string | null
          orders_this_month?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_tokens: {
        Row: {
          balance: number | null
          id: string
          total_purchased: number | null
          total_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          id?: string
          total_purchased?: number | null
          total_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          id?: string
          total_purchased?: number | null
          total_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voices: {
        Row: {
          created_at: string | null
          elevenlabs_voice_id: string | null
          id: string
          is_cloned: boolean | null
          is_favorite: boolean | null
          name: string
          preview_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          elevenlabs_voice_id?: string | null
          id?: string
          is_cloned?: boolean | null
          is_favorite?: boolean | null
          name: string
          preview_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          elevenlabs_voice_id?: string | null
          id?: string
          is_cloned?: boolean | null
          is_favorite?: boolean | null
          name?: string
          preview_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_config: {
        Row: {
          created_at: string | null
          events: Json | null
          id: string
          is_active: boolean | null
          secret_key: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          events?: Json | null
          id?: string
          is_active?: boolean | null
          secret_key?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          events?: Json | null
          id?: string
          is_active?: boolean | null
          secret_key?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key: string | null
          config: Json | null
          created_at: string | null
          evolution_server_url: string | null
          id: string
          instance_name: string | null
          meta_access_token: string | null
          phone_number: string | null
          phone_number_id: string | null
          provider: string
          qr_code: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          waba_id: string | null
          webhook_url: string | null
          ycloud_api_key: string | null
        }
        Insert: {
          api_key?: string | null
          config?: Json | null
          created_at?: string | null
          evolution_server_url?: string | null
          id?: string
          instance_name?: string | null
          meta_access_token?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          provider: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          waba_id?: string | null
          webhook_url?: string | null
          ycloud_api_key?: string | null
        }
        Update: {
          api_key?: string | null
          config?: Json | null
          created_at?: string | null
          evolution_server_url?: string | null
          id?: string
          instance_name?: string | null
          meta_access_token?: string | null
          phone_number?: string | null
          phone_number_id?: string | null
          provider?: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          waba_id?: string | null
          webhook_url?: string | null
          ycloud_api_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_tokens_to_user: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      admin_add_tokens: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_block_user: {
        Args: { p_block: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_remove_tokens: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_update_user_plan: {
        Args: { p_plan_id: string; p_user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      debit_voice_tokens: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      get_effective_user_id: { Args: never; Returns: string }
      get_user_plan_limit: { Args: { feature: string }; Returns: number }
      has_active_subscription: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member_with_role: { Args: { _roles: string[] }; Returns: boolean }
    }
    Enums: {
      app_role: "superadmin" | "tenant" | "tenant_admin" | "tenant_agent"
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
      app_role: ["superadmin", "tenant", "tenant_admin", "tenant_agent"],
    },
  },
} as const
