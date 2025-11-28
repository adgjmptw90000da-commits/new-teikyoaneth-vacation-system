export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 予定表示設定の型定義
export interface DisplaySettings {
  research_day?: {
    label: string
    label_first_year: string
    color: string
    bg_color: string
    default_work_location_id?: number | null
  }
  vacation?: {
    label_full: string
    label_am: string
    label_pm: string
    color: string
    bg_color: string
    default_work_location_id?: number | null
  }
  vacation_applied?: {
    color: string
    bg_color: string
  }
  kensanbi_used?: {
    label: string
    color: string
    bg_color: string
    default_work_location_id?: number | null
  }
  secondment?: {
    label: string
    color: string
    bg_color: string
    default_work_location_id?: number | null
  }
  leave_of_absence?: {
    label: string
    color: string
    bg_color: string
    default_work_location_id?: number | null
  }
}

export interface Database {
  public: {
    Tables: {
      user: {
        Row: {
          staff_id: string
          name: string
          password: string
          is_admin: boolean
          team: 'A' | 'B'
          night_shift_level: 'なし' | '上' | '中' | '下'
          can_cardiac: boolean
          can_obstetric: boolean
          can_icu: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          staff_id: string
          name: string
          password: string
          is_admin?: boolean
          team?: 'A' | 'B'
          night_shift_level?: '上' | '中' | '下'
          can_cardiac?: boolean
          can_obstetric?: boolean
          can_icu?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          staff_id?: string
          name?: string
          password?: string
          is_admin?: boolean
          team?: 'A' | 'B'
          night_shift_level?: '上' | '中' | '下'
          can_cardiac?: boolean
          can_obstetric?: boolean
          can_icu?: boolean
          display_order?: number
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
          display_settings: DisplaySettings
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
          display_settings?: DisplaySettings
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
          display_settings?: DisplaySettings
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
          one_personnel_status: 'not_applied' | 'applied' | 'kensanbi'
          user_notified: boolean
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
          one_personnel_status?: 'not_applied' | 'applied' | 'kensanbi'
          user_notified?: boolean
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
          one_personnel_status?: 'not_applied' | 'applied' | 'kensanbi'
          user_notified?: boolean
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
      event: {
        Row: {
          id: number
          event_date: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          event_date: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          event_date?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      conference: {
        Row: {
          id: number
          conference_date: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          conference_date: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          conference_date?: string
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
          user_notified: boolean
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
          user_notified?: boolean
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
          user_notified?: boolean
        }
      }
      schedule_type: {
        Row: {
          id: number
          name: string
          display_label: string | null
          position_am: boolean
          position_pm: boolean
          position_night: boolean
          prev_day_night_shift: boolean
          same_day_night_shift: boolean
          next_day_night_shift: boolean
          display_order: number
          color: string
          text_color: string
          monthly_limit: number | null
          default_work_location_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          display_label?: string | null
          position_am?: boolean
          position_pm?: boolean
          position_night?: boolean
          prev_day_night_shift?: boolean
          same_day_night_shift?: boolean
          next_day_night_shift?: boolean
          display_order?: number
          color?: string
          text_color?: string
          monthly_limit?: number | null
          default_work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_label?: string | null
          position_am?: boolean
          position_pm?: boolean
          position_night?: boolean
          prev_day_night_shift?: boolean
          same_day_night_shift?: boolean
          next_day_night_shift?: boolean
          display_order?: number
          color?: string
          text_color?: string
          monthly_limit?: number | null
          default_work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      user_schedule: {
        Row: {
          id: number
          staff_id: string
          schedule_date: string
          schedule_type_id: number
          work_location_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          schedule_date: string
          schedule_type_id: number
          work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          schedule_date?: string
          schedule_type_id?: number
          work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      user_research_day: {
        Row: {
          id: number
          staff_id: string
          day_of_week: number
          is_first_year: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          day_of_week: number
          is_first_year?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          day_of_week?: number
          is_first_year?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_secondment: {
        Row: {
          id: number
          staff_id: string
          year: number
          month: number
          created_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          year: number
          month: number
          created_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          year?: number
          month?: number
          created_at?: string
        }
      }
      user_leave_of_absence: {
        Row: {
          id: number
          staff_id: string
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          start_date: string
          end_date: string
          created_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          start_date?: string
          end_date?: string
          created_at?: string
        }
      }
      shift_type: {
        Row: {
          id: number
          name: string
          display_label: string | null
          position_am: boolean
          position_pm: boolean
          position_night: boolean
          display_order: number
          color: string
          text_color: string
          is_kensanbi_target: boolean
          default_work_location_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          display_label?: string | null
          position_am?: boolean
          position_pm?: boolean
          position_night?: boolean
          display_order?: number
          color?: string
          text_color?: string
          is_kensanbi_target?: boolean
          default_work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_label?: string | null
          position_am?: boolean
          position_pm?: boolean
          position_night?: boolean
          display_order?: number
          color?: string
          text_color?: string
          is_kensanbi_target?: boolean
          default_work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      user_shift: {
        Row: {
          id: number
          staff_id: string
          shift_date: string
          shift_type_id: number
          work_location_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          shift_date: string
          shift_type_id: number
          work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          shift_date?: string
          shift_type_id?: number
          work_location_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      kensanbi_grant_history: {
        Row: {
          id: number
          staff_id: string
          user_shift_id: number | null
          shift_date: string
          granted_days: number
          status: 'pending' | 'approved' | 'rejected'
          approved_by_staff_id: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          user_shift_id?: number | null
          shift_date: string
          granted_days: number
          status?: 'pending' | 'approved' | 'rejected'
          approved_by_staff_id?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          user_shift_id?: number | null
          shift_date?: string
          granted_days?: number
          status?: 'pending' | 'approved' | 'rejected'
          approved_by_staff_id?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      kensanbi_usage_history: {
        Row: {
          id: number
          staff_id: string
          usage_date: string
          used_days: number
          reason: string | null
          application_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          usage_date: string
          used_days: number
          reason?: string | null
          application_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          usage_date?: string
          used_days?: number
          reason?: string | null
          application_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      schedule_publish: {
        Row: {
          id: number
          year: number
          month: number
          is_published: boolean
          published_at: string | null
          published_by_staff_id: string | null
          snapshot_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          year: number
          month: number
          is_published?: boolean
          published_at?: string | null
          published_by_staff_id?: string | null
          snapshot_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          year?: number
          month?: number
          is_published?: boolean
          published_at?: string | null
          published_by_staff_id?: string | null
          snapshot_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      work_location: {
        Row: {
          id: number
          name: string
          display_label: string | null
          color: string
          text_color: string
          display_order: number
          is_default_weekday: boolean
          is_default_holiday: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          display_label?: string | null
          color?: string
          text_color?: string
          display_order?: number
          is_default_weekday?: boolean
          is_default_holiday?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_label?: string | null
          color?: string
          text_color?: string
          display_order?: number
          is_default_weekday?: boolean
          is_default_holiday?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_work_location: {
        Row: {
          id: number
          staff_id: string
          work_date: string
          work_location_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          staff_id: string
          work_date: string
          work_location_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          staff_id?: string
          work_date?: string
          work_location_id?: number
          created_at?: string
          updated_at?: string
        }
      }
      count_config: {
        Row: {
          id: number
          name: string
          display_label: string
          is_active: boolean
          display_order: number
          target_schedule_type_ids: number[]
          target_shift_type_ids: number[]
          target_work_location_ids: number[]
          target_special_types: string[]
          target_period_am: boolean
          target_period_pm: boolean
          target_period_night: boolean
          filter_teams: string[]
          filter_night_shift_levels: string[]
          filter_can_cardiac: boolean | null
          filter_can_obstetric: boolean | null
          filter_can_icu: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          display_label: string
          is_active?: boolean
          display_order?: number
          target_schedule_type_ids?: number[]
          target_shift_type_ids?: number[]
          target_work_location_ids?: number[]
          target_special_types?: string[]
          target_period_am?: boolean
          target_period_pm?: boolean
          target_period_night?: boolean
          filter_teams?: string[]
          filter_night_shift_levels?: string[]
          filter_can_cardiac?: boolean | null
          filter_can_obstetric?: boolean | null
          filter_can_icu?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_label?: string
          is_active?: boolean
          display_order?: number
          target_schedule_type_ids?: number[]
          target_shift_type_ids?: number[]
          target_work_location_ids?: number[]
          target_special_types?: string[]
          target_period_am?: boolean
          target_period_pm?: boolean
          target_period_night?: boolean
          filter_teams?: string[]
          filter_night_shift_levels?: string[]
          filter_can_cardiac?: boolean | null
          filter_can_obstetric?: boolean | null
          filter_can_icu?: boolean | null
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
