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
      athletes: {
        Row: {
          bib_number: string | null
          birth_date: string | null
          category: string | null
          city: string | null
          cpf: string | null
          created_at: string
          custom_1: string | null
          custom_2: string | null
          custom_3: string | null
          custom_4: string | null
          custom_5: string | null
          distance: string | null
          email: string | null
          equipe: string | null
          event_id: string
          gender: string | null
          id: string
          kit_status: Database["public"]["Enums"]["kit_status"]
          kit_type: string | null
          modality: string | null
          name: string
          payment_status: string
          phone: string | null
          registration_number: string | null
          registration_status: string
          shirt_size: string | null
        }
        Insert: {
          bib_number?: string | null
          birth_date?: string | null
          category?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          custom_1?: string | null
          custom_2?: string | null
          custom_3?: string | null
          custom_4?: string | null
          custom_5?: string | null
          distance?: string | null
          email?: string | null
          equipe?: string | null
          event_id: string
          gender?: string | null
          id?: string
          kit_status?: Database["public"]["Enums"]["kit_status"]
          kit_type?: string | null
          modality?: string | null
          name: string
          payment_status?: string
          phone?: string | null
          registration_number?: string | null
          registration_status?: string
          shirt_size?: string | null
        }
        Update: {
          bib_number?: string | null
          birth_date?: string | null
          category?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          custom_1?: string | null
          custom_2?: string | null
          custom_3?: string | null
          custom_4?: string | null
          custom_5?: string | null
          distance?: string | null
          email?: string | null
          equipe?: string | null
          event_id?: string
          gender?: string | null
          id?: string
          kit_status?: Database["public"]["Enums"]["kit_status"]
          kit_type?: string | null
          modality?: string | null
          name?: string
          payment_status?: string
          phone?: string | null
          registration_number?: string | null
          registration_status?: string
          shirt_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          event_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          event_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          event_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          athlete_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          delivered_at: string
          delivered_by: string | null
          delivered_by_name: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          event_id: string
          id: string
          identification_method: string
          kit_id: string | null
          kit_name: string | null
          location_id: string | null
          shirt_size: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          third_party_cpf: string | null
          third_party_name: string | null
        }
        Insert: {
          athlete_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          delivered_at?: string
          delivered_by?: string | null
          delivered_by_name?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          event_id: string
          id?: string
          identification_method?: string
          kit_id?: string | null
          kit_name?: string | null
          location_id?: string | null
          shirt_size?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          third_party_cpf?: string | null
          third_party_name?: string | null
        }
        Update: {
          athlete_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          delivered_at?: string
          delivered_by?: string | null
          delivered_by_name?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          event_id?: string
          id?: string
          identification_method?: string
          kit_id?: string | null
          kit_name?: string | null
          location_id?: string | null
          shirt_size?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          third_party_cpf?: string | null
          third_party_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "pickup_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          archived: boolean
          athletes_lock_at: string | null
          city: string | null
          created_at: string
          created_by: string | null
          custom_field_labels: string[]
          description: string | null
          event_date: string | null
          event_time: string | null
          id: string
          logo_url: string | null
          modalities: string[]
          name: string
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          address?: string | null
          archived?: boolean
          athletes_lock_at?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          custom_field_labels?: string[]
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          logo_url?: string | null
          modalities?: string[]
          name: string
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          address?: string | null
          archived?: boolean
          athletes_lock_at?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          custom_field_labels?: string[]
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          logo_url?: string | null
          modalities?: string[]
          name?: string
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          event_id: string
          id: string
          item_type: string
          low_stock_threshold: number
          quantity_current: number
          quantity_initial: number
          size: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          item_type?: string
          low_stock_threshold?: number
          quantity_current?: number
          quantity_initial?: number
          size: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          item_type?: string
          low_stock_threshold?: number
          quantity_current?: number
          quantity_initial?: number
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          id: string
          kit_id: string
          name: string
          quantity: number
        }
        Insert: {
          id?: string
          kit_id: string
          name: string
          quantity?: number
        }
        Update: {
          id?: string
          kit_id?: string
          name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_locations: {
        Row: {
          address: string | null
          created_at: string
          date: string | null
          end_time: string | null
          event_id: string
          id: string
          name: string
          start_time: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          date?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          name: string
          start_time?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          date?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          name?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string
          id: string
          name?: string
          phone?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      third_party_authorizations: {
        Row: {
          athlete_id: string
          cpf: string
          created_at: string
          event_id: string
          id: string
          name: string
          phone: string | null
          qr_code: string
          status: string
        }
        Insert: {
          athlete_id: string
          cpf: string
          created_at?: string
          event_id: string
          id?: string
          name: string
          phone?: string | null
          qr_code?: string
          status?: string
        }
        Update: {
          athlete_id?: string
          cpf?: string
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          phone?: string | null
          qr_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "third_party_authorizations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "third_party_authorizations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_athletes: { Args: { _event_id: string }; Returns: boolean }
      can_manage_event: { Args: { _event_id: string }; Returns: boolean }
      has_event_access: { Args: { _event_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      public_kit_lookup: {
        Args: { _doc: string; _slug: string }
        Returns: {
          athlete_id: string
          bib_number: string
          category: string
          city: string
          custom_labels: string[]
          custom_values: string[]
          delivered_at: string
          event_name: string
          kit_status: Database["public"]["Enums"]["kit_status"]
          kit_type: string
          modality: string
          name: string
          qr_payload: string
          shirt_size: string
        }[]
      }
      public_kit_lookup_all: {
        Args: { _doc: string }
        Returns: {
          athlete_id: string
          bib_number: string
          category: string
          city: string
          custom_labels: string[]
          custom_values: string[]
          delivered_at: string
          event_city: string
          event_date: string
          event_id: string
          event_name: string
          event_slug: string
          event_state: string
          kit_status: Database["public"]["Enums"]["kit_status"]
          kit_type: string
          modality: string
          name: string
          qr_payload: string
          shirt_size: string
        }[]
      }
      shares_managed_event: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "organizer" | "attendant"
      delivery_status: "active" | "cancelled"
      delivery_type: "athlete" | "third_party"
      event_status:
        | "planning"
        | "registrations_open"
        | "registrations_closed"
        | "kit_delivery"
        | "completed"
        | "closed"
      kit_status: "pending" | "delivered" | "third_party" | "blocked"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "organizer", "attendant"],
      delivery_status: ["active", "cancelled"],
      delivery_type: ["athlete", "third_party"],
      event_status: [
        "planning",
        "registrations_open",
        "registrations_closed",
        "kit_delivery",
        "completed",
        "closed",
      ],
      kit_status: ["pending", "delivered", "third_party", "blocked"],
    },
  },
} as const
