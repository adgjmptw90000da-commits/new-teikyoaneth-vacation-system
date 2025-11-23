// @ts-nocheck
import { supabase } from "./supabase";

interface RecordCounts {
  applications: number;
  calendarRecords: number;
  holidays: number;
  events: number;
}

/**
 * 指定した年度のレコード数を取得
 * @param fiscalYear 年度（例: 2023 → 2023/4/1〜2024/3/31）
 * @returns レコード数のオブジェクト、またはnull
 */
export async function getRecordCountsByFiscalYear(
  fiscalYear: number
): Promise<RecordCounts | null> {
  try {
    const startDate = `${fiscalYear}-04-01`;
    const endDate = `${fiscalYear + 1}-03-31`;

    // 申請数をカウント
    const { count: applicationCount, error: appError } = await supabase
      .from("application")
      .select("id", { count: "exact", head: true })
      .gte("vacation_date", startDate)
      .lte("vacation_date", endDate);

    if (appError) {
      console.error("Error counting applications:", appError);
      return null;
    }

    // カレンダーレコード数をカウント
    const { count: calendarCount, error: calError } = await supabase
      .from("calendar_management")
      .select("vacation_date", { count: "exact", head: true })
      .gte("vacation_date", startDate)
      .lte("vacation_date", endDate);

    if (calError) {
      console.error("Error counting calendar records:", calError);
      return null;
    }

    // 祝日・主要学会数をカウント
    const { count: holidayCount, error: holError } = await supabase
      .from("holiday")
      .select("id", { count: "exact", head: true })
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate);

    if (holError) {
      console.error("Error counting holidays:", holError);
      return null;
    }

    // イベント数をカウント
    const { count: eventCount, error: eventError } = await supabase
      .from("event")
      .select("id", { count: "exact", head: true })
      .gte("event_date", startDate)
      .lte("event_date", endDate);

    if (eventError) {
      console.error("Error counting events:", eventError);
      return null;
    }

    return {
      applications: applicationCount || 0,
      calendarRecords: calendarCount || 0,
      holidays: holidayCount || 0,
      events: eventCount || 0,
    };
  } catch (error) {
    console.error("Error in getRecordCountsByFiscalYear:", error);
    return null;
  }
}

/**
 * 指定した年度のレコードを削除
 * @param fiscalYear 年度（例: 2023 → 2023/4/1〜2024/3/31）
 * @returns 成功したかどうか
 */
export async function deleteRecordsByFiscalYear(
  fiscalYear: number
): Promise<boolean> {
  try {
    const startDate = `${fiscalYear}-04-01`;
    const endDate = `${fiscalYear + 1}-03-31`;

    // 申請を削除
    const { error: appError } = await supabase
      .from("application")
      .delete()
      .gte("vacation_date", startDate)
      .lte("vacation_date", endDate);

    if (appError) {
      console.error("Error deleting applications:", appError);
      return false;
    }

    // カレンダーレコードを削除
    const { error: calError } = await supabase
      .from("calendar_management")
      .delete()
      .gte("vacation_date", startDate)
      .lte("vacation_date", endDate);

    if (calError) {
      console.error("Error deleting calendar records:", calError);
      return false;
    }

    // 祝日・主要学会を削除
    const { error: holError } = await supabase
      .from("holiday")
      .delete()
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate);

    if (holError) {
      console.error("Error deleting holidays:", holError);
      return false;
    }

    // イベントを削除
    const { error: eventError } = await supabase
      .from("event")
      .delete()
      .gte("event_date", startDate)
      .lte("event_date", endDate);

    if (eventError) {
      console.error("Error deleting events:", eventError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteRecordsByFiscalYear:", error);
    return false;
  }
}
