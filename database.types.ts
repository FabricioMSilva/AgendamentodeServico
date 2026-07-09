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
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          phone: string | null
          email: string | null
          zip_code: string | null
          street: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          latitude: number | null
          longitude: number | null
          whatsapp_phone: string | null
          instagram_url: string | null
          facebook_url: string | null
          youtube_url: string | null
          tiktok_url: string | null
          business_type: string
          reminder_message: string | null
          auto_cancel_hours_before: number
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
          phone?: string | null
          email?: string | null
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          latitude?: number | null
          longitude?: number | null
          whatsapp_phone?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          youtube_url?: string | null
          tiktok_url?: string | null
          business_type?: string
          reminder_message?: string | null
          auto_cancel_hours_before?: number
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
          phone?: string | null
          email?: string | null
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          latitude?: number | null
          longitude?: number | null
          whatsapp_phone?: string | null
          instagram_url?: string | null
          facebook_url?: string | null
          youtube_url?: string | null
          tiktok_url?: string | null
          business_type?: string
          reminder_message?: string | null
          auto_cancel_hours_before?: number
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
      establishment_media: {
        Row: {
          id: string
          establishment_id: string
          media_type: 'image' | 'video'
          url: string
          provider: 'upload' | 'youtube' | 'tiktok' | 'vimeo' | null
          title: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          media_type: 'image' | 'video'
          url: string
          provider?: 'upload' | 'youtube' | 'tiktok' | 'vimeo' | null
          title?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          media_type?: 'image' | 'video'
          url?: string
          provider?: 'upload' | 'youtube' | 'tiktok' | 'vimeo' | null
          title?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'establishment_media_establishment_id_fkey'
            columns: ['establishment_id']
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      service_catalog: {
        Row: {
          id: string
          business_type: string
          name: string
          category: string
          default_duration_minutes: number
          default_price_type: PriceType
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_type: string
          name: string
          category?: string
          default_duration_minutes?: number
          default_price_type?: PriceType
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          business_type?: string
          name?: string
          category?: string
          default_duration_minutes?: number
          default_price_type?: PriceType
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      service_suggestions: {
        Row: {
          id: string
          establishment_id: string
          suggested_name: string
          category: string
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          suggested_name: string
          category?: string
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          suggested_name?: string
          category?: string
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_suggestions_establishment_id_fkey'
            columns: ['establishment_id']
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      establishment_schedule_exceptions: {
        Row: {
          id: string
          establishment_id: string
          exception_date: string
          is_open: boolean
          open_time: string | null
          close_time: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          exception_date: string
          is_open?: boolean
          open_time?: string | null
          close_time?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          exception_date?: string
          is_open?: boolean
          open_time?: string | null
          close_time?: string | null
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'establishment_schedule_exceptions_establishment_id_fkey'
            columns: ['establishment_id']
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
        ]
      }
      staff_members: {
        Row: {
          id: string
          establishment_id: string
          profile_id: string | null
          name: string
          role: string | null
          phone: string | null
          email: string | null
          is_active: boolean
          business_hours: Json
          created_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          profile_id?: string | null
          name: string
          role?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          business_hours?: Json
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          profile_id?: string | null
          name?: string
          role?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean
          business_hours?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'staff_members_establishment_id_fkey'
            columns: ['establishment_id']
            referencedRelation: 'establishments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'staff_members_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      staff_services: {
        Row: {
          staff_id: string
          service_id: string
          created_at: string
        }
        Insert: {
          staff_id: string
          service_id: string
          created_at?: string
        }
        Update: {
          staff_id?: string
          service_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'staff_services_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'staff_services_service_id_fkey'
            columns: ['service_id']
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_profile_id: string | null
          establishment_id: string | null
          appointment_id: string | null
          channel: 'panel' | 'whatsapp' | 'email' | 'push'
          title: string
          body: string | null
          status: 'unread' | 'read' | 'archived'
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          recipient_profile_id?: string | null
          establishment_id?: string | null
          appointment_id?: string | null
          channel?: 'panel' | 'whatsapp' | 'email' | 'push'
          title: string
          body?: string | null
          status?: 'unread' | 'read' | 'archived'
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          recipient_profile_id?: string | null
          establishment_id?: string | null
          appointment_id?: string | null
          channel?: 'panel' | 'whatsapp' | 'email' | 'push'
          title?: string
          body?: string | null
          status?: 'unread' | 'read' | 'archived'
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          id: string
          establishment_id: string | null
          appointment_id: string | null
          recipient_phone: string
          recipient_role: 'owner' | 'customer' | 'staff'
          template_key: string
          message_body: string
          provider: string | null
          provider_message_id: string | null
          status: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          error_message: string | null
          scheduled_for: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          establishment_id?: string | null
          appointment_id?: string | null
          recipient_phone: string
          recipient_role: 'owner' | 'customer' | 'staff'
          template_key: string
          message_body: string
          provider?: string | null
          provider_message_id?: string | null
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          error_message?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string | null
          appointment_id?: string | null
          recipient_phone?: string
          recipient_role?: 'owner' | 'customer' | 'staff'
          template_key?: string
          message_body?: string
          provider?: string | null
          provider_message_id?: string | null
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
          error_message?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      login_codes: {
        Row: {
          id: string
          phone: string
          code_hash: string
          attempts: number
          expires_at: string
          consumed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          phone: string
          code_hash: string
          attempts?: number
          expires_at: string
          consumed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string
          code_hash?: string
          attempts?: number
          expires_at?: string
          consumed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          establishment_id: string
          appointment_id: string | null
          customer_id: string | null
          provider: string | null
          method: 'pix' | 'card' | 'cash' | 'other' | null
          amount: number
          currency: string
          status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled'
          provider_reference: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          appointment_id?: string | null
          customer_id?: string | null
          provider?: string | null
          method?: 'pix' | 'card' | 'cash' | 'other' | null
          amount?: number
          currency?: string
          status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled'
          provider_reference?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          appointment_id?: string | null
          customer_id?: string | null
          provider?: string | null
          method?: 'pix' | 'card' | 'cash' | 'other' | null
          amount?: number
          currency?: string
          status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled'
          provider_reference?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      appointment_events: {
        Row: {
          id: string
          appointment_id: string
          establishment_id: string
          actor_profile_id: string | null
          event_type:
            | 'created'
            | 'owner_confirmed'
            | 'owner_rejected'
            | 'customer_confirmed'
            | 'customer_declined'
            | 'completed'
            | 'cancelled'
            | 'no_show'
            | 'reminder_sent'
          status_from: string | null
          status_to: string | null
          amount: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          establishment_id: string
          actor_profile_id?: string | null
          event_type:
            | 'created'
            | 'owner_confirmed'
            | 'owner_rejected'
            | 'customer_confirmed'
            | 'customer_declined'
            | 'completed'
            | 'cancelled'
            | 'no_show'
            | 'reminder_sent'
          status_from?: string | null
          status_to?: string | null
          amount?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          establishment_id?: string
          actor_profile_id?: string | null
          event_type?:
            | 'created'
            | 'owner_confirmed'
            | 'owner_rejected'
            | 'customer_confirmed'
            | 'customer_declined'
            | 'completed'
            | 'cancelled'
            | 'no_show'
            | 'reminder_sent'
          status_from?: string | null
          status_to?: string | null
          amount?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
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
          staff_id: string | null
          payment_id: string | null
          cancelled_reason: string | null
          owner_decision_at: string | null
          owner_decision_by: string | null
          reminder_sent_at: string | null
          owner_notified_at: string | null
          customer_notified_at: string | null
          customer_confirmation_status: string
          customer_confirmed_at: string | null
          customer_declined_at: string | null
          reminder_due_at: string | null
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
          staff_id?: string | null
          payment_id?: string | null
          cancelled_reason?: string | null
          owner_decision_at?: string | null
          owner_decision_by?: string | null
          reminder_sent_at?: string | null
          owner_notified_at?: string | null
          customer_notified_at?: string | null
          customer_confirmation_status?: string
          customer_confirmed_at?: string | null
          customer_declined_at?: string | null
          reminder_due_at?: string | null
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
          staff_id?: string | null
          payment_id?: string | null
          cancelled_reason?: string | null
          owner_decision_at?: string | null
          owner_decision_by?: string | null
          reminder_sent_at?: string | null
          owner_notified_at?: string | null
          customer_notified_at?: string | null
          customer_confirmation_status?: string
          customer_confirmed_at?: string | null
          customer_declined_at?: string | null
          reminder_due_at?: string | null
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
export type EstablishmentMedia = Tables<'establishment_media'>
export type ServiceCatalogItem = Tables<'service_catalog'>
export type ServiceSuggestion = Tables<'service_suggestions'>
export type ScheduleException = Tables<'establishment_schedule_exceptions'>
export type StaffMember = Tables<'staff_members'>
export type StaffService = Tables<'staff_services'>
export type Notification = Tables<'notifications'>
export type WhatsappMessage = Tables<'whatsapp_messages'>
export type Payment = Tables<'payments'>
export type AppointmentEvent = Tables<'appointment_events'>
export type Appointment = Tables<'appointments'>
export type AppointmentItem = Tables<'appointment_items'>
