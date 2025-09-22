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
        ]
      }
      campaigns: {
        Row: {
          category_id: string | null
          created_at: string
          current_amount: number | null
          description: string
          funding_goal: number | null
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
          description: string
          funding_goal?: number | null
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
          description?: string
          funding_goal?: number | null
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
          anonymous: boolean | null
          campaign_id: string
          created_at: string
          donor_email: string | null
          donor_id: string | null
          donor_name: string | null
          id: string
          message: string | null
          net_amount: number
          platform_fee: number
          reward_tier_id: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          anonymous?: boolean | null
          campaign_id: string
          created_at?: string
          donor_email?: string | null
          donor_id?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          net_amount: number
          platform_fee: number
          reward_tier_id?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          anonymous?: boolean | null
          campaign_id?: string
          created_at?: string
          donor_email?: string | null
          donor_id?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          net_amount?: number
          platform_fee?: number
          reward_tier_id?: string | null
          stripe_charge_id?: string | null
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
      payouts: {
        Row: {
          amount: number
          campaign_id: string | null
          created_at: string
          id: string
          organizer_id: string
          platform_fee: number
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          created_at?: string
          id?: string
          organizer_id: string
          platform_fee: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          id?: string
          organizer_id?: string
          platform_fee?: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
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
            foreignKeyName: "payouts_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
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
          organization_name?: string | null
          phone?: string | null
          social_media_links?: Json | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_platform_fee: {
        Args: { amount: number }
        Returns: number
      }
      generate_campaign_slug: {
        Args: { title: string }
        Returns: string
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
