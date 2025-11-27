// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

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

  // 研究日設定
  const [researchDay, setResearchDay] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 出向中設定
  const [isSecondment, setIsSecondment] = useState(false);

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

  // モーダル
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');

  // 初期ロード完了フラグ（設定の自動保存を防ぐため）
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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
        { data: researchDayData },
        { data: secondmentData },
        { data: leaveData },
        { data: userData },
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
        supabase.from("user_research_day")
          .select("*")
          .eq("staff_id", staffId)
          .single(),
        supabase.from("user_secondment")
          .select("*")
          .eq("staff_id", staffId)
          .eq("year", currentYear)
          .eq("month", currentMonth)
          .single(),
        supabase.from("user_leave_of_absence")
          .select("*")
          .eq("staff_id", staffId),
        supabase.from("user")
          .select("night_shift_level")
          .eq("staff_id", staffId)
          .single(),
      ]);

      setHolidaysData(holidays || []);
      setConferencesData(conferences || []);
      setEventsData(events || []);
      setApplicationsData(applications || []);
      setScheduleTypes(types || []);
      setUserSchedulesData(userSchedules || []);
      setLeaveOfAbsenceData(leaveData || []);

      // 研究日設定を復元
      if (researchDayData) {
        setResearchDay(researchDayData.day_of_week);
      } else {
        setResearchDay(null);
      }

      // 出向中設定を復元
      setIsSecondment(!!secondmentData);

      // ユーザーの当直レベルを設定
      setUserNightShiftLevel(userData?.night_shift_level || null);

      // 初期ロード完了
      setInitialLoadComplete(true);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 研究日設定を保存
  const saveResearchDaySetting = async () => {
    if (!user) return;

    try {
      // 既存のデータを削除
      await supabase.from("user_research_day").delete().eq("staff_id", user.staff_id);

      // 新しいデータを挿入
      if (researchDay !== null) {
        await supabase.from("user_research_day").insert({
          staff_id: user.staff_id,
          day_of_week: researchDay,
          is_first_year: false,
        });
      }
    } catch (err) {
      console.error("Error saving research day setting:", err);
    }
  };

  // 研究日設定が変更されたら保存（初期ロード完了後のみ）
  useEffect(() => {
    if (user && initialLoadComplete) {
      saveResearchDaySetting();
    }
  }, [researchDay, user, initialLoadComplete]);

  // 出向中設定を保存
  const saveSecondmentSetting = async () => {
    if (!user) return;

    try {
      // 既存のデータを削除
      await supabase.from("user_secondment")
        .delete()
        .eq("staff_id", user.staff_id)
        .eq("year", currentYear)
        .eq("month", currentMonth);

      // 出向中の場合は挿入
      if (isSecondment) {
        await supabase.from("user_secondment").insert({
          staff_id: user.staff_id,
          year: currentYear,
          month: currentMonth,
        });
      }
    } catch (err) {
      console.error("Error saving secondment setting:", err);
    }
  };

  // 出向中設定が変更されたら保存（初期ロード完了後のみ）
  useEffect(() => {
    if (user && initialLoadComplete) {
      saveSecondmentSetting();
    }
  }, [isSecondment, user, currentYear, currentMonth, initialLoadComplete]);

  // 休職期間を追加
  const handleAddLeaveOfAbsence = async () => {
    if (!user || !leaveStartDate || !leaveEndDate) return;

    if (leaveStartDate > leaveEndDate) {
      alert("開始日は終了日より前に設定してください");
      return;
    }

    try {
      const { error } = await supabase.from("user_leave_of_absence").insert({
        staff_id: user.staff_id,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
      });

      if (error) {
        alert("休職期間の追加に失敗しました: " + error.message);
      } else {
        setShowLeaveModal(false);
        setLeaveStartDate('');
        setLeaveEndDate('');
        fetchData(user.staff_id);
      }
    } catch (err) {
      console.error("Error adding leave of absence:", err);
    }
  };

  // 休職期間を削除
  const handleDeleteLeaveOfAbsence = async (startDate: string, endDate: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("user_leave_of_absence")
        .delete()
        .eq("staff_id", user.staff_id)
        .eq("start_date", startDate)
        .eq("end_date", endDate);

      if (error) {
        alert("休職期間の削除に失敗しました: " + error.message);
      } else {
        fetchData(user.staff_id);
      }
    } catch (err) {
      console.error("Error deleting leave of absence:", err);
    }
  };

  // 特定の日が休職期間内かどうかをチェック
  const isDateInLeaveOfAbsence = (date: string): boolean => {
    return leaveOfAbsenceData.some(leave => {
      return date >= leave.start_date && date <= leave.end_date;
    });
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
    //    - AM: 当日当直可
    if (vacation) {
      if (vacation.period === 'full_day' || vacation.period === 'pm') {
        return false;
      }
      // AM年休: 当直可
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

      // 出向中・休職中判定
      const isSecondmentForDate = isSecondment;
      const isLeaveOfAbsenceForDate = isDateInLeaveOfAbsence(date);

      // 研究日判定（祝日・日曜は除く、出向中・休職中は除く）
      const isResearchDayForDate = researchDay !== null &&
        dayOfWeek === researchDay &&
        !holiday &&
        dayOfWeek !== 0 &&
        !isSecondmentForDate &&
        !isLeaveOfAbsenceForDate;

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
  }, [currentYear, currentMonth, holidaysData, conferencesData, eventsData, applicationsData, researchDay, userSchedulesData, isSecondment, leaveOfAbsenceData, userNightShiftLevel]);

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

  const getVacationColor = (level: number, status: string) => {
    if (status === "confirmed") {
      if (level === 1) return "bg-red-600 text-white";
      if (level === 2) return "bg-blue-600 text-white";
      return "bg-green-600 text-white";
    }
    if (level === 1) return "bg-[#ffb3c8] text-red-900";
    if (level === 2) return "bg-blue-100 text-blue-800";
    return "bg-[#e0ffe0] text-green-900";
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
    if (!user || !selectedDate) return;

    // 回数制限チェック
    const scheduleType = scheduleTypes.find(t => t.id === typeId);
    if (scheduleType?.monthly_limit) {
      const currentCount = getMonthlyScheduleCount(typeId);
      if (currentCount >= scheduleType.monthly_limit) {
        alert(`「${scheduleType.name}」は月${scheduleType.monthly_limit}回までです。\n現在: ${currentCount}回`);
        return;
      }
    }

    try {
      const { error } = await supabase.from("user_schedule").insert({
        staff_id: user.staff_id,
        schedule_date: selectedDate,
        schedule_type_id: typeId,
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
    setSelectedDate(date);
    setShowModal(true);
  };

  // 選択された日のデータ
  const selectedDayData = selectedDate ? daysData.find(d => d.date === selectedDate) : null;

  if (loading) {
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
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                予定提出
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showSettings ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icons.Settings />
                設定
              </button>
              <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Icons.Home />
                ホーム
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 設定パネル */}
          {showSettings && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">研究日設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    研究日の曜日
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setResearchDay(null)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        researchDay === null
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      なし
                    </button>
                    {WEEKDAYS.filter(w => w.value >= 1 && w.value <= 5).map((w) => (
                      <button
                        key={w.value}
                        onClick={() => setResearchDay(w.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          researchDay === w.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {w.label}曜日
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <p className="font-medium mb-1">当直制約ルール:</p>
                  <ul className="space-y-1 ml-2">
                    <li>• 研究日: 前日当直×、当日当直×、翌日当直○</li>
                    <li>• 年休(終日/PM): 前日当直×、当日当直×、翌日当直○</li>
                    <li>• 年休(AM): 前日当直×、当日当直○、翌日当直○</li>
                  </ul>
                </div>
              </div>

              {/* 出向中設定 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">出向中設定</h3>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSecondment}
                      onChange={(e) => setIsSecondment(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">
                    {currentYear}年{currentMonth}月は出向中
                  </span>
                </div>
                {isSecondment && (
                  <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                    この月は全て「出向中」として表示され、当直は全て不可になります。
                  </p>
                )}
              </div>

              {/* 休職期間設定 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">休職期間</h3>
                {leaveOfAbsenceData.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {leaveOfAbsenceData.map((leave, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">
                          {leave.start_date.replace(/-/g, '/')} 〜 {leave.end_date.replace(/-/g, '/')}
                        </span>
                        <button
                          onClick={() => handleDeleteLeaveOfAbsence(leave.start_date, leave.end_date)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Icons.Trash />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <Icons.Plus />
                  休職期間を追加
                </button>
              </div>
            </div>
          )}

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
                const tabDate = new Date();
                tabDate.setMonth(tabDate.getMonth() + offset);
                const tabYear = tabDate.getFullYear();
                const tabMonth = tabDate.getMonth() + 1;
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

          {/* 凡例 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icons.Info />
              <p className="font-bold text-xs text-gray-900">凡例</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200">日曜・祝日</span>
              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200">土曜</span>
              <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded border border-orange-200">主要学会</span>
              <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded border border-purple-200">イベント</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded border border-green-300">年休</span>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded border border-indigo-300">研究日</span>
              <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded border border-amber-300">出向中</span>
              <span className="px-2 py-1 bg-gray-300 text-gray-700 rounded border border-gray-400">休職中</span>
              <span className="px-2 py-1 bg-white text-green-600 rounded border border-gray-200 font-bold">○当直可</span>
              <span className="px-2 py-1 bg-white text-red-600 rounded border border-gray-200 font-bold">×当直不可</span>
            </div>
          </div>

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

                // ユーザースケジュール（AM/PM配置のもの）
                const amPmSchedules = day.userSchedules.filter(s => s.schedule_type.position_am || s.schedule_type.position_pm);
                const nightSchedules = day.userSchedules.filter(s => s.schedule_type.position_night);

                // AM/PM全体に表示するか
                const hasFullDaySchedule = amPmSchedules.some(s => s.schedule_type.position_am && s.schedule_type.position_pm);
                const showFullDay = day.isResearchDay || hasFullDayVacation || hasFullDaySchedule || day.isSecondment || day.isLeaveOfAbsence;

                return (
                  <div
                    key={day.date}
                    onClick={() => handleDateClick(day.date)}
                    className={`min-h-[90px] sm:min-h-[110px] rounded-lg flex flex-col overflow-hidden border border-gray-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all ${
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
                      {/* 出向中（全体表示） */}
                      {day.isSecondment && (
                        <div className="absolute inset-0 flex items-center justify-center bg-amber-200">
                          <span className="text-[10px] sm:text-xs font-bold text-amber-800">
                            出向中
                          </span>
                        </div>
                      )}

                      {/* 休職中（全体表示） */}
                      {day.isLeaveOfAbsence && !day.isSecondment && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                          <span className="text-[10px] sm:text-xs font-bold text-gray-700">
                            休職中
                          </span>
                        </div>
                      )}

                      {/* 研究日（AM/PM全体に表示） */}
                      {day.isResearchDay && !hasVacation && amPmSchedules.length === 0 && !day.isSecondment && !day.isLeaveOfAbsence && (
                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100 border-b border-gray-100" style={{ bottom: '33%' }}>
                          <span className="text-[10px] sm:text-xs font-bold text-indigo-800">
                            研究日
                          </span>
                        </div>
                      )}

                      {/* 終日年休（AM/PM全体に表示） */}
                      {hasFullDayVacation && (
                        <div className={`absolute inset-0 flex items-center justify-center ${getVacationColor(day.confirmedVacation!.level, day.confirmedVacation!.status)}`} style={{ bottom: '33%' }}>
                          <span className="text-[10px] sm:text-xs font-bold">
                            年休({day.confirmedVacation!.priority || '-'})
                          </span>
                        </div>
                      )}

                      {/* カスタム予定（AM/PM全体表示） */}
                      {!day.isResearchDay && !hasVacation && hasFullDaySchedule && (
                        <div
                          className="absolute inset-0 flex items-center justify-center border-b border-gray-100"
                          style={{ bottom: '33%', backgroundColor: getEffectiveBgColor(amPmSchedules[0].schedule_type.color, day) }}
                        >
                          <span className="text-[10px] sm:text-xs font-bold" style={{ color: amPmSchedules[0].schedule_type.text_color || '#000000' }}>
                            {amPmSchedules[0].schedule_type.display_label || amPmSchedules[0].schedule_type.name}
                          </span>
                        </div>
                      )}

                      {/* 通常の3分割表示 */}
                      {!showFullDay && (
                        <>
                          {/* 午前 */}
                          <div className={`flex-1 px-1 py-0.5 border-b border-gray-100 flex items-center justify-between ${hasAMVacation ? getVacationColor(day.confirmedVacation!.level, day.confirmedVacation!.status) : ''}`}>
                            <span className={`text-[8px] sm:text-[10px] ${hasAMVacation ? '' : 'text-gray-400'}`}>AM</span>
                            {hasAMVacation && (
                              <span className="text-[8px] sm:text-[10px] font-bold">
                                年休({day.confirmedVacation!.priority || '-'})
                              </span>
                            )}
                            {!hasAMVacation && amPmSchedules.filter(s => s.schedule_type.position_am && !s.schedule_type.position_pm).map(s => (
                              <span
                                key={s.id}
                                className="text-[8px] sm:text-[10px] font-bold px-1 rounded"
                                style={{ backgroundColor: getEffectiveBgColor(s.schedule_type.color, day), color: s.schedule_type.text_color || '#000000' }}
                              >
                                {s.schedule_type.display_label || s.schedule_type.name}
                              </span>
                            ))}
                          </div>

                          {/* 午後 */}
                          <div className={`flex-1 px-1 py-0.5 border-b border-gray-100 flex items-center justify-between ${hasPMVacation ? getVacationColor(day.confirmedVacation!.level, day.confirmedVacation!.status) : ''}`}>
                            <span className={`text-[8px] sm:text-[10px] ${hasPMVacation ? '' : 'text-gray-400'}`}>PM</span>
                            {hasPMVacation && (
                              <span className="text-[8px] sm:text-[10px] font-bold">
                                年休({day.confirmedVacation!.priority || '-'})
                              </span>
                            )}
                            {!hasPMVacation && amPmSchedules.filter(s => s.schedule_type.position_pm && !s.schedule_type.position_am).map(s => (
                              <span
                                key={s.id}
                                className="text-[8px] sm:text-[10px] font-bold px-1 rounded"
                                style={{ backgroundColor: getEffectiveBgColor(s.schedule_type.color, day), color: s.schedule_type.text_color || '#000000' }}
                              >
                                {s.schedule_type.display_label || s.schedule_type.name}
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 研究日・終日年休・終日予定時のダミースペース */}
                      {showFullDay && (
                        <>
                          <div className="flex-1 border-b border-gray-100 opacity-0"></div>
                          <div className="flex-1 border-b border-gray-100 opacity-0"></div>
                        </>
                      )}

                      {/* 夜勤 */}
                      <div className="flex-1 px-1 py-0.5 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-[8px] sm:text-[10px] text-gray-400">夜勤</span>
                        {nightSchedules.map(s => (
                          <span
                            key={s.id}
                            className="text-[8px] sm:text-[10px] font-bold px-1 rounded"
                            style={{ backgroundColor: getEffectiveBgColor(s.schedule_type.color, day), color: s.schedule_type.text_color || '#000000' }}
                          >
                            {s.schedule_type.display_label || s.schedule_type.name}
                          </span>
                        ))}
                      </div>
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
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        出向中
                      </li>
                    )}
                    {selectedDayData.isLeaveOfAbsence && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        休職中
                      </li>
                    )}
                    {selectedDayData.isResearchDay && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        研究日
                      </li>
                    )}
                    {selectedDayData.confirmedVacation && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-600"></span>
                        年休({selectedDayData.confirmedVacation.period === 'full_day' ? '終日' : selectedDayData.confirmedVacation.period === 'am' ? 'AM' : 'PM'})
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

      {/* 休職期間追加モーダル */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">休職期間を追加</h2>
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveStartDate('');
                  setLeaveEndDate('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>

              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                休職期間中の日は全て「休職中」として表示され、当直は全て不可になります。
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveStartDate('');
                  setLeaveEndDate('');
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddLeaveOfAbsence}
                disabled={!leaveStartDate || !leaveEndDate}
                className="flex-1 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
