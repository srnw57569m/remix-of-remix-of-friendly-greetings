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
      activity_logs: {
        Row: {
          action: string
          bot_id: string | null
          created_at: string
          detail: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          bot_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          bot_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          admins: Json
          bot_index: number
          bot_name: string
          bot_token: string
          created_at: string
          icecast_password: string
          icecast_port: number
          icecast_server: string
          icecast_username: string
          id: string
          last_restart_at: string | null
          mount_point: string
          owner_username: string
          plan_duration: string | null
          room_id: string
          status: string
          storage_path: string
          subscription_expires_at: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admins?: Json
          bot_index: number
          bot_name: string
          bot_token: string
          created_at?: string
          icecast_password: string
          icecast_port: number
          icecast_server: string
          icecast_username: string
          id?: string
          last_restart_at?: string | null
          mount_point: string
          owner_username: string
          plan_duration?: string | null
          room_id: string
          status?: string
          storage_path: string
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admins?: Json
          bot_index?: number
          bot_name?: string
          bot_token?: string
          created_at?: string
          icecast_password?: string
          icecast_port?: number
          icecast_server?: string
          icecast_username?: string
          id?: string
          last_restart_at?: string | null
          mount_point?: string
          owner_username?: string
          plan_duration?: string | null
          room_id?: string
          status?: string
          storage_path?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      highrise_codes: {
        Row: {
          claimed_by: string | null
          code: string
          created_at: string
          highrise_id: string | null
          highrise_username: string
          used_at: string | null
        }
        Insert: {
          claimed_by?: string | null
          code: string
          created_at?: string
          highrise_id?: string | null
          highrise_username: string
          used_at?: string | null
        }
        Update: {
          claimed_by?: string | null
          code?: string
          created_at?: string
          highrise_id?: string | null
          highrise_username?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          highrise_connected_at: string | null
          highrise_id: string | null
          highrise_username: string | null
          id: string
          suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          user_id: string
          username: string
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          email: string
          highrise_connected_at?: string | null
          highrise_id?: string | null
          highrise_username?: string | null
          id: string
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
          username: string
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          email?: string
          highrise_connected_at?: string | null
          highrise_id?: string | null
          highrise_username?: string | null
          id?: string
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          wallet_balance?: number
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          detail: string | null
          id: string
          kind: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
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
      bank_deposit_by_highrise: {
        Args: { _amount: number; _highrise_id: string; _username: string }
        Returns: {
          balance_after: number
          user_id: string
        }[]
      }
      purchase_bot_plan: {
        Args: {
          _bot_id: string
          _duration: string
          _interval: string
          _price: number
          _user_id: string
        }
        Returns: {
          balance_after: number
          bot_id: string
          expires_at: string
        }[]
      }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin" | "super_admin"
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
      app_role: ["user", "moderator", "admin", "super_admin"],
    },
  },
} as const
