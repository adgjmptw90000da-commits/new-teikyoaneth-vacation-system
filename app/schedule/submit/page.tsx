// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database, DisplaySettings } from "@/lib/database.types";

// デフォルトの表示設定
const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  research_day: {
    label: "研究日",
    label_first_year: "外勤",
    color: "#000000",
    bg_color: "#FFFF99",
  },
  vacation: {
    label_full: "年休",
    label_am: "AM",
    label_pm: "PM",
    color: "#000000",
    bg_color: "#FFCCCC",
  },
  vacation_applied: {
    color: "#000000",
    bg_color: "#99CCFF",
  },
  kensanbi_used: {
    label: "研鑽日",
    color: "#000000",
    bg_color: "#99FF99",
  },
  secondment: {
    label: "出向",
    color: "#000000",
    bg_color: "#FFCC99",
  },
  leave_of_absence: {
    label: "休職",
    color: "#000000",
    bg_color: "#C0C0C0",
  },
};

type Application = Database["public"]["Tables"]["application"]["Row"];
type Holiday = Database["public"]["Tables"]["holiday"]["Row"];
type Conference = Database["public"]["Tables"]["conference"]["Row"];
type Event = Database["public"]["Tables"]["event"]["Row"];
type ScheduleType = Database["public"]["Tables"]["schedule_type"]["Row"];
type UserSchedule = Database["public"]["Tables"]["user_schedule"]["Row"];

interface DayData {
  date: string;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
  isConference: boolean;
  conferenceName?: string;
  isEvent: boolean;
  eventName?: string;
  confirmedVacation?: {
    period: string;
    level: number;
    status: string;
    priority: number | null;
  };
  isResearchDay: boolean;
  isSecondment: boolean;
  isLeaveOfAbsence: boolean;
  canNightShift: boolean;
  userSchedules: (UserSchedule & { schedule_type: ScheduleType })[];
}

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  ),
};

const WEEKDAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
];

export default function ScheduleSubmitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next.getMonth() + 1;
  });
  const [user, setUser] = useState<any>(null);

  // 研究日設定（月単位）
  const [researchDay, setResearchDay] = useState<number | null>(null);

  // 日付範囲選択モード（出向中・休職中の登録用）
  const [selectionMode, setSelectionMode] = useState<'none' | 'secondment' | 'leave'>('none');
  const [selectionStart, setSelectionStart] = useState<string | null>(null);

  // ユーザーの当直レベル
  const [userNightShiftLevel, setUserNightShiftLevel] = useState<string | null>(null);

  // データ
  const [holidaysData, setHolidaysData] = useState<Holiday[]>([]);
  const [conferencesData, setConferencesData] = useState<Conference[]>([]);
  const [eventsData, setEventsData] = useState<Event[]>([]);
  const [applicationsData, setApplicationsData] = useState<Application[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [userSchedulesData, setUserSchedulesData] = useState<(UserSchedule & { schedule_type: ScheduleType })[]>([]);
  const [leaveOfAbsenceData, setLeaveOfAbsenceData] = useState<{ start_date: string; end_date: string }[]>([]);
  const [secondmentData, setSecondmentData] = useState<{ start_date: string; end_date: string }[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  // システム予約タイプ
  const [systemScheduleTypes, setSystemScheduleTypes] = useState<{
    research_day?: ScheduleType;
    secondment?: ScheduleType;
    leave_of_absence?: ScheduleType;
  }>({});

  // モーダル
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 初期ロード完了フラグ（設定の自動保存を防ぐため）
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // 予定提出ロック状態
  const [isLocked, setIsLocked] = useState(false);

  // 二重フェッチ防止用
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    setUser(currentUser);
    fetchData(currentUser.staff_id);
  }, [router, currentYear, currentMonth]);

  const fetchData = async (staffId: string) => {
    // 二重フェッチ防止
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setLoading(true);
    try {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      const [
        { data: holidays },
        { data: conferences },
        { data: events },
        { data: applications },
        { data: types },
        { data: userSchedules },
        { data: userData },
        { data: displaySettingsData },
        { data: publishData },
      ] = await Promise.all([
        supabase.from("holiday").select("*"),
        supabase.from("conference").select("*"),
        supabase.from("event").select("*"),
        supabase.from("application")
          .select("*")
          .eq("staff_id", staffId)
          .gte("vacation_date", startDate)
          .lte("vacation_date", endDate)
          .in("status", ["after_lottery", "confirmed"]),
        supabase.from("schedule_type").select("*").order("display_order", { ascending: true }),
        supabase.from("user_schedule")
          .select("*, schedule_type(*)")
          .eq("staff_id", staffId)
          .gte("schedule_date", startDate)
          .lte("schedule_date", endDate),
        supabase.from("user")
          .select("night_shift_level")
          .eq("staff_id", staffId)
          .single(),
        supabase.from("setting").select("display_settings").single(),
        supabase.from("schedule_publish")
          .select("is_submission_locked")
          .eq("year", currentYear)
          .eq("month", currentMonth)
          .maybeSingle(),
      ]);

      // 予定提出ロック状態を設定
      setIsLocked(publishData?.is_submission_locked ?? false);

      setHolidaysData(holidays || []);
      setConferencesData(conferences || []);
      setEventsData(events || []);
      setApplicationsData(applications || []);
      setScheduleTypes((types || []).filter(t => !t.is_system)); // システム予約タイプを除外
      setUserSchedulesData(userSchedules || []);

      // 表示設定を読み込み
      if (displaySettingsData?.display_settings) {
        setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...displaySettingsData.display_settings });
      }

      // システム予約タイプを取得
      const systemTypes: typeof systemScheduleTypes = {};
      (types || []).forEach(t => {
        if (t.system_key === 'research_day') systemTypes.research_day = t;
        if (t.system_key === 'secondment') systemTypes.secondment = t;
        if (t.system_key === 'leave_of_absence') systemTypes.leave_of_absence = t;
      });
      setSystemScheduleTypes(systemTypes);

      // user_scheduleから研究日の曜日を推測（今月のデータから）
      if (systemTypes.research_day && userSchedules) {
        const researchDaySchedules = userSchedules.filter(
          s => s.schedule_type_id === systemTypes.research_day!.id
        );
        if (researchDaySchedules.length > 0) {
          // 最初の研究日の曜日を取得
          const firstResearchDay = new Date(researchDaySchedules[0].schedule_date);
          setResearchDay(firstResearchDay.getDay());
        } else {
          setResearchDay(null);
        }
      } else {
        setResearchDay(null);
      }

      // 連続した日付をグループ化するヘルパー関数
      const groupConsecutiveDates = (records: typeof userSchedules): { start_date: string; end_date: string }[] => {
        if (!records || records.length === 0) return [];
        const sorted = [...records].sort((a, b) => a.schedule_date.localeCompare(b.schedule_date));
        const groups: { start_date: string; end_date: string }[] = [];
        let currentStart: string | null = null;
        let currentEnd: string | null = null;

        for (const record of sorted) {
          if (currentStart === null) {
            currentStart = record.schedule_date;
            currentEnd = record.schedule_date;
          } else {
            const prevDate = new Date(currentEnd!);
            prevDate.setDate(prevDate.getDate() + 1);
            if (prevDate.toISOString().split('T')[0] === record.schedule_date) {
              currentEnd = record.schedule_date;
            } else {
              groups.push({ start_date: currentStart, end_date: currentEnd! });
              currentStart = record.schedule_date;
              currentEnd = record.schedule_date;
            }
          }
        }
        if (currentStart !== null) {
          groups.push({ start_date: currentStart, end_date: currentEnd! });
        }
        return groups;
      };

      // user_scheduleから休職中の期間を特定
      if (systemTypes.leave_of_absence && userSchedules) {
        const leaveRecords = userSchedules.filter(
          s => s.schedule_type_id === systemTypes.leave_of_absence!.id
        );
        setLeaveOfAbsenceData(groupConsecutiveDates(leaveRecords));
      } else {
        setLeaveOfAbsenceData([]);
      }

      // user_scheduleから出向中の期間を特定
      if (systemTypes.secondment && userSchedules) {
        const secondmentRecords = userSchedules.filter(
          s => s.schedule_type_id === systemTypes.secondment!.id
        );
        setSecondmentData(groupConsecutiveDates(secondmentRecords));
      } else {
        setSecondmentData([]);
      }

      // ユーザーの当直レベルを設定
      setUserNightShiftLevel(userData?.night_shift_level || null);

      // 初期ロード完了
      setInitialLoadComplete(true);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  // 指定した曜日のすべての日付を取得（祝日・日曜を除く）
  const getDatesForWeekday = (weekday: number, startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      if (current.getDay() === weekday && current.getDay() !== 0) {
        const dateStr = current.toISOString().split('T')[0];
        // 祝日でないかチェック
        const isHoliday = holidaysData.some(h => h.holiday_date === dateStr);
        if (!isHoliday) {
          dates.push(dateStr);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // 研究日設定を保存（月単位）
  const saveResearchDaySetting = async () => {
    if (!user) return;

    try {
      // 今月の範囲を取得
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      // user_scheduleから今月の研究日タイプのレコードを削除
      if (systemScheduleTypes.research_day) {
        await supabase.from("user_schedule")
          .delete()
          .eq("staff_id", user.staff_id)
          .eq("schedule_type_id", systemScheduleTypes.research_day.id)
          .gte("schedule_date", monthStart)
          .lte("schedule_date", monthEnd);
      }

      // 新しいデータを挿入（今月のみ）
      if (researchDay !== null && systemScheduleTypes.research_day) {
        const dates = getDatesForWeekday(researchDay, monthStart, monthEnd);

        if (dates.length > 0) {
          const records = dates.map(date => ({
            staff_id: user.staff_id,
            schedule_date: date,
            schedule_type_id: systemScheduleTypes.research_day!.id,
            work_location_id: systemScheduleTypes.research_day!.default_work_location_id || null,
          }));

          await supabase.from("user_schedule").insert(records);
        }
      }

      // データ再取得
      fetchData(user.staff_id);
    } catch (err) {
      console.error("Error saving research day setting:", err);
    }
  };

  // 研究日設定が変更されたら保存（初期ロード完了後のみ、月が変わった時は自動保存しない）
  const [lastSavedResearchDay, setLastSavedResearchDay] = useState<{ year: number; month: number; day: number | null } | null>(null);

  useEffect(() => {
    if (user && initialLoadComplete) {
      // 同じ月で曜日が変わった時のみ保存
      if (lastSavedResearchDay === null ||
          (lastSavedResearchDay.year === currentYear &&
           lastSavedResearchDay.month === currentMonth &&
           lastSavedResearchDay.day !== researchDay)) {
        // 初回ロード時は保存しない
        if (lastSavedResearchDay !== null) {
          saveResearchDaySetting();
        }
      }
      setLastSavedResearchDay({ year: currentYear, month: currentMonth, day: researchDay });
    }
  }, [researchDay, user, initialLoadComplete, currentYear, currentMonth]);

  // 出向中設定を保存（期間指定）
  const handleSaveSecondment = async (startDate: string, endDate: string) => {
    if (!user) return;

    try {
      if (systemScheduleTypes.secondment) {
        const dates = getAllDatesInRange(startDate, endDate);

        if (dates.length > 0) {
          const records = dates.map(date => ({
            staff_id: user.staff_id,
            schedule_date: date,
            schedule_type_id: systemScheduleTypes.secondment!.id,
            work_location_id: systemScheduleTypes.secondment!.default_work_location_id || null,
          }));

          await supabase.from("user_schedule").insert(records);
        }
      }

      fetchData(user.staff_id);
    } catch (err) {
      console.error("Error saving secondment setting:", err);
      alert("出向中設定の保存に失敗しました");
    }
  };

  // 出向中を削除
  const handleDeleteSecondment = async (startDate: string, endDate: string) => {
    if (!user) return;

    try {
      if (systemScheduleTypes.secondment) {
        await supabase.from("user_schedule")
          .delete()
          .eq("staff_id", user.staff_id)
          .eq("schedule_type_id", systemScheduleTypes.secondment.id)
          .gte("schedule_date", startDate)
          .lte("schedule_date", endDate);
      }

      fetchData(user.staff_id);
    } catch (err) {
      console.error("Error deleting secondment:", err);
      alert("出向中設定の削除に失敗しました");
    }
  };

  // 期間の全日付を取得
  const getAllDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const current = new Date(start);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // 休職期間を追加
  const handleAddLeaveOfAbsence = async (startDate: string, endDate: string) => {
    if (!user) return;

    try {
      if (systemScheduleTypes.leave_of_absence) {
        const dates = getAllDatesInRange(startDate, endDate);

        if (dates.length > 0) {
          const records = dates.map(date => ({
            staff_id: user.staff_id,
            schedule_date: date,
            schedule_type_id: systemScheduleTypes.leave_of_absence!.id,
            work_location_id: systemScheduleTypes.leave_of_absence!.default_work_location_id || null,
          }));

          await supabase.from("user_schedule").insert(records);
        }
      }

      fetchData(user.staff_id);
    } catch (err) {
      console.error("Error adding leave of absence:", err);
      alert("休職期間の追加に失敗しました");
    }
  };

  // 休職期間を削除
  const handleDeleteLeaveOfAbsence = async (startDate: string, endDate: string) => {
    if (!user) return;

    try {
      // user_scheduleから削除
      if (systemScheduleTypes.leave_of_absence) {
        await supabase.from("user_schedule")
          .delete()
          .eq("staff_id", user.staff_id)
          .eq("schedule_type_id", systemScheduleTypes.leave_of_absence.id)
          .gte("schedule_date", startDate)
          .lte("schedule_date", endDate);
      }

      fetchData(user.staff_id);
    } catch (err) {
      console.error("Error deleting leave of absence:", err);
      alert("休職期間の削除に失敗しました");
    }
  };

  // 当直可否を判定する関数
  const checkNightShiftAvailability = (
    date: string,
    dayOfWeek: number,
    isHoliday: boolean,
    isResearchDay: boolean,
    vacation?: { period: string },
    schedules?: ScheduleType[],
    prevDayData?: { isResearchDay: boolean; vacation?: { period: string }; schedules?: ScheduleType[] },
    nextDayData?: { isResearchDay: boolean; vacation?: { period: string }; schedules?: ScheduleType[] }
  ): boolean => {
    // 当日の制約チェック
    // 1. 研究日: 当日当直不可
    if (isResearchDay) {
      return false;
    }
    // 2. 年休:
    //    - 終日/PM: 当日当直不可
    //    - AM: 土曜日のみ当日当直不可
    if (vacation) {
      if (vacation.period === 'full_day' || vacation.period === 'pm') {
        return false;
      }
      // AM年休: 土曜日のみ当直不可
      if (vacation.period === 'am' && dayOfWeek === 6) {
        return false;
      }
    }

    // カスタム予定の当日制約
    if (schedules && schedules.length > 0) {
      for (const s of schedules) {
        if (!s.same_day_night_shift) {
          return false;
        }
      }
    }

    // 翌日の予定による制約チェック
    if (nextDayData) {
      // 翌日が研究日 → 前日当直不可 = 当日当直不可
      if (nextDayData.isResearchDay) {
        return false;
      }
      // 翌日が年休 → 前日当直不可 = 当日当直不可
      if (nextDayData.vacation) {
        return false;
      }
      // 翌日のカスタム予定
      if (nextDayData.schedules && nextDayData.schedules.length > 0) {
        for (const s of nextDayData.schedules) {
          if (!s.prev_day_night_shift) {
            return false;
          }
        }
      }
    }

    return true;
  };

  // カレンダーデータを生成（メモ化）
  const daysData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const applicationsMap = new Map<string, Application>();
    applicationsData.forEach((app) => {
      applicationsMap.set(app.vacation_date, app);
    });

    // ユーザースケジュールをマップ化
    const schedulesMap = new Map<string, (UserSchedule & { schedule_type: ScheduleType })[]>();
    userSchedulesData.forEach((s) => {
      const existing = schedulesMap.get(s.schedule_date) || [];
      existing.push(s);
      schedulesMap.set(s.schedule_date, existing);
    });

    // まず基本データを作成
    const baseDays: Omit<DayData, 'canNightShift'>[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(date).getDay();
      const holiday = holidaysData.find((h) => h.holiday_date === date);
      const conference = conferencesData.find((c) => c.conference_date === date);
      const event = eventsData.find((e) => e.event_date === date);
      const application = applicationsMap.get(date);
      const userSchedules = schedulesMap.get(date) || [];

      // user_scheduleから研究日・出向中・休職中を判定
      const isResearchDayForDate = systemScheduleTypes.research_day
        ? userSchedules.some(s => s.schedule_type_id === systemScheduleTypes.research_day!.id)
        : false;
      const isSecondmentForDate = systemScheduleTypes.secondment
        ? userSchedules.some(s => s.schedule_type_id === systemScheduleTypes.secondment!.id)
        : false;
      const isLeaveOfAbsenceForDate = systemScheduleTypes.leave_of_absence
        ? userSchedules.some(s => s.schedule_type_id === systemScheduleTypes.leave_of_absence!.id)
        : false;

      baseDays.push({
        date,
        dayOfWeek,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        isConference: !!conference,
        conferenceName: conference?.name,
        isEvent: !!event,
        eventName: event?.name,
        confirmedVacation: application ? {
          period: application.period,
          level: application.level,
          status: application.status,
          priority: application.priority,
        } : undefined,
        isResearchDay: isResearchDayForDate,
        isSecondment: isSecondmentForDate,
        isLeaveOfAbsence: isLeaveOfAbsenceForDate,
        userSchedules,
      });
    }

    // 前日・翌日を考慮して当直可否を計算
    const days: DayData[] = baseDays.map((day, index) => {
      const prevDay = index > 0 ? baseDays[index - 1] : undefined;
      const nextDay = index < baseDays.length - 1 ? baseDays[index + 1] : undefined;

      // 当直レベル「なし」・出向中・休職中は当直不可
      if (userNightShiftLevel === 'なし' || day.isSecondment || day.isLeaveOfAbsence) {
        return { ...day, canNightShift: false };
      }

      const canNightShift = checkNightShiftAvailability(
        day.date,
        day.dayOfWeek,
        day.isHoliday,
        day.isResearchDay,
        day.confirmedVacation,
        day.userSchedules.map(s => s.schedule_type),
        prevDay ? {
          isResearchDay: prevDay.isResearchDay,
          vacation: prevDay.confirmedVacation,
          schedules: prevDay.userSchedules.map(s => s.schedule_type)
        } : undefined,
        nextDay ? {
          isResearchDay: nextDay.isResearchDay,
          vacation: nextDay.confirmedVacation,
          schedules: nextDay.userSchedules.map(s => s.schedule_type)
        } : undefined
      );

      return { ...day, canNightShift };
    });

    return days;
  }, [currentYear, currentMonth, holidaysData, conferencesData, eventsData, applicationsData, userSchedulesData, systemScheduleTypes, userNightShiftLevel]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth() + 1);
  };

  const getDateBackgroundColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) {
      return "bg-red-50/50";
    }
    if (day.isConference) {
      return "bg-orange-50/50";
    }
    if (day.dayOfWeek === 6) {
      return "bg-blue-50/50";
    }
    return "bg-white/80";
  };

  // セルのデフォルト背景色を取得（transparent時のフォールバック用）
  const getCellDefaultBgColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) {
      return "#FEF2F2"; // red-50
    }
    if (day.isConference) {
      return "#FFF7ED"; // orange-50
    }
    if (day.dayOfWeek === 6) {
      return "#EFF6FF"; // blue-50
    }
    return "#FFFFFF";
  };

  // 背景色を取得（transparentの場合はデフォルト色を返す）
  const getEffectiveBgColor = (bgColor: string | undefined, day: DayData): string => {
    if (!bgColor || bgColor === 'transparent') {
      return getCellDefaultBgColor(day);
    }
    return bgColor;
  };

  const getDateTextColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) {
      return "text-red-600";
    }
    if (day.isConference) {
      return "text-orange-600";
    }
    if (day.dayOfWeek === 6) {
      return "text-blue-600";
    }
    return "text-gray-900";
  };

  const getCalendarGridData = (): (DayData | null)[] => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();

    const gridData: (DayData | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      gridData.push(null);
    }

    daysData.forEach(day => {
      gridData.push(day);
    });

    const remainingDays = 7 - (gridData.length % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        gridData.push(null);
      }
    }

    return gridData;
  };

  // 月ごとの予定タイプ使用回数を計算
  const getMonthlyScheduleCount = (typeId: number): number => {
    return userSchedulesData.filter(s => s.schedule_type_id === typeId).length;
  };

  // 予定追加
  const handleAddSchedule = async (typeId: number) => {
    if (!user || !selectedDate || !selectedDayData) return;

    // 回数制限チェック
    const scheduleType = scheduleTypes.find(t => t.id === typeId);
    if (!scheduleType) return;

    if (scheduleType.monthly_limit) {
      const currentCount = getMonthlyScheduleCount(typeId);
      if (currentCount >= scheduleType.monthly_limit) {
        alert(`「${scheduleType.name}」は月${scheduleType.monthly_limit}回までです。\n現在: ${currentCount}回`);
        return;
      }
    }

    // 勤務帯の重複チェック
    const newPositions = {
      am: scheduleType.position_am,
      pm: scheduleType.position_pm,
      night: scheduleType.position_night,
    };

    // 既存の予定の勤務帯を取得（システム予約タイプを除く）
    const existingSchedules = selectedDayData.userSchedules.filter(s => !s.schedule_type.is_system);

    for (const existing of existingSchedules) {
      const existingPositions = {
        am: existing.schedule_type.position_am,
        pm: existing.schedule_type.position_pm,
        night: existing.schedule_type.position_night,
      };

      // 重複チェック
      const hasOverlap =
        (newPositions.am && existingPositions.am) ||
        (newPositions.pm && existingPositions.pm) ||
        (newPositions.night && existingPositions.night);

      if (hasOverlap) {
        const overlappingParts: string[] = [];
        if (newPositions.am && existingPositions.am) overlappingParts.push('AM');
        if (newPositions.pm && existingPositions.pm) overlappingParts.push('PM');
        if (newPositions.night && existingPositions.night) overlappingParts.push('夜勤');

        alert(`「${existing.schedule_type.name}」と${overlappingParts.join('/')}が重複しています。\n既存の予定を削除してから追加してください。`);
        return;
      }
    }

    try {
      // schedule_typeからdefault_work_location_idを取得
      const scheduleTypeData = scheduleTypes.find(t => t.id === typeId);
      const { error } = await supabase.from("user_schedule").insert({
        staff_id: user.staff_id,
        schedule_date: selectedDate,
        schedule_type_id: typeId,
        work_location_id: scheduleTypeData?.default_work_location_id || null,
      });

      if (error) {
        alert("予定の追加に失敗しました: " + error.message);
      } else {
        fetchData(user.staff_id);
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error adding schedule:", err);
    }
  };

  // 予定削除
  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("user_schedule").delete().eq("id", scheduleId);

      if (error) {
        alert("予定の削除に失敗しました: " + error.message);
      } else {
        fetchData(user.staff_id);
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
    }
  };

  // 日付クリック
  const handleDateClick = (date: string) => {
    // ロック中は操作不可
    if (isLocked) {
      return;
    }

    // 選択モード中の場合
    if (selectionMode !== 'none') {
      if (!selectionStart) {
        // 開始日を選択
        setSelectionStart(date);
      } else {
        // 終了日を選択して登録
        const startDate = selectionStart <= date ? selectionStart : date;
        const endDate = selectionStart <= date ? date : selectionStart;

        if (selectionMode === 'secondment') {
          handleSaveSecondment(startDate, endDate);
        } else if (selectionMode === 'leave') {
          handleAddLeaveOfAbsence(startDate, endDate);
        }

        // 選択モードをリセット
        setSelectionMode('none');
        setSelectionStart(null);
      }
      return;
    }

    // 通常モード：モーダルを表示
    setSelectedDate(date);
    setShowModal(true);
  };

  // 選択モードをキャンセル
  const cancelSelection = () => {
    setSelectionMode('none');
    setSelectionStart(null);
  };

  // 日付が選択範囲内かどうかをチェック
  const isDateInSelectionRange = (date: string): boolean => {
    if (selectionMode === 'none' || !selectionStart) return false;
    return date === selectionStart;
  };

  // 選択された日のデータ
  const selectedDayData = selectedDate ? daysData.find(d => d.date === selectedDate) : null;

  // 初回ロード時のみフルスクリーンローディングを表示
  if (loading && !initialLoadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-400 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ヘッダー */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="戻る"
              >
                <Icons.ChevronLeft />
              </button>
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                予定提出
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/admin/home")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ホーム"
              >
                <Icons.Home />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {/* 研究日・出向中・休職中設定 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 研究日 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">研究日（曜日選択）</h3>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => !isLocked && setResearchDay(null)}
                    disabled={isLocked}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      researchDay === null
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={researchDay === null ? { backgroundColor: displaySettings.research_day?.bg_color || '#FFFF99', color: displaySettings.research_day?.color || '#000000' } : undefined}
                  >
                    なし
                  </button>
                  {WEEKDAYS.filter(w => w.value >= 1 && w.value <= 5).map((w) => (
                    <button
                      key={w.value}
                      onClick={() => !isLocked && setResearchDay(w.value)}
                      disabled={isLocked}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        researchDay === w.value
                          ? ''
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={researchDay === w.value ? { backgroundColor: displaySettings.research_day?.bg_color || '#FFFF99', color: displaySettings.research_day?.color || '#000000' } : undefined}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 出向中 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">出向中</h3>
                {selectionMode === 'secondment' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 font-medium">
                      {selectionStart ? `${selectionStart.replace(/-/g, '/')} 〜 終了日を選択` : '開始日を選択'}
                    </span>
                    <button
                      onClick={cancelSelection}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <button
                      onClick={() => !isLocked && setSelectionMode('secondment')}
                      disabled={isLocked}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: displaySettings.secondment?.bg_color || '#FFCC99', color: displaySettings.secondment?.color || '#000000' }}
                    >
                      <Icons.Plus />
                      追加
                    </button>
                    {secondmentData.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {secondmentData.map((period, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                            style={{ backgroundColor: displaySettings.secondment?.bg_color || '#FFCC99', color: displaySettings.secondment?.color || '#000000' }}
                          >
                            {period.start_date.slice(5).replace(/-/g, '/')}〜{period.end_date.slice(5).replace(/-/g, '/')}
                            {!isLocked && (
                              <button
                                onClick={() => handleDeleteSecondment(period.start_date, period.end_date)}
                                className="hover:opacity-70"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 休職中 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">休職中</h3>
                {selectionMode === 'leave' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">
                      {selectionStart ? `${selectionStart.replace(/-/g, '/')} 〜 終了日を選択` : '開始日を選択'}
                    </span>
                    <button
                      onClick={cancelSelection}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <button
                      onClick={() => !isLocked && setSelectionMode('leave')}
                      disabled={isLocked}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: displaySettings.leave_of_absence?.bg_color || '#C0C0C0', color: displaySettings.leave_of_absence?.color || '#000000' }}
                    >
                      <Icons.Plus />
                      追加
                    </button>
                    {leaveOfAbsenceData.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {leaveOfAbsenceData.map((leave, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                            style={{ backgroundColor: displaySettings.leave_of_absence?.bg_color || '#C0C0C0', color: displaySettings.leave_of_absence?.color || '#000000' }}
                          >
                            {leave.start_date.slice(5).replace(/-/g, '/')}〜{leave.end_date.slice(5).replace(/-/g, '/')}
                            {!isLocked && (
                              <button
                                onClick={() => handleDeleteLeaveOfAbsence(leave.start_date, leave.end_date)}
                                className="hover:opacity-70"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 月選択 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
              >
                <Icons.ChevronLeft />
                <span className="hidden sm:inline">前月</span>
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {currentYear}年{currentMonth}月
              </h2>
              <button
                onClick={() => changeMonth(1)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
              >
                <span className="hidden sm:inline">次月</span>
                <Icons.ChevronRight />
              </button>
            </div>

            {/* 直近5ヶ月タブ */}
            <div className="flex justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
              {[0, 1, 2, 3, 4].map(offset => {
                const now = new Date();
                const targetMonth = now.getMonth() + offset;
                const tabYear = now.getFullYear() + Math.floor(targetMonth / 12);
                const tabMonth = (targetMonth % 12) + 1;
                const isActive = tabYear === currentYear && tabMonth === currentMonth;

                return (
                  <button
                    key={offset}
                    onClick={() => {
                      setCurrentYear(tabYear);
                      setCurrentMonth(tabMonth);
                    }}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg whitespace-nowrap text-xs sm:text-sm font-medium transition-all ${isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tabMonth}月
                  </button>
                );
              })}
            </div>
          </div>

          {/* ロック警告メッセージ */}
          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <div className="text-red-500">
                <Icons.Lock />
              </div>
              <div>
                <p className="text-sm font-medium text-red-700">
                  この月の予定提出はロックされています
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  編集が必要な場合は管理者にお問い合わせください
                </p>
              </div>
            </div>
          )}

          {/* カレンダー */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 sm:p-4">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-xs sm:text-sm font-bold py-1 sm:py-2 ${
                    index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* カレンダーグリッド */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {getCalendarGridData().map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="min-h-[90px] sm:min-h-[110px] bg-gray-50 rounded-lg" />;
                }

                const hasVacation = !!day.confirmedVacation;
                const hasAMVacation = hasVacation && (day.confirmedVacation!.period === 'am' || day.confirmedVacation!.period === 'full_day');
                const hasPMVacation = hasVacation && (day.confirmedVacation!.period === 'pm' || day.confirmedVacation!.period === 'full_day');
                const hasFullDayVacation = hasVacation && day.confirmedVacation!.period === 'full_day';

                // ユーザースケジュール（AM/PM配置のもの、システム予約タイプを除外）
                const amPmSchedules = day.userSchedules.filter(s =>
                  (s.schedule_type.position_am || s.schedule_type.position_pm) &&
                  !s.schedule_type.is_system
                );
                const nightSchedules = day.userSchedules.filter(s =>
                  s.schedule_type.position_night && !s.schedule_type.is_system
                );

                // AM/PM/夜勤全てに跨る予定があるか
                const allDaySchedule = day.userSchedules.find(s =>
                  s.schedule_type.position_am && s.schedule_type.position_pm && s.schedule_type.position_night &&
                  !s.schedule_type.is_system
                );
                // AM/PM全体に表示するか（夜勤は含まない）
                const hasFullDaySchedule = amPmSchedules.some(s =>
                  s.schedule_type.position_am && s.schedule_type.position_pm && !s.schedule_type.position_night
                );
                // 全帯域（AM/PM/夜勤）を結合するか
                const showAllDay = !!allDaySchedule || day.isSecondment || day.isLeaveOfAbsence;
                // AM/PM部分のみ結合するか
                const showFullDay = day.isResearchDay || hasFullDayVacation || hasFullDaySchedule;

                // 選択モード中のハイライト
                const isSelectionStart = selectionStart === day.date;
                const isInSelectionMode = selectionMode !== 'none';

                return (
                  <div
                    key={day.date}
                    onClick={() => handleDateClick(day.date)}
                    className={`min-h-[90px] sm:min-h-[110px] rounded-lg flex flex-col overflow-hidden transition-all ${
                      isLocked
                        ? 'cursor-default border border-gray-200'
                        : isSelectionStart
                          ? 'cursor-pointer border-2 border-indigo-500 shadow-lg ring-2 ring-indigo-200'
                          : isInSelectionMode
                            ? 'cursor-pointer border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:shadow-md'
                            : 'cursor-pointer border border-gray-200 hover:border-indigo-400 hover:shadow-md'
                    } ${
                      day.isSecondment ? 'bg-amber-50/80' :
                      day.isLeaveOfAbsence ? 'bg-gray-100' :
                      getDateBackgroundColor(day)
                    }`}
                  >
                    {/* 日付ヘッダー */}
                    <div className="flex items-center justify-between px-1 sm:px-2 py-0.5 border-b border-gray-100">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className={`text-sm sm:text-base font-bold shrink-0 ${getDateTextColor(day)}`}>
                          {day.date.split('-')[2]}
                        </span>
                        <span className="text-[7px] sm:text-[9px] truncate">
                          {day.isHoliday && <span className="text-red-600">{day.holidayName}</span>}
                          {day.isConference && <span className="text-orange-600">{day.conferenceName}</span>}
                          {day.isEvent && <span className="text-purple-600">{day.eventName}</span>}
                        </span>
                      </div>
                      {/* 当直可否マーク */}
                      <span className={`text-sm sm:text-base font-bold ${day.canNightShift ? 'text-green-600' : 'text-red-500'}`}>
                        {day.canNightShift ? '○' : '×'}
                      </span>
                    </div>

                    {/* 3分割エリア */}
                    <div className="flex-1 flex flex-col relative">
                      {/* 全帯域表示（AM/PM/夜勤すべて結合） */}
                      {showAllDay && (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            backgroundColor: day.isSecondment
                              ? displaySettings.secondment?.bg_color || '#FFCC99'
                              : day.isLeaveOfAbsence
                                ? displaySettings.leave_of_absence?.bg_color || '#C0C0C0'
                                : allDaySchedule
                                  ? getEffectiveBgColor(allDaySchedule.schedule_type.color, day)
                                  : undefined
                          }}
                        >
                          <span
                            className="text-[10px] sm:text-xs font-bold"
                            style={{
                              color: day.isSecondment
                                ? displaySettings.secondment?.color || '#000000'
                                : day.isLeaveOfAbsence
                                  ? displaySettings.leave_of_absence?.color || '#000000'
                                  : allDaySchedule?.schedule_type.text_color || '#000000'
                            }}
                          >
                            {day.isSecondment
                              ? displaySettings.secondment?.label || '出向'
                              : day.isLeaveOfAbsence
                                ? displaySettings.leave_of_absence?.label || '休職'
                                : allDaySchedule?.schedule_type.display_label || allDaySchedule?.schedule_type.name}
                          </span>
                        </div>
                      )}

                      {/* AM/PM結合表示（夜勤は別） */}
                      {!showAllDay && showFullDay && (
                        <>
                          <div
                            className="flex-[2] flex items-center justify-center border-b border-gray-100"
                            style={{
                              backgroundColor: hasFullDayVacation
                                ? displaySettings.vacation?.bg_color || '#FFCCCC'
                                : day.isResearchDay
                                  ? displaySettings.research_day?.bg_color || '#FFFF99'
                                  : hasFullDaySchedule
                                    ? getEffectiveBgColor(amPmSchedules.find(s => s.schedule_type.position_am && s.schedule_type.position_pm)?.schedule_type.color, day)
                                    : undefined
                            }}
                          >
                            <span
                              className="text-[10px] sm:text-xs font-bold"
                              style={{
                                color: hasFullDayVacation
                                  ? displaySettings.vacation?.color || '#000000'
                                  : day.isResearchDay
                                    ? displaySettings.research_day?.color || '#000000'
                                    : amPmSchedules.find(s => s.schedule_type.position_am && s.schedule_type.position_pm)?.schedule_type.text_color || '#000000'
                              }}
                            >
                              {hasFullDayVacation
                                ? `${displaySettings.vacation?.label_full || '年休'}(${day.confirmedVacation!.priority || '-'})`
                                : day.isResearchDay
                                  ? displaySettings.research_day?.label || '研究日'
                                  : amPmSchedules.find(s => s.schedule_type.position_am && s.schedule_type.position_pm)?.schedule_type.display_label ||
                                    amPmSchedules.find(s => s.schedule_type.position_am && s.schedule_type.position_pm)?.schedule_type.name}
                            </span>
                          </div>
                          {/* 夜勤（AM/PM結合時） */}
                          {(() => {
                            const nightOnlySchedule = nightSchedules.find(s => !s.schedule_type.position_am && !s.schedule_type.position_pm);
                            return (
                              <div
                                className="flex-1 flex items-center justify-center"
                                style={{
                                  backgroundColor: nightOnlySchedule
                                    ? getEffectiveBgColor(nightOnlySchedule.schedule_type.color, day)
                                    : 'rgb(249 250 251 / 0.5)'
                                }}
                              >
                                {nightOnlySchedule ? (
                                  <span
                                    className="text-[10px] sm:text-xs font-bold"
                                    style={{ color: nightOnlySchedule.schedule_type.text_color || '#000000' }}
                                  >
                                    {nightOnlySchedule.schedule_type.display_label || nightOnlySchedule.schedule_type.name}
                                  </span>
                                ) : (
                                  <span className="text-[8px] sm:text-[10px] text-gray-400">夜勤</span>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}

                      {/* 通常の3分割表示 */}
                      {!showAllDay && !showFullDay && (() => {
                        const amOnlySchedule = amPmSchedules.find(s => s.schedule_type.position_am && !s.schedule_type.position_pm);
                        const pmOnlySchedule = amPmSchedules.find(s => s.schedule_type.position_pm && !s.schedule_type.position_am);
                        const nightOnlySchedule = nightSchedules.find(s => !s.schedule_type.position_am && !s.schedule_type.position_pm);

                        return (
                          <>
                            {/* 午前 */}
                            <div
                              className="flex-1 border-b border-gray-100 flex items-center justify-center"
                              style={{
                                backgroundColor: hasAMVacation
                                  ? displaySettings.vacation?.bg_color || '#FFCCCC'
                                  : amOnlySchedule
                                    ? getEffectiveBgColor(amOnlySchedule.schedule_type.color, day)
                                    : undefined
                              }}
                            >
                              {hasAMVacation ? (
                                <span
                                  className="text-[10px] sm:text-xs font-bold"
                                  style={{ color: displaySettings.vacation?.color || '#000000' }}
                                >
                                  {displaySettings.vacation?.label_full || '年休'}({day.confirmedVacation!.priority || '-'})
                                </span>
                              ) : amOnlySchedule ? (
                                <span
                                  className="text-[10px] sm:text-xs font-bold"
                                  style={{ color: amOnlySchedule.schedule_type.text_color || '#000000' }}
                                >
                                  {amOnlySchedule.schedule_type.display_label || amOnlySchedule.schedule_type.name}
                                </span>
                              ) : (
                                <span className="text-[8px] sm:text-[10px] text-gray-400">AM</span>
                              )}
                            </div>

                            {/* 午後 */}
                            <div
                              className="flex-1 border-b border-gray-100 flex items-center justify-center"
                              style={{
                                backgroundColor: hasPMVacation
                                  ? displaySettings.vacation?.bg_color || '#FFCCCC'
                                  : pmOnlySchedule
                                    ? getEffectiveBgColor(pmOnlySchedule.schedule_type.color, day)
                                    : undefined
                              }}
                            >
                              {hasPMVacation ? (
                                <span
                                  className="text-[10px] sm:text-xs font-bold"
                                  style={{ color: displaySettings.vacation?.color || '#000000' }}
                                >
                                  {displaySettings.vacation?.label_full || '年休'}({day.confirmedVacation!.priority || '-'})
                                </span>
                              ) : pmOnlySchedule ? (
                                <span
                                  className="text-[10px] sm:text-xs font-bold"
                                  style={{ color: pmOnlySchedule.schedule_type.text_color || '#000000' }}
                                >
                                  {pmOnlySchedule.schedule_type.display_label || pmOnlySchedule.schedule_type.name}
                                </span>
                              ) : (
                                <span className="text-[8px] sm:text-[10px] text-gray-400">PM</span>
                              )}
                            </div>

                            {/* 夜勤 */}
                            <div
                              className="flex-1 flex items-center justify-center"
                              style={{
                                backgroundColor: nightOnlySchedule
                                  ? getEffectiveBgColor(nightOnlySchedule.schedule_type.color, day)
                                  : 'rgb(249 250 251 / 0.5)'
                              }}
                            >
                              {nightOnlySchedule ? (
                                <span
                                  className="text-[10px] sm:text-xs font-bold"
                                  style={{ color: nightOnlySchedule.schedule_type.text_color || '#000000' }}
                                >
                                  {nightOnlySchedule.schedule_type.display_label || nightOnlySchedule.schedule_type.name}
                                </span>
                              ) : (
                                <span className="text-[8px] sm:text-[10px] text-gray-400">夜勤</span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* 予定追加モーダル */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedDate.replace(/-/g, '/')} の予定
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 既存の予定 */}
              {selectedDayData && selectedDayData.userSchedules.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">登録済みの予定</h3>
                  <ul className="space-y-2">
                    {selectedDayData.userSchedules.map(s => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded-lg"
                        style={{ backgroundColor: (s.schedule_type.color === 'transparent' ? '#f3f4f6' : s.schedule_type.color) + '20' }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ backgroundColor: getEffectiveBgColor(s.schedule_type.color, selectedDayData), color: s.schedule_type.text_color || '#000000' }}
                          >
                            {s.schedule_type.display_label || s.schedule_type.name}
                          </div>
                          <span className="font-medium text-gray-900">{s.schedule_type.name}</span>
                          <span className="text-xs text-gray-500">
                            ({s.schedule_type.position_am && 'AM'}
                            {s.schedule_type.position_am && s.schedule_type.position_pm && '/'}
                            {s.schedule_type.position_pm && 'PM'}
                            {(s.schedule_type.position_am || s.schedule_type.position_pm) && s.schedule_type.position_night && '/'}
                            {s.schedule_type.position_night && '夜勤'})
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Icons.Trash />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 予定追加 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">予定を追加</h3>
                {scheduleTypes.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    予定タイプがありません。管理画面の「予定提出設定」から追加してください。
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {scheduleTypes.map(type => {
                      const currentCount = getMonthlyScheduleCount(type.id);
                      const isLimitReached = type.monthly_limit !== null && currentCount >= type.monthly_limit;
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleAddSchedule(type.id)}
                          disabled={isLimitReached}
                          className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                            isLimitReached
                              ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div
                            className="px-2 py-0.5 rounded text-xs font-bold shrink-0"
                            style={{ backgroundColor: type.color === 'transparent' ? '#f3f4f6' : type.color, color: type.text_color || '#000000' }}
                          >
                            {type.display_label || type.name}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 text-sm truncate">{type.name}</div>
                            <div className="text-[10px] text-gray-500 flex justify-between">
                              <span>
                                {type.position_am && 'AM'}
                                {type.position_am && type.position_pm && '/'}
                                {type.position_pm && 'PM'}
                                {(type.position_am || type.position_pm) && type.position_night && '/'}
                                {type.position_night && '夜勤'}
                              </span>
                              {type.monthly_limit !== null && (
                                <span className={isLimitReached ? 'text-red-500 font-medium' : 'text-gray-400'}>
                                  {currentCount}/{type.monthly_limit}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 固定予定の表示 */}
              {selectedDayData && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">その他の予定</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {selectedDayData.isSecondment && (
                      <li className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: displaySettings.secondment?.bg_color || '#FFCC99' }}
                        ></span>
                        {displaySettings.secondment?.label || '出向'}
                      </li>
                    )}
                    {selectedDayData.isLeaveOfAbsence && (
                      <li className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: displaySettings.leave_of_absence?.bg_color || '#C0C0C0' }}
                        ></span>
                        {displaySettings.leave_of_absence?.label || '休職'}
                      </li>
                    )}
                    {selectedDayData.isResearchDay && (
                      <li className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: displaySettings.research_day?.bg_color || '#FFFF99' }}
                        ></span>
                        {displaySettings.research_day?.label || '研究日'}
                      </li>
                    )}
                    {selectedDayData.confirmedVacation && (
                      <li className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: displaySettings.vacation?.bg_color || '#FFCCCC' }}
                        ></span>
                        {displaySettings.vacation?.label_full || '年休'}({selectedDayData.confirmedVacation.period === 'full_day' ? '終日' : selectedDayData.confirmedVacation.period === 'am' ? displaySettings.vacation?.label_am || 'AM' : displaySettings.vacation?.label_pm || 'PM'})
                      </li>
                    )}
                    {selectedDayData.isHoliday && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        祝日: {selectedDayData.holidayName}
                      </li>
                    )}
                    {selectedDayData.isConference && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                        学会: {selectedDayData.conferenceName}
                      </li>
                    )}
                    {selectedDayData.isEvent && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        イベント: {selectedDayData.eventName}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
