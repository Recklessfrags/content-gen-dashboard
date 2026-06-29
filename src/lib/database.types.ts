// GENERATED — do not edit by hand.
// Source: Supabase `generate_typescript_types` off project `tyeejhaknqkeftjykqog`
// (the shared reels-content schema = the enforced dashboard contract).
// Regenerate when the pipeline adds/changes columns; the build breaks until the
// app conforms. See the "Dashboard Contract — single source of truth" HQ page.
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
      asset_ledger: {
        Row: {
          cost: number
          created_at: string
          episode_id: string | null
          key: string
          kind: string
          uri: string
        }
        Insert: {
          cost?: number
          created_at?: string
          episode_id?: string | null
          key: string
          kind: string
          uri: string
        }
        Update: {
          cost?: number
          created_at?: string
          episode_id?: string | null
          key?: string
          kind?: string
          uri?: string
        }
        Relationships: []
      }
      casting_usage: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      character_bible_revisions: {
        Row: {
          bible: Json
          character_id: string
          codename: string | null
          concept: string | null
          created_at: string
          id: string
          owner: string
          status: string | null
        }
        Insert: {
          bible?: Json
          character_id: string
          codename?: string | null
          concept?: string | null
          created_at?: string
          id?: string
          owner?: string
          status?: string | null
        }
        Update: {
          bible?: Json
          character_id?: string
          codename?: string | null
          concept?: string | null
          created_at?: string
          id?: string
          owner?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_bible_revisions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          bible: Json
          codename: string
          concept: string
          created_at: string
          id: string
          owner: string
          status: string
          updated_at: string
          voice_id: string | null
          voice_settings: Json | null
        }
        Insert: {
          bible?: Json
          codename?: string
          concept?: string
          created_at?: string
          id?: string
          owner?: string
          status?: string
          updated_at?: string
          voice_id?: string | null
          voice_settings?: Json | null
        }
        Update: {
          bible?: Json
          codename?: string
          concept?: string
          created_at?: string
          id?: string
          owner?: string
          status?: string
          updated_at?: string
          voice_id?: string | null
          voice_settings?: Json | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          character_id: string | null
          created_at: string
          episode_id: string
          final_stage: string | null
          food: string
          message: string | null
          sentinels: Json
          spend: number
          status: string
          updated_at: string
        }
        Insert: {
          character_id?: string | null
          created_at?: string
          episode_id: string
          final_stage?: string | null
          food: string
          message?: string | null
          sentinels?: Json
          spend?: number
          status: string
          updated_at?: string
        }
        Update: {
          character_id?: string | null
          created_at?: string
          episode_id?: string
          final_stage?: string | null
          food?: string
          message?: string | null
          sentinels?: Json
          spend?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          channel: string
          character_id: string | null
          created_at: string
          id: string
          note: string
          owner: string
          status: string
          title: string
        }
        Insert: {
          channel?: string
          character_id?: string | null
          created_at?: string
          id?: string
          note?: string
          owner?: string
          status?: string
          title: string
        }
        Update: {
          channel?: string
          character_id?: string | null
          created_at?: string
          id?: string
          note?: string
          owner?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          anchor_citation: string | null
          anchor_url: string | null
          attempts: number
          character: string | null
          created_at: string
          episode_cap: number
          episode_id: string | null
          error: string | null
          finished_at: string | null
          food: string
          id: number
          idempotency_key: string | null
          inject_claims: Json
          lease_expires_at: string | null
          live_adapters: Json | null
          publish_approved: boolean
          routes: Json
          spend: number | null
          spend_approved: boolean
          started_at: string | null
          status: string
          stub_upstream: boolean
        }
        Insert: {
          anchor_citation?: string | null
          anchor_url?: string | null
          attempts?: number
          character?: string | null
          created_at?: string
          episode_cap?: number
          episode_id?: string | null
          error?: string | null
          finished_at?: string | null
          food: string
          id?: never
          idempotency_key?: string | null
          inject_claims?: Json
          lease_expires_at?: string | null
          live_adapters?: Json | null
          publish_approved?: boolean
          routes?: Json
          spend?: number | null
          spend_approved?: boolean
          started_at?: string | null
          status?: string
          stub_upstream?: boolean
        }
        Update: {
          anchor_citation?: string | null
          anchor_url?: string | null
          attempts?: number
          character?: string | null
          created_at?: string
          episode_cap?: number
          episode_id?: string | null
          error?: string | null
          finished_at?: string | null
          food?: string
          id?: never
          idempotency_key?: string | null
          inject_claims?: Json
          lease_expires_at?: string | null
          live_adapters?: Json | null
          publish_approved?: boolean
          routes?: Json
          spend?: number | null
          spend_approved?: boolean
          started_at?: string | null
          status?: string
          stub_upstream?: boolean
        }
        Relationships: []
      }
      published_posts: {
        Row: {
          created_at: string
          episode_id: string | null
          key: string
          platform: string
          ticket: string
        }
        Insert: {
          created_at?: string
          episode_id?: string | null
          key: string
          platform: string
          ticket: string
        }
        Update: {
          created_at?: string
          episode_id?: string | null
          key?: string
          platform?: string
          ticket?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          cache_creation_tokens: number | null
          cache_read_tokens: number | null
          clamped: boolean
          effort_requested: string | null
          effort_used: string | null
          episode_id: string
          evidence: Json | null
          id: number
          iteration: number
          model: string | null
          provider: string | null
          reason: string | null
          result: Json | null
          seq: number
          spend_so_far: number
          stage: string
          ts: string
          verdict: string
        }
        Insert: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          clamped?: boolean
          effort_requested?: string | null
          effort_used?: string | null
          episode_id: string
          evidence?: Json | null
          id?: never
          iteration: number
          model?: string | null
          provider?: string | null
          reason?: string | null
          result?: Json | null
          seq: number
          spend_so_far?: number
          stage: string
          ts?: string
          verdict: string
        }
        Update: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          clamped?: boolean
          effort_requested?: string | null
          effort_used?: string | null
          episode_id?: string
          evidence?: Json | null
          id?: never
          iteration?: number
          model?: string | null
          provider?: string | null
          reason?: string | null
          result?: Json | null
          seq?: number
          spend_so_far?: number
          stage?: string
          ts?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      casting_bump_usage: {
        Args: { p_limit: number; p_user: string }
        Returns: {
          allowed: boolean
          used: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
