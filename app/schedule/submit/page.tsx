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

  // 一括登録モーダル
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSchedule, setBulkSchedule] = useState({
    schedule_type_id: 0,
    start_date: "",
    end_date: "",
    weekdays: [] as number[],
  });

  // ユーザーの当直レベル
  const [userNightShiftLevel, setUserNightShiftLevel] = useState<string | null>(null);

  // データ
  const [holidaysData, setHolidaysData] = useState<Holiday[]>([]);
  const [conferencesData, setConferencesData] = useState<Conference[]>([]);
  const [eventsData, setEventsData] = useState<Event[]>([]);
  const [applicationsData, setApplicationsData] = useState<Application[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [userSchedulesData, setUserSchedulesData] = useState<(UserSchedule & { schedule_type: ScheduleType })[]>([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 一括登録対象日の計算
  const bulkTargetDates = useMemo(() => {
    if (!bulkSchedule.start_date || !bulkSchedule.end_date || bulkSchedule.weekdays.length === 0) {
      return [];
    }
    const dates: string[] = [];
    const start = new Date(bulkSchedule.start_date);
    const end = new Date(bulkSchedule.end_date);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (bulkSchedule.weekdays.includes(d.getDay())) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  }, [bulkSchedule]);

  // 一括登録可能な予定タイプのリスト（システム予約 + カスタム）
  const bulkScheduleTypeOptions = useMemo(() => {
    const options: { id: number; name: string; color: string; text_color: string }[] = [];

    // システム予約タイプを追加
    if (systemScheduleTypes.research_day) {
      options.push({
        id: systemScheduleTypes.research_day.id,
        name: displaySettings.research_day?.label || '研究日',
        color: displaySettings.research_day?.bg_color || '#FFFF99',
        text_color: displaySettings.research_day?.color || '#000000',
      });
    }
    if (systemScheduleTypes.secondment) {
      options.push({
        id: systemScheduleTypes.secondment.id,
        name: displaySettings.secondment?.label || '出向',
        color: displaySettings.secondment?.bg_color || '#FFCC99',
        text_color: displaySettings.secondment?.color || '#000000',
      });
    }
    if (systemScheduleTypes.leave_of_absence) {
      options.push({
        id: systemScheduleTypes.leave_of_absence.id,
        name: displaySettings.leave_of_absence?.label || '休職',
        color: displaySettings.leave_of_absence?.bg_color || '#C0C0C0',
        text_color: displaySettings.leave_of_absence?.color || '#000000',
      });
    }

    // カスタム予定タイプを追加
    scheduleTypes.forEach(t => {
      options.push({
        id: t.id,
        name: t.name,
        color: t.color === 'transparent' ? '#f3f4f6' : t.color,
        text_color: t.text_color || '#000000',
      });
    });

    return options;
  }, [systemScheduleTypes, scheduleTypes, displaySettings]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth() + 1);
  };

  // 一括登録モーダルを開く
  const openBulkModal = () => {
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    setBulkSchedule({
      schedule_type_id: 0,
      start_date: monthStart,
      end_date: monthEnd,
      weekdays: [],
    });
    setShowBulkModal(true);
  };

  // 曜日の選択/解除
  const toggleWeekday = (weekday: number) => {
    setBulkSchedule(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(weekday)
        ? prev.weekdays.filter(w => w !== weekday)
        : [...prev.weekdays, weekday],
    }));
  };

  // 一括登録処理
  const handleBulkAdd = async () => {
    if (!bulkSchedule.schedule_type_id) {
      alert("予定タイプを選択してください");
      return;
    }
    if (bulkTargetDates.length === 0) {
      alert("対象日がありません。期間と曜日を選択してください");
      return;
    }
    if (!user) return;

    try {
      // DBから既存予定を直接取得（同じ予定タイプのもの）
      const { data: existingSchedules } = await supabase
        .from("user_schedule")
        .select("schedule_date")
        .eq("staff_id", user.staff_id)
        .eq("schedule_type_id", bulkSchedule.schedule_type_id)
        .gte("schedule_date", bulkSchedule.start_date)
        .lte("schedule_date", bulkSchedule.end_date);

      const existingDates = (existingSchedules || []).map(s => s.schedule_date);

      // 予定タイプの情報を取得
      const scheduleType = bulkScheduleTypeOptions.find(t => t.id === bulkSchedule.schedule_type_id);
      const fullScheduleType = [...scheduleTypes, ...Object.values(systemScheduleTypes).filter(Boolean)]
        .find(t => t?.id === bulkSchedule.schedule_type_id);

      const insertData = bulkTargetDates
        .filter(date => !existingDates.includes(date))
        .map(date => ({
          staff_id: user.staff_id,
          schedule_date: date,
          schedule_type_id: bulkSchedule.schedule_type_id,
          work_location_id: (fullScheduleType as ScheduleType)?.default_work_location_id || null,
        }));

      const skippedCount = bulkTargetDates.length - insertData.length;

      if (insertData.length === 0) {
        alert("すべての日付に既に予定が登録されています");
        return;
      }

      const { error } = await supabase.from("user_schedule").insert(insertData);

      if (error) {
        alert("登録に失敗しました: " + error.message);
      } else {
        const message = skippedCount > 0
          ? `${insertData.length}件登録しました（${skippedCount}件は既存予定のためスキップ）`
          : `${insertData.length}件登録しました`;
        alert(message);
        setShowBulkModal(false);
        fetchData(user.staff_id);
      }
    } catch (err) {
      console.error("Error in bulk add:", err);
      alert("一括登録に失敗しました");
    }
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

    // カスタム予定タイプとシステム予定タイプの両方から検索
    const scheduleType = scheduleTypes.find(t => t.id === typeId)
      || Object.values(systemScheduleTypes).find(t => t?.id === typeId);
    if (!scheduleType) return;

    // 回数制限チェック（システム予定タイプには適用しない）
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

    // 年休との重複チェック
    if (selectedDayData.confirmedVacation) {
      const vacationPeriod = selectedDayData.confirmedVacation.period;
      const vacationPositions = {
        am: vacationPeriod === 'full_day' || vacationPeriod === 'am',
        pm: vacationPeriod === 'full_day' || vacationPeriod === 'pm',
        night: false,  // 年休は夜勤には影響しない
      };

      const hasVacationOverlap =
        (newPositions.am && vacationPositions.am) ||
        (newPositions.pm && vacationPositions.pm);

      if (hasVacationOverlap) {
        const overlappingParts: string[] = [];
        if (newPositions.am && vacationPositions.am) overlappingParts.push('AM');
        if (newPositions.pm && vacationPositions.pm) overlappingParts.push('PM');

        alert(`「年休」と${overlappingParts.join('/')}が重複しています。\n年休をキャンセルしてから追加してください。`);
        return;
      }
    }

    // 既存の予定の勤務帯を取得（すべての予定を対象）
    const existingSchedules = selectedDayData.userSchedules;

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
    setSelectedDate(date);
    setShowModal(true);
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

            {/* 直近5ヶ月タブ + 一括登録ボタン */}
            <div className="flex justify-center items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
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
              <button
                onClick={openBulkModal}
                disabled={isLocked}
                className={`ml-2 px-3 py-1 sm:py-1.5 rounded-lg whitespace-nowrap text-xs sm:text-sm font-medium transition-all flex items-center gap-1
                  ${isLocked
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'
                  }`}
              >
                <Icons.Plus />
                一括登録
              </button>
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

                return (
                  <div
                    key={day.date}
                    onClick={() => handleDateClick(day.date)}
                    className={`min-h-[90px] sm:min-h-[110px] rounded-lg flex flex-col overflow-hidden transition-all ${
                      isLocked
                        ? 'cursor-default border border-gray-200'
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

              {/* 研究日・出向中・休職中を追加 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">研究日・出向中・休職中</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {systemScheduleTypes.research_day && (
                    <button
                      onClick={() => handleAddSchedule(systemScheduleTypes.research_day!.id)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: displaySettings.research_day?.bg_color || '#FFFF99', color: displaySettings.research_day?.color || '#000000' }}
                      >
                        {displaySettings.research_day?.label || '研究日'}
                      </div>
                      <span className="text-[9px] text-gray-500">AM/PM</span>
                    </button>
                  )}
                  {systemScheduleTypes.secondment && (
                    <button
                      onClick={() => handleAddSchedule(systemScheduleTypes.secondment!.id)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: displaySettings.secondment?.bg_color || '#FFCC99', color: displaySettings.secondment?.color || '#000000' }}
                      >
                        {displaySettings.secondment?.label || '出向'}
                      </div>
                      <span className="text-[9px] text-gray-500">終日</span>
                    </button>
                  )}
                  {systemScheduleTypes.leave_of_absence && (
                    <button
                      onClick={() => handleAddSchedule(systemScheduleTypes.leave_of_absence!.id)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ backgroundColor: displaySettings.leave_of_absence?.bg_color || '#C0C0C0', color: displaySettings.leave_of_absence?.color || '#000000' }}
                      >
                        {displaySettings.leave_of_absence?.label || '休職'}
                      </div>
                      <span className="text-[9px] text-gray-500">終日</span>
                    </button>
                  )}
                </div>
              </div>

              {/* カスタム予定を追加 */}
              {scheduleTypes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">その他の予定</h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    {scheduleTypes.map(type => {
                      const currentCount = getMonthlyScheduleCount(type.id);
                      const isLimitReached = type.monthly_limit !== null && currentCount >= type.monthly_limit;
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleAddSchedule(type.id)}
                          disabled={isLimitReached}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                            isLimitReached
                              ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ backgroundColor: type.color === 'transparent' ? '#f3f4f6' : type.color, color: type.text_color || '#000000' }}
                          >
                            {type.display_label || type.name}
                          </div>
                          <div className="text-[9px] text-gray-500 text-center">
                            {type.position_am && 'AM'}
                            {type.position_am && type.position_pm && '/'}
                            {type.position_pm && 'PM'}
                            {(type.position_am || type.position_pm) && type.position_night && '/'}
                            {type.position_night && '夜勤'}
                          </div>
                          {type.monthly_limit !== null && (
                            <div className={`text-[9px] ${isLimitReached ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              {currentCount}/{type.monthly_limit}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

      {/* 一括登録モーダル */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">一括予定登録</h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 予定タイプ選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  予定タイプ <span className="text-red-500">*</span>
                </label>
                <select
                  value={bulkSchedule.schedule_type_id}
                  onChange={(e) => setBulkSchedule(prev => ({ ...prev, schedule_type_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value={0}>選択してください</option>
                  {bulkScheduleTypeOptions.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 期間選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期間 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={bulkSchedule.start_date}
                    onChange={(e) => setBulkSchedule(prev => ({ ...prev, start_date: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                  <span className="text-gray-500">〜</span>
                  <input
                    type="date"
                    value={bulkSchedule.end_date}
                    onChange={(e) => setBulkSchedule(prev => ({ ...prev, end_date: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              {/* 曜日選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  曜日 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1">
                  {WEEKDAYS.map((w) => (
                    <button
                      key={w.value}
                      onClick={() => toggleWeekday(w.value)}
                      className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        bulkSchedule.weekdays.includes(w.value)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 対象日数表示 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  対象日数: <span className="font-bold text-purple-600">{bulkTargetDates.length}日</span>
                </p>
                {bulkTargetDates.length > 0 && bulkTargetDates.length <= 10 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {bulkTargetDates.map(d => d.slice(5).replace(/-/g, '/')).join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleBulkAdd}
                disabled={!bulkSchedule.schedule_type_id || bulkTargetDates.length === 0}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  !bulkSchedule.schedule_type_id || bulkTargetDates.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                登録
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
