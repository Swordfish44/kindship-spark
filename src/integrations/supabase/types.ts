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
      campaign_analytics: {
        Row: {
          avg_donation_amount: number | null
          campaign_id: string
          conversion_rate: number | null
          id: string
          page_views: number | null
          recorded_date: string
          social_shares: number | null
          total_refunds: number | null
          unique_visitors: number | null
        }
        Insert: {
          avg_donation_amount?: number | null
          campaign_id: string
          conversion_rate?: number | null
          id?: string
          page_views?: number | null
          recorded_date?: string
          social_shares?: number | null
          total_refunds?: number | null
          unique_visitors?: number | null
        }
        Update: {
          avg_donation_amount?: number | null
          campaign_id?: string
          conversion_rate?: number | null
          id?: string
          page_views?: number | null
          recorded_date?: string
          social_shares?: number | null
          total_refunds?: number | null
          unique_visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaign_categories: {
        Row: {
          color_hex: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          name: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      campaign_comments: {
        Row: {
          campaign_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean | null
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_comments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_comments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "campaign_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_likes: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_likes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_likes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaign_subscribers: {
        Row: {
          campaign_id: string
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
          subscription_type: string
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          subscription_type?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          subscription_type?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_team_members: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_team_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_team_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_updates: {
        Row: {
          campaign_id: string
          content: string
          created_at: string
          id: string
          is_public: boolean | null
          title: string
          update_type: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          title: string
          update_type?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          title?: string
          update_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          category_id: string | null
          created_at: string
          current_amount: number | null
          current_amount_cents: number | null
          description: string
          funding_goal: number | null
          funding_goal_cents: number | null
          id: string
          image_url: string | null
          media_urls: string[] | null
          organizer_id: string
          slug: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          current_amount?: number | null
          current_amount_cents?: number | null
          description: string
          funding_goal?: number | null
          funding_goal_cents?: number | null
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          organizer_id: string
          slug?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          current_amount?: number | null
          current_amount_cents?: number | null
          description?: string
          funding_goal?: number | null
          funding_goal_cents?: number | null
          id?: string
          image_url?: string | null
          media_urls?: string[] | null
          organizer_id?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "campaign_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          amount_cents: number | null
          anonymous: boolean | null
          campaign_id: string
          created_at: string
          currency: string | null
          donor_email: string | null
          donor_id: string | null
          donor_name: string | null
          id: string
          message: string | null
          net_amount: number
          net_amount_cents: number | null
          net_to_organizer_cents: number | null
          platform_fee: number
          platform_fee_cents: number | null
          refunded_cents: number | null
          reward_tier_id: string | null
          stripe_balance_txn_id: string | null
          stripe_charge_id: string | null
          stripe_fee_cents: number | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          amount_cents?: number | null
          anonymous?: boolean | null
          campaign_id: string
          created_at?: string
          currency?: string | null
          donor_email?: string | null
          donor_id?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          net_amount: number
          net_amount_cents?: number | null
          net_to_organizer_cents?: number | null
          platform_fee: number
          platform_fee_cents?: number | null
          refunded_cents?: number | null
          reward_tier_id?: string | null
          stripe_balance_txn_id?: string | null
          stripe_charge_id?: string | null
          stripe_fee_cents?: number | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          amount_cents?: number | null
          anonymous?: boolean | null
          campaign_id?: string
          created_at?: string
          currency?: string | null
          donor_email?: string | null
          donor_id?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          net_amount?: number
          net_amount_cents?: number | null
          net_to_organizer_cents?: number | null
          platform_fee?: number
          platform_fee_cents?: number | null
          refunded_cents?: number | null
          reward_tier_id?: string | null
          stripe_balance_txn_id?: string | null
          stripe_charge_id?: string | null
          stripe_fee_cents?: number | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_reward_tier_id_fkey"
            columns: ["reward_tier_id"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          target_audience: Json
          template_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          target_audience?: Json
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          target_audience?: Json
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string
          email_type: string
          id: string
          is_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_type: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          email_type: string
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject_template: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject_template: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject_template?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          email: string
          email_type: string | null
          id: string
          reason: string | null
          unsubscribed_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          email_type?: string | null
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          email_type?: string | null
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          amount_cents: number | null
          campaign_id: string | null
          created_at: string
          id: string
          organizer_id: string
          platform_fee: number
          platform_fee_cents: number | null
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          stripe_account_id: string | null
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          amount_cents?: number | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          organizer_id: string
          platform_fee: number
          platform_fee_cents?: number | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          stripe_account_id?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          amount_cents?: number | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          organizer_id?: string
          platform_fee?: number
          platform_fee_cents?: number | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          stripe_account_id?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "payouts_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ratelimits: {
        Row: {
          count: number
          key: string
          window_started_at: string
        }
        Insert: {
          count?: number
          key: string
          window_started_at?: string
        }
        Update: {
          count?: number
          key?: string
          window_started_at?: string
        }
        Relationships: []
      }
      receipt_logs: {
        Row: {
          created_at: string
          donation_pi: string
          donor_email: string | null
          id: number
          organizer_email: string | null
          organizer_sent_at: string | null
          receipt_sent_at: string | null
        }
        Insert: {
          created_at?: string
          donation_pi: string
          donor_email?: string | null
          id?: number
          organizer_email?: string | null
          organizer_sent_at?: string | null
          receipt_sent_at?: string | null
        }
        Update: {
          created_at?: string
          donation_pi?: string
          donor_email?: string | null
          id?: number
          organizer_email?: string | null
          organizer_sent_at?: string | null
          receipt_sent_at?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          donation_id: string
          id: string
          processed_at: string | null
          reason: string | null
          status: string | null
          stripe_refund_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          donation_id: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
          stripe_refund_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          donation_id?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
          stripe_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tiers: {
        Row: {
          campaign_id: string
          created_at: string
          description: string
          estimated_delivery: string | null
          id: string
          is_active: boolean | null
          minimum_amount: number
          minimum_amount_cents: number | null
          quantity_claimed: number | null
          quantity_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description: string
          estimated_delivery?: string | null
          id?: string
          is_active?: boolean | null
          minimum_amount: number
          minimum_amount_cents?: number | null
          quantity_claimed?: number | null
          quantity_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string
          estimated_delivery?: string | null
          id?: string
          is_active?: boolean | null
          minimum_amount?: number
          minimum_amount_cents?: number | null
          quantity_claimed?: number | null
          quantity_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_type: string
          id: string
          metadata: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_type: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_type?: string
          id?: string
          metadata?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          campaign_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activities_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_ledger_by_campaign"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_social_accounts: {
        Row: {
          created_at: string
          id: string
          platform: string
          url: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          url?: string | null
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          url?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          kyc_status: string | null
          organization_name: string | null
          phone: string | null
          social_media_links: Json | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          kyc_status?: string | null
          organization_name?: string | null
          phone?: string | null
          social_media_links?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          kyc_status?: string | null
          organization_name?: string | null
          phone?: string | null
          social_media_links?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          data: Json
          event_type: string
          id: string
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          event_type: string
          id?: string
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          event_type?: string
          id?: string
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_donations_30d: {
        Row: {
          day: string | null
          donation_count: number | null
          total_amount: number | null
        }
        Relationships: []
      }
      vw_ledger_by_campaign: {
        Row: {
          campaign_id: string | null
          donations_count: number | null
          gross_cents: number | null
          net_to_organizer_cents: number | null
          platform_fee_cents: number | null
          refund_cents: number | null
          slug: string | null
          stripe_fee_cents: number | null
          title: string | null
        }
        Relationships: []
      }
      vw_ledger_daily: {
        Row: {
          day: string | null
          donations_count: number | null
          gross_cents: number | null
          net_to_organizer_cents: number | null
          platform_fee_cents: number | null
          refund_cents: number | null
          stripe_fee_cents: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ledger_by_campaign: {
        Args: Record<PropertyKey, never>
        Returns: {
          campaign_id: string | null
          donations_count: number | null
          gross_cents: number | null
          net_to_organizer_cents: number | null
          platform_fee_cents: number | null
          refund_cents: number | null
          slug: string | null
          stripe_fee_cents: number | null
          title: string | null
        }[]
      }
      admin_ledger_daily: {
        Args: { p_end?: string; p_start?: string }
        Returns: {
          day: string | null
          donations_count: number | null
          gross_cents: number | null
          net_to_organizer_cents: number | null
          platform_fee_cents: number | null
          refund_cents: number | null
          stripe_fee_cents: number | null
        }[]
      }
      admin_payouts: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          organizer_id: string
          status: string
          stripe_account_id: string
          stripe_payout_id: string
        }[]
      }
      calculate_platform_fee: {
        Args: { amount: number }
        Returns: number
      }
      calculate_platform_fee_cents: {
        Args: { amount_cents: number }
        Returns: number
      }
      generate_campaign_slug: {
        Args: { title: string }
        Returns: string
      }
      get_campaign_public_stats: {
        Args: { campaign_slug: string }
        Returns: {
          backer_count: number
          campaign_id: string
          funding_goal_cents: number
          raised_cents: number
          status: string
          title: string
        }[]
      }
      increment_campaign_amount: {
        Args: { amount_param: number; campaign_id_param: string }
        Returns: undefined
      }
      increment_campaign_amount_cents: {
        Args: { amount_cents_param: number; campaign_id_param: string }
        Returns: undefined
      }
      increment_reward_tier_claimed: {
        Args: { tier_id_param: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_unsubscribed: {
        Args: { email_address: string; email_type_check: string }
        Returns: boolean
      }
      public_campaign_stats: {
        Args: { sl: string }
        Returns: {
          backer_count: number
          campaign_id: string
          currency: string
          goal_cents: number
          raised_cents: number
          status: string
          title: string
        }[]
      }
      public_discover_campaigns: {
        Args:
          | {
              p_category_id?: string
              p_funding_status?: string
              p_max_goal_cents?: number
              p_min_goal_cents?: number
              p_page?: number
              p_search?: string
              p_size?: number
              p_sort?: string
            }
          | {
              p_page?: number
              p_search?: string
              p_size?: number
              p_sort?: string
            }
        Returns: {
          backer_count: number
          category_color: string
          category_name: string
          created_at: string
          currency: string
          days_remaining: number
          description: string
          funding_goal_cents: number
          image_url: string
          organizer_name: string
          progress_percentage: number
          raised_cents: number
          slug: string
          title: string
        }[]
      }
      refresh_mv_donations_30d: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rl_take: {
        Args: {
          p_action: string
          p_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      select_donations_for_fee_backfill: {
        Args: { p_limit: number; p_since: string }
        Returns: {
          campaign_id: string
          organizer_acct: string
          pi: string
        }[]
      }
    }
    Enums: {
      campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      document_type:
        | "government_id_front"
        | "government_id_back"
        | "proof_of_address"
        | "business_registration"
        | "bank_statement"
      payout_status: "pending" | "in_transit" | "paid" | "failed" | "cancelled"
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
      campaign_status: ["draft", "active", "paused", "completed", "cancelled"],
      document_type: [
        "government_id_front",
        "government_id_back",
        "proof_of_address",
        "business_registration",
        "bank_statement",
      ],
      payout_status: ["pending", "in_transit", "paid", "failed", "cancelled"],
    },
  },
} as const
