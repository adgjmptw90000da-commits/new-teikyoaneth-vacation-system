// @ts-nocheck
import { supabase } from './supabase'
import { Database } from '@/lib/database.types'

type Holiday = Database['public']['Tables']['holiday']['Row']
type KensanbiGrantHistory = Database['public']['Tables']['kensanbi_grant_history']['Row']

// 翌日の日付を取得
export const getNextDay = (dateStr: string): string => {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

// 土日かどうかを判定
export const isWeekend = (dateStr: string): boolean => {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // 0=日曜, 6=土曜
}

// 祝日かどうかを判定
export const isHoliday = (dateStr: string, holidays: Holiday[]): boolean => {
  return holidays.some(h => h.holiday_date === dateStr)
}

// 土日祝かどうかを判定
export const isWeekendOrHoliday = (dateStr: string, holidays: Holiday[]): boolean => {
  return isWeekend(dateStr) || isHoliday(dateStr, holidays)
}

// 研鑽日数計算（当日・翌日それぞれ独立して加算）
export const calculateKensanbiDays = (shiftDate: string, holidays: Holiday[]): number => {
  const nextDay = getNextDay(shiftDate)
  let days = 0

  // 当日が土日祝 → +0.5日
  if (isWeekendOrHoliday(shiftDate, holidays)) {
    days += 0.5
  }

  // 翌日が土日祝 → +0.5日
  if (isWeekendOrHoliday(nextDay, holidays)) {
    days += 0.5
  }

  return days // 0, 0.5, または 1.0
}

// 候補生成：2ヶ月前の当直データから未登録の研鑽日候補を取得
export interface KensanbiCandidate {
  userShiftId: number
  staffId: string
  staffName: string
  shiftDate: string
  shiftTypeName: string
  grantedDays: number
  existingHistoryId?: number
  existingStatus?: 'pending' | 'approved' | 'rejected'
}

export const generateKensanbiCandidates = async (
  targetYear: number,
  targetMonth: number
): Promise<KensanbiCandidate[]> => {
  // 対象月の開始日と終了日
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0]

  // 祝日を取得
  const { data: holidays } = await supabase
    .from('holiday')
    .select('*')
    .gte('holiday_date', startDate)
    .lte('holiday_date', getNextDay(endDate))

  // 研鑽日対象のシフトタイプを取得
  const { data: shiftTypes } = await supabase
    .from('shift_type')
    .select('id, name')
    .eq('is_kensanbi_target', true)

  if (!shiftTypes || shiftTypes.length === 0) {
    return []
  }

  const shiftTypeIds = shiftTypes.map(st => st.id)

  // 対象月の当直データを取得
  const { data: userShifts } = await supabase
    .from('user_shift')
    .select(`
      id,
      staff_id,
      shift_date,
      shift_type_id,
      user:staff_id (name)
    `)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .in('shift_type_id', shiftTypeIds)
    .order('shift_date', { ascending: true })

  if (!userShifts) {
    return []
  }

  // 既存の研鑽日付与履歴を取得
  const userShiftIds = userShifts.map(us => us.id)
  const { data: existingHistory } = await supabase
    .from('kensanbi_grant_history')
    .select('*')
    .in('user_shift_id', userShiftIds)

  const existingHistoryMap = new Map<number, KensanbiGrantHistory>()
  existingHistory?.forEach(h => existingHistoryMap.set(h.user_shift_id, h))

  // 候補リストを生成
  const candidates: KensanbiCandidate[] = []

  for (const shift of userShifts) {
    const grantedDays = calculateKensanbiDays(shift.shift_date, holidays || [])

    // 研鑽日が0の場合はスキップ
    if (grantedDays === 0) continue

    const shiftType = shiftTypes.find(st => st.id === shift.shift_type_id)
    const existing = existingHistoryMap.get(shift.id)

    candidates.push({
      userShiftId: shift.id,
      staffId: shift.staff_id,
      staffName: (shift.user as { name: string } | null)?.name || shift.staff_id,
      shiftDate: shift.shift_date,
      shiftTypeName: shiftType?.name || '不明',
      grantedDays,
      existingHistoryId: existing?.id,
      existingStatus: existing?.status as 'pending' | 'approved' | 'rejected' | undefined
    })
  }

  return candidates
}

// 候補を履歴に登録（pending状態で）
export const createKensanbiHistory = async (
  candidate: KensanbiCandidate
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('kensanbi_grant_history')
    .insert({
      staff_id: candidate.staffId,
      user_shift_id: candidate.userShiftId,
      shift_date: candidate.shiftDate,
      granted_days: candidate.grantedDays,
      status: 'pending'
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 一括で候補を履歴に登録
export const createKensanbiHistoryBulk = async (
  candidates: KensanbiCandidate[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  // 既存履歴がないものだけフィルタ
  const newCandidates = candidates.filter(c => !c.existingHistoryId)

  if (newCandidates.length === 0) {
    return { success: true, count: 0 }
  }

  const { error } = await supabase
    .from('kensanbi_grant_history')
    .insert(
      newCandidates.map(c => ({
        staff_id: c.staffId,
        user_shift_id: c.userShiftId,
        shift_date: c.shiftDate,
        granted_days: c.grantedDays,
        status: 'pending' as const
      }))
    )

  if (error) {
    return { success: false, count: 0, error: error.message }
  }

  return { success: true, count: newCandidates.length }
}

// 個別承認
export const approveKensanbi = async (
  historyId: number,
  approverStaffId: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('kensanbi_grant_history')
    .update({
      status: 'approved',
      approved_by_staff_id: approverStaffId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', historyId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 個別却下
export const rejectKensanbi = async (
  historyId: number,
  approverStaffId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('kensanbi_grant_history')
    .update({
      status: 'rejected',
      approved_by_staff_id: approverStaffId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', historyId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 一括承認
export const approveKensanbiBulk = async (
  historyIds: number[],
  approverStaffId: string
): Promise<{ success: boolean; count: number; error?: string }> => {
  const { error } = await supabase
    .from('kensanbi_grant_history')
    .update({
      status: 'approved',
      approved_by_staff_id: approverStaffId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .in('id', historyIds)
    .eq('status', 'pending')

  if (error) {
    return { success: false, count: 0, error: error.message }
  }

  return { success: true, count: historyIds.length }
}

// メンバーの研鑽日残高を取得
export const getKensanbiBalance = async (
  staffId: string
): Promise<{ granted: number; used: number; balance: number }> => {
  // 付与合計（approved のみ）
  const { data: grantHistory } = await supabase
    .from('kensanbi_grant_history')
    .select('granted_days')
    .eq('staff_id', staffId)
    .eq('status', 'approved')

  const granted = grantHistory?.reduce((sum, h) => sum + Number(h.granted_days), 0) || 0

  // 使用合計
  const { data: usageHistory } = await supabase
    .from('kensanbi_usage_history')
    .select('used_days')
    .eq('staff_id', staffId)

  const used = usageHistory?.reduce((sum, h) => sum + Number(h.used_days), 0) || 0

  return {
    granted,
    used,
    balance: granted - used
  }
}

// 対象月の研鑽日履歴を取得
export const getKensanbiHistoryByMonth = async (
  year: number,
  month: number
): Promise<KensanbiGrantHistory[]> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data } = await supabase
    .from('kensanbi_grant_history')
    .select('*')
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date', { ascending: true })

  return data || []
}

// 曜日名を取得
export const getDayOfWeekName = (dateStr: string): string => {
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const date = new Date(dateStr)
  return days[date.getDay()]
}

// 手動追加された履歴を取得（user_shift_idがNULLのもの）
export const getManualKensanbiHistory = async (
  year: number,
  month: number
): Promise<KensanbiCandidate[]> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: history } = await supabase
    .from('kensanbi_grant_history')
    .select(`
      id,
      staff_id,
      shift_date,
      granted_days,
      status,
      user:staff_id (name)
    `)
    .is('user_shift_id', null)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date', { ascending: true })

  if (!history) return []

  return history.map(h => ({
    userShiftId: -h.id, // 負の値で手動追加を区別
    staffId: h.staff_id,
    staffName: (h.user as { name: string } | null)?.name || h.staff_id,
    shiftDate: h.shift_date,
    shiftTypeName: '手動追加',
    grantedDays: Number(h.granted_days),
    existingHistoryId: h.id,
    existingStatus: h.status as 'pending' | 'approved' | 'rejected'
  }))
}

// 手動で研鑽日候補を追加（シフト変更等で実際の当直者と記録が異なる場合）
export const createManualKensanbiHistory = async (
  staffId: string,
  shiftDate: string,
  grantedDays: number
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('kensanbi_grant_history')
    .insert({
      staff_id: staffId,
      user_shift_id: null, // 手動追加はuser_shift_idなし
      shift_date: shiftDate,
      granted_days: grantedDays,
      status: 'pending'
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 確定済み年休を研鑽日に変更（研鑽日を消費）
export const convertVacationToKensanbi = async (
  applicationId: number,
  staffId: string,
  vacationDate: string,
  period: 'full_day' | 'am' | 'pm'
): Promise<{ success: boolean; error?: string }> => {
  // 消費日数を計算
  const usedDays = period === 'full_day' ? 1.0 : 0.5

  // 残高確認
  const balance = await getKensanbiBalance(staffId)
  if (balance.balance < usedDays) {
    return { success: false, error: '研鑽日の残高が不足しています' }
  }

  // 使用履歴を追加
  const { error: usageError } = await supabase
    .from('kensanbi_usage_history')
    .insert({
      staff_id: staffId,
      usage_date: vacationDate,
      used_days: usedDays,
      reason: '確定済み年休からの変換',
      application_id: applicationId
    })

  if (usageError) {
    return { success: false, error: usageError.message }
  }

  // applicationのone_personnel_statusを'kensanbi'に更新
  const { error: appError } = await supabase
    .from('application')
    .update({ one_personnel_status: 'kensanbi' })
    .eq('id', applicationId)

  if (appError) {
    return { success: false, error: appError.message }
  }

  return { success: true }
}

// One人事申請確認（ステータスをappliedに変更）
export const confirmOnePersonnelApplication = async (
  applicationId: number
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('application')
    .update({ one_personnel_status: 'applied' })
    .eq('id', applicationId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
