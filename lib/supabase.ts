import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: "user" | "moderator" | "admin"
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: "user" | "moderator" | "admin"
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          role?: "user" | "moderator" | "admin"
        }
      }
      courts: {
        Row: {
          id: string
          name: string
          description: string | null
          hourly_rate: number
          image_url: string | null
          is_active: boolean
          amenities: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          hourly_rate: number
          image_url?: string | null
          is_active?: boolean
          amenities?: string[] | null
        }
        Update: {
          name?: string
          description?: string | null
          hourly_rate?: number
          image_url?: string | null
          is_active?: boolean
          amenities?: string[] | null
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          court_id: string
          booking_date: string
          start_time: string
          end_time: string
          total_amount: number
          status: "pending" | "confirmed" | "cancelled" | "completed"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          court_id: string
          booking_date: string
          start_time: string
          end_time: string
          total_amount: number
          status?: "pending" | "confirmed" | "cancelled" | "completed"
          notes?: string | null
        }
        Update: {
          status?: "pending" | "confirmed" | "cancelled" | "completed"
          notes?: string | null
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: any
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value: any
          description?: string | null
        }
        Update: {
          value?: any
          description?: string | null
        }
      }
      pricing_schedules: {
        Row: {
          id: string
          court_id: string
          name: string
          start_time: string
          end_time: string
          rate: number
          days_of_week: number[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          court_id: string
          name: string
          start_time: string
          end_time: string
          rate: number
          days_of_week?: number[]
          is_active?: boolean
        }
        Update: {
          name?: string
          start_time?: string
          end_time?: string
          rate?: number
          days_of_week?: number[]
          is_active?: boolean
        }
      }
    }
  }
}
