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
      categories: {
        Row: {
          category_id: string
          created_at: string
          is_active: boolean
          label_en: string | null
          label_he: string
          legacy_donation_slug: string | null
          legacy_post_category: string | null
          parent_id: string | null
          slug: string
          sort_order: number
          world_slug: string
        }
        Insert: {
          category_id?: string
          created_at?: string
          is_active?: boolean
          label_en?: string | null
          label_he: string
          legacy_donation_slug?: string | null
          legacy_post_category?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number
          world_slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          is_active?: boolean
          label_en?: string | null
          label_he?: string
          legacy_donation_slug?: string | null
          legacy_post_category?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
          world_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_legacy_donation_slug_fkey"
            columns: ["legacy_donation_slug"]
            isOneToOne: false
            referencedRelation: "donation_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "categories_world_slug_fkey"
            columns: ["world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
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
          geo: unknown
          lat: number | null
          lon: number | null
          name_en: string
          name_he: string
        }
        Insert: {
          city_id: string
          country_code?: string
          geo?: unknown
          lat?: number | null
          lon?: number | null
          name_en: string
          name_he: string
        }
        Update: {
          city_id?: string
          country_code?: string
          geo?: unknown
          lat?: number | null
          lon?: number | null
          name_en?: string
          name_he?: string
        }
        Relationships: []
      }
      claim_requests: {
        Row: {
          claim_id: string
          created_at: string
          listing_id: string
          requester_id: string
          status: string
        }
        Insert: {
          claim_id?: string
          created_at?: string
          listing_id: string
          requester_id: string
          status?: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          listing_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "claim_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "claim_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
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
      embedding_jobs: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          job_id: string
          listing_id: string
          model: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          job_id?: string
          listing_id: string
          model?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          job_id?: string
          listing_id?: string
          model?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "embedding_jobs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
        ]
      }
      entity_aliases: {
        Row: {
          actor_id: string
          alias_id: string
          alias_text: string
          created_at: string
          source: string | null
        }
        Insert: {
          actor_id: string
          alias_id?: string
          alias_text: string
          created_at?: string
          source?: string | null
        }
        Update: {
          actor_id?: string
          alias_id?: string
          alias_text?: string
          created_at?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_aliases_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_actors"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      entity_merges: {
        Row: {
          merge_id: string
          merged_at: string
          merged_by: string | null
          merged_id: string
          snapshot: Json
          survivor_id: string
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          merge_id?: string
          merged_at?: string
          merged_by?: string | null
          merged_id: string
          snapshot: Json
          survivor_id: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          merge_id?: string
          merged_at?: string
          merged_by?: string | null
          merged_id?: string
          snapshot?: Json
          survivor_id?: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_merges_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "entity_merges_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "entity_merges_merged_id_fkey"
            columns: ["merged_id"]
            isOneToOne: false
            referencedRelation: "marketplace_actors"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "entity_merges_survivor_id_fkey"
            columns: ["survivor_id"]
            isOneToOne: false
            referencedRelation: "marketplace_actors"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "entity_merges_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "entity_merges_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      er_candidates: {
        Row: {
          actor_a: string
          actor_b: string
          candidate_id: string
          created_at: string
          reason: string | null
          score: number
          status: string
        }
        Insert: {
          actor_a: string
          actor_b: string
          candidate_id?: string
          created_at?: string
          reason?: string | null
          score: number
          status?: string
        }
        Update: {
          actor_a?: string
          actor_b?: string
          candidate_id?: string
          created_at?: string
          reason?: string | null
          score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "er_candidates_actor_a_fkey"
            columns: ["actor_a"]
            isOneToOne: false
            referencedRelation: "marketplace_actors"
            referencedColumns: ["actor_id"]
          },
          {
            foreignKeyName: "er_candidates_actor_b_fkey"
            columns: ["actor_b"]
            isOneToOne: false
            referencedRelation: "marketplace_actors"
            referencedColumns: ["actor_id"]
          },
        ]
      }
      external_bodies: {
        Row: {
          body_id: string
          body_type: string
          contact_url: string | null
          created_at: string
          is_active: boolean
          is_verified: boolean
          label_en: string
          label_he: string
          requires_routing: boolean
          slug: string
          world_slug: string
        }
        Insert: {
          body_id?: string
          body_type: string
          contact_url?: string | null
          created_at?: string
          is_active?: boolean
          is_verified?: boolean
          label_en: string
          label_he: string
          requires_routing?: boolean
          slug: string
          world_slug: string
        }
        Update: {
          body_id?: string
          body_type?: string
          contact_url?: string | null
          created_at?: string
          is_active?: boolean
          is_verified?: boolean
          label_en?: string
          label_he?: string
          requires_routing?: boolean
          slug?: string
          world_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_bodies_world_slug_fkey"
            columns: ["world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
        ]
      }
      extractions: {
        Row: {
          confidence: number | null
          created_at: string
          extracted: Json
          extraction_id: string
          kind_slug: string | null
          listing_id: string | null
          record_id: string
          world_slug: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          extracted?: Json
          extraction_id?: string
          kind_slug?: string | null
          listing_id?: string | null
          record_id: string
          world_slug?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          extracted?: Json
          extraction_id?: string
          kind_slug?: string | null
          listing_id?: string | null
          record_id?: string
          world_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extractions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "extractions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "raw_records"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "extractions_world_slug_fkey"
            columns: ["world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
        ]
      }
      feed_impressions: {
        Row: {
          impression_id: string
          post_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          impression_id?: string
          post_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          impression_id?: string
          post_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_impressions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "feed_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feed_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_impressions_default: {
        Row: {
          impression_id: string
          post_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          impression_id?: string
          post_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          impression_id?: string
          post_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_impressions_y2026m10: {
        Row: {
          impression_id: string
          post_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          impression_id?: string
          post_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          impression_id?: string
          post_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_impressions_y2026m11: {
        Row: {
          impression_id: string
          post_id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          impression_id?: string
          post_id: string
          seen_at?: string
          user_id: string
        }
        Update: {
          impression_id?: string
          post_id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_mute_filters: {
        Row: {
          created_at: string
          filter_id: string
          filter_kind: string
          filter_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_id?: string
          filter_kind: string
          filter_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_id?: string
          filter_kind?: string
          filter_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_mute_filters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feed_mute_filters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_mv_refresh_state: {
        Row: {
          dirty: boolean
          last_refresh_at: string | null
          row_count: number
          singleton_id: number
          updated_at: string
        }
        Insert: {
          dirty?: boolean
          last_refresh_at?: string | null
          row_count?: number
          singleton_id?: number
          updated_at?: string
        }
        Update: {
          dirty?: boolean
          last_refresh_at?: string | null
          row_count?: number
          singleton_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      feed_post_hides: {
        Row: {
          hidden_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_hides_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "feed_post_hides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feed_post_hides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_ranking_config: {
        Row: {
          config_key: string
          updated_at: string
          weight: number
        }
        Insert: {
          config_key: string
          updated_at?: string
          weight: number
        }
        Update: {
          config_key?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      field_provenance: {
        Row: {
          extracted_at: string
          field_path: string
          listing_id: string
          provenance_id: string
          record_id: string | null
          source_id: string | null
        }
        Insert: {
          extracted_at?: string
          field_path: string
          listing_id: string
          provenance_id?: string
          record_id?: string | null
          source_id?: string | null
        }
        Update: {
          extracted_at?: string
          field_path?: string
          listing_id?: string
          provenance_id?: string
          record_id?: string | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_provenance_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "field_provenance_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "raw_records"
            referencedColumns: ["record_id"]
          },
          {
            foreignKeyName: "field_provenance_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["source_id"]
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
      ingestion_runs: {
        Row: {
          finished_at: string | null
          run_id: string
          source_id: string
          started_at: string
          stats: Json
          status: string
        }
        Insert: {
          finished_at?: string | null
          run_id?: string
          source_id: string
          started_at?: string
          stats?: Json
          status?: string
        }
        Update: {
          finished_at?: string | null
          run_id?: string
          source_id?: string
          started_at?: string
          stats?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      ingestion_sources: {
        Row: {
          consent_ref: string | null
          created_at: string
          is_active: boolean
          label: string
          slug: string
          source_id: string
          source_type: string
        }
        Insert: {
          consent_ref?: string | null
          created_at?: string
          is_active?: boolean
          label: string
          slug: string
          source_id?: string
          source_type: string
        }
        Update: {
          consent_ref?: string | null
          created_at?: string
          is_active?: boolean
          label?: string
          slug?: string
          source_id?: string
          source_type?: string
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
      listing_kinds: {
        Row: {
          created_at: string
          default_ttl_hours: number | null
          detail_schema: Json
          direction: string
          is_active: boolean
          kind_id: string
          label_en: string
          label_he: string
          slug: string
          sort_order: number
          world_slug: string
        }
        Insert: {
          created_at?: string
          default_ttl_hours?: number | null
          detail_schema?: Json
          direction: string
          is_active?: boolean
          kind_id?: string
          label_en: string
          label_he: string
          slug: string
          sort_order?: number
          world_slug: string
        }
        Update: {
          created_at?: string
          default_ttl_hours?: number | null
          detail_schema?: Json
          direction?: string
          is_active?: boolean
          kind_id?: string
          label_en?: string
          label_he?: string
          slug?: string
          sort_order?: number
          world_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_kinds_world_slug_fkey"
            columns: ["world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
        ]
      }
      listing_matches: {
        Row: {
          candidate_listing_id: string
          created_at: string
          listing_id: string
          match_id: string
          run_id: string | null
          score: number
          status: string
        }
        Insert: {
          candidate_listing_id: string
          created_at?: string
          listing_id: string
          match_id?: string
          run_id?: string | null
          score: number
          status?: string
        }
        Update: {
          candidate_listing_id?: string
          created_at?: string
          listing_id?: string
          match_id?: string
          run_id?: string | null
          score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_matches_candidate_listing_id_fkey"
            columns: ["candidate_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_matches_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "match_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      listings: {
        Row: {
          anonymity_level: number
          canonical_id: string | null
          category_id: string | null
          city_id: string | null
          created_at: string
          details: Json
          direction: string
          embedding: string | null
          embedding_model: string | null
          expires_at: string | null
          external_body_id: string | null
          geo: unknown
          geo_mode_override: string | null
          geo_weight_override: number | null
          kind_id: string
          legacy_post_id: string | null
          legacy_ride_id: string | null
          listing_id: string
          max_radius_km_override: number | null
          moderation_status: string
          origin: string
          owner_id: string
          published_at: string | null
          search_vector: unknown
          status: string
          summary: string | null
          time_window: unknown
          title: string
          updated_at: string
          visibility: string
          world_slug: string
        }
        Insert: {
          anonymity_level?: number
          canonical_id?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          details?: Json
          direction: string
          embedding?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          external_body_id?: string | null
          geo?: unknown
          geo_mode_override?: string | null
          geo_weight_override?: number | null
          kind_id: string
          legacy_post_id?: string | null
          legacy_ride_id?: string | null
          listing_id?: string
          max_radius_km_override?: number | null
          moderation_status?: string
          origin?: string
          owner_id: string
          published_at?: string | null
          search_vector?: unknown
          status?: string
          summary?: string | null
          time_window?: unknown
          title: string
          updated_at?: string
          visibility?: string
          world_slug: string
        }
        Update: {
          anonymity_level?: number
          canonical_id?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          details?: Json
          direction?: string
          embedding?: string | null
          embedding_model?: string | null
          expires_at?: string | null
          external_body_id?: string | null
          geo?: unknown
          geo_mode_override?: string | null
          geo_weight_override?: number | null
          kind_id?: string
          legacy_post_id?: string | null
          legacy_ride_id?: string | null
          listing_id?: string
          max_radius_km_override?: number | null
          moderation_status?: string
          origin?: string
          owner_id?: string
          published_at?: string | null
          search_vector?: unknown
          status?: string
          summary?: string | null
          time_window?: unknown
          title?: string
          updated_at?: string
          visibility?: string
          world_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "listings_external_body_id_fkey"
            columns: ["external_body_id"]
            isOneToOne: false
            referencedRelation: "external_bodies"
            referencedColumns: ["body_id"]
          },
          {
            foreignKeyName: "listings_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "listing_kinds"
            referencedColumns: ["kind_id"]
          },
          {
            foreignKeyName: "listings_legacy_post_id_fkey"
            columns: ["legacy_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "listings_legacy_ride_id_fkey"
            columns: ["legacy_ride_id"]
            isOneToOne: false
            referencedRelation: "ride_listings"
            referencedColumns: ["ride_id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listings_world_slug_fkey"
            columns: ["world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
        ]
      }
      marketplace_actors: {
        Row: {
          actor_id: string
          actor_type: string
          created_at: string
          display_name: string
          listing_id: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: string
          actor_type: string
          created_at?: string
          display_name: string
          listing_id?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string
          actor_type?: string
          created_at?: string
          display_name?: string
          listing_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_actors_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "marketplace_actors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "marketplace_actors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      match_alert_subscriptions: {
        Row: {
          city_id: string | null
          created_at: string
          direction: string | null
          is_active: boolean
          saved_query: string | null
          subscription_id: string
          updated_at: string
          user_id: string
          world_slug: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          direction?: string | null
          is_active?: boolean
          saved_query?: string | null
          subscription_id?: string
          updated_at?: string
          user_id: string
          world_slug?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string
          direction?: string | null
          is_active?: boolean
          saved_query?: string | null
          subscription_id?: string
          updated_at?: string
          user_id?: string
          world_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_alert_subscriptions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "match_alert_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_alert_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_alert_subscriptions_world_slug_fkey"
            columns: ["world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
        ]
      }
      match_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback_id: string
          match_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback_id?: string
          match_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback_id?: string
          match_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "listing_matches"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      match_runs: {
        Row: {
          finished_at: string | null
          run_id: string
          source_listing_id: string
          started_at: string
          stats: Json
          triggered_by: string | null
        }
        Insert: {
          finished_at?: string | null
          run_id?: string
          source_listing_id: string
          started_at?: string
          stats?: Json
          triggered_by?: string | null
        }
        Update: {
          finished_at?: string | null
          run_id?: string
          source_listing_id?: string
          started_at?: string
          stats?: Json
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_runs_source_listing_id_fkey"
            columns: ["source_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "match_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      match_weights: {
        Row: {
          created_at: string
          user_id: string | null
          w_fts: number
          w_geo: number
          w_trust: number
          w_vector: number
          weight_id: string
          world_slug: string | null
        }
        Insert: {
          created_at?: string
          user_id?: string | null
          w_fts?: number
          w_geo?: number
          w_trust?: number
          w_vector?: number
          weight_id?: string
          world_slug?: string | null
        }
        Update: {
          created_at?: string
          user_id?: string | null
          w_fts?: number
          w_geo?: number
          w_trust?: number
          w_vector?: number
          weight_id?: string
          world_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "match_weights_world_slug_fkey"
            columns: ["world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
        ]
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
      message_reactions: {
        Row: {
          created_at: string
          message_id: string
          reaction_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          reaction_id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          reaction_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["message_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
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
          media_payload: Json | null
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
          media_payload?: Json | null
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
          media_payload?: Json | null
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
      notification_inbox: {
        Row: {
          body_args: Json
          body_key: string
          category: string
          created_at: string
          data: Json
          group_actor_ids: string[]
          group_count: number
          group_key: string | null
          inbox_id: string
          kind: string
          outbox_id: string | null
          read_at: string | null
          title_key: string
          updated_at: string
          user_id: string
          world: string
        }
        Insert: {
          body_args?: Json
          body_key: string
          category: string
          created_at?: string
          data?: Json
          group_actor_ids?: string[]
          group_count?: number
          group_key?: string | null
          inbox_id?: string
          kind: string
          outbox_id?: string | null
          read_at?: string | null
          title_key: string
          updated_at?: string
          user_id: string
          world?: string
        }
        Update: {
          body_args?: Json
          body_key?: string
          category?: string
          created_at?: string
          data?: Json
          group_actor_ids?: string[]
          group_count?: number
          group_key?: string | null
          inbox_id?: string
          kind?: string
          outbox_id?: string | null
          read_at?: string | null
          title_key?: string
          updated_at?: string
          user_id?: string
          world?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_inbox_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notifications_outbox"
            referencedColumns: ["notification_id"]
          },
          {
            foreignKeyName: "notification_inbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_inbox_user_id_fkey"
            columns: ["user_id"]
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
      post_comments: {
        Row: {
          author_id: string
          body: string
          comment_id: string
          created_at: string
          edited_at: string | null
          mention_user_ids: string[]
          parent_comment_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          comment_id?: string
          created_at?: string
          edited_at?: string | null
          mention_user_ids?: string[]
          parent_comment_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          comment_id?: string
          created_at?: string
          edited_at?: string | null
          mention_user_ids?: string[]
          parent_comment_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["comment_id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          post_id: string
          reaction_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          reaction_id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          reaction_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          external_channel: string | null
          post_id: string
          repost_post_id: string | null
          share_id: string
          share_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_channel?: string | null
          post_id: string
          repost_post_id?: string | null
          share_id?: string
          share_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_channel?: string | null
          post_id?: string
          repost_post_id?: string | null
          share_id?: string
          share_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_shares_repost_post_id_fkey"
            columns: ["repost_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_stats: {
        Row: {
          comment_count: number
          post_id: string
          reaction_count: number
          share_count: number
          updated_at: string
        }
        Insert: {
          comment_count?: number
          post_id: string
          reaction_count?: number
          share_count?: number
          updated_at?: string
        }
        Update: {
          comment_count?: number
          post_id?: string
          reaction_count?: number
          share_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_stats_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["post_id"]
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
      raw_records: {
        Row: {
          external_key: string | null
          fetched_at: string
          payload: Json
          record_id: string
          retain_until: string | null
          run_id: string
        }
        Insert: {
          external_key?: string | null
          fetched_at?: string
          payload: Json
          record_id?: string
          retain_until?: string | null
          run_id: string
        }
        Update: {
          external_key?: string | null
          fetched_at?: string
          payload?: Json
          record_id?: string
          retain_until?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_records_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ingestion_runs"
            referencedColumns: ["run_id"]
          },
        ]
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
      search_hashtags: {
        Row: {
          tag: string
          updated_at: string
          use_count: number
        }
        Insert: {
          tag: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          tag?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: []
      }
      social_rpc_explain_snapshots: {
        Row: {
          captured_at: string
          elapsed_ms: number | null
          notes: string | null
          plan_text: string
          rpc_name: string
          snapshot_id: string
        }
        Insert: {
          captured_at?: string
          elapsed_ms?: number | null
          notes?: string | null
          plan_text: string
          rpc_name: string
          snapshot_id?: string
        }
        Update: {
          captured_at?: string
          elapsed_ms?: number | null
          notes?: string | null
          plan_text?: string
          rpc_name?: string
          snapshot_id?: string
        }
        Relationships: []
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
          geo: unknown
          name_he: string
          street_id: number
        }
        Insert: {
          city_id: string
          geo?: unknown
          name_he: string
          street_id: number
        }
        Update: {
          city_id?: string
          geo?: unknown
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
      user_feed_cache: {
        Row: {
          post_ids: string[]
          refreshed_at: string
          user_id: string
        }
        Insert: {
          post_ids?: string[]
          refreshed_at?: string
          user_id: string
        }
        Update: {
          post_ids?: string[]
          refreshed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_feed_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      user_geo_prefs: {
        Row: {
          default_radius_km: number | null
          geo_mode: string | null
          geo_weight: number | null
          home_city_id: string | null
          home_geo: unknown
          updated_at: string
          user_id: string
        }
        Insert: {
          default_radius_km?: number | null
          geo_mode?: string | null
          geo_weight?: number | null
          home_city_id?: string | null
          home_geo?: unknown
          updated_at?: string
          user_id: string
        }
        Update: {
          default_radius_km?: number | null
          geo_mode?: string | null
          geo_weight?: number | null
          home_city_id?: string | null
          home_geo?: unknown
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_geo_prefs_home_city_id_fkey"
            columns: ["home_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["city_id"]
          },
          {
            foreignKeyName: "user_geo_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_geo_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
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
      world_links: {
        Row: {
          created_at: string
          description: string | null
          from_world_slug: string
          is_active: boolean
          label_en: string
          label_he: string
          link_id: string
          link_slug: string
          to_world_slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          from_world_slug: string
          is_active?: boolean
          label_en: string
          label_he: string
          link_id?: string
          link_slug: string
          to_world_slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          from_world_slug?: string
          is_active?: boolean
          label_en?: string
          label_he?: string
          link_id?: string
          link_slug?: string
          to_world_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_links_from_world_slug_fkey"
            columns: ["from_world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "world_links_to_world_slug_fkey"
            columns: ["to_world_slug"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["slug"]
          },
        ]
      }
      worlds: {
        Row: {
          created_at: string
          default_anonymity_level: number
          default_radius_km: number
          default_ttl_hours: number | null
          geo_decay: number
          geo_mode: string
          geo_weight: number
          is_active: boolean
          label_en: string
          label_he: string
          prd_index: number
          requires_verification: boolean
          sensitivity: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_anonymity_level?: number
          default_radius_km?: number
          default_ttl_hours?: number | null
          geo_decay?: number
          geo_mode?: string
          geo_weight?: number
          is_active?: boolean
          label_en: string
          label_he: string
          prd_index: number
          requires_verification?: boolean
          sensitivity?: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_anonymity_level?: number
          default_radius_km?: number
          default_ttl_hours?: number | null
          geo_decay?: number
          geo_mode?: string
          geo_weight?: number
          is_active?: boolean
          label_en?: string
          label_he?: string
          prd_index?: number
          requires_verification?: boolean
          sensitivity?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
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
      listing_owner_trust_score: {
        Row: {
          trust_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["user_id"]
          },
        ]
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
      anonymity_level_to_visibility: {
        Args: { p_level: number }
        Returns: string
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
      cron_feed_cache_worker: { Args: never; Returns: number }
      cron_refresh_feed_open_posts_mv_if_dirty: { Args: never; Returns: number }
      delete_account_data: { Args: never; Returns: Json }
      drop_feed_impressions_partitions_older_than: {
        Args: { p_retention?: string }
        Returns: number
      }
      effective_geo: {
        Args: {
          p_listing: Database["public"]["Tables"]["listings"]["Row"]
          p_viewer?: string
        }
        Returns: {
          anchor_geo: unknown
          geo_mode: string
          geo_weight: number
          radius_km: number
        }[]
      }
      enforce_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: undefined
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
      ensure_feed_impressions_month_partition: {
        Args: { p_at?: string }
        Returns: string
      }
      escape_ilike: { Args: { p: string }; Returns: string }
      feed_cache_enqueue: { Args: { p_user_id: string }; Returns: number }
      feed_cache_enqueue_active_users: {
        Args: { p_limit?: number }
        Returns: number
      }
      feed_cache_process_queue: { Args: { p_batch?: number }; Returns: number }
      feed_cache_refresh_user: { Args: { p_user_id: string }; Returns: number }
      feed_newest_explain_analyze_ms: {
        Args: { p_viewer_id?: string }
        Returns: Json
      }
      feed_ranked_ids: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_distance?: number
          p_cursor_post_id?: string
          p_cursor_rank_score?: number
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
          rank_score: number
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
      find_matches: {
        Args: { p_limit?: number; p_listing_id: string; p_viewer?: string }
        Returns: {
          candidate_listing_id: string
          fts_score: number
          geo_score: number
          match_status: string
          score: number
          trust_score: number
          vector_score: number
        }[]
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
      is_chat_participant: {
        Args: { p_chat_id: string; p_user: string }
        Returns: boolean
      }
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
      is_listing_operator: { Args: { p_viewer: string }; Returns: boolean }
      is_listing_visible_to: {
        Args: {
          p_listing: Database["public"]["Tables"]["listings"]["Row"]
          p_viewer: string
        }
        Returns: boolean
      }
      is_post_engagement_visible: {
        Args: { p_post_id: string; p_viewer: string }
        Returns: boolean
      }
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
      listing_geo_from_city: { Args: { p_city_id: string }; Returns: unknown }
      listing_upsert_from_post: {
        Args: { p_post: Database["public"]["Tables"]["posts"]["Row"] }
        Returns: undefined
      }
      listing_upsert_from_ride: {
        Args: { p_ride: Database["public"]["Tables"]["ride_listings"]["Row"] }
        Returns: undefined
      }
      merge_entities: {
        Args: { p_actor?: string; p_merged: string; p_survivor: string }
        Returns: string
      }
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
      notification_in_quiet_hours: {
        Args: { p_at?: string; p_prefs: Json }
        Returns: boolean
      }
      notification_inbox_group_meta: {
        Args: {
          p_row: Database["public"]["Tables"]["notifications_outbox"]["Row"]
        }
        Returns: {
          actor_id: string
          group_key: string
        }[]
      }
      notification_inbox_world_for_kind: {
        Args: { p_kind: string }
        Returns: string
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
      post_stats_bump: {
        Args: {
          p_comment_delta?: number
          p_post_id: string
          p_reaction_delta?: number
          p_share_delta?: number
        }
        Returns: undefined
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
      refresh_feed_open_posts_mv: {
        Args: { p_concurrent?: boolean }
        Returns: number
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
      resolve_comment_mentions: { Args: { p_body: string }; Returns: string[] }
      resolve_match_weights: {
        Args: { p_user: string; p_world: string }
        Returns: {
          w_fts: number
          w_geo: number
          w_trust: number
          w_vector: number
        }[]
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
      rpc_create_post_comment: {
        Args: {
          p_body: string
          p_parent_comment_id?: string
          p_post_id: string
        }
        Returns: {
          author_id: string
          body: string
          comment_id: string
          created_at: string
          edited_at: string | null
          mention_user_ids: string[]
          parent_comment_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "post_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_delete_post_comment: {
        Args: { p_comment_id: string }
        Returns: {
          author_id: string
          body: string
          comment_id: string
          created_at: string
          edited_at: string | null
          mention_user_ids: string[]
          parent_comment_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "post_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_feed_add_mute_filter: {
        Args: { p_filter_kind: string; p_filter_value: string }
        Returns: {
          created_at: string
          filter_id: string
          filter_kind: string
          filter_value: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "feed_mute_filters"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_feed_hide_post: { Args: { p_post_id: string }; Returns: undefined }
      rpc_feed_list_mute_filters: {
        Args: never
        Returns: {
          created_at: string
          filter_id: string
          filter_kind: string
          filter_value: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "feed_mute_filters"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_feed_log_impressions: {
        Args: { p_post_ids: string[] }
        Returns: number
      }
      rpc_feed_remove_mute_filter: {
        Args: { p_filter_id: string }
        Returns: undefined
      }
      rpc_follow_suggestions: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          city_name: string
          display_name: string
          followers_count: number
          reason: string
          score: number
          share_handle: string
          user_id: string
        }[]
      }
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
      rpc_get_post_engagement_stats: {
        Args: { p_post_id: string }
        Returns: {
          comment_count: number
          post_id: string
          reaction_count: number
          share_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "post_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_log_post_share: {
        Args: {
          p_external_channel?: string
          p_post_id: string
          p_repost_post_id?: string
          p_share_kind: string
        }
        Returns: {
          created_at: string
          external_channel: string | null
          post_id: string
          repost_post_id: string | null
          share_id: string
          share_kind: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "post_shares"
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
      rpc_notification_inbox_list: {
        Args: {
          p_category?: string
          p_cursor_created_at?: string
          p_cursor_inbox_id?: string
          p_limit?: number
          p_world?: string
        }
        Returns: {
          body_args: Json
          body_key: string
          category: string
          created_at: string
          data: Json
          group_actor_ids: string[]
          group_count: number
          group_key: string | null
          inbox_id: string
          kind: string
          outbox_id: string | null
          read_at: string | null
          title_key: string
          updated_at: string
          user_id: string
          world: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_inbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_notification_inbox_mark_all_read: { Args: never; Returns: number }
      rpc_notification_inbox_mark_read: {
        Args: { p_inbox_id: string }
        Returns: {
          body_args: Json
          body_key: string
          category: string
          created_at: string
          data: Json
          group_actor_ids: string[]
          group_count: number
          group_key: string | null
          inbox_id: string
          kind: string
          outbox_id: string | null
          read_at: string | null
          title_key: string
          updated_at: string
          user_id: string
          world: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_inbox"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_notification_inbox_unread_count: { Args: never; Returns: number }
      rpc_profile_completeness: { Args: { p_user_id?: string }; Returns: Json }
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
      rpc_search_suggested_queries: { Args: never; Returns: string[] }
      rpc_send_chat_media_message: {
        Args: { p_body?: string; p_chat_id: string; p_media_payload: Json }
        Returns: {
          body: string | null
          chat_id: string
          created_at: string
          delivered_at: string | null
          kind: string
          media_payload: Json | null
          message_id: string
          read_at: string | null
          sender_id: string | null
          source_language: string | null
          source_language_confidence: number | null
          status: string
          system_payload: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_set_message_reaction: {
        Args: { p_message_id: string; p_reaction_type: string }
        Returns: {
          created_at: string
          message_id: string
          reaction_id: string
          reaction_type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "message_reactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_set_post_reaction: {
        Args: { p_post_id: string; p_reaction_type: string }
        Returns: {
          created_at: string
          post_id: string
          reaction_id: string
          reaction_type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "post_reactions"
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
      rpc_sync_chat_messages: {
        Args: {
          p_after_created_at?: string
          p_after_message_id?: string
          p_chat_id: string
          p_limit?: number
        }
        Returns: {
          body: string | null
          chat_id: string
          created_at: string
          delivered_at: string | null
          kind: string
          media_payload: Json | null
          message_id: string
          read_at: string | null
          sender_id: string | null
          source_language: string | null
          source_language_confidence: number | null
          status: string
          system_payload: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_unread_counts_for_chats: {
        Args: { p_chat_ids: string[]; p_viewer_id: string }
        Returns: {
          chat_id: string
          unread_count: number
        }[]
      }
      rpc_update_post_comment: {
        Args: { p_body: string; p_comment_id: string }
        Returns: {
          author_id: string
          body: string
          comment_id: string
          created_at: string
          edited_at: string | null
          mention_user_ids: string[]
          parent_comment_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "post_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      scale_retention_purge_notifications_outbox: {
        Args: { p_older_than?: string }
        Returns: number
      }
      search_all: {
        Args: { p_limit?: number; p_query: string; p_types?: string[] }
        Returns: Json
      }
      search_listings: {
        Args: {
          p_limit?: number
          p_query: string
          p_viewer?: string
          p_world_slug?: string
        }
        Returns: {
          fts_rank: number
          geo_rank: number
          listing_id: string
          rrf_score: number
          trgm_rank: number
          vector_rank: number
        }[]
      }
      seed_feed_performance_posts: {
        Args: { p_city_id: string; p_count?: number; p_owner_id: string }
        Returns: number
      }
      social_rpc_capture_explain: {
        Args: {
          p_elapsed_ms?: number
          p_notes?: string
          p_plan_text: string
          p_rpc_name: string
        }
        Returns: string
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
      undo_merge: {
        Args: { p_actor?: string; p_merge_id: string }
        Returns: undefined
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
      visibility_to_anonymity_level: {
        Args: { p_visibility: string }
        Returns: number
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

