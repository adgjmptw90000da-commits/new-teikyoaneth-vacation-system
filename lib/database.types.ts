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
          max_annual_leave_points: number
          level1_points: number
          level2_points: number
          level3_points: number
          current_fiscal_year: number
          show_lottery_period_applications: boolean
          point_retention_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          organization_code?: string
          lottery_period_months?: number
          lottery_period_start_day?: number
          lottery_period_end_day?: number
          max_annual_leave_points?: number
          level1_points?: number
          level2_points?: number
          level3_points?: number
          current_fiscal_year?: number
          show_lottery_period_applications?: boolean
          point_retention_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          organization_code?: string
          lottery_period_months?: number
          lottery_period_start_day?: number
          lottery_period_end_day?: number
          max_annual_leave_points?: number
          level1_points?: number
          level2_points?: number
          level3_points?: number
          current_fiscal_year?: number
          show_lottery_period_applications?: boolean
          point_retention_rate?: number
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
          status: 'before_lottery' | 'after_lottery' | 'confirmed' | 'withdrawn' | 'cancelled' | 'pending_approval' | 'pending_cancellation' | 'cancelled_before_lottery' | 'cancelled_after_lottery'
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
          status?: 'before_lottery' | 'after_lottery' | 'confirmed' | 'withdrawn' | 'cancelled' | 'pending_approval' | 'pending_cancellation' | 'cancelled_before_lottery' | 'cancelled_after_lottery'
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
          status?: 'before_lottery' | 'after_lottery' | 'confirmed' | 'withdrawn' | 'cancelled' | 'pending_approval' | 'pending_cancellation' | 'cancelled_before_lottery' | 'cancelled_after_lottery'
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
      priority_exchange_log: {
        Row: {
          id: number
          application_id_1: number
          application_id_2: number
          before_priority_1: number
          before_priority_2: number
          before_level_1: number
          before_level_2: number
          after_priority_1: number
          after_priority_2: number
          after_level_1: number
          after_level_2: number
          exchanged_by_staff_id: string
          exchanged_at: string
        }
        Insert: {
          id?: number
          application_id_1: number
          application_id_2: number
          before_priority_1: number
          before_priority_2: number
          before_level_1: number
          before_level_2: number
          after_priority_1: number
          after_priority_2: number
          after_level_1: number
          after_level_2: number
          exchanged_by_staff_id: string
          exchanged_at?: string
        }
        Update: {
          id?: number
          application_id_1?: number
          application_id_2?: number
          before_priority_1?: number
          before_priority_2?: number
          before_level_1?: number
          before_level_2?: number
          after_priority_1?: number
          after_priority_2?: number
          after_level_1?: number
          after_level_2?: number
          exchanged_by_staff_id?: string
          exchanged_at?: string
        }
      }
      cancellation_request: {
        Row: {
          id: number
          application_id: number
          requested_at: string
          requested_reason: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by_staff_id: string | null
          reviewed_at: string | null
          review_comment: string | null
        }
        Insert: {
          id?: number
          application_id: number
          requested_at?: string
          requested_reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by_staff_id?: string | null
          reviewed_at?: string | null
          review_comment?: string | null
        }
        Update: {
          id?: number
          application_id?: number
          requested_at?: string
          requested_reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by_staff_id?: string | null
          reviewed_at?: string | null
          review_comment?: string | null
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
