// Supabase database types.
//
// Mirrors supabase/schema.sql. In a live project these are regenerated with
// `supabase gen types typescript`; committed here so the SupabaseStore and
// feature tracks type-check without a running database. Keep in sync with the
// schema when it changes.
//
// Insert/Update shapes are written out explicitly (not derived with Omit)
// because supabase-js resolves its query overloads from these concrete object
// types; deriving them breaks inference and collapses results to `{}`/`never`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      campuses: {
        Row: {
          id: string;
          name: string;
          city: string;
          state: string;
          latitude: number;
          longitude: number;
          city_service_name: string;
          city_service_url: string;
          city_service_phone: string;
          campus_police_name: string;
          campus_police_phone: string;
          counseling_name: string;
          counseling_url: string;
        };
        Insert: {
          id: string;
          name: string;
          city: string;
          state: string;
          latitude: number;
          longitude: number;
          city_service_name: string;
          city_service_url: string;
          city_service_phone: string;
          campus_police_name: string;
          campus_police_phone: string;
          counseling_name: string;
          counseling_url: string;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string;
          state?: string;
          latitude?: number;
          longitude?: number;
          city_service_name?: string;
          city_service_url?: string;
          city_service_phone?: string;
          campus_police_name?: string;
          campus_police_phone?: string;
          counseling_name?: string;
          counseling_url?: string;
        };
        Relationships: [];
      };
      buildings: {
        Row: {
          id: string;
          campus_id: string;
          name: string;
          latitude: number;
          longitude: number;
          floors: string[];
          dining_halls: string[];
        };
        Insert: {
          id: string;
          campus_id: string;
          name: string;
          latitude: number;
          longitude: number;
          floors: string[];
          dining_halls: string[];
        };
        Update: {
          id?: string;
          campus_id?: string;
          name?: string;
          latitude?: number;
          longitude?: number;
          floors?: string[];
          dining_halls?: string[];
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: string;
          public_team: string | null;
          private_office: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: string;
          public_team?: string | null;
          private_office?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: string;
          public_team?: string | null;
          private_office?: string | null;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          campus_id: string;
          building_id: string | null;
          reporter_id: string;
          category: string;
          item: string;
          title: string;
          tier: string;
          status: string;
          location: string;
          incomplete: boolean;
          location_unverified: boolean;
          photo_url: string | null;
          resolution_note: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          campus_id: string;
          building_id?: string | null;
          reporter_id: string;
          category: string;
          item: string;
          title: string;
          tier: string;
          status: string;
          location: string;
          incomplete: boolean;
          location_unverified: boolean;
          photo_url?: string | null;
          resolution_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          building_id?: string | null;
          reporter_id?: string;
          category?: string;
          item?: string;
          title?: string;
          tier?: string;
          status?: string;
          location?: string;
          incomplete?: boolean;
          location_unverified?: boolean;
          photo_url?: string | null;
          resolution_note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      co_signs: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id: string;
          report_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          body: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          recipient_id: string;
          body: string;
          read: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          body?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      private_reports: {
        Row: {
          id: string;
          campus_id: string;
          reporter_id: string;
          office: string;
          current_office: string;
          title: string;
          body: string;
          status: string;
          dont_share_name: boolean;
          resolution_note: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          campus_id: string;
          reporter_id: string;
          office: string;
          current_office: string;
          title: string;
          body: string;
          status: string;
          dont_share_name: boolean;
          resolution_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          reporter_id?: string;
          office?: string;
          current_office?: string;
          title?: string;
          body?: string;
          status?: string;
          dont_share_name?: boolean;
          resolution_note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      report_comments: {
        Row: {
          id: string;
          report_id: string;
          author_id: string;
          author_role: string;
          visibility: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id: string;
          report_id: string;
          author_id: string;
          author_role: string;
          visibility: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          author_id?: string;
          author_role?: string;
          visibility?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      private_messages: {
        Row: {
          id: string;
          report_id: string;
          author_role: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id: string;
          report_id: string;
          author_role: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          author_role?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      access_log: {
        Row: {
          id: string;
          actor_id: string;
          actor_office: string | null;
          action: string;
          report_id: string;
          created_at: string;
        };
        Insert: {
          id: string;
          actor_id: string;
          actor_office?: string | null;
          action: string;
          report_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          actor_office?: string | null;
          action?: string;
          report_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      quick_fixes: {
        Row: {
          id: string;
          campus_id: string;
          category: string;
          item: string | null;
          text: string;
        };
        Insert: {
          id: string;
          campus_id: string;
          category: string;
          item?: string | null;
          text: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          category?: string;
          item?: string | null;
          text?: string;
        };
        Relationships: [];
      };
      self_resolutions: {
        Row: {
          id: string;
          campus_id: string;
          user_id: string;
          category: string;
          item: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          campus_id: string;
          user_id: string;
          category: string;
          item?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campus_id?: string;
          user_id?: string;
          category?: string;
          item?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
