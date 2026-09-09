export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      about_team_members: {
        Row: {
          created_at: string
          is_active: boolean
          role_key: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          role_key: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          role_key?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "about_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "about_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_role_grants: {
        Row: {
          grant_id: string
          granted_at: string
          granted_by: string | null
          manager_grant_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          scope_org_id: string | null
          user_id: string
        }
        Insert: {
          grant_id?: string
          granted_at?: string
          granted_by?: string | null
          manager_grant_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          scope_org_id?: string | null
          user_id: string
        }
        Update: {
          grant_id?: string
          granted_at?: string
          granted_by?: string | null
          manager_grant_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          scope_org_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_role_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_role_grants_manager_grant_id_fkey"
            columns: ["manager_grant_id"]
            isOneToOne: false
            referencedRelation: "admin_role_grants"
            referencedColumns: ["grant_id"]
          },
          {
            foreignKeyName: "admin_role_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_role_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_role_grants_scope_org_fk"
            columns: ["scope_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_id"]
          },
          {
            foreignKeyName: "admin_role_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_role_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_task_activities: {
        Row: {
          activity_id: string
          actor_id: string | null
          created_at: string
          kind: string
          payload: Json
          task_id: string
        }
        Insert: {
          activity_id?: string
          actor_id?: string | null
          created_at?: string
          kind: string
          payload?: Json
          task_id: string
        }
        Update: {
          activity_id?: string
          actor_id?: string | null
          created_at?: string
          kind?: string
          payload?: Json
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_task_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_task_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "admin_tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      admin_tasks: {
        Row: {
          assignee_id: string | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          labels: string[]
          priority: string
          status: string
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          labels?: string[]
          priority?: string
          status?: string
          task_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          labels?: string[]
          priority?: string
          status?: string
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          event_id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          event_id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          event_id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      auth_identities: {
        Row: {
          auth_identity_id: string
          created_at: string
          provider: string
          provider_subject: string
          user_id: string
        }
        Insert: {
          auth_identity_id?: string
          created_at?: string
          provider: string
          provider_subject: string
          user_id: string
        }
        Update: {
          auth_identity_id?: string
          created_at?: string
          provider?: string
          provider_subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auth_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chats: {
        Row: {
          anchor_post_id: string | null
          anchor_ride_id: string | null
          chat_id: string
          created_at: string
          inbox_hidden_at_a: string | null
          inbox_hidden_at_b: string | null
          is_support_thread: boolean
          last_message_at: string
          participant_a: string | null
          participant_b: string | null
          removed_at: string | null
        }
        Insert: {
          anchor_post_id?: string | null
          anchor_ride_id?: string | null
          chat_id?: string
          created_at?: string
          inbox_hidden_at_a?: string | null
          inbox_hidden_at_b?: string | null
          is_support_thread?: boolean
          last_message_at?: string
          participant_a?: string | null
          participant_b?: string | null
          removed_at?: string | null
        }
        Update: {
          anchor_post_id?: string | null
          anchor_ride_id?: string | null
          chat_id?: string
          created_at?: string
          inbox_hidden_at_a?: string | null
          inbox_hidden_at_b?: string | null
          is_support_thread?: boolean
          last_message_at?: string
          participant_a?: string | null
          participant_b?: string | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_anchor_post_id_fkey"
            columns: ["anchor_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "chats_anchor_ride_id_fkey"
            columns: ["anchor_ride_id"]
            isOneToOne: false
            referencedRelation: "ride_listings"
            referencedColumns: ["ride_id"]
          },
          {
            foreignKeyName: "chats_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chats_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cities: {
        Row: {
          city_id: string
          country_code: string
          lat: number | null
          lon: number | null
          name_en: string
          name_he: string
        }
        Insert: {
          city_id: string
          country_code?: string
          lat?: number | null
          lon?: number | null
          name_en: string
          name_he: string
        }
        Update: {
          city_id?: string
          country_code?: string
          lat?: number | null
          lon?: number | null
          name_en?: string
          name_he?: string
        }
        Relationships: []
      }
      closure_cleanup_metrics: {
        Row: {
          deleted_count: number
          run_at: string
        }
        Insert: {
          deleted_count: number
          run_at?: string
        }
        Update: {
          deleted_count?: number
          run_at?: string
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          confidence: number | null
          content_id: string
          content_type: string
          created_at: string
          field: string
          id: string
          model: string | null
          source_language: string | null
          target_language: string
          translated_text: string
        }
        Insert: {
          confidence?: number | null
          content_id: string
          content_type: string
          created_at?: string
          field: string
          id?: string
          model?: string | null
          source_language?: string | null
          target_language: string
          translated_text: string
        }
        Update: {
          confidence?: number | null
          content_id?: string
          content_type?: string
          created_at?: string
          field?: string
          id?: string
          model?: string | null
          source_language?: string | null
          target_language?: string
          translated_text?: string
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          last_contacted_at: string | null
          name: string
          notes: string | null
          organization: string | null
          phone: string | null
          role_title: string | null
          status: string
          tags: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          role_title?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          role_title?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "crm_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      devices: {
        Row: {
          active: boolean
          device_id: string
          last_seen_at: string
          platform: string
          push_token: string
          user_id: string
        }
        Insert: {
          active?: boolean
          device_id?: string
          last_seen_at?: string
          platform: string
          push_token: string
          user_id: string
        }
        Update: {
          active?: boolean
          device_id?: string
          last_seen_at?: string
          platform?: string
          push_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      donation_categories: {
        Row: {
          icon_name: string
          is_active: boolean
          label_he: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon_name: string
          is_active?: boolean
          label_he: string
          slug: string
          sort_order: number
        }
        Update: {
          icon_name?: string
          is_active?: boolean
          label_he?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      donation_links: {
        Row: {
          category_slug: string
          created_at: string
          description: string | null
          display_name: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          search_vector: unknown
          submitted_by: string
          tags: string | null
          url: string
          validated_at: string
        }
        Insert: {
          category_slug: string
          created_at?: string
          description?: string | null
          display_name: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          search_vector?: unknown
          submitted_by: string
          tags?: string | null
          url: string
          validated_at: string
        }
        Update: {
          category_slug?: string
          created_at?: string
          description?: string | null
          display_name?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          search_vector?: unknown
          submitted_by?: string
          tags?: string | null
          url?: string
          validated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_links_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "donation_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      driver_declarations: {
        Row: {
          declared_at: string
          insurance_declared: boolean
          license_declared: boolean
          no_profit_acknowledged: boolean
          user_id: string
        }
        Insert: {
          declared_at?: string
          insurance_declared: boolean
          license_declared: boolean
          no_profit_acknowledged: boolean
          user_id: string
        }
        Update: {
          declared_at?: string
          insurance_declared?: boolean
          license_declared?: boolean
          no_profit_acknowledged?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_declarations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_declarations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      finance_ledger_entries: {
        Row: {
          amount_cents: number
          category: string | null
          counterparty: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          direction: string
          entry_id: string
          kind: string
          occurred_at: string
          reference_url: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_cents: number
          category?: string | null
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          direction: string
          entry_id?: string
          kind: string
          occurred_at?: string
          reference_url?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_cents?: number
          category?: string | null
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          direction?: string
          entry_id?: string
          kind?: string
          occurred_at?: string
          reference_url?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_ledger_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "finance_ledger_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      follow_edges: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_edges_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_edges_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_edges_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_edges_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      follow_requests: {
        Row: {
          cooldown_until: string | null
          created_at: string
          requester_id: string
          resolved_at: string | null
          status: string
          target_id: string
        }
        Insert: {
          cooldown_until?: string | null
          created_at?: string
          requester_id: string
          resolved_at?: string | null
          status?: string
          target_id: string
        }
        Update: {
          cooldown_until?: string | null
          created_at?: string
          requester_id?: string
          resolved_at?: string | null
          status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      glowe_applications: {
        Row: {
          availability: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          motivation: string | null
          opportunity_id: string
          rejection_note: string | null
          skills: string | null
          status: string
          submitted_comment: string | null
          submitted_email: string | null
          submitted_phone: string | null
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          motivation?: string | null
          opportunity_id: string
          rejection_note?: string | null
          skills?: string | null
          status?: string
          submitted_comment?: string | null
          submitted_email?: string | null
          submitted_phone?: string | null
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          motivation?: string | null
          opportunity_id?: string
          rejection_note?: string | null
          skills?: string | null
          status?: string
          submitted_comment?: string | null
          submitted_email?: string | null
          submitted_phone?: string | null
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: []
      }
      glowe_comments: {
        Row: {
          author_name: string | null
          author_name_en: string | null
          created_at: string
          id: string
          post_id: string
          text: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          author_name_en?: string | null
          created_at?: string
          id?: string
          post_id: string
          text: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          author_name_en?: string | null
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      glowe_content_translations: {
        Row: {
          confidence: number | null
          content_id: string
          content_type: string
          created_at: string
          field: string
          id: string
          model: string | null
          source_language: string | null
          target_language: string
          translated_text: string
        }
        Insert: {
          confidence?: number | null
          content_id: string
          content_type: string
          created_at?: string
          field: string
          id?: string
          model?: string | null
          source_language?: string | null
          target_language: string
          translated_text: string
        }
        Update: {
          confidence?: number | null
          content_id?: string
          content_type?: string
          created_at?: string
          field?: string
          id?: string
          model?: string | null
          source_language?: string | null
          target_language?: string
          translated_text?: string
        }
        Relationships: []
      }
      glowe_email_outbox: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          email_id: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          template: string
          to_email: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          email_id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          template: string
          to_email: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          email_id?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          template?: string
          to_email?: string
        }
        Relationships: []
      }
      glowe_forum_groups: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          tags: string[]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id: string
          tags?: string[]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      glowe_forum_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          thread_id: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          thread_id: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glowe_forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "glowe_forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      glowe_forum_threads: {
        Row: {
          body: string | null
          created_at: string
          group_id: string
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          group_id: string
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          group_id?: string
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glowe_forum_threads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "glowe_forum_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      glowe_health_checks: {
        Row: {
          app_version: string | null
          check_name: string
          checked_at: string
          environment: string
          error_code: string | null
          error_detail: string | null
          id: string
          latency_ms: number | null
          run_id: string
          status: string
        }
        Insert: {
          app_version?: string | null
          check_name: string
          checked_at?: string
          environment?: string
          error_code?: string | null
          error_detail?: string | null
          id?: string
          latency_ms?: number | null
          run_id: string
          status: string
        }
        Update: {
          app_version?: string | null
          check_name?: string
          checked_at?: string
          environment?: string
          error_code?: string | null
          error_detail?: string | null
          id?: string
          latency_ms?: number | null
          run_id?: string
          status?: string
        }
        Relationships: []
      }
      glowe_offers: {
        Row: {
          availability: string | null
          contact_preference: string | null
          created_at: string
          id: string
          offer_text: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          contact_preference?: string | null
          created_at?: string
          id?: string
          offer_text?: string | null
          post_id: string
          user_id?: string
        }
        Update: {
          availability?: string | null
          contact_preference?: string | null
          created_at?: string
          id?: string
          offer_text?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glowe_offers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "glowe_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      glowe_opportunities: {
        Row: {
          capacity: number | null
          commitment: string | null
          created_at: string
          description: string | null
          duration: string | null
          end_at: string | null
          event_link: string | null
          event_type: string | null
          featured: boolean
          field: string | null
          id: string
          link_reveal_hours: number | null
          link_visibility: string
          location: string | null
          org_icon: string | null
          organization: string
          organization_en: string | null
          registration_mode: string
          requirements: string[]
          responsibilities: string[]
          skills: string[]
          start_at: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          capacity?: number | null
          commitment?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          end_at?: string | null
          event_link?: string | null
          event_type?: string | null
          featured?: boolean
          field?: string | null
          id?: string
          link_reveal_hours?: number | null
          link_visibility?: string
          location?: string | null
          org_icon?: string | null
          organization: string
          organization_en?: string | null
          registration_mode?: string
          requirements?: string[]
          responsibilities?: string[]
          skills?: string[]
          start_at?: string | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          capacity?: number | null
          commitment?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          end_at?: string | null
          event_link?: string | null
          event_type?: string | null
          featured?: boolean
          field?: string | null
          id?: string
          link_reveal_hours?: number | null
          link_visibility?: string
          location?: string | null
          org_icon?: string | null
          organization?: string
          organization_en?: string | null
          registration_mode?: string
          requirements?: string[]
          responsibilities?: string[]
          skills?: string[]
          start_at?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      glowe_posts: {
        Row: {
          audience: string | null
          author_avatar_url: string | null
          author_id: string | null
          author_name: string | null
          author_name_en: string | null
          category: string | null
          created_at: string
          id: string
          impact_area: string | null
          language: string | null
          link: string | null
          post_type: string
          status: string
          tags: string[]
          text: string | null
          title: string
          user_id: string | null
          wish_type: string | null
        }
        Insert: {
          audience?: string | null
          author_avatar_url?: string | null
          author_id?: string | null
          author_name?: string | null
          author_name_en?: string | null
          category?: string | null
          created_at?: string
          id?: string
          impact_area?: string | null
          language?: string | null
          link?: string | null
          post_type?: string
          status?: string
          tags?: string[]
          text?: string | null
          title: string
          user_id?: string | null
          wish_type?: string | null
        }
        Update: {
          audience?: string | null
          author_avatar_url?: string | null
          author_id?: string | null
          author_name?: string | null
          author_name_en?: string | null
          category?: string | null
          created_at?: string
          id?: string
          impact_area?: string | null
          language?: string | null
          link?: string | null
          post_type?: string
          status?: string
          tags?: string[]
          text?: string | null
          title?: string
          user_id?: string | null
          wish_type?: string | null
        }
        Relationships: []
      }
      glowe_profiles: {
        Row: {
          about: string | null
          account_type: string | null
          approval_status: string
          availability: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string
          display_name_en: string | null
          email: string | null
          focus: string | null
          id: string
          languages: string[]
          location: string | null
          needs: string | null
          onboarding_complete: boolean
          org_contact_email: string | null
          org_contact_name: string | null
          org_contact_phone: string | null
          org_country: string | null
          org_description: string | null
          org_field: string | null
          org_name: string | null
          org_name_en: string | null
          org_registration_number: string | null
          org_review_note: string | null
          org_reviewed_at: string | null
          org_reviewed_by: string | null
          org_size: string | null
          org_submitted_at: string | null
          org_website: string | null
          profile_status: string
          profile_type: string | null
          public_link: string | null
          raw_profile: Json
          skills: string[]
          updated_at: string
        }
        Insert: {
          about?: string | null
          account_type?: string | null
          approval_status?: string
          availability?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          display_name_en?: string | null
          email?: string | null
          focus?: string | null
          id: string
          languages?: string[]
          location?: string | null
          needs?: string | null
          onboarding_complete?: boolean
          org_contact_email?: string | null
          org_contact_name?: string | null
          org_contact_phone?: string | null
          org_country?: string | null
          org_description?: string | null
          org_field?: string | null
          org_name?: string | null
          org_name_en?: string | null
          org_registration_number?: string | null
          org_review_note?: string | null
          org_reviewed_at?: string | null
          org_reviewed_by?: string | null
          org_size?: string | null
          org_submitted_at?: string | null
          org_website?: string | null
          profile_status?: string
          profile_type?: string | null
          public_link?: string | null
          raw_profile?: Json
          skills?: string[]
          updated_at?: string
        }
        Update: {
          about?: string | null
          account_type?: string | null
          approval_status?: string
          availability?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          display_name_en?: string | null
          email?: string | null
          focus?: string | null
          id?: string
          languages?: string[]
          location?: string | null
          needs?: string | null
          onboarding_complete?: boolean
          org_contact_email?: string | null
          org_contact_name?: string | null
          org_contact_phone?: string | null
          org_country?: string | null
          org_description?: string | null
          org_field?: string | null
          org_name?: string | null
          org_name_en?: string | null
          org_registration_number?: string | null
          org_review_note?: string | null
          org_reviewed_at?: string | null
          org_reviewed_by?: string | null
          org_size?: string | null
          org_submitted_at?: string | null
          org_website?: string | null
          profile_status?: string
          profile_type?: string | null
          public_link?: string | null
          raw_profile?: Json
          skills?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      glowe_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      glowe_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      glowe_saved_items: {
        Row: {
          created_at: string
          href: string | null
          id: string
          item_id: string
          item_type: string
          meta: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          href?: string | null
          id?: string
          item_id: string
          item_type: string
          meta?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          href?: string | null
          id?: string
          item_id?: string
          item_type?: string
          meta?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      karma_drift_events: {
        Row: {
          detected_at: string
          drift_id: number
          new_value: number
          old_value: number
          run_id: number
          user_id: string
        }
        Insert: {
          detected_at?: string
          drift_id?: number
          new_value: number
          old_value: number
          run_id: number
          user_id: string
        }
        Update: {
          detected_at?: string
          drift_id?: number
          new_value?: number
          old_value?: number
          run_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "karma_drift_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "karma_recompute_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "karma_drift_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "karma_drift_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      karma_ledger: {
        Row: {
          created_at: string
          event_type: string
          ledger_id: number
          points_delta: number
          ref_id: string
          ref_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          ledger_id?: number
          points_delta: number
          ref_id: string
          ref_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          ledger_id?: number
          points_delta?: number
          ref_id?: string
          ref_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "karma_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "karma_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      karma_recompute_runs: {
        Row: {
          drift_events: number
          run_at: string
          run_id: number
          users_processed: number
        }
        Insert: {
          drift_events: number
          run_at?: string
          run_id?: number
          users_processed: number
        }
        Update: {
          drift_events?: number
          run_at?: string
          run_id?: number
          users_processed?: number
        }
        Relationships: []
      }
      legal_document_versions: {
        Row: {
          body_md: string
          change_summary: string | null
          content_hash: string
          created_at: string
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          effective_date: string
          id: string
          language: string
          published_at: string
          published_by: string
          severity: string
          version: number
        }
        Insert: {
          body_md: string
          change_summary?: string | null
          content_hash?: string
          created_at?: string
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          effective_date: string
          id?: string
          language?: string
          published_at?: string
          published_by: string
          severity: string
          version: number
        }
        Update: {
          body_md?: string
          change_summary?: string | null
          content_hash?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["legal_doc_type"]
          effective_date?: string
          id?: string
          language?: string
          published_at?: string
          published_by?: string
          severity?: string
          version?: number
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          current_effective_date: string
          current_version: number
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          id: string
          last_material_severity: string | null
          last_material_version: number
          updated_at: string
        }
        Insert: {
          current_effective_date: string
          current_version?: number
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          id?: string
          last_material_severity?: string | null
          last_material_version?: number
          updated_at?: string
        }
        Update: {
          current_effective_date?: string
          current_version?: number
          doc_type?: Database["public"]["Enums"]["legal_doc_type"]
          id?: string
          last_material_severity?: string | null
          last_material_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          created_at: string
          media_asset_id: string
          mime_type: string
          ordinal: number
          path: string
          post_id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          media_asset_id?: string
          mime_type: string
          ordinal: number
          path: string
          post_id: string
          size_bytes: number
        }
        Update: {
          created_at?: string
          media_asset_id?: string
          mime_type?: string
          ordinal?: number
          path?: string
          post_id?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          chat_id: string
          created_at: string
          delivered_at: string | null
          kind: string
          message_id: string
          read_at: string | null
          sender_id: string | null
          source_language: string | null
          source_language_confidence: number | null
          status: string
          system_payload: Json | null
        }
        Insert: {
          body?: string | null
          chat_id: string
          created_at?: string
          delivered_at?: string | null
          kind?: string
          message_id?: string
          read_at?: string | null
          sender_id?: string | null
          source_language?: string | null
          source_language_confidence?: number | null
          status?: string
          system_payload?: Json | null
        }
        Update: {
          body?: string | null
          chat_id?: string
          created_at?: string
          delivered_at?: string | null
          kind?: string
          message_id?: string
          read_at?: string | null
          sender_id?: string | null
          source_language?: string | null
          source_language_confidence?: number | null
          status?: string
          system_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["chat_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      moderation_queue_entries: {
        Row: {
          created_at: string
          entry_id: string
          metadata: Json | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          entry_id?: string
          metadata?: Json | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          metadata?: Json | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_entries_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "moderation_queue_entries_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications_outbox: {
        Row: {
          attempts: number
          body_args: Json
          body_key: string
          bypass_preferences: boolean
          category: string
          created_at: string
          data: Json
          dedupe_key: string | null
          dispatched_at: string | null
          expires_at: string
          kind: string
          last_error: string | null
          notification_id: string
          title_key: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body_args?: Json
          body_key: string
          bypass_preferences?: boolean
          category: string
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          dispatched_at?: string | null
          expires_at?: string
          kind: string
          last_error?: string | null
          notification_id?: string
          title_key: string
          user_id: string
        }
        Update: {
          attempts?: number
          body_args?: Json
          body_key?: string
          bypass_preferences?: boolean
          category?: string
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          dispatched_at?: string | null
          expires_at?: string
          kind?: string
          last_error?: string | null
          notification_id?: string
          title_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      org_applications: {
        Row: {
          applicant_user_id: string
          application_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          org_description: string | null
          org_name: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          website_url: string | null
        }
        Insert: {
          applicant_user_id: string
          application_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          org_description?: string | null
          org_name: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website_url?: string | null
        }
        Update: {
          applicant_user_id?: string
          application_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          org_description?: string | null
          org_name?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_applications_applicant_user_id_fkey"
            columns: ["applicant_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_applications_applicant_user_id_fkey"
            columns: ["applicant_user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          is_platform: boolean
          name: string
          org_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          is_platform?: boolean
          name: string
          org_id?: string
          slug: string
        }
        Update: {
          created_at?: string
          is_platform?: boolean
          name?: string
          org_id?: string
          slug?: string
        }
        Relationships: []
      }
      post_actor_identity: {
        Row: {
          hide_from_counterparty: boolean
          identity_visibility: string
          post_id: string
          surface_visibility: string
          updated_at: string
          user_id: string
        }
        Insert: {
          hide_from_counterparty?: boolean
          identity_visibility: string
          post_id: string
          surface_visibility?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          hide_from_counterparty?: boolean
          identity_visibility?: string
          post_id?: string
          surface_visibility?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_actor_identity_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_actor_identity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_actor_identity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      posts: {
        Row: {
          category: string
          city: string
          created_at: string
          delete_after: string | null
          description: string | null
          estimated_value: number | null
          item_condition: string | null
          location_display_level: string
          owner_id: string
          post_id: string
          reopen_count: number
          search_vector: unknown
          source_language: string | null
          source_language_confidence: number | null
          status: string
          status_before_admin_removal: string | null
          street: string
          street_number: string
          title: string
          type: string
          updated_at: string
          urgency: string | null
          visibility: string
        }
        Insert: {
          category?: string
          city: string
          created_at?: string
          delete_after?: string | null
          description?: string | null
          estimated_value?: number | null
          item_condition?: string | null
          location_display_level?: string
          owner_id: string
          post_id?: string
          reopen_count?: number
          search_vector?: unknown
          source_language?: string | null
          source_language_confidence?: number | null
          status?: string
          status_before_admin_removal?: string | null
          street: string
          street_number: string
          title: string
          type: string
          updated_at?: string
          urgency?: string | null
          visibility?: string
        }
        Update: {
          category?: string
          city?: string
          created_at?: string
          delete_after?: string | null
          description?: string | null
          estimated_value?: number | null
          item_condition?: string | null
          location_display_level?: string
          owner_id?: string
          post_id?: string
          reopen_count?: number
          search_vector?: unknown
          source_language?: string | null
          source_language_confidence?: number | null
          status?: string
          status_before_admin_removal?: string | null
          street?: string
          street_number?: string
          title?: string
          type?: string
          updated_at?: string
          urgency?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "posts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_research_contact_requests: {
        Row: {
          consent_at: string
          contact_email: string
          contact_window_he: string | null
          id: string
          response_id: string
        }
        Insert: {
          consent_at?: string
          contact_email: string
          contact_window_he?: string | null
          id?: string
          response_id: string
        }
        Update: {
          consent_at?: string
          contact_email?: string
          contact_window_he?: string | null
          id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_research_contact_requests_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "public_research_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      public_research_responses: {
        Row: {
          answers: Json
          created_at: string
          id: string
          ip_hash: string
          source: string
          survey_slug: string
          user_agent_hash: string | null
          version: number
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          ip_hash: string
          source?: string
          survey_slug: string
          user_agent_hash?: string | null
          version: number
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          ip_hash?: string
          source?: string
          survey_slug?: string
          user_agent_hash?: string | null
          version?: number
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      recipients: {
        Row: {
          marked_at: string
          post_id: string
          recipient_user_id: string
        }
        Insert: {
          marked_at?: string
          post_id: string
          recipient_user_id: string
        }
        Update: {
          marked_at?: string
          post_id?: string
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipients_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "recipients_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recipients_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reporter_hides: {
        Row: {
          created_at: string
          reporter_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          reporter_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          reporter_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporter_hides_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reporter_hides_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          note: string | null
          reason: string
          report_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          sanction_consumed_at: string | null
          status: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          reason: string
          report_id?: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          sanction_consumed_at?: string | null
          status?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          created_at?: string
          note?: string | null
          reason?: string
          report_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sanction_consumed_at?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      research_secrets: {
        Row: {
          key: string
          rotated_at: string
          value: string
        }
        Insert: {
          key: string
          rotated_at?: string
          value: string
        }
        Update: {
          key?: string
          rotated_at?: string
          value?: string
        }
        Relationships: []
      }
      ride_emergency_events: {
        Row: {
          event_id: string
          lat: number | null
          lng: number | null
          note: string | null
          resolved_at: string | null
          resolved_by: string | null
          ride_id: string
          triggered_at: string
          triggered_by: string
        }
        Insert: {
          event_id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          ride_id: string
          triggered_at?: string
          triggered_by: string
        }
        Update: {
          event_id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          ride_id?: string
          triggered_at?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_emergency_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_emergency_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_emergency_events_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "ride_listings"
            referencedColumns: ["ride_id"]
          },
          {
            foreignKeyName: "ride_emergency_events_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_emergency_events_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ride_listings: {
        Row: {
          arrive_reason: string | null
          arrived_at: string | null
          cargo_allowed_types: string[] | null
          cargo_enabled: boolean
          cargo_max_volume_l: number | null
          cargo_max_weight_kg: number | null
          created_at: string
          departs_at: string
          description: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number: string | null
          food_chilled: boolean | null
          food_handover_to_org: boolean
          food_max_kg: number | null
          food_shipping_enabled: boolean
          linked_post_id: string | null
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number: string | null
          owner_id: string
          payment_amount_ils: number | null
          payment_model: string
          req_gender: string
          req_pets_allowed: boolean
          req_smoking_allowed: boolean
          req_verified_only: boolean
          ride_id: string
          seats_available: number | null
          started_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          arrive_reason?: string | null
          arrived_at?: string | null
          cargo_allowed_types?: string[] | null
          cargo_enabled?: boolean
          cargo_max_volume_l?: number | null
          cargo_max_weight_kg?: number | null
          created_at?: string
          departs_at: string
          description?: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number?: string | null
          food_chilled?: boolean | null
          food_handover_to_org?: boolean
          food_max_kg?: number | null
          food_shipping_enabled?: boolean
          linked_post_id?: string | null
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number?: string | null
          owner_id: string
          payment_amount_ils?: number | null
          payment_model?: string
          req_gender?: string
          req_pets_allowed?: boolean
          req_smoking_allowed?: boolean
          req_verified_only?: boolean
          ride_id?: string
          seats_available?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          arrive_reason?: string | null
          arrived_at?: string | null
          cargo_allowed_types?: string[] | null
          cargo_enabled?: boolean
          cargo_max_volume_l?: number | null
          cargo_max_weight_kg?: number | null
          created_at?: string
          departs_at?: string
          description?: string | null
          dest_city_id?: string
          dest_street?: string
          dest_street_number?: string | null
          food_chilled?: boolean | null
          food_handover_to_org?: boolean
          food_max_kg?: number | null
          food_shipping_enabled?: boolean
          linked_post_id?: string | null
          mode?: string
          origin_city_id?: string
          origin_street?: string
          origin_street_number?: string | null
          owner_id?: string
          payment_amount_ils?: number | null
          payment_model?: string
          req_gender?: string
          req_pets_allowed?: boolean
          req_smoking_allowed?: boolean
          req_verified_only?: boolean
          ride_id?: string
          seats_available?: number | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_listings_dest_city_id_fkey"
            columns: ["dest_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "ride_listings_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "ride_listings_origin_city_id_fkey"
            columns: ["origin_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "ride_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_listings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ride_templates"
            referencedColumns: ["template_id"]
          },
        ]
      }
      ride_participants: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          joined_active_at: string | null
          note: string | null
          participant_id: string
          requested_at: string
          ride_id: string
          status: string
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          joined_active_at?: string | null
          note?: string | null
          participant_id?: string
          requested_at?: string
          ride_id: string
          status?: string
          user_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          joined_active_at?: string | null
          note?: string | null
          participant_id?: string
          requested_at?: string
          ride_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_participants_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_participants_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_participants_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "ride_listings"
            referencedColumns: ["ride_id"]
          },
          {
            foreignKeyName: "ride_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ride_ratings: {
        Row: {
          comment: string | null
          created_at: string
          is_penalty: boolean
          ratee_id: string
          rater_id: string
          rating_id: string
          ride_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          is_penalty?: boolean
          ratee_id: string
          rater_id: string
          rating_id?: string
          ride_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          is_penalty?: boolean
          ratee_id?: string
          rater_id?: string
          rating_id?: string
          ride_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "ride_listings"
            referencedColumns: ["ride_id"]
          },
        ]
      }
      ride_stops: {
        Row: {
          city_id: string
          created_at: string
          notes: string | null
          ride_id: string
          sort_order: number
          stop_id: string
          street: string | null
        }
        Insert: {
          city_id: string
          created_at?: string
          notes?: string | null
          ride_id: string
          sort_order: number
          stop_id?: string
          street?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string
          notes?: string | null
          ride_id?: string
          sort_order?: number
          stop_id?: string
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_stops_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "ride_stops_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "ride_listings"
            referencedColumns: ["ride_id"]
          },
        ]
      }
      ride_templates: {
        Row: {
          created_at: string
          depart_time: string
          description: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number: string | null
          lookahead_days: number
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number: string | null
          owner_id: string
          seats_available: number | null
          status: string
          template_id: string
          updated_at: string
          visibility: string
          weekday_mask: number
        }
        Insert: {
          created_at?: string
          depart_time: string
          description?: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number?: string | null
          lookahead_days?: number
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number?: string | null
          owner_id: string
          seats_available?: number | null
          status?: string
          template_id?: string
          updated_at?: string
          visibility?: string
          weekday_mask: number
        }
        Update: {
          created_at?: string
          depart_time?: string
          description?: string | null
          dest_city_id?: string
          dest_street?: string
          dest_street_number?: string | null
          lookahead_days?: number
          mode?: string
          origin_city_id?: string
          origin_street?: string
          origin_street_number?: string | null
          owner_id?: string
          seats_available?: number | null
          status?: string
          template_id?: string
          updated_at?: string
          visibility?: string
          weekday_mask?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_templates_dest_city_id_fkey"
            columns: ["dest_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "ride_templates_origin_city_id_fkey"
            columns: ["origin_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "ride_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          post_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          post_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          post_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stats_drift_events: {
        Row: {
          column_name: string
          detected_at: string
          drift_id: number
          new_value: number
          old_value: number
          run_id: number
          user_id: string
        }
        Insert: {
          column_name: string
          detected_at?: string
          drift_id?: number
          new_value: number
          old_value: number
          run_id: number
          user_id: string
        }
        Update: {
          column_name?: string
          detected_at?: string
          drift_id?: number
          new_value?: number
          old_value?: number
          run_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stats_drift_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "stats_recompute_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "stats_drift_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stats_drift_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stats_recompute_runs: {
        Row: {
          drift_events: number
          run_at: string
          run_id: number
          users_processed: number
        }
        Insert: {
          drift_events: number
          run_at?: string
          run_id?: number
          users_processed: number
        }
        Update: {
          drift_events?: number
          run_at?: string
          run_id?: number
          users_processed?: number
        }
        Relationships: []
      }
      streets: {
        Row: {
          city_id: string
          name_he: string
          street_id: number
        }
        Insert: {
          city_id: string
          name_he: string
          street_id: number
        }
        Update: {
          city_id?: string
          name_he?: string
          street_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "streets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer_text: string | null
          created_at: string
          id: string
          question_id: string
          rating: number
          survey_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id: string
          rating: number
          survey_id: string
          updated_at?: string
          user_id: string
          version: number
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id?: string
          rating?: number
          survey_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          context_he: string
          id: string
          prompt_he: string
          question_type: Database["public"]["Enums"]["survey_question_type"]
          rating_anchor_high_he: string
          rating_anchor_low_he: string
          short_label_he: string
          sort_order: number
          survey_version_id: string
          text_placeholder_he: string
        }
        Insert: {
          context_he?: string
          id?: string
          prompt_he: string
          question_type?: Database["public"]["Enums"]["survey_question_type"]
          rating_anchor_high_he?: string
          rating_anchor_low_he?: string
          short_label_he: string
          sort_order: number
          survey_version_id: string
          text_placeholder_he?: string
        }
        Update: {
          context_he?: string
          id?: string
          prompt_he?: string
          question_type?: Database["public"]["Enums"]["survey_question_type"]
          rating_anchor_high_he?: string
          rating_anchor_low_he?: string
          short_label_he?: string
          sort_order?: number
          survey_version_id?: string
          text_placeholder_he?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_version_id_fkey"
            columns: ["survey_version_id"]
            isOneToOne: false
            referencedRelation: "survey_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_versions: {
        Row: {
          id: string
          published_at: string
          published_by: string
          survey_id: string
          version: number
        }
        Insert: {
          id?: string
          published_at?: string
          published_by: string
          survey_id: string
          version: number
        }
        Update: {
          id?: string
          published_at?: string
          published_by?: string
          survey_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_versions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          current_version: number
          description_he: string | null
          id: string
          is_active: boolean
          prompt_rules: Json
          slug: string
          title_he: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version?: number
          description_he?: string | null
          id?: string
          is_active?: boolean
          prompt_rules?: Json
          slug: string
          title_he: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version?: number
          description_he?: string | null
          id?: string
          is_active?: boolean
          prompt_rules?: Json
          slug?: string
          title_he?: string
          updated_at?: string
        }
        Relationships: []
      }
      timesheet_entries: {
        Row: {
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          entry_id: string
          hours_x100: number
          project: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          entry_id?: string
          hours_x100: number
          project?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          entry_id?: string
          hours_x100?: number
          project?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timesheet_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          body: string
          created_at: string
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_legal_acceptances: {
        Row: {
          accepted_at: string
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          id: string
          ip_inet: unknown
          locale: string | null
          user_agent: string | null
          user_id: string
          version: number
        }
        Insert: {
          accepted_at?: string
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          id?: string
          ip_inet?: unknown
          locale?: string | null
          user_agent?: string | null
          user_id: string
          version: number
        }
        Update: {
          accepted_at?: string
          doc_type?: Database["public"]["Enums"]["legal_doc_type"]
          id?: string
          ip_inet?: unknown
          locale?: string | null
          user_agent?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_legal_acceptances_version_fk"
            columns: ["doc_type", "version"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["doc_type", "version"]
          },
        ]
      }
      user_personal_activity_log: {
        Row: {
          actor_display_name: string | null
          kind: string
          log_id: number
          occurred_at: string
          post_id: string
          post_title: string
          subject_user_id: string
        }
        Insert: {
          actor_display_name?: string | null
          kind: string
          log_id?: number
          occurred_at: string
          post_id: string
          post_title: string
          subject_user_id: string
        }
        Update: {
          actor_display_name?: string | null
          kind?: string
          log_id?: number
          occurred_at?: string
          post_id?: string
          post_title?: string
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_personal_activity_log_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_personal_activity_log_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: string
          account_status_until: string | null
          active_posts_count_followers_only_open: number
          active_posts_count_internal: number
          active_posts_count_public_open: number
          auth_provider: string
          avatar_url: string | null
          basic_info_skipped: boolean
          biography: string | null
          city: string | null
          city_name: string | null
          closure_explainer_dismissed: boolean
          contact_phone: string | null
          created_at: string
          display_name: string | null
          false_report_sanction_count: number
          false_reports_count: number
          first_post_nudge_dismissed: boolean
          followers_count: number
          following_count: number
          is_super_admin: boolean
          items_given_count: number
          items_received_count: number
          karma_points: number
          notification_preferences: Json
          onboarding_state: string
          posts_created_total: number
          preferred_language: string | null
          privacy_changed_at: string | null
          privacy_mode: string
          profile_street: string | null
          profile_street_number: string | null
          search_vector: unknown
          share_handle: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          account_status_until?: string | null
          active_posts_count_followers_only_open?: number
          active_posts_count_internal?: number
          active_posts_count_public_open?: number
          auth_provider: string
          avatar_url?: string | null
          basic_info_skipped?: boolean
          biography?: string | null
          city?: string | null
          city_name?: string | null
          closure_explainer_dismissed?: boolean
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          false_report_sanction_count?: number
          false_reports_count?: number
          first_post_nudge_dismissed?: boolean
          followers_count?: number
          following_count?: number
          is_super_admin?: boolean
          items_given_count?: number
          items_received_count?: number
          karma_points?: number
          notification_preferences?: Json
          onboarding_state?: string
          posts_created_total?: number
          preferred_language?: string | null
          privacy_changed_at?: string | null
          privacy_mode?: string
          profile_street?: string | null
          profile_street_number?: string | null
          search_vector?: unknown
          share_handle: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          account_status_until?: string | null
          active_posts_count_followers_only_open?: number
          active_posts_count_internal?: number
          active_posts_count_public_open?: number
          auth_provider?: string
          avatar_url?: string | null
          basic_info_skipped?: boolean
          biography?: string | null
          city?: string | null
          city_name?: string | null
          closure_explainer_dismissed?: boolean
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          false_report_sanction_count?: number
          false_reports_count?: number
          first_post_nudge_dismissed?: boolean
          followers_count?: number
          following_count?: number
          is_super_admin?: boolean
          items_given_count?: number
          items_received_count?: number
          karma_points?: number
          notification_preferences?: Json
          onboarding_state?: string
          posts_created_total?: number
          preferred_language?: string | null
          privacy_changed_at?: string | null
          privacy_mode?: string
          profile_street?: string | null
          profile_street_number?: string | null
          search_vector?: unknown
          share_handle?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
        ]
      }
    }
    Views: {
      about_team_profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          role_key: string | null
          share_handle: string | null
          sort_order: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "about_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "about_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_stats: {
        Row: {
          active_public_posts: number | null
          as_of: string | null
          items_delivered_total: number | null
          registered_users: number | null
        }
        Relationships: []
      }
      glowe_public_profiles: {
        Row: {
          about: string | null
          account_type: string | null
          approval_status: string | null
          availability: string | null
          avatar_url: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          display_name_en: string | null
          focus: string | null
          id: string | null
          languages: string[] | null
          location: string | null
          needs: string | null
          onboarding_complete: boolean | null
          org_country: string | null
          org_description: string | null
          org_field: string | null
          org_name: string | null
          org_name_en: string | null
          org_size: string | null
          org_website: string | null
          profile_status: string | null
          profile_type: string | null
          public_link: string | null
          skills: string[] | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          account_type?: string | null
          approval_status?: string | null
          availability?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          display_name_en?: string | null
          focus?: string | null
          id?: string | null
          languages?: string[] | null
          location?: string | null
          needs?: string | null
          onboarding_complete?: boolean | null
          org_country?: string | null
          org_description?: string | null
          org_field?: string | null
          org_name?: string | null
          org_name_en?: string | null
          org_size?: string | null
          org_website?: string | null
          profile_status?: string | null
          profile_type?: string | null
          public_link?: string | null
          skills?: string[] | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          account_type?: string | null
          approval_status?: string | null
          availability?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          display_name_en?: string | null
          focus?: string | null
          id?: string | null
          languages?: string[] | null
          location?: string | null
          needs?: string | null
          onboarding_complete?: boolean | null
          org_country?: string | null
          org_description?: string | null
          org_field?: string | null
          org_name?: string | null
          org_name_en?: string | null
          org_size?: string | null
          org_website?: string | null
          profile_status?: string | null
          profile_type?: string | null
          public_link?: string | null
          skills?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_legal_acceptances_latest: {
        Row: {
          accepted_at: string | null
          doc_type: Database["public"]["Enums"]["legal_doc_type"] | null
          user_id: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_legal_acceptances_version_fk"
            columns: ["doc_type", "version"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["doc_type", "version"]
          },
        ]
      }
      user_ride_rating_summary: {
        Row: {
          avg_stars: number | null
          last_rated_at: string | null
          ratings_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_ratings_ratee_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ride_ratings_ratee_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users_public: {
        Row: {
          account_status: string | null
          auth_provider: string | null
          avatar_url: string | null
          basic_info_skipped: boolean | null
          biography: string | null
          city: string | null
          city_name: string | null
          closure_explainer_dismissed: boolean | null
          created_at: string | null
          display_name: string | null
          first_post_nudge_dismissed: boolean | null
          followers_count: number | null
          following_count: number | null
          items_given_count: number | null
          items_received_count: number | null
          onboarding_state: string | null
          privacy_changed_at: string | null
          privacy_mode: string | null
          share_handle: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_status?: string | null
          auth_provider?: string | null
          avatar_url?: string | null
          basic_info_skipped?: boolean | null
          biography?: string | null
          city?: string | null
          city_name?: string | null
          closure_explainer_dismissed?: boolean | null
          created_at?: string | null
          display_name?: string | null
          first_post_nudge_dismissed?: boolean | null
          followers_count?: number | null
          following_count?: number | null
          items_given_count?: number | null
          items_received_count?: number | null
          onboarding_state?: string | null
          privacy_changed_at?: string | null
          privacy_mode?: string | null
          share_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_status?: string | null
          auth_provider?: string | null
          avatar_url?: string | null
          basic_info_skipped?: boolean | null
          biography?: string | null
          city?: string | null
          city_name?: string | null
          closure_explainer_dismissed?: boolean | null
          created_at?: string | null
          display_name?: string | null
          first_post_nudge_dismissed?: boolean | null
          followers_count?: number | null
          following_count?: number | null
          items_given_count?: number | null
          items_received_count?: number | null
          onboarding_state?: string | null
          privacy_changed_at?: string | null
          privacy_mode?: string | null
          share_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
        ]
      }
    }
    Functions: {
      accept_legal_document: {
        Args: {
          p_doc_type: Database["public"]["Enums"]["legal_doc_type"]
          p_locale: string
          p_user_agent: string
          p_version: number
        }
        Returns: Json
      }
      active_posts_count_for_viewer: {
        Args: { p_owner: string; p_viewer: string }
        Returns: number
      }
      admin_assert_role: {
        Args: { allowed: string[]; uid: string }
        Returns: undefined
      }
      admin_audit_lookup: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          action: string
          actor_id: string | null
          created_at: string
          event_id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "audit_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_audit_lookup_guarded: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          action: string
          actor_id: string | null
          created_at: string
          event_id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "audit_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_audit_search: {
        Args: {
          p_action?: string
          p_actor_id?: string
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_target_user_id?: string
          p_to?: string
        }
        Returns: {
          action: string
          actor_display_name: string
          actor_id: string
          created_at: string
          event_id: string
          metadata: Json
          target_display_name: string
          target_id: string
          target_type: string
          total_count: number
        }[]
      }
      admin_ban_user: {
        Args: { p_note: string; p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      admin_confirm_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      admin_delete_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      admin_dismiss_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      admin_grant_role: {
        Args: {
          p_role: string
          p_scope_org_id?: string
          p_target_user_id: string
        }
        Returns: string
      }
      admin_list_admins: {
        Args: { p_include_revoked?: boolean }
        Returns: {
          avatar_url: string
          display_name: string
          grant_id: string
          granted_at: string
          granted_by: string
          granted_by_display_name: string
          last_seen_at: string
          revoked_at: string
          revoked_by: string
          role: string
          scope_org_id: string
          user_id: string
        }[]
      }
      admin_org_application_approve: {
        Args: { p_application_id: string; p_note?: string }
        Returns: undefined
      }
      admin_org_application_decide: {
        Args: { p_application_id: string; p_approve: boolean; p_note?: string }
        Returns: undefined
      }
      admin_org_application_list: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          applicant_name: string
          applicant_user_id: string
          application_id: string
          contact_email: string
          contact_phone: string
          created_at: string
          org_description: string
          org_name: string
          review_note: string
          reviewed_at: string
          reviewed_by: string
          reviewer_name: string
          status: string
          total_count: number
          website_url: string
        }[]
      }
      admin_org_application_reject: {
        Args: { p_application_id: string; p_note?: string }
        Returns: undefined
      }
      admin_org_tree: {
        Args: { p_org_id?: string }
        Returns: {
          avatar_url: string
          display_name: string
          effective_org_id: string
          grant_id: string
          is_platform: boolean
          last_seen_at: string
          manager_grant_id: string
          org_name: string
          role: string
          scope_org_id: string
          user_id: string
        }[]
      }
      admin_remove_post: { Args: { p_post_id: string }; Returns: undefined }
      admin_restore_target: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: undefined
      }
      admin_revoke_role: { Args: { p_grant_id: string }; Returns: undefined }
      admin_search_posts: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_status?: string
        }
        Returns: {
          created_at: string
          owner_display_name: string
          owner_id: string
          post_id: string
          status: string
          title: string
          total_count: number
          type: string
          updated_at: string
          visibility: string
        }[]
      }
      admin_search_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_status?: string
        }
        Returns: {
          account_status: string
          city_name: string
          created_at: string
          display_name: string
          last_seen_at: string
          share_handle: string
          total_count: number
          user_id: string
        }[]
      }
      admin_set_manager: {
        Args: { p_grant_id: string; p_manager_grant_id?: string }
        Returns: undefined
      }
      admin_survey_overview: { Args: never; Returns: Json }
      admin_survey_results: { Args: { p_slug: string }; Returns: Json }
      admin_task_add_comment: {
        Args: { p_body: string; p_task_id: string }
        Returns: string
      }
      admin_task_assign: {
        Args: { p_new_assignee: string; p_task_id: string }
        Returns: undefined
      }
      admin_task_create: {
        Args: {
          p_assignee_id?: string
          p_category?: string
          p_description?: string
          p_due_at?: string
          p_labels?: string[]
          p_priority?: string
          p_title: string
        }
        Returns: string
      }
      admin_task_delete: { Args: { p_task_id: string }; Returns: undefined }
      admin_task_detail: {
        Args: { p_task_id: string }
        Returns: {
          activities: Json
          assignee_display_name: string
          assignee_id: string
          category: string
          created_at: string
          created_by: string
          created_by_display_name: string
          description: string
          due_at: string
          labels: string[]
          priority: string
          status: string
          task_id: string
          title: string
          updated_at: string
        }[]
      }
      admin_task_enqueue_assigned_notification: {
        Args: {
          p_actor_id: string
          p_assignee_id: string
          p_task_id: string
          p_title: string
        }
        Returns: undefined
      }
      admin_task_is_owner_or_assignee: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      admin_task_list: {
        Args: {
          p_assignee?: string
          p_category?: string
          p_due_from?: string
          p_due_to?: string
          p_label?: string
          p_limit?: number
          p_offset?: number
          p_only_mine?: boolean
          p_overdue?: boolean
          p_priority?: string
          p_status?: string
          p_unassigned_only?: boolean
        }
        Returns: {
          assignee_display_name: string
          assignee_id: string
          category: string
          comment_count: number
          created_at: string
          created_by: string
          created_by_display_name: string
          description: string
          due_at: string
          labels: string[]
          priority: string
          status: string
          task_id: string
          title: string
          updated_at: string
        }[]
      }
      admin_task_set_status: {
        Args: { p_new_status: string; p_task_id: string }
        Returns: undefined
      }
      admin_task_update: {
        Args: {
          p_category?: string
          p_clear_due?: boolean
          p_description?: string
          p_due_at?: string
          p_labels?: string[]
          p_priority?: string
          p_task_id: string
          p_title?: string
        }
        Returns: undefined
      }
      admin_user_feedback_list: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      auth_check_account_gate: {
        Args: { p_user_id: string }
        Returns: {
          allowed: boolean
          reason: string
          until_at: string
        }[]
      }
      can_grant_role: {
        Args: { granter_uid: string; target_role: string; target_scope: string }
        Returns: boolean
      }
      check_survey_prompt_eligibility: {
        Args: { p_session_count: number; p_slug: string }
        Returns: Json
      }
      close_post_with_recipient: {
        Args: { p_post_id: string; p_recipient_user_id: string }
        Returns: {
          category: string
          city: string
          created_at: string
          delete_after: string | null
          description: string | null
          estimated_value: number | null
          item_condition: string | null
          location_display_level: string
          owner_id: string
          post_id: string
          reopen_count: number
          search_vector: unknown
          source_language: string | null
          source_language_confidence: number | null
          status: string
          status_before_admin_removal: string | null
          street: string
          street_number: string
          title: string
          type: string
          updated_at: string
          urgency: string | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      closure_cleanup_expired: { Args: never; Returns: number }
      closure_cleanup_expired_with_metric: { Args: never; Returns: number }
      crm_contact_delete: { Args: { p_contact_id: string }; Returns: undefined }
      crm_contact_list: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_status?: string
          p_tag?: string
        }
        Returns: {
          contact_id: string
          created_at: string
          email: string
          last_contacted_at: string
          name: string
          notes: string
          organization: string
          phone: string
          role_title: string
          status: string
          tags: string[]
          total_count: number
          updated_at: string
        }[]
      }
      crm_contact_mark_contacted: {
        Args: { p_contact_id: string }
        Returns: undefined
      }
      crm_contact_upsert: {
        Args: {
          p_contact_id?: string
          p_email?: string
          p_name?: string
          p_notes?: string
          p_organization?: string
          p_phone?: string
          p_role_title?: string
          p_status?: string
          p_tags?: string[]
        }
        Returns: string
      }
      delete_account_data: { Args: never; Returns: Json }
      enforce_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: undefined
      }
      enqueue_glowe_email: {
        Args: {
          p_dedupe_key?: string
          p_payload?: Json
          p_template: string
          p_to_email: string
        }
        Returns: string
      }
      enqueue_notification: {
        Args: {
          p_body_args?: Json
          p_body_key: string
          p_bypass_preferences?: boolean
          p_category: string
          p_data?: Json
          p_dedupe_key?: string
          p_kind: string
          p_title_key: string
          p_user_id: string
        }
        Returns: string
      }
      escape_ilike: { Args: { p: string }; Returns: string }
      feed_ranked_ids: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_distance?: number
          p_cursor_post_id?: string
          p_filter_categories?: string[]
          p_filter_center_city?: string
          p_filter_item_conditions?: string[]
          p_filter_radius_km?: number
          p_filter_search_query?: string
          p_filter_status?: string
          p_filter_type?: string
          p_followers_only?: boolean
          p_page_limit?: number
          p_proximity_sort_city?: string
          p_sort_order?: string
          p_viewer_id: string
        }
        Returns: {
          distance_km: number
          post_id: string
        }[]
      }
      finance_ledger_delete: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      finance_ledger_list: {
        Args: {
          p_direction?: string
          p_from?: string
          p_kind?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_to?: string
        }
        Returns: {
          amount_cents: number
          category: string
          counterparty: string
          created_at: string
          currency: string
          description: string
          direction: string
          entry_id: string
          kind: string
          occurred_at: string
          reference_url: string
          status: string
          total_count: number
          updated_at: string
        }[]
      }
      finance_ledger_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          currency: string
          entry_count: number
          expense_cents: number
          income_cents: number
          net_cents: number
        }[]
      }
      finance_ledger_upsert: {
        Args: {
          p_amount_cents?: number
          p_category?: string
          p_counterparty?: string
          p_currency?: string
          p_description?: string
          p_entry_id?: string
          p_kind?: string
          p_occurred_at?: string
          p_reference_url?: string
          p_status?: string
        }
        Returns: string
      }
      find_or_create_support_chat: { Args: { p_user: string }; Returns: string }
      get_chat_counterparty_contact: {
        Args: { p_chat_id: string }
        Returns: string
      }
      get_my_admin_roles: { Args: never; Returns: string[] }
      get_post_translations: {
        Args: { p_post_ids: string[]; p_target_language: string }
        Returns: {
          confidence: number
          field: string
          post_id: string
          source_language: string
          translated_text: string
        }[]
      }
      get_public_research_questions: { Args: { p_slug: string }; Returns: Json }
      get_survey_bundle: { Args: { p_slug: string }; Returns: Json }
      glowe_admin_dismiss_report: {
        Args: { p_report_id: string }
        Returns: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        SetofOptions: {
          from: "*"
          to: "glowe_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      glowe_admin_health_summary: {
        Args: never
        Returns: {
          app_version: string
          check_name: string
          checked_at: string
          error_detail: string
          latency_ms: number
          status: string
        }[]
      }
      glowe_admin_list_health_checks: {
        Args: { p_limit?: number }
        Returns: {
          app_version: string
          check_name: string
          checked_at: string
          environment: string
          error_code: string
          error_detail: string
          id: string
          latency_ms: number
          run_id: string
          status: string
        }[]
      }
      glowe_admin_list_reports: {
        Args: never
        Returns: {
          created_at: string
          id: string
          note: string
          reason: string
          reporter_id: string
          reporter_name: string
          reviewed_at: string
          status: string
          target_id: string
          target_type: string
        }[]
      }
      glowe_admin_remove_content: {
        Args: { p_id: string; p_report_id?: string; p_type: string }
        Returns: undefined
      }
      glowe_apply_to_opportunity: {
        Args: {
          p_availability?: string
          p_comment?: string
          p_email?: string
          p_motivation?: string
          p_opportunity_id: string
          p_phone?: string
          p_skills?: string
        }
        Returns: {
          availability: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          motivation: string | null
          opportunity_id: string
          rejection_note: string | null
          skills: string | null
          status: string
          submitted_comment: string | null
          submitted_email: string | null
          submitted_phone: string | null
          user_id: string
          waitlist_position: number | null
        }
        SetofOptions: {
          from: "*"
          to: "glowe_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      glowe_assert_can_create: {
        Args: { p_kind: string; p_user_id: string }
        Returns: undefined
      }
      glowe_can_create: {
        Args: {
          p_account_type: string
          p_approval_status: string
          p_kind: string
        }
        Returns: boolean
      }
      glowe_cancel_event: {
        Args: { p_opportunity_id: string }
        Returns: {
          capacity: number | null
          commitment: string | null
          created_at: string
          description: string | null
          duration: string | null
          end_at: string | null
          event_link: string | null
          event_type: string | null
          featured: boolean
          field: string | null
          id: string
          link_reveal_hours: number | null
          link_visibility: string
          location: string | null
          org_icon: string | null
          organization: string
          organization_en: string | null
          registration_mode: string
          requirements: string[]
          responsibilities: string[]
          skills: string[]
          start_at: string | null
          status: string
          title: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "glowe_opportunities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      glowe_decide_event_registration: {
        Args: { p_decision: string; p_note?: string; p_registration_id: string }
        Returns: {
          availability: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          motivation: string | null
          opportunity_id: string
          rejection_note: string | null
          skills: string | null
          status: string
          submitted_comment: string | null
          submitted_email: string | null
          submitted_phone: string | null
          user_id: string
          waitlist_position: number | null
        }
        SetofOptions: {
          from: "*"
          to: "glowe_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      glowe_enqueue_application_decision_email: {
        Args: {
          p_app: Database["public"]["Tables"]["glowe_applications"]["Row"]
          p_opp: Database["public"]["Tables"]["glowe_opportunities"]["Row"]
        }
        Returns: undefined
      }
      glowe_get_event_link: {
        Args: { p_opportunity_id: string }
        Returns: string
      }
      glowe_get_self_private_fields: { Args: never; Returns: Json }
      glowe_list_applications_for_opportunity: {
        Args: { p_opportunity_id: string }
        Returns: {
          applicant_avatar: string
          applicant_email: string
          applicant_name: string
          availability: string
          created_at: string
          id: string
          motivation: string
          skills: string
          status: string
          user_id: string
          waitlist_position: number
        }[]
      }
      glowe_list_event_registrations: {
        Args: { p_opportunity_id: string }
        Returns: {
          created_at: string
          decided_at: string
          id: string
          registrant_avatar: string
          registrant_name: string
          rejection_note: string
          status: string
          submitted_comment: string
          submitted_email: string
          submitted_phone: string
          user_id: string
          waitlist_position: number
        }[]
      }
      glowe_list_offers_for_post: {
        Args: { p_post_id: string }
        Returns: {
          availability: string
          contact_preference: string
          created_at: string
          id: string
          offer_text: string
          offerer_avatar: string
          offerer_email: string
          offerer_name: string
          user_id: string
        }[]
      }
      glowe_list_pending_orgs: {
        Args: never
        Returns: {
          about: string | null
          account_type: string | null
          approval_status: string
          availability: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string
          display_name_en: string | null
          email: string | null
          focus: string | null
          id: string
          languages: string[]
          location: string | null
          needs: string | null
          onboarding_complete: boolean
          org_contact_email: string | null
          org_contact_name: string | null
          org_contact_phone: string | null
          org_country: string | null
          org_description: string | null
          org_field: string | null
          org_name: string | null
          org_name_en: string | null
          org_registration_number: string | null
          org_review_note: string | null
          org_reviewed_at: string | null
          org_reviewed_by: string | null
          org_size: string | null
          org_submitted_at: string | null
          org_website: string | null
          profile_status: string
          profile_type: string | null
          public_link: string | null
          raw_profile: Json
          skills: string[]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "glowe_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      glowe_next_waitlist_position: {
        Args: { p_capacity: number; p_opportunity_id: string }
        Returns: number
      }
      glowe_register_for_event: {
        Args: {
          p_comment?: string
          p_email?: string
          p_opportunity_id: string
          p_phone?: string
        }
        Returns: {
          availability: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          motivation: string | null
          opportunity_id: string
          rejection_note: string | null
          skills: string | null
          status: string
          submitted_comment: string | null
          submitted_email: string | null
          submitted_phone: string | null
          user_id: string
          waitlist_position: number | null
        }
        SetofOptions: {
          from: "*"
          to: "glowe_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      glowe_resolve_user_email: { Args: { p_user_id: string }; Returns: string }
      glowe_set_org_approval: {
        Args: { p_decision: string; p_note?: string; p_profile_id: string }
        Returns: {
          about: string | null
          account_type: string | null
          approval_status: string
          availability: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string
          display_name_en: string | null
          email: string | null
          focus: string | null
          id: string
          languages: string[]
          location: string | null
          needs: string | null
          onboarding_complete: boolean
          org_contact_email: string | null
          org_contact_name: string | null
          org_contact_phone: string | null
          org_country: string | null
          org_description: string | null
          org_field: string | null
          org_name: string | null
          org_name_en: string | null
          org_registration_number: string | null
          org_review_note: string | null
          org_reviewed_at: string | null
          org_reviewed_by: string | null
          org_size: string | null
          org_submitted_at: string | null
          org_website: string | null
          profile_status: string
          profile_type: string | null
          public_link: string | null
          raw_profile: Json
          skills: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "glowe_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      glowe_update_application_status: {
        Args: { p_application_id: string; p_decision: string }
        Returns: {
          availability: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          motivation: string | null
          opportunity_id: string
          rejection_note: string | null
          skills: string | null
          status: string
          submitted_comment: string | null
          submitted_email: string | null
          submitted_phone: string | null
          user_id: string
          waitlist_position: number | null
        }
        SetofOptions: {
          from: "*"
          to: "glowe_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      glowe_viewer_is_reviewer: { Args: never; Returns: boolean }
      has_admin_role:
        | { Args: { role_name: string; uid: string }; Returns: boolean }
        | {
            Args: { role_name: string; scope: string; uid: string }
            Returns: boolean
          }
      has_blocked: {
        Args: { blocked: string; blocker: string }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      inject_system_message: {
        Args: { p_body?: string; p_chat_id: string; p_payload: Json }
        Returns: string
      }
      is_active_member: { Args: { uid: string }; Returns: boolean }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_ancestor: {
        Args: { p_ancestor: string; p_node: string }
        Returns: boolean
      }
      is_blocked: { Args: { a: string; b: string }; Returns: boolean }
      is_chat_visible_to: {
        Args: {
          p_chat: Database["public"]["Tables"]["chats"]["Row"]
          p_viewer: string
        }
        Returns: boolean
      }
      is_following: {
        Args: { followed: string; follower: string }
        Returns: boolean
      }
      is_glowe_admin: { Args: { uid: string }; Returns: boolean }
      is_post_visible_to: {
        Args: {
          p_post: Database["public"]["Tables"]["posts"]["Row"]
          p_viewer: string
        }
        Returns: boolean
      }
      karma_apply: {
        Args: {
          p_delta: number
          p_event: string
          p_ref_id: string
          p_ref_type: string
          p_user: string
        }
        Returns: undefined
      }
      karma_grant_once: {
        Args: {
          p_delta: number
          p_event: string
          p_ref_id: string
          p_ref_type: string
          p_user: string
        }
        Returns: undefined
      }
      karma_recompute_nightly: {
        Args: never
        Returns: {
          drift_events: number
          users_processed: number
        }[]
      }
      karma_value_bonus: { Args: { p_value: number }; Returns: number }
      list_active_surveys: { Args: never; Returns: Json }
      needs_legal_reacknowledgement: {
        Args: never
        Returns: {
          block_mode: string
          current_effective_date: string
          current_version: number
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          last_accepted_version: number
          last_material_severity: string
          last_material_version: number
        }[]
      }
      notifications_backlog_check: { Args: never; Returns: undefined }
      notifications_bump_attempt: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      notifications_post_expiry_check: { Args: never; Returns: undefined }
      participant_closed_surface_visible: {
        Args: {
          p_actor: string
          p_post: Database["public"]["Tables"]["posts"]["Row"]
          p_viewer: string
        }
        Returns: boolean
      }
      posts_expiry_transition: { Args: never; Returns: number }
      profile_closed_posts: {
        Args: {
          p_cursor?: string
          p_limit?: number
          p_list_mode?: string
          p_profile_user_id: string
          p_viewer_user_id: string
        }
        Returns: {
          closed_at: string
          identity_role: string
          post_id: string
        }[]
      }
      profile_closed_posts_count: {
        Args: {
          p_list_mode?: string
          p_profile_user_id: string
          p_viewer_user_id: string
        }
        Returns: number
      }
      publish_legal_document: {
        Args: {
          p_body_md: string
          p_change_summary: string
          p_doc_type: Database["public"]["Enums"]["legal_doc_type"]
          p_effective_date: string
          p_severity: string
        }
        Returns: Json
      }
      publish_survey_version: {
        Args: {
          p_description_he: string
          p_is_active: boolean
          p_prompt_rules: Json
          p_questions: Json
          p_slug: string
          p_title_he: string
        }
        Returns: Json
      }
      reopen_post_deleted_no_recipient: {
        Args: { p_post_id: string }
        Returns: {
          category: string
          city: string
          created_at: string
          delete_after: string | null
          description: string | null
          estimated_value: number | null
          item_condition: string | null
          location_display_level: string
          owner_id: string
          post_id: string
          reopen_count: number
          search_vector: unknown
          source_language: string | null
          source_language_confidence: number | null
          status: string
          status_before_admin_removal: string | null
          street: string
          street_number: string
          title: string
          type: string
          updated_at: string
          urgency: string | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reopen_post_marked: {
        Args: { p_post_id: string }
        Returns: {
          category: string
          city: string
          created_at: string
          delete_after: string | null
          description: string | null
          estimated_value: number | null
          item_condition: string | null
          location_display_level: string
          owner_id: string
          post_id: string
          reopen_count: number
          search_vector: unknown
          source_language: string | null
          source_language_confidence: number | null
          status: string
          status_before_admin_removal: string | null
          street: string
          street_number: string
          title: string
          type: string
          updated_at: string
          urgency: string | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      report_donation_link: { Args: { p_link_id: string }; Returns: undefined }
      reports_case_detail: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: Json
      }
      reports_open_inbox: {
        Args: {
          p_cursor?: Json
          p_limit?: number
          p_max_age_days?: number
          p_reporter_filter?: string
          p_target_type_filter?: string
        }
        Returns: Json
      }
      ride_complete_pending_rating_cleanup: { Args: never; Returns: undefined }
      ride_food_overdue_alert: { Args: never; Returns: undefined }
      ride_listings_expire_check: { Args: never; Returns: number }
      ride_listings_find_matches: {
        Args: { p_limit?: number; p_ride_id: string; p_window_hours?: number }
        Returns: {
          arrive_reason: string | null
          arrived_at: string | null
          cargo_allowed_types: string[] | null
          cargo_enabled: boolean
          cargo_max_volume_l: number | null
          cargo_max_weight_kg: number | null
          created_at: string
          departs_at: string
          description: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number: string | null
          food_chilled: boolean | null
          food_handover_to_org: boolean
          food_max_kg: number | null
          food_shipping_enabled: boolean
          linked_post_id: string | null
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number: string | null
          owner_id: string
          payment_amount_ils: number | null
          payment_model: string
          req_gender: string
          req_pets_allowed: boolean
          req_smoking_allowed: boolean
          req_verified_only: boolean
          ride_id: string
          seats_available: number | null
          started_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ride_listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ride_listings_search: {
        Args: {
          p_cursor?: string
          p_depart_from?: string
          p_depart_to?: string
          p_dest_city_id?: string
          p_limit?: number
          p_mode?: string
          p_origin_city_id?: string
          p_query?: string
        }
        Returns: {
          arrive_reason: string | null
          arrived_at: string | null
          cargo_allowed_types: string[] | null
          cargo_enabled: boolean
          cargo_max_volume_l: number | null
          cargo_max_weight_kg: number | null
          created_at: string
          departs_at: string
          description: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number: string | null
          food_chilled: boolean | null
          food_handover_to_org: boolean
          food_max_kg: number | null
          food_shipping_enabled: boolean
          linked_post_id: string | null
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number: string | null
          owner_id: string
          payment_amount_ils: number | null
          payment_model: string
          req_gender: string
          req_pets_allowed: boolean
          req_smoking_allowed: boolean
          req_verified_only: boolean
          ride_id: string
          seats_available: number | null
          started_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ride_listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ride_participants_expire_stale_check: { Args: never; Returns: number }
      ride_templates_materialize: { Args: never; Returns: number }
      rpc_chat_hide_for_viewer: {
        Args: { p_chat_id: string }
        Returns: undefined
      }
      rpc_chat_mark_read: { Args: { p_chat_id: string }; Returns: undefined }
      rpc_chat_set_anchor: {
        Args: { p_anchor_post_id: string; p_chat_id: string }
        Returns: {
          anchor_post_id: string | null
          anchor_ride_id: string | null
          chat_id: string
          created_at: string
          inbox_hidden_at_a: string | null
          inbox_hidden_at_b: string | null
          is_support_thread: boolean
          last_message_at: string
          participant_a: string | null
          participant_b: string | null
          removed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "chats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_chat_set_anchor_ride: {
        Args: { p_anchor_ride_id: string; p_chat_id: string }
        Returns: {
          anchor_post_id: string | null
          anchor_ride_id: string | null
          chat_id: string
          created_at: string
          inbox_hidden_at_a: string | null
          inbox_hidden_at_b: string | null
          is_support_thread: boolean
          last_message_at: string
          participant_a: string | null
          participant_b: string | null
          removed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "chats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_chat_unread_total: { Args: never; Returns: number }
      rpc_get_or_create_support_thread: {
        Args: never
        Returns: {
          anchor_post_id: string | null
          anchor_ride_id: string | null
          chat_id: string
          created_at: string
          inbox_hidden_at_a: string | null
          inbox_hidden_at_b: string | null
          is_support_thread: boolean
          last_message_at: string
          participant_a: string | null
          participant_b: string | null
          removed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "chats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_my_activity_timeline: {
        Args: { p_limit?: number }
        Returns: {
          actor_display_name: string
          kind: string
          occurred_at: string
          post_id: string
          post_title: string
        }[]
      }
      rpc_recipient_unmark_self: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      rpc_republish_post: { Args: { p_post_id: string }; Returns: string }
      rpc_ride_arrive: {
        Args: { p_reason?: string; p_ride_id: string }
        Returns: {
          arrive_reason: string | null
          arrived_at: string | null
          cargo_allowed_types: string[] | null
          cargo_enabled: boolean
          cargo_max_volume_l: number | null
          cargo_max_weight_kg: number | null
          created_at: string
          departs_at: string
          description: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number: string | null
          food_chilled: boolean | null
          food_handover_to_org: boolean
          food_max_kg: number | null
          food_shipping_enabled: boolean
          linked_post_id: string | null
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number: string | null
          owner_id: string
          payment_amount_ils: number | null
          payment_model: string
          req_gender: string
          req_pets_allowed: boolean
          req_smoking_allowed: boolean
          req_verified_only: boolean
          ride_id: string
          seats_available: number | null
          started_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_ride_emergency_trigger: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_note?: string
          p_ride_id: string
        }
        Returns: {
          event_id: string
          lat: number | null
          lng: number | null
          note: string | null
          resolved_at: string | null
          resolved_by: string | null
          ride_id: string
          triggered_at: string
          triggered_by: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_emergency_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_ride_participants_cancel: {
        Args: { p_participant_id: string }
        Returns: {
          decided_at: string | null
          decided_by: string | null
          joined_active_at: string | null
          note: string | null
          participant_id: string
          requested_at: string
          ride_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_ride_participants_decide: {
        Args: { p_participant_id: string; p_status: string }
        Returns: {
          decided_at: string | null
          decided_by: string | null
          joined_active_at: string | null
          note: string | null
          participant_id: string
          requested_at: string
          ride_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_ride_participants_request: {
        Args: { p_note?: string; p_ride_id: string }
        Returns: {
          decided_at: string | null
          decided_by: string | null
          joined_active_at: string | null
          note: string | null
          participant_id: string
          requested_at: string
          ride_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_ride_rate: {
        Args: {
          p_comment?: string
          p_is_penalty?: boolean
          p_ratee_id: string
          p_ride_id: string
          p_stars: number
        }
        Returns: {
          comment: string | null
          created_at: string
          is_penalty: boolean
          ratee_id: string
          rater_id: string
          rating_id: string
          ride_id: string
          stars: number
        }
        SetofOptions: {
          from: "*"
          to: "ride_ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_ride_start: {
        Args: { p_ride_id: string }
        Returns: {
          arrive_reason: string | null
          arrived_at: string | null
          cargo_allowed_types: string[] | null
          cargo_enabled: boolean
          cargo_max_volume_l: number | null
          cargo_max_weight_kg: number | null
          created_at: string
          departs_at: string
          description: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number: string | null
          food_chilled: boolean | null
          food_handover_to_org: boolean
          food_max_kg: number | null
          food_shipping_enabled: boolean
          linked_post_id: string | null
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number: string | null
          owner_id: string
          payment_amount_ils: number | null
          payment_model: string
          req_gender: string
          req_pets_allowed: boolean
          req_smoking_allowed: boolean
          req_verified_only: boolean
          ride_id: string
          seats_available: number | null
          started_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_ride_update_visibility: {
        Args: { p_ride_id: string; p_visibility: string }
        Returns: {
          arrive_reason: string | null
          arrived_at: string | null
          cargo_allowed_types: string[] | null
          cargo_enabled: boolean
          cargo_max_volume_l: number | null
          cargo_max_weight_kg: number | null
          created_at: string
          departs_at: string
          description: string | null
          dest_city_id: string
          dest_street: string
          dest_street_number: string | null
          food_chilled: boolean | null
          food_handover_to_org: boolean
          food_max_kg: number | null
          food_shipping_enabled: boolean
          linked_post_id: string | null
          mode: string
          origin_city_id: string
          origin_street: string
          origin_street_number: string | null
          owner_id: string
          payment_amount_ils: number | null
          payment_model: string
          req_gender: string
          req_pets_allowed: boolean
          req_smoking_allowed: boolean
          req_verified_only: boolean
          ride_id: string
          seats_available: number | null
          started_at: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_submit_support_issue: {
        Args: { p_category: string; p_description: string }
        Returns: {
          anchor_post_id: string | null
          anchor_ride_id: string | null
          chat_id: string
          created_at: string
          inbox_hidden_at_a: string | null
          inbox_hidden_at_b: string | null
          is_support_thread: boolean
          last_message_at: string
          participant_a: string | null
          participant_b: string | null
          removed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "chats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_unread_counts_for_chats: {
        Args: { p_chat_ids: string[]; p_viewer_id: string }
        Returns: {
          chat_id: string
          unread_count: number
        }[]
      }
      stats_recompute_personal_counters_nightly: {
        Args: never
        Returns: {
          drift_events: number
          users_processed: number
        }[]
      }
      stats_safe_dec: { Args: { p_value: number }; Returns: number }
      submit_public_research_response: {
        Args: {
          p_answers: Json
          p_contact_email?: string
          p_contact_window_he?: string
          p_honeypot: string
          p_ip_hash: string
          p_slug: string
          p_source: string
          p_user_agent_hash: string
          p_version: number
        }
        Returns: string
      }
      suspension_expiry_lift: { Args: never; Returns: number }
      timesheet_approve: {
        Args: { p_entry_id: string; p_note?: string }
        Returns: undefined
      }
      timesheet_decide: {
        Args: { p_approve: boolean; p_entry_id: string; p_note?: string }
        Returns: undefined
      }
      timesheet_delete: { Args: { p_entry_id: string }; Returns: undefined }
      timesheet_list: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_to?: string
          p_user_id?: string
        }
        Returns: {
          approval_note: string
          approved_at: string
          approved_by: string
          approver_name: string
          created_at: string
          description: string
          entry_id: string
          hours_x100: number
          project: string
          status: string
          submitted_at: string
          total_count: number
          updated_at: string
          user_id: string
          user_name: string
          work_date: string
        }[]
      }
      timesheet_reject: {
        Args: { p_entry_id: string; p_note?: string }
        Returns: undefined
      }
      timesheet_submit: { Args: { p_entry_id: string }; Returns: undefined }
      timesheet_upsert: {
        Args: {
          p_description?: string
          p_entry_id?: string
          p_hours_x100?: number
          p_project?: string
          p_work_date?: string
        }
        Returns: string
      }
      upsert_post_actor_identity: {
        Args: {
          p_hide_from_counterparty: boolean
          p_post_id: string
          p_surface_visibility: string
        }
        Returns: undefined
      }
      upsert_survey_answers: {
        Args: { p_answers: Json; p_slug: string }
        Returns: undefined
      }
      users_get_self_private_fields: { Args: never; Returns: Json }
      users_merge_notification_preferences: {
        Args: { p_merge: Json; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      legal_doc_type: "terms" | "privacy"
      survey_question_type: "rating_1_7_with_optional_text"
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
      legal_doc_type: ["terms", "privacy"],
      survey_question_type: ["rating_1_7_with_optional_text"],
    },
  },
} as const
