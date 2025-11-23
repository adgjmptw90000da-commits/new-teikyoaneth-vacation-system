// @ts-nocheck
// 年休申請関連のユーティリティ関数

import { supabase } from './supabase';
import type { Database } from './database.types';
import { getJSTDate, formatDateToYYYYMMDD } from './dateUtils';

type Application = Database['public']['Tables']['application']['Row'];
type ApplicationInsert = Database['public']['Tables']['application']['Insert'];
type Setting = Database['public']['Tables']['setting']['Row'];

/**
 * 抽選参加期間内かどうかを判定
 */
export const isWithinLotteryPeriod = async (
  vacationDate: string
): Promise<boolean> => {
  try {
    // settingテーブルから抽選期間設定を取得
    const { data: setting, error } = await supabase
      .from('setting')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !setting) {
      console.error('Failed to fetch setting:', error);
      return false;
    }

    const vacation = new Date(vacationDate);
    const today = getJSTDate(); // 日本時間で取得

    // 抽選参加可能期間の計算: Xヶ月前のx日〜x日
    const targetMonth = new Date(vacation);
    targetMonth.setMonth(targetMonth.getMonth() - setting.lottery_period_months);

    const startDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      setting.lottery_period_start_day
    );
    const endDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      setting.lottery_period_end_day,
      23,
      59,
      59
    );

    return today >= startDate && today <= endDate;
  } catch (error) {
    console.error('Error checking lottery period:', error);
    return false;
  }
};

/**
 * 祝日・主要学会かどうかを判定
 */
export const isHoliday = async (date: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('holiday')
      .select('*')
      .eq('holiday_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = データが見つからない（祝日・主要学会ではない）
      console.error('Error checking holiday:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking holiday:', error);
    return false;
  }
};

/**
 * 同一日付の既存申請をチェック
 */
export const checkDuplicateApplication = async (
  staffId: string,
  vacationDate: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('application')
      .select('*')
      .eq('staff_id', staffId)
      .eq('vacation_date', vacationDate)
      .not('status', 'in', '(cancelled,cancelled_before_lottery,cancelled_after_lottery)')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking duplicate:', error);
      return false;
    }

    return !!data; // データがあれば重複
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return false;
  }
};

/**
 * 同一希望日の優先順位を計算（申請時）
 * キャンセル分を除いた申請数 + 1
 */
export const calculateInitialPriority = async (
  vacationDate: string
): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('application')
      .select('*', { count: 'exact', head: true })
      .eq('vacation_date', vacationDate)
      .not('status', 'in', '(cancelled,cancelled_before_lottery,cancelled_after_lottery)');

    if (error) {
      console.error('Error calculating priority:', error);
      return 1;
    }

    return (count || 0) + 1;
  } catch (error) {
    console.error('Error calculating priority:', error);
    return 1;
  }
};

/**
 * キャンセル時の優先順位再計算
 * 同一希望日の有効な申請を優先順位順に並べ直す
 */
export const recalculatePriorities = async (
  vacationDate: string
): Promise<void> => {
  try {
    // 同一希望日の有効な申請（キャンセル以外）を優先順位順に取得
    const { data: applications, error } = await supabase
      .from('application')
      .select('*')
      .eq('vacation_date', vacationDate)
      .not('status', 'in', '(cancelled,cancelled_before_lottery,cancelled_after_lottery)')
      .order('priority', { ascending: true });

    if (error || !applications) {
      console.error('Error fetching applications:', error);
      return;
    }

    // 優先順位を1から振り直し（並列更新でパフォーマンス改善）
    if (applications.length > 0) {
      const updatePromises = applications.map((app, i) =>
        supabase
          .from('application')
          .update({
            priority: i + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', app.id)
      );

      const results = await Promise.all(updatePromises);

      // エラーチェック
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Error updating priorities:', errors);
      }
    }
  } catch (error) {
    console.error('Error recalculating priorities:', error);
  }
};

/**
 * 抽選実施（1ヶ月分一括）
 * レベル1 → レベル2 → 期間内レベル3 → 期間外レベル3 の順で優先順位を振る
 * 申請がない日付も含めて、全ての日付のステータスを抽選済みに変更
 */
export const performLottery = async (
  year: number,
  month: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 対象月の開始日と終了日を計算（日本時間）
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = formatDateToYYYYMMDD(startDate);
    const endDateStr = formatDateToYYYYMMDD(endDate);

    // 対象月の全申請を取得（申請日時順）
    const { data: applications, error } = await supabase
      .from('application')
      .select('*')
      .gte('vacation_date', startDateStr)
      .lte('vacation_date', endDateStr)
      .eq('status', 'before_lottery')
      .order('applied_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // 日付ごとにグループ化
    const groupedByDate = (applications || []).reduce((acc, app) => {
      if (!acc[app.vacation_date]) {
        acc[app.vacation_date] = [];
      }
      acc[app.vacation_date].push(app);
      return acc;
    }, {} as Record<string, Application[]>);

    // 申請がある日付のみ抽選を実施
    for (const [date, apps] of Object.entries(groupedByDate)) {
      // レベル別にグループ化
      const level1 = apps.filter((a) => a.level === 1);
      const level2 = apps.filter((a) => a.level === 2);
      const level3Within = apps.filter(
        (a) => a.level === 3 && a.is_within_lottery_period
      );
      const level3Outside = apps.filter(
        (a) => a.level === 3 && !a.is_within_lottery_period
      );

      // 各レベル内でシャッフル
      const shuffledLevel1 = shuffle([...level1]);
      const shuffledLevel2 = shuffle([...level2]);
      const shuffledLevel3Within = shuffle([...level3Within]);

      // 期間外レベル3は申請順のまま（シャッフルしない、applied_atでソート）
      const sortedLevel3Outside = [...level3Outside].sort(
        (a, b) => new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime()
      );

      // 全体の優先順位を振る
      const allApplications = [
        ...shuffledLevel1,
        ...shuffledLevel2,
        ...shuffledLevel3Within,
        ...sortedLevel3Outside,
      ];

      // 優先順位を並列更新（パフォーマンス改善）
      const updatePromises = allApplications.map((app, i) =>
        supabase
          .from('application')
          .update({
            priority: i + 1,
            status: 'after_lottery',
            updated_at: new Date().toISOString(),
          })
          .eq('id', app.id)
      );

      const results = await Promise.all(updatePromises);

      // エラーチェック
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Error updating applications:', errors);
      }
    }

    // 祝日・主要学会を取得
    const { data: holidays } = await supabase
      .from('holiday')
      .select('*')
      .gte('holiday_date', startDateStr)
      .lte('holiday_date', endDateStr);

    const holidayDates = new Set(holidays?.map(h => h.holiday_date) || []);

    // 月内の全日付のステータスを抽選済みに変更（日曜・祝日・主要学会を除く）
    // 一括更新でパフォーマンス改善
    const daysInMonth = endDate.getDate();
    const calendarUpdates = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(date).getDay();

      // 日曜日(0)または祝日・主要学会はスキップ
      if (dayOfWeek === 0 || holidayDates.has(date)) {
        continue;
      }

      calendarUpdates.push({
        vacation_date: date,
        status: 'after_lottery' as const,
      });
    }

    // 一括upsert
    if (calendarUpdates.length > 0) {
      const { error: calendarError } = await supabase
        .from('calendar_management')
        .upsert(calendarUpdates);

      if (calendarError) {
        console.error('Error updating calendar status:', calendarError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error performing lottery:', error);
    return { success: false, error: '抽選処理中にエラーが発生しました' };
  }
};

/**
 * 一括確定処理（1ヶ月分）
 * マンパワーが設定されている日付のみ確定処理を実施
 */
export const confirmAllApplicationsForMonth = async (
  year: number,
  month: number
): Promise<{ success: boolean; error?: string; processedCount?: number }> => {
  try {
    // 対象月の開始日と終了日を計算（日本時間）
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();

    const startDateStr = formatDateToYYYYMMDD(startDate);
    const endDateStr = formatDateToYYYYMMDD(endDate);

    // 祝日・主要学会を取得
    const { data: holidays } = await supabase
      .from('holiday')
      .select('*')
      .gte('holiday_date', startDateStr)
      .lte('holiday_date', endDateStr);

    const holidayDates = new Set(holidays?.map(h => h.holiday_date) || []);

    // 対象月のカレンダー管理情報を取得（マンパワー設定があるもののみ）
    const { data: calendarData, error: calendarError } = await supabase
      .from('calendar_management')
      .select('*')
      .gte('vacation_date', startDateStr)
      .lte('holiday_date', endDateStr)
      .not('max_people', 'is', null);

    if (calendarError) {
      return { success: false, error: calendarError.message };
    }

    if (!calendarData || calendarData.length === 0) {
      return { success: false, error: 'マンパワーが設定されている日付がありません' };
    }

    // マンパワーが設定されている各日付に対して確定処理を実施（日曜・祝日・主要学会を除く）
    // 並列処理で高速化
    const targetCalendars = calendarData.filter(calendar => {
      const dayOfWeek = new Date(calendar.vacation_date).getDay();
      // 日曜日(0)または祝日・主要学会はスキップ
      return dayOfWeek !== 0 && !holidayDates.has(calendar.vacation_date);
    });

    const confirmPromises = targetCalendars.map(calendar =>
      confirmApplications(calendar.vacation_date)
    );

    const results = await Promise.all(confirmPromises);

    // 成功した処理をカウント
    const processedCount = results.filter(result => result.success).length;

    // エラーがあった日付をログ出力
    results.forEach((result, index) => {
      if (!result.success) {
        console.error(`Error confirming ${targetCalendars[index].vacation_date}:`, result.error);
      }
    });

    return { success: true, processedCount };
  } catch (error) {
    console.error('Error confirming all applications:', error);
    return { success: false, error: '一括確定処理中にエラーが発生しました' };
  }
};

/**
 * 配列をシャッフル（Fisher-Yates アルゴリズム）
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 抽選実施（特定の日付のみ）
 */
export const performLotteryForDate = async (
  vacationDate: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 対象日の抽選前申請を取得（申請日時順）
    const { data: applications, error } = await supabase
      .from('application')
      .select('*')
      .eq('vacation_date', vacationDate)
      .eq('status', 'before_lottery')
      .order('applied_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // 申請がある場合は抽選処理を実施
    if (applications && applications.length > 0) {
      // レベル別にグループ化
      const level1 = applications.filter((a) => a.level === 1);
      const level2 = applications.filter((a) => a.level === 2);
      const level3Within = applications.filter(
        (a) => a.level === 3 && a.is_within_lottery_period
      );
      const level3Outside = applications.filter(
        (a) => a.level === 3 && !a.is_within_lottery_period
      );

      // 各レベル内でシャッフル
      const shuffledLevel1 = shuffle([...level1]);
      const shuffledLevel2 = shuffle([...level2]);
      const shuffledLevel3Within = shuffle([...level3Within]);

      // 期間外レベル3は申請順のまま（シャッフルしない、applied_atでソート）
      const sortedLevel3Outside = [...level3Outside].sort(
        (a, b) => new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime()
      );

      // 全体の優先順位を振る
      const allApplications = [
        ...shuffledLevel1,
        ...shuffledLevel2,
        ...shuffledLevel3Within,
        ...sortedLevel3Outside,
      ];

      // 優先順位を並列更新（パフォーマンス改善）
      const updatePromises = allApplications.map((app, i) =>
        supabase
          .from('application')
          .update({
            priority: i + 1,
            status: 'after_lottery',
            updated_at: new Date().toISOString(),
          })
          .eq('id', app.id)
      );

      const results = await Promise.all(updatePromises);

      // エラーチェック
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Error updating applications:', errors);
      }
    }

    // 申請の有無に関わらず、calendar_managementのステータスを更新
    const { error: calendarError } = await supabase
      .from('calendar_management')
      .upsert({
        vacation_date: vacationDate,
        status: 'after_lottery',
      });

    if (calendarError) {
      console.error('Error updating calendar status:', calendarError);
      return { success: false, error: 'カレンダーステータスの更新に失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error performing lottery:', error);
    return { success: false, error: '抽選処理中にエラーが発生しました' };
  }
};

/**
 * 年休確定処理（特定の日付）
 * 優先順位順に確定、マンパワーを超えたら取り下げ
 */
export const confirmApplications = async (
  vacationDate: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // マンパワーを取得
    const { data: calendar, error: calendarError } = await supabase
      .from('calendar_management')
      .select('*')
      .eq('vacation_date', vacationDate)
      .single();

    // 対象日の抽選済み申請を優先順位順に取得
    const { data: applications, error } = await supabase
      .from('application')
      .select('*')
      .eq('vacation_date', vacationDate)
      .eq('status', 'after_lottery')
      .order('priority', { ascending: true });

    if (error) {
      return { success: false, error: error?.message };
    }

    // 申請がある場合のみ確定処理を実施
    if (applications && applications.length > 0) {
      // マンパワーが設定されていない場合はエラー
      if (calendarError || !calendar || calendar.max_people === null) {
        return {
          success: false,
          error: 'マンパワーが設定されていません',
        };
      }

      // 確定と取り下げの申請IDを分類
      const confirmedIds: number[] = [];
      const withdrawnIds: number[] = [];

      for (let i = 0; i < applications.length; i++) {
        if (i < calendar.max_people) {
          confirmedIds.push(applications[i].id);
        } else {
          withdrawnIds.push(applications[i].id);
        }
      }

      // 確定分を一括更新
      if (confirmedIds.length > 0) {
        const { error: confirmError } = await supabase
          .from('application')
          .update({ status: 'confirmed' })
          .in('id', confirmedIds);

        if (confirmError) {
          console.error('Error confirming applications:', confirmError);
        }
      }

      // 取り下げ分を一括更新
      if (withdrawnIds.length > 0) {
        const { error: withdrawError } = await supabase
          .from('application')
          .update({ status: 'withdrawn' })
          .in('id', withdrawnIds);

        if (withdrawError) {
          console.error('Error withdrawing applications:', withdrawError);
        }
      }
    }

    // 申請の有無に関わらず、calendar_managementのステータスを更新
    const { error: statusError } = await supabase
      .from('calendar_management')
      .upsert({
        vacation_date: vacationDate,
        status: 'confirmation_completed',
      });

    if (statusError) {
      console.error('Error updating calendar status:', statusError);
      return { success: false, error: 'カレンダーステータスの更新に失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error confirming applications:', error);
    return { success: false, error: '確定処理中にエラーが発生しました' };
  }
};

/**
 * 個別確定
 */
export const confirmSingleApplication = async (
  applicationId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 申請を取得
    const { data: application, error } = await supabase
      .from('application')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      return { success: false, error: '申請が見つかりません' };
    }

    // マンパワーチェック
    const { data: calendar } = await supabase
      .from('calendar_management')
      .select('*')
      .eq('vacation_date', application.vacation_date)
      .single();

    if (!calendar || calendar.max_people === null) {
      return { success: false, error: 'マンパワーが設定されていません' };
    }

    // 確定済み数をカウント
    const { count } = await supabase
      .from('application')
      .select('*', { count: 'exact', head: true })
      .eq('vacation_date', application.vacation_date)
      .eq('status', 'confirmed');

    if ((count || 0) >= calendar.max_people) {
      return { success: false, error: 'マンパワーの上限に達しています' };
    }

    // 確定
    const { error: updateError } = await supabase
      .from('application')
      .update({ status: 'confirmed' })
      .eq('id', applicationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error confirming application:', error);
    return { success: false, error: '確定処理中にエラーが発生しました' };
  }
};

/**
 * 確定解除（個別）
 */
export const cancelConfirmation = async (
  applicationId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 申請を取得
    const { data: application, error } = await supabase
      .from('application')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      return { success: false, error: '申請が見つかりません' };
    }

    if (application.status !== 'confirmed') {
      return { success: false, error: '確定済みの申請ではありません' };
    }

    // 抽選済みに戻す
    const { error: updateError } = await supabase
      .from('application')
      .update({ status: 'after_lottery' })
      .eq('id', applicationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 同じ日付の全申請をチェックして、全て抽選済み以下なら日付ステータスを戻す
    const { data: allApps } = await supabase
      .from('application')
      .select('*')
      .eq('vacation_date', application.vacation_date)
      .not('status', 'in', '(cancelled,cancelled_before_lottery,cancelled_after_lottery)');

    const hasConfirmed = allApps?.some((a) => a.status === 'confirmed');

    if (!hasConfirmed) {
      // 確定済みがなければ、日付ステータスを抽選済みに戻す
      await supabase
        .from('calendar_management')
        .update({ status: 'after_lottery' })
        .eq('vacation_date', application.vacation_date);
    }

    return { success: true };
  } catch (error) {
    console.error('Error canceling confirmation:', error);
    return { success: false, error: '確定解除処理中にエラーが発生しました' };
  }
};

/**
 * 現在の日付が、指定された年休取得希望日の抽選参加期間内かどうかを判定
 * カレンダー表示・優先順位表示の動的判定に使用
 */
export const isCurrentlyInLotteryPeriodForDate = async (
  vacationDate: string
): Promise<boolean> => {
  try {
    // settingテーブルから抽選期間設定を取得
    const { data: setting, error } = await supabase
      .from('setting')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !setting) {
      console.error('Failed to fetch setting:', error);
      return false;
    }

    const vacation = new Date(vacationDate);
    const today = getJSTDate(); // 日本時間で取得

    // 抽選参加可能期間の計算: Xヶ月前のx日〜x日
    const targetMonth = new Date(vacation);
    targetMonth.setMonth(targetMonth.getMonth() - setting.lottery_period_months);

    const startDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      setting.lottery_period_start_day
    );
    const endDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      setting.lottery_period_end_day,
      23,
      59,
      59
    );

    return today >= startDate && today <= endDate;
  } catch (error) {
    console.error('Error checking lottery period:', error);
    return false;
  }
};

/**
 * 現在の日付が、指定された年休取得希望日の抽選参加期間開始前かどうかを判定
 * レベル3の申請可否判定に使用
 */
export const isBeforeLotteryPeriod = async (
  vacationDate: string
): Promise<boolean> => {
  try {
    // settingテーブルから抽選期間設定を取得
    const { data: setting, error } = await supabase
      .from('setting')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !setting) {
      console.error('Failed to fetch setting:', error);
      return false;
    }

    const vacation = new Date(vacationDate);
    const today = getJSTDate(); // 日本時間で取得

    // 抽選参加可能期間の開始日を計算: Xヶ月前のx日
    const targetMonth = new Date(vacation);
    targetMonth.setMonth(targetMonth.getMonth() - setting.lottery_period_months);

    const startDate = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      setting.lottery_period_start_day
    );

    // 今日が開始日より前かどうかを返す
    return today < startDate;
  } catch (error) {
    console.error('Error checking lottery period:', error);
    return false;
  }
};

/**
 * 現在の抽選参加可能期間の情報を取得
 * 年休申請ページでの期間情報表示に使用
 */
export const getCurrentLotteryPeriodInfo = async (): Promise<{
  isWithinPeriod: boolean;
  targetMonth: string;
  periodStart: string;
  periodEnd: string;
} | null> => {
  try {
    // settingテーブルから抽選期間設定を取得
    const { data: setting, error } = await supabase
      .from('setting')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !setting) {
      console.error('Failed to fetch setting:', error);
      return null;
    }

    const today = getJSTDate(); // 日本時間で取得

    // 現在の月の抽選期間を計算
    const currentPeriodStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      setting.lottery_period_start_day
    );
    const currentPeriodEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      setting.lottery_period_end_day,
      23,
      59,
      59
    );

    // 現在の月の抽選期間の対象月（X ヶ月後）
    const currentTargetMonth = new Date(today);
    currentTargetMonth.setMonth(currentTargetMonth.getMonth() + setting.lottery_period_months);

    // 現在が抽選期間内かチェック
    const isWithinPeriod = today >= currentPeriodStart && today <= currentPeriodEnd;

    let targetMonth: Date;
    let periodStart: Date;
    let periodEnd: Date;

    if (isWithinPeriod) {
      // 期間内の場合: 現在の情報を返す
      targetMonth = currentTargetMonth;
      periodStart = currentPeriodStart;
      periodEnd = currentPeriodEnd;
    } else {
      // 期間外の場合: 次の抽選期間を計算
      let nextPeriodStart: Date;
      let nextTargetMonth: Date;

      if (today < currentPeriodStart) {
        // 今月の抽選期間開始前 → 今月の抽選期間が「次」
        nextPeriodStart = currentPeriodStart;
        nextTargetMonth = currentTargetMonth;
      } else {
        // 今月の抽選期間終了後 → 来月の抽選期間が「次」
        nextPeriodStart = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          setting.lottery_period_start_day
        );
        nextTargetMonth = new Date(today);
        nextTargetMonth.setMonth(nextTargetMonth.getMonth() + 1 + setting.lottery_period_months);
      }

      const nextPeriodEnd = new Date(
        nextPeriodStart.getFullYear(),
        nextPeriodStart.getMonth(),
        setting.lottery_period_end_day,
        23,
        59,
        59
      );

      targetMonth = nextTargetMonth;
      periodStart = nextPeriodStart;
      periodEnd = nextPeriodEnd;
    }

    // 日本語形式で整形
    const formatDate = (date: Date): string => {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    return {
      isWithinPeriod,
      targetMonth: `${targetMonth.getFullYear()}年${targetMonth.getMonth() + 1}月`,
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd),
    };
  } catch (error) {
    console.error('Error getting lottery period info:', error);
    return null;
  }
};

/**
 * 指定年度の年休得点を計算
 * @param staffId 職員ID
 * @param fiscalYear 年度（例: 2025 = 2025/4/1〜2026/3/31）
 * @returns レベル1・2・3の申請中、確定、抽選後キャンセル数、各レベルの消費得点
 */
export const calculateAnnualLeavePoints = async (
  staffId: string,
  fiscalYear: number
): Promise<{
  level1PendingCount: number;
  level1ConfirmedCount: number;
  level1CancelledAfterLotteryCount: number;
  level1Points: number;
  level2PendingCount: number;
  level2ConfirmedCount: number;
  level2CancelledAfterLotteryCount: number;
  level2Points: number;
  level3PendingCount: number;
  level3ConfirmedCount: number;
  level3CancelledAfterLotteryCount: number;
  level3Points: number;
  totalPoints: number;
} | null> => {
  try {
    // 設定を取得
    const { data: setting, error: settingError } = await supabase
      .from('setting')
      .select('level1_points, level2_points, level3_points')
      .eq('id', 1)
      .single();

    if (settingError || !setting) {
      console.error('Failed to fetch setting:', settingError);
      return null;
    }

    // 年度の開始日と終了日を計算（4月1日〜翌年3月31日）
    const fiscalYearStart = `${fiscalYear}-04-01`;
    const fiscalYearEnd = `${fiscalYear + 1}-03-31`;

    // 対象期間の申請を取得
    // 除外: cancelled, withdrawn, cancelled_before_lottery (得点回復済み)
    // 含める: before_lottery, after_lottery, confirmed, pending_approval, pending_cancellation, cancelled_after_lottery
    const { data: applications, error: appError } = await supabase
      .from('application')
      .select('level, period, status')
      .eq('staff_id', staffId)
      .gte('vacation_date', fiscalYearStart)
      .lte('vacation_date', fiscalYearEnd)
      .in('status', ['before_lottery', 'after_lottery', 'confirmed', 'pending_approval', 'pending_cancellation', 'cancelled_after_lottery']);

    if (appError) {
      console.error('Failed to fetch applications:', appError);
      return null;
    }

    // カウントを計算
    let level1PendingCount = 0;
    let level1ConfirmedCount = 0;
    let level1CancelledAfterLotteryCount = 0;
    let level2PendingCount = 0;
    let level2ConfirmedCount = 0;
    let level2CancelledAfterLotteryCount = 0;
    let level3PendingCount = 0;
    let level3ConfirmedCount = 0;
    let level3CancelledAfterLotteryCount = 0;

    (applications || []).forEach(app => {
      // 全日 = 1カウント、AM/PM = 0.5カウント
      const count = app.period === 'full_day' ? 1 : 0.5;

      if (app.level === 1) {
        if (app.status === 'confirmed') {
          level1ConfirmedCount += count;
        } else if (app.status === 'cancelled_after_lottery') {
          level1CancelledAfterLotteryCount += count;
        } else {
          level1PendingCount += count;
        }
      } else if (app.level === 2) {
        if (app.status === 'confirmed') {
          level2ConfirmedCount += count;
        } else if (app.status === 'cancelled_after_lottery') {
          level2CancelledAfterLotteryCount += count;
        } else {
          level2PendingCount += count;
        }
      } else if (app.level === 3) {
        if (app.status === 'confirmed') {
          level3ConfirmedCount += count;
        } else if (app.status === 'cancelled_after_lottery') {
          level3CancelledAfterLotteryCount += count;
        } else {
          level3PendingCount += count;
        }
      }
    });

    // 各レベルの消費得点を計算
    const level1Points = (level1PendingCount + level1ConfirmedCount + level1CancelledAfterLotteryCount) * setting.level1_points;
    const level2Points = (level2PendingCount + level2ConfirmedCount + level2CancelledAfterLotteryCount) * setting.level2_points;
    const level3Points = (level3PendingCount + level3ConfirmedCount + level3CancelledAfterLotteryCount) * setting.level3_points;

    // 合計消費得点を計算
    const totalPoints = level1Points + level2Points + level3Points;

    return {
      level1PendingCount,
      level1ConfirmedCount,
      level1CancelledAfterLotteryCount,
      level1Points,
      level2PendingCount,
      level2ConfirmedCount,
      level2CancelledAfterLotteryCount,
      level2Points,
      level3PendingCount,
      level3ConfirmedCount,
      level3CancelledAfterLotteryCount,
      level3Points,
      totalPoints,
    };
  } catch (error) {
    console.error('Error calculating annual leave points:', error);
    return null;
  }
};

/**
 * 新規申請が可能かチェック
 * @param staffId 職員ID
 * @param level 申請レベル（1, 2, 3）
 * @param period 期間（full_day, am, pm）
 * @returns 利用可能上限、消費得点、残り得点、申請可否
 */
export const checkAnnualLeavePointsAvailable = async (
  staffId: string,
  level: 1 | 2 | 3,
  period: 'full_day' | 'am' | 'pm'
): Promise<{
  maxPoints: number;
  usedPoints: number;
  remainingPoints: number;
  canApply: boolean;
} | null> => {
  try {
    // 設定とスタッフ情報を取得
    const { data: setting, error: settingError } = await supabase
      .from('setting')
      .select('max_annual_leave_points, level1_points, level2_points, level3_points, current_fiscal_year')
      .eq('id', 1)
      .single();

    if (settingError || !setting) {
      console.error('Failed to fetch setting:', settingError);
      return null;
    }

    const { data: user, error: userError } = await supabase
      .from('user')
      .select('point_retention_rate')
      .eq('staff_id', staffId)
      .single();

    if (userError || !user) {
      console.error('Failed to fetch user:', userError);
      return null;
    }

    // 個人の利用可能上限を計算
    const maxPoints = Math.floor(
      (setting.max_annual_leave_points * user.point_retention_rate) / 100
    );

    // 現在の消費得点を計算
    const pointsData = await calculateAnnualLeavePoints(
      staffId,
      setting.current_fiscal_year
    );

    if (!pointsData) {
      return null;
    }

    const usedPoints = pointsData.totalPoints;

    // 新規申請の消費得点を計算
    const newApplicationPoints =
      (period === 'full_day' ? 1 : 0.5) *
      (level === 1 ? setting.level1_points : level === 2 ? setting.level2_points : setting.level3_points);

    // 申請後の合計が上限を超えないかチェック
    const remainingPoints = maxPoints - usedPoints;
    const canApply = usedPoints + newApplicationPoints <= maxPoints;

    return {
      maxPoints,
      usedPoints,
      remainingPoints,
      canApply,
    };
  } catch (error) {
    console.error('Error checking annual leave points:', error);
    return null;
  }
};
