export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      dining_locations: {
        Row: {
          category: string | null;
          external_id: string;
          formal_name: string | null;
          id: string;
          name: string;
          provider: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          external_id: string;
          formal_name?: string | null;
          id?: string;
          name: string;
          provider: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          external_id?: string;
          formal_name?: string | null;
          id?: string;
          name?: string;
          provider?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      dining_menu_items: {
        Row: {
          food_id: string;
          id: string;
          location_id: string;
          meal: string;
          meal_order: number;
          served_on: string;
          sort_order: number;
          station: string;
          synced_at: string;
        };
        Insert: {
          food_id: string;
          id?: string;
          location_id: string;
          meal: string;
          meal_order?: number;
          served_on: string;
          sort_order?: number;
          station: string;
          synced_at?: string;
        };
        Update: {
          food_id?: string;
          id?: string;
          location_id?: string;
          meal?: string;
          meal_order?: number;
          served_on?: string;
          sort_order?: number;
          station?: string;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dining_menu_items_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'foods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dining_menu_items_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'dining_locations';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_entries: {
        Row: {
          active_calories: number;
          activity_type: string;
          created_at: string;
          ended_at: string;
          external_id: string | null;
          id: string;
          local_date: string;
          source: Database['public']['Enums']['exercise_source'];
          started_at: string;
          user_id: string;
        };
        Insert: {
          active_calories: number;
          activity_type: string;
          created_at?: string;
          ended_at: string;
          external_id?: string | null;
          id?: string;
          local_date: string;
          source?: Database['public']['Enums']['exercise_source'];
          started_at: string;
          user_id: string;
        };
        Update: {
          active_calories?: number;
          activity_type?: string;
          created_at?: string;
          ended_at?: string;
          external_id?: string | null;
          id?: string;
          local_date?: string;
          source?: Database['public']['Enums']['exercise_source'];
          started_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      food_servings: {
        Row: {
          base_multiplier: number;
          created_at: string;
          food_id: string;
          id: string;
          is_default: boolean;
          label: string;
        };
        Insert: {
          base_multiplier: number;
          created_at?: string;
          food_id: string;
          id?: string;
          is_default?: boolean;
          label: string;
        };
        Update: {
          base_multiplier?: number;
          created_at?: string;
          food_id?: string;
          id?: string;
          is_default?: boolean;
          label?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_servings_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'foods';
            referencedColumns: ['id'];
          },
        ];
      };
      food_verifications: {
        Row: {
          food_id: string;
          matches: boolean;
          user_id: string;
          verified_at: string;
        };
        Insert: {
          food_id: string;
          matches: boolean;
          user_id: string;
          verified_at?: string;
        };
        Update: {
          food_id?: string;
          matches?: boolean;
          user_id?: string;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'food_verifications_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'foods';
            referencedColumns: ['id'];
          },
        ];
      };
      foods: {
        Row: {
          allergens: string[];
          barcode: string | null;
          base_amount: number;
          base_unit: Database['public']['Enums']['base_unit'];
          brand: string | null;
          calories: number;
          carbs_g: number;
          cholesterol_mg: number | null;
          created_at: string;
          diet_tags: string[];
          external_id: string | null;
          fat_g: number;
          fiber_g: number | null;
          id: string;
          ingredients: string | null;
          micros: Json;
          mismatch_count: number;
          name: string;
          owner_id: string | null;
          protein_g: number;
          provider: string | null;
          provider_item_id: string | null;
          provider_synced_at: string | null;
          sat_fat_g: number | null;
          search_vector: unknown;
          sodium_mg: number | null;
          source: Database['public']['Enums']['food_source'];
          sugar_g: number | null;
          verification_count: number;
          visibility: Database['public']['Enums']['food_visibility'];
        };
        Insert: {
          allergens?: string[];
          barcode?: string | null;
          base_amount?: number;
          base_unit?: Database['public']['Enums']['base_unit'];
          brand?: string | null;
          calories: number;
          carbs_g?: number;
          cholesterol_mg?: number | null;
          created_at?: string;
          diet_tags?: string[];
          external_id?: string | null;
          fat_g?: number;
          fiber_g?: number | null;
          id?: string;
          ingredients?: string | null;
          micros?: Json;
          mismatch_count?: number;
          name: string;
          owner_id?: string | null;
          protein_g?: number;
          provider?: string | null;
          provider_item_id?: string | null;
          provider_synced_at?: string | null;
          sat_fat_g?: number | null;
          search_vector?: unknown;
          sodium_mg?: number | null;
          source: Database['public']['Enums']['food_source'];
          sugar_g?: number | null;
          verification_count?: number;
          visibility?: Database['public']['Enums']['food_visibility'];
        };
        Update: {
          allergens?: string[];
          barcode?: string | null;
          base_amount?: number;
          base_unit?: Database['public']['Enums']['base_unit'];
          brand?: string | null;
          calories?: number;
          carbs_g?: number;
          cholesterol_mg?: number | null;
          created_at?: string;
          diet_tags?: string[];
          external_id?: string | null;
          fat_g?: number;
          fiber_g?: number | null;
          id?: string;
          ingredients?: string | null;
          micros?: Json;
          mismatch_count?: number;
          name?: string;
          owner_id?: string | null;
          protein_g?: number;
          provider?: string | null;
          provider_item_id?: string | null;
          provider_synced_at?: string | null;
          sat_fat_g?: number | null;
          search_vector?: unknown;
          sodium_mg?: number | null;
          source?: Database['public']['Enums']['food_source'];
          sugar_g?: number | null;
          verification_count?: number;
          visibility?: Database['public']['Enums']['food_visibility'];
        };
        Relationships: [];
      };
      goals: {
        Row: {
          carbs_target_g: number | null;
          created_at: string;
          daily_calorie_target: number;
          ended_at: string | null;
          fat_target_g: number | null;
          goal_type: Database['public']['Enums']['goal_type'];
          id: string;
          pace_kg_per_week: number;
          protein_target_g: number | null;
          start_weight_kg: number;
          started_at: string;
          target_body_fat_pct: number | null;
          target_weight_kg: number | null;
          user_id: string;
        };
        Insert: {
          carbs_target_g?: number | null;
          created_at?: string;
          daily_calorie_target: number;
          ended_at?: string | null;
          fat_target_g?: number | null;
          goal_type: Database['public']['Enums']['goal_type'];
          id?: string;
          pace_kg_per_week?: number;
          protein_target_g?: number | null;
          start_weight_kg: number;
          started_at?: string;
          target_body_fat_pct?: number | null;
          target_weight_kg?: number | null;
          user_id: string;
        };
        Update: {
          carbs_target_g?: number | null;
          created_at?: string;
          daily_calorie_target?: number;
          ended_at?: string | null;
          fat_target_g?: number | null;
          goal_type?: Database['public']['Enums']['goal_type'];
          id?: string;
          pace_kg_per_week?: number;
          protein_target_g?: number | null;
          start_weight_kg?: number;
          started_at?: string;
          target_body_fat_pct?: number | null;
          target_weight_kg?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      log_entries: {
        Row: {
          calories: number;
          carbs_g: number;
          created_at: string;
          fat_g: number;
          food_id: string | null;
          food_name: string;
          id: string;
          local_date: string;
          logged_at: string;
          meal: Database['public']['Enums']['meal_type'];
          nutrients: Json;
          protein_g: number;
          quantity: number;
          serving_id: string | null;
          user_id: string;
        };
        Insert: {
          calories: number;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          food_id?: string | null;
          food_name: string;
          id?: string;
          local_date: string;
          logged_at?: string;
          meal: Database['public']['Enums']['meal_type'];
          nutrients?: Json;
          protein_g?: number;
          quantity?: number;
          serving_id?: string | null;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          food_id?: string | null;
          food_name?: string;
          id?: string;
          local_date?: string;
          logged_at?: string;
          meal?: Database['public']['Enums']['meal_type'];
          nutrients?: Json;
          protein_g?: number;
          quantity?: number;
          serving_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'log_entries_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'foods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'log_entries_serving_id_fkey';
            columns: ['serving_id'];
            isOneToOne: false;
            referencedRelation: 'food_servings';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          activity_level: Database['public']['Enums']['activity_level'] | null;
          allergies: string[];
          birth_date: string | null;
          created_at: string;
          dietary_restrictions: string[];
          display_name: string | null;
          height_cm: number | null;
          id: string;
          motivation: string | null;
          numbers_off: boolean;
          onboarded_at: string | null;
          sex: Database['public']['Enums']['sex_for_bmr'] | null;
          timezone: string;
          unit_system: Database['public']['Enums']['unit_system'];
          weigh_in_frequency: Database['public']['Enums']['weigh_in_freq'];
          weigh_in_reminder_time: string;
          weigh_in_weekday: number;
        };
        Insert: {
          activity_level?: Database['public']['Enums']['activity_level'] | null;
          allergies?: string[];
          birth_date?: string | null;
          created_at?: string;
          dietary_restrictions?: string[];
          display_name?: string | null;
          height_cm?: number | null;
          id: string;
          motivation?: string | null;
          numbers_off?: boolean;
          onboarded_at?: string | null;
          sex?: Database['public']['Enums']['sex_for_bmr'] | null;
          timezone?: string;
          unit_system?: Database['public']['Enums']['unit_system'];
          weigh_in_frequency?: Database['public']['Enums']['weigh_in_freq'];
          weigh_in_reminder_time?: string;
          weigh_in_weekday?: number;
        };
        Update: {
          activity_level?: Database['public']['Enums']['activity_level'] | null;
          allergies?: string[];
          birth_date?: string | null;
          created_at?: string;
          dietary_restrictions?: string[];
          display_name?: string | null;
          height_cm?: number | null;
          id?: string;
          motivation?: string | null;
          numbers_off?: boolean;
          onboarded_at?: string | null;
          sex?: Database['public']['Enums']['sex_for_bmr'] | null;
          timezone?: string;
          unit_system?: Database['public']['Enums']['unit_system'];
          weigh_in_frequency?: Database['public']['Enums']['weigh_in_freq'];
          weigh_in_reminder_time?: string;
          weigh_in_weekday?: number;
        };
        Relationships: [];
      };
      weigh_ins: {
        Row: {
          body_fat_pct: number | null;
          created_at: string;
          id: string;
          local_date: string;
          measured_at: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          body_fat_pct?: number | null;
          created_at?: string;
          id?: string;
          local_date: string;
          measured_at?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          body_fat_pct?: number | null;
          created_at?: string;
          id?: string;
          local_date?: string;
          measured_at?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      daily_totals: {
        Row: {
          calories: number | null;
          carbs_g: number | null;
          entry_count: number | null;
          fat_g: number | null;
          local_date: string | null;
          protein_g: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      change_goal: {
        Args: {
          p_carbs_target_g?: number;
          p_daily_calorie_target: number;
          p_fat_target_g?: number;
          p_goal_type: Database['public']['Enums']['goal_type'];
          p_pace_kg_per_week?: number;
          p_protein_target_g?: number;
          p_start_weight_kg: number;
          p_target_body_fat_pct?: number;
          p_target_weight_kg?: number;
        };
        Returns: {
          carbs_target_g: number | null;
          created_at: string;
          daily_calorie_target: number;
          ended_at: string | null;
          fat_target_g: number | null;
          goal_type: Database['public']['Enums']['goal_type'];
          id: string;
          pace_kg_per_week: number;
          protein_target_g: number | null;
          start_weight_kg: number;
          started_at: string;
          target_body_fat_pct: number | null;
          target_weight_kg: number | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'goals';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_streak: { Args: { p_tz: string }; Returns: number };
      insert_food_with_servings: {
        Args: { food: Json; servings: Json };
        Returns: string;
      };
      streak_from_dates: {
        Args: { p_days: string[]; p_today: string };
        Returns: number;
      };
      upsert_provider_food: {
        Args: { food: Json; servings: Json };
        Returns: string;
      };
    };
    Enums: {
      activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
      base_unit: 'g' | 'ml' | 'serving';
      exercise_source: 'apple_health' | 'manual';
      food_source:
        | 'open_food_facts'
        | 'restaurant'
        | 'label_scan'
        | 'user_product'
        | 'user_recipe'
        | 'dining_hall';
      food_visibility: 'private' | 'public';
      goal_type: 'lose' | 'maintain' | 'gain';
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      sex_for_bmr: 'male' | 'female';
      unit_system: 'imperial' | 'metric';
      weigh_in_freq: 'weekly' | 'biweekly' | 'monthly';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      activity_level: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      base_unit: ['g', 'ml', 'serving'],
      exercise_source: ['apple_health', 'manual'],
      food_source: [
        'open_food_facts',
        'restaurant',
        'label_scan',
        'user_product',
        'user_recipe',
        'dining_hall',
      ],
      food_visibility: ['private', 'public'],
      goal_type: ['lose', 'maintain', 'gain'],
      meal_type: ['breakfast', 'lunch', 'dinner', 'snack'],
      sex_for_bmr: ['male', 'female'],
      unit_system: ['imperial', 'metric'],
      weigh_in_freq: ['weekly', 'biweekly', 'monthly'],
    },
  },
} as const;
