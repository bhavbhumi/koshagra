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
      assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at: string
          estate_id: string
          estimated_value: number | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          estate_id: string
          estimated_value?: number | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          created_at?: string
          estate_id?: string
          estimated_value?: number | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "continuity_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      continuity_subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_participant_id: string
          purpose_description: string | null
          subject_type: Database["public"]["Enums"]["subject_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_participant_id: string
          purpose_description?: string | null
          subject_type: Database["public"]["Enums"]["subject_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_participant_id?: string
          purpose_description?: string | null
          subject_type?: Database["public"]["Enums"]["subject_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "continuity_subjects_owner_participant_id_fkey"
            columns: ["owner_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          amount: number | null
          created_at: string
          estate_id: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          estate_id: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          estate_id?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "continuity_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          created_at: string
          estate_id: string
          id: string
          nominee_name: string
          notes: string | null
          relationship: string | null
          role: Database["public"]["Enums"]["nomination_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          estate_id: string
          id?: string
          nominee_name: string
          notes?: string | null
          relationship?: string | null
          role: Database["public"]["Enums"]["nomination_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          estate_id?: string
          id?: string
          nominee_name?: string
          notes?: string | null
          relationship?: string | null
          role?: Database["public"]["Enums"]["nomination_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nominations_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "continuity_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          auth_user_id: string | null
          capacity_name: string
          created_at: string
          display_name: string
          email: string
          id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          capacity_name?: string
          created_at?: string
          display_name: string
          email: string
          id?: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          capacity_name?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          updated_at?: string
        }
        Relationships: []
      }
      wills: {
        Row: {
          created_at: string
          estate_id: string
          executed_at: string | null
          id: string
          status: Database["public"]["Enums"]["will_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          estate_id: string
          executed_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["will_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          estate_id?: string
          executed_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["will_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wills_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: true
            referencedRelation: "continuity_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      participant_owns_estate: {
        Args: { _estate_id: string }
        Returns: boolean
      }
    }
    Enums: {
      asset_type: "Asset" | "Digital Asset"
      nomination_role: "Executor" | "Guardian" | "Beneficiary"
      participant_type:
        | "Individual"
        | "Family"
        | "Institution"
        | "Professional"
        | "AI Agent"
      subject_type:
        | "Estate"
        | "Family"
        | "Enterprise"
        | "Trust"
        | "Digital Legacy"
      will_status: "Drafted" | "Executed"
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
      asset_type: ["Asset", "Digital Asset"],
      nomination_role: ["Executor", "Guardian", "Beneficiary"],
      participant_type: [
        "Individual",
        "Family",
        "Institution",
        "Professional",
        "AI Agent",
      ],
      subject_type: [
        "Estate",
        "Family",
        "Enterprise",
        "Trust",
        "Digital Legacy",
      ],
      will_status: ["Drafted", "Executed"],
    },
  },
} as const
