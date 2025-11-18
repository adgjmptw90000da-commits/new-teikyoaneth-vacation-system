export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user: {
        Row: {
          staff_id: string
          name: string
          password: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          staff_id: string
          name: string
          password: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          staff_id?: string
          name?: string
          password?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      setting: {
        Row: {
          id: number
          organization_code: string
          lottery_period_months: number
          lottery_period_start_day: number
          lottery_period_end_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          organization_code?: string
          lottery_period_months?: number
          lottery_period_start_day?: number
          lottery_period_end_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          organization_code?: string
          lottery_period_months?: number
          lottery_period_start_day?: number
          lottery_period_end_day?: number
          created_at?: string
          updated_at?: string
        }
      }
      application: {
        Row: {
          id: number
          staff_id: string
          applied_at: string
          vacation_date: string
          period: 'full_day' | 'am' | 'pm'
          level: 1 | 2 | 3
          is_within_lottery_period: boolean
          status: 'before_lottery' | 'after_lottery' | 'confirmed' | 'withdrawn' | 'cancelled' | 'pending_approval'
          priority: number | null
          remarks: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          applied_at?: string
          vacation_date: string
          period: 'full_day' | 'am' | 'pm'
          level: 1 | 2 | 3
          is_within_lottery_period: boolean
          status?: 'before_lottery' | 'after_lottery' | 'confirmed' | 'withdrawn' | 'cancelled' | 'pending_approval'
          priority?: number | null
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          applied_at?: string
          vacation_date?: string
          period?: 'full_day' | 'am' | 'pm'
          level?: 1 | 2 | 3
          is_within_lottery_period?: boolean
          status?: 'before_lottery' | 'after_lottery' | 'confirmed' | 'withdrawn' | 'cancelled' | 'pending_approval'
          priority?: number | null
          remarks?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calendar_management: {
        Row: {
          vacation_date: string
          max_people: number | null
          status: 'before_lottery' | 'after_lottery' | 'confirmation_completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          vacation_date: string
          max_people?: number | null
          status?: 'before_lottery' | 'after_lottery' | 'confirmation_completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          vacation_date?: string
          max_people?: number | null
          status?: 'before_lottery' | 'after_lottery' | 'confirmation_completed'
          created_at?: string
          updated_at?: string
        }
      }
      holiday: {
        Row: {
          id: number
          holiday_date: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          holiday_date: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          holiday_date?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
