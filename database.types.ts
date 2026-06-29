/**
 * Vip Space — Supabase Database Types
 *
 * Manually maintained until `supabase gen types typescript` is run against a live instance.
 * Regenerate with: npx supabase gen types typescript --project-id <id> > database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type UserRole = 'admin' | 'customer'
export type PriceType = 'fixed' | 'variable'

export interface Database {
  public: {
    Tables: {
      super_admins: {
        Row: { email: string }
        Insert: { email: string }
        Update: { email?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          role: UserRole
          name: string | null
          phone: string | null
          email: string
          avatar_url: string | null
          zip_code: string | null
          street: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          name?: string | null
          phone?: string | null
          email: string
          avatar_url?: string | null
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          name?: string | null
          phone?: string | null
          email?: string
          avatar_url?: string | null
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      establishments: {
        Row: {
          id: string
          admin_id: string | null
          owner_email: string
          slug: string
          name: string
          address: string | null
          contact: string | null
          zip_code: string | null
          street: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          whatsapp_phone: string | null
          logo_url: string | null
          business_hours: Json
          slots_per_schedule: number
          reminder_hours_before: number
          is_blocked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          admin_id?: string | null
          owner_email: string
          slug: string
          name: string
          address?: string | null
          contact?: string | null
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          whatsapp_phone?: string | null
          logo_url?: string | null
          business_hours?: Json
          slots_per_schedule?: number
          reminder_hours_before?: number
          is_blocked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string | null
          owner_email?: string
          slug?: string
          name?: string
          address?: string | null
          contact?: string | null
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          whatsapp_phone?: string | null
          logo_url?: string | null
          business_hours?: Json
          slots_per_schedule?: number
          reminder_hours_before?: number
          is_blocked?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'establishments_admin_id_fkey'
            columns: ['admin_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      services: {
        Row: {
          id: string
          establishment_id: string
          name: string
          price_type: PriceType
          price: number | null
          description: string | null
          image_url: string | null
          duration_minutes: number
          category: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          name: string
          price_type: PriceType
          price?: number | null
          description?: string | null
          image_url?: string | null
          duration_minutes?: number
          category?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          name?: string
          price_type?: PriceType
          price?: number | null
          description?: string | null
          image_url?: string | null
          duration_minutes?: number
          category?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'services_establishment_id_fkey'
            columns: ['establishment_id']
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      appointments: {
        Row: {
          id: string
          customer_id: string
          establishment_id: string
          service_id: string
          scheduled_at: string
          status: AppointmentStatus
          customer_name: string | null
          customer_phone: string | null
          notes: string | null
          total_price: number | null
          total_duration_minutes: number
          reminder_sent_at: string | null
          confirmed_by_customer_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          establishment_id: string
          service_id: string
          scheduled_at: string
          status?: AppointmentStatus
          customer_name?: string | null
          customer_phone?: string | null
          notes?: string | null
          total_price?: number | null
          total_duration_minutes?: number
          reminder_sent_at?: string | null
          confirmed_by_customer_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          establishment_id?: string
          service_id?: string
          scheduled_at?: string
          status?: AppointmentStatus
          customer_name?: string | null
          customer_phone?: string | null
          notes?: string | null
          total_price?: number | null
          total_duration_minutes?: number
          reminder_sent_at?: string | null
          confirmed_by_customer_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_customer_id_fkey'
            columns: ['customer_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_establishment_id_fkey'
            columns: ['establishment_id']
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_service_id_fkey'
            columns: ['service_id']
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
        ]
      }
      appointment_items: {
        Row: {
          id: string
          appointment_id: string
          service_id: string
          service_name: string
          price_type: PriceType
          price: number | null
          duration_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          service_id: string
          service_name: string
          price_type: PriceType
          price?: number | null
          duration_minutes: number
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          service_id?: string
          service_name?: string
          price_type?: PriceType
          price?: number | null
          duration_minutes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointment_items_appointment_id_fkey'
            columns: ['appointment_id']
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointment_items_service_id_fkey'
            columns: ['service_id']
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      count_open_appointments: {
        Args: { p_customer_id: string }
        Returns: number
      }
      count_no_show_appointments: {
        Args: { p_customer_id: string }
        Returns: number
      }
      is_establishment_blocked: {
        Args: { p_establishment_id: string }
        Returns: boolean
      }
    }
    Enums: {
      appointment_status: AppointmentStatus
      user_role: UserRole
      price_type: PriceType
    }
    CompositeTypes: Record<string, never>
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          id: string
          name: string
          public: boolean
          file_size_limit: number | null
          allowed_mime_types: string[] | null
          created_at: string
          updated_at: string
          owner: string | null
          avif_autodetection: boolean
        }
        Insert: {
          id: string
          name: string
          public?: boolean
          file_size_limit?: number | null
          allowed_mime_types?: string[] | null
          created_at?: string
          updated_at?: string
          owner?: string | null
          avif_autodetection?: boolean
        }
        Update: {
          id?: string
          name?: string
          public?: boolean
          file_size_limit?: number | null
          allowed_mime_types?: string[] | null
          updated_at?: string
          owner?: string | null
          avif_autodetection?: boolean
        }
        Relationships: []
      }
      objects: {
        Row: {
          id: string
          name: string
          bucket_id: string
          owner: string | null
          created_at: string
          updated_at: string
          last_accessed_at: string
          metadata: Record<string, Json> | null
        }
        Insert: {
          id?: string
          name: string
          bucket_id: string
          owner?: string | null
          created_at?: string
          updated_at?: string
          last_accessed_at?: string
          metadata?: Record<string, Json> | null
        }
        Update: {
          id?: string
          name?: string
          bucket_id?: string
          owner?: string | null
          updated_at?: string
          last_accessed_at?: string
          metadata?: Record<string, Json> | null
        }
        Relationships: []
      }
    }
  }
  graphql_public: {
    Tables: Record<string, never>
  }
}

// ── Convenient row-type aliases ───────────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertDTO<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateDTO<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Profile = Tables<'profiles'>
export type Establishment = Tables<'establishments'>
export type Service = Tables<'services'>
export type Appointment = Tables<'appointments'>
export type AppointmentItem = Tables<'appointment_items'>
