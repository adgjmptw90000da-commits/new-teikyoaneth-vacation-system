// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { DisplaySettings, Database } from "@/lib/database.types";

type NameListConfig = Database["public"]["Tables"]["name_list_config"]["Row"];

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

interface MemberData {
  staff_id: string;
  name: string;
  team: 'A' | 'B';
  display_order: number;
  researchDay: number | null;
  isFirstYear: boolean;
  isSecondment: boolean;
  leaveOfAbsence: { start_date: string; end_date: string }[];
  schedules: { [date: string]: any[] };
  shifts: { [date: string]: any[] };
  vacations: { [date: string]: any };
  nightShiftLevel: string | null;
  workLocations: { [date: string]: number };
}

interface WorkLocation {
  id: number;
  name: string;
  display_label: string | null;
  color: string;
  text_color: string | null;
  is_default_weekday: boolean;
  is_default_holiday: boolean;
}

interface Holiday {
  id: number;
  holiday_date: string;
  name: string;
}

interface DayData {
  date: string;
  day: number;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
}

interface SnapshotData {
  members: MemberData[];
  holidays: Holiday[];
  displaySettings: DisplaySettings;
  workLocationMaster?: WorkLocation[];
  generatedAt: string;
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
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function ScheduleViewPage() {
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

  // データ
  const [members, setMembers] = useState<MemberData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [workLocationMaster, setWorkLocationMaster] = useState<WorkLocation[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [nameListConfigs, setNameListConfigs] = useState<NameListConfig[]>([]);

  // A/B表切り替え
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');

  // メインタブ切り替え（予定表/名前一覧表）
  const [mainTab, setMainTab] = useState<'schedule' | 'nameList'>('schedule');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    fetchData();
  }, [router, currentYear, currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // schedule_publishと非表示メンバー、名前一覧設定を同時に取得
      const [
        { data: publishData, error },
        { data: hiddenMembersData },
        { data: nameListConfigsData },
      ] = await Promise.all([
        supabase
          .from("schedule_publish")
          .select("*")
          .eq("year", currentYear)
          .eq("month", currentMonth)
          .single(),
        supabase.from("schedule_hidden_members").select("staff_id"),
        supabase.from("name_list_config").select("*").eq("is_active", true).order("display_order"),
      ]);

      setNameListConfigs(nameListConfigsData || []);

      // 非表示メンバーのSetを作成
      const hiddenMemberIds = new Set(hiddenMembersData?.map(h => h.staff_id) || []);

      if (error || !publishData || !publishData.is_published) {
        // 未公開
        setIsPublished(false);
        setMembers([]);
        setHolidays([]);
        setPublishedAt(null);
      } else {
        // 公開済み - スナップショットからデータを復元
        setIsPublished(true);
        setPublishedAt(publishData.published_at);

        const snapshot = publishData.snapshot_data as SnapshotData;
        if (snapshot) {
          // 非表示メンバーを除外
          const visibleMembers = (snapshot.members || []).filter(m => !hiddenMemberIds.has(m.staff_id));
          setMembers(visibleMembers);
          setHolidays(snapshot.holidays || []);
          setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...snapshot.displaySettings });
          setWorkLocationMaster(snapshot.workLocationMaster || []);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setIsPublished(false);
    } finally {
      setLoading(false);
    }
  };

  // 日付データを生成
  const daysData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(date).getDay();
      const holiday = holidays.find(h => h.holiday_date === date);

      days.push({
        date,
        day,
        dayOfWeek,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
      });
    }

    return days;
  }, [currentYear, currentMonth, holidays]);

  // 休職期間内かチェック
  const isDateInLeaveOfAbsence = (date: string, leaves: { start_date: string; end_date: string }[]): boolean => {
    return leaves.some(leave => date >= leave.start_date && date <= leave.end_date);
  };

  // 名前一覧計算: 指定された日付と設定に対して該当する人の名前リストを取得
  const calculateNameList = (day: DayData, config: NameListConfig): string[] => {
    return members
      .filter(member => {
        // 出向中・休職中は除外
        if (member.isSecondment) return false;
        if (isDateInLeaveOfAbsence(day.date, member.leaveOfAbsence)) return false;

        // 対象のシフト/予定があるかチェック
        const schedules = member.schedules[day.date] || [];
        const shifts = member.shifts[day.date] || [];

        // 勤務時間帯フィルタの確認
        const checkPeriod = (am: boolean, pm: boolean, night: boolean) => {
          if (config.target_period_am && am) return true;
          if (config.target_period_pm && pm) return true;
          if (config.target_period_night && night) return true;
          return false;
        };

        // 予定タイプチェック
        if (config.target_schedule_type_ids && config.target_schedule_type_ids.length > 0) {
          for (const schedule of schedules) {
            if (config.target_schedule_type_ids.includes(schedule.schedule_type_id)) {
              // schedule_type がある場合はそれを使用、なければ全時間帯をtrue扱い
              const hasAm = schedule.schedule_type?.position_am ?? true;
              const hasPm = schedule.schedule_type?.position_pm ?? true;
              const hasNight = schedule.schedule_type?.position_night ?? false;
              if (checkPeriod(hasAm, hasPm, hasNight)) {
                return true;
              }
            }
          }
        }

        // シフトタイプチェック
        if (config.target_shift_type_ids && config.target_shift_type_ids.length > 0) {
          for (const shift of shifts) {
            if (config.target_shift_type_ids.includes(shift.shift_type_id)) {
              const hasAm = shift.shift_type?.position_am ?? false;
              const hasPm = shift.shift_type?.position_pm ?? false;
              const hasNight = shift.shift_type?.position_night ?? true;
              if (checkPeriod(hasAm, hasPm, hasNight)) {
                return true;
              }
            }
          }
        }

        return false;
      })
      .map(member => member.name);
  };

  // セルの内容を取得（当直可否は計算しない）
  const getCellContent = (date: string, member: MemberData, dayOfWeek: number, isHoliday: boolean) => {
    // 出向中
    if (member.isSecondment) {
      return { type: 'secondment', am: null, pm: null, night: null, amPmMerged: false, allMerged: false };
    }

    // 休職中
    if (isDateInLeaveOfAbsence(date, member.leaveOfAbsence)) {
      return { type: 'leave', am: null, pm: null, night: null, amPmMerged: false, allMerged: false };
    }

    const schedules = member.schedules[date] || [];
    const vacation = member.vacations[date];

    // 研究日判定
    const isResearchDay = member.researchDay !== null &&
      dayOfWeek === member.researchDay &&
      !isHoliday &&
      dayOfWeek !== 0;

    // AM/PM/夜勤の予定を分類
    let amContent: { label: string; color: string; bgColor?: string } | null = null;
    let pmContent: { label: string; color: string; bgColor?: string } | null = null;
    let nightContent: { label: string; color: string; bgColor?: string } | null = null;
    let amPmMerged = false;
    let allMerged = false;

    // 研究日（AM+PM結合）
    if (isResearchDay) {
      const researchSettings = displaySettings.research_day;
      const label = member.isFirstYear
        ? (researchSettings?.label_first_year || '外勤')
        : (researchSettings?.label || '研究日');
      const color = researchSettings?.color || '#000000';
      const bgColor = researchSettings?.bg_color || '#FFFF00';
      amContent = { label, color, bgColor };
      pmContent = { label, color, bgColor };
      amPmMerged = true;
    }

    // 年休
    if (vacation) {
      const onePersonnelStatus = vacation.one_personnel_status || 'not_applied';
      const priorityDisplay = vacation.priority ?? vacation.level;

      let color: string;
      let bgColor: string;
      let labelPrefix: string;

      if (onePersonnelStatus === 'kensanbi') {
        const kensanbiSettings = displaySettings.kensanbi_used;
        color = kensanbiSettings?.color || '#000000';
        bgColor = kensanbiSettings?.bg_color || '#99FF99';
        labelPrefix = kensanbiSettings?.label || '研鑽日';
      } else if (onePersonnelStatus === 'applied') {
        const appliedSettings = displaySettings.vacation_applied;
        const vacationSettings = displaySettings.vacation;
        color = appliedSettings?.color || '#000000';
        bgColor = appliedSettings?.bg_color || '#99CCFF';
        labelPrefix = vacation.period === 'full_day'
          ? (vacationSettings?.label_full || '年休')
          : vacation.period === 'am'
            ? (vacationSettings?.label_am || 'AM')
            : (vacationSettings?.label_pm || 'PM');
      } else {
        const vacationSettings = displaySettings.vacation;
        color = vacationSettings?.color || '#000000';
        bgColor = vacationSettings?.bg_color || '#FFCCCC';
        labelPrefix = vacation.period === 'full_day'
          ? (vacationSettings?.label_full || '年休')
          : vacation.period === 'am'
            ? (vacationSettings?.label_am || 'AM')
            : (vacationSettings?.label_pm || 'PM');
      }

      const label = onePersonnelStatus === 'kensanbi'
        ? labelPrefix
        : `${labelPrefix}${priorityDisplay}`;

      if (vacation.period === 'full_day') {
        amContent = { label, color, bgColor };
        pmContent = { label, color, bgColor };
        amPmMerged = true;
      } else if (vacation.period === 'am') {
        amContent = { label, color, bgColor };
      } else if (vacation.period === 'pm') {
        pmContent = { label, color, bgColor };
      }
    }

    // カスタム予定
    schedules.forEach(s => {
      const scheduleType = s.schedule_type;
      if (!scheduleType) return;

      const label = scheduleType.display_label || scheduleType.name;
      const textColor = scheduleType.text_color || '#000000';
      const bgColor = scheduleType.color;
      const hasAm = scheduleType.position_am;
      const hasPm = scheduleType.position_pm;
      const hasNight = scheduleType.position_night;

      if (hasAm && hasPm && hasNight && !amContent && !pmContent && !nightContent) {
        amContent = { label, color: textColor, bgColor };
        pmContent = { label, color: textColor, bgColor };
        nightContent = { label, color: textColor, bgColor };
        allMerged = true;
        amPmMerged = true;
      } else if (hasAm && hasPm && !amContent && !pmContent) {
        amContent = { label, color: textColor, bgColor };
        pmContent = { label, color: textColor, bgColor };
        amPmMerged = true;
        if (hasNight && !nightContent) {
          nightContent = { label, color: textColor, bgColor };
        }
      } else {
        if (hasAm && !amContent) {
          amContent = { label, color: textColor, bgColor };
        }
        if (hasPm && !pmContent) {
          pmContent = { label, color: textColor, bgColor };
        }
        if (hasNight && !nightContent) {
          nightContent = { label, color: textColor, bgColor };
        }
      }
    });

    // シフト
    const shifts = member.shifts[date] || [];
    shifts.forEach(s => {
      const shiftType = s.shift_type;
      if (!shiftType) return;

      const label = shiftType.display_label || shiftType.name;
      const textColor = shiftType.text_color || '#000000';
      const bgColor = shiftType.color;
      const hasAm = shiftType.position_am;
      const hasPm = shiftType.position_pm;
      const hasNight = shiftType.position_night;

      if (hasAm && hasPm && hasNight && !amContent && !pmContent && !nightContent) {
        amContent = { label, color: textColor, bgColor };
        pmContent = { label, color: textColor, bgColor };
        nightContent = { label, color: textColor, bgColor };
        allMerged = true;
        amPmMerged = true;
      } else if (hasAm && hasPm && !amContent && !pmContent) {
        amContent = { label, color: textColor, bgColor };
        pmContent = { label, color: textColor, bgColor };
        amPmMerged = true;
        if (hasNight && !nightContent) {
          nightContent = { label, color: textColor, bgColor };
        }
      } else {
        if (hasAm && !amContent) {
          amContent = { label, color: textColor, bgColor };
        }
        if (hasPm && !pmContent) {
          pmContent = { label, color: textColor, bgColor };
        }
        if (hasNight && !nightContent) {
          nightContent = { label, color: textColor, bgColor };
        }
      }
    });

    // AM/PMが同じ内容・色なら結合
    if (amContent && pmContent && amContent.label === pmContent.label && amContent.color === pmContent.color) {
      amPmMerged = true;
    }

    // AM/PM/夜勤すべて同じなら3セル結合
    if (amContent && pmContent && nightContent &&
        amContent.label === pmContent.label && amContent.label === nightContent.label &&
        amContent.color === pmContent.color && amContent.color === nightContent.color &&
        amContent.bgColor === pmContent.bgColor && amContent.bgColor === nightContent.bgColor) {
      allMerged = true;
      amPmMerged = true;
    }

    return { type: 'normal', am: amContent, pm: pmContent, night: nightContent, amPmMerged, allMerged };
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth() + 1);
  };

  const getRowBackgroundColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) return "bg-red-50";
    if (day.dayOfWeek === 6) return "bg-blue-50";
    return "bg-white";
  };

  const getDateTextColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) return "text-red-600";
    if (day.dayOfWeek === 6) return "text-blue-600";
    return "text-gray-900";
  };

  // セルのデフォルト背景色（予定がないとき）- 勤務場所マスタの色を使用
  const getCellDefaultBgColor = (day: DayData, member?: MemberData): string => {
    // メンバーが指定されている場合、その日の勤務場所をチェック
    if (member && member.workLocations) {
      const workLocationId = member.workLocations[day.date];
      if (workLocationId) {
        const workLocation = workLocationMaster.find(wl => wl.id === workLocationId);
        if (workLocation) {
          return workLocation.color;
        }
      }
    }

    // デフォルト勤務場所の色を取得
    if (day.isHoliday || day.dayOfWeek === 0) {
      // 休日デフォルト
      const holidayDefault = workLocationMaster.find(wl => wl.is_default_holiday);
      if (holidayDefault) return holidayDefault.color;
      return "#C0C0C0"; // フォールバック
    }

    // 平日デフォルト
    const weekdayDefault = workLocationMaster.find(wl => wl.is_default_weekday);
    if (weekdayDefault) return weekdayDefault.color;
    return "#CCFFFF"; // フォールバック
  };

  // 背景色を取得（transparentの場合はデフォルト背景色を使用）
  const getEffectiveBgColor = (bgColor: string | undefined, day: DayData, member?: MemberData): string => {
    if (!bgColor || bgColor === 'transparent') {
      return getCellDefaultBgColor(day, member);
    }
    return bgColor;
  };

  // 選択されたチームのメンバーをフィルター
  const filteredMembers = useMemo(() => {
    return members
      .filter(m => m.team === selectedTeam)
      .sort((a, b) => {
        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
        return a.staff_id.localeCompare(b.staff_id);
      });
  }, [members, selectedTeam]);

  const teamACount = members.filter(m => m.team === 'A').length;
  const teamBCount = members.filter(m => m.team === 'B').length;

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
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="戻る"
              >
                <Icons.ChevronLeft />
              </button>
              <div className="bg-teal-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                予定表
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

      <main className="max-w-full mx-auto py-4 px-4 sm:px-6 lg:px-8">
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
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tabMonth}月
                  </button>
                );
              })}
            </div>

            {/* A/B表切り替え（名前一覧表では非表示） */}
            {isPublished && mainTab !== 'nameList' && (
              <div className="flex justify-center gap-2 pt-4 border-t border-gray-200 mt-4">
                <span className="text-sm font-medium text-gray-900 self-center mr-2">表示:</span>
                <button
                  onClick={() => setSelectedTeam('A')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedTeam === 'A'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  A表 ({teamACount}名)
                </button>
                <button
                  onClick={() => setSelectedTeam('B')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedTeam === 'B'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  B表 ({teamBCount}名)
                </button>
              </div>
            )}

            {/* 公開日時表示 */}
            {isPublished && publishedAt && (
              <div className="text-center text-xs text-gray-900 mt-2">
                最終更新: {new Date(publishedAt).toLocaleString('ja-JP')}
              </div>
            )}

            {/* メインタブ切り替え（予定表/名前一覧表） */}
            {isPublished && (
              <div className="flex justify-center gap-2 pt-4 border-t border-gray-200 mt-4">
                <button
                  onClick={() => setMainTab('schedule')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    mainTab === 'schedule'
                      ? 'bg-gray-800 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  予定表
                </button>
                <button
                  onClick={() => setMainTab('nameList')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    mainTab === 'nameList'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  名前一覧表
                </button>
              </div>
            )}
          </div>

          {/* 未公開メッセージ */}
          {!isPublished && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Icons.Calendar />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">
                {currentYear}年{currentMonth}月の予定表はまだ公開されていません
              </h3>
              <p className="text-sm text-gray-900">
                管理者が予定表をアップロードするまでお待ちください
              </p>
            </div>
          )}

          {/* 予定表タブ */}
          {isPublished && mainTab === 'schedule' && (
            <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="border-collapse table-fixed w-auto">
                  <thead>
                    {/* メンバー名ヘッダー */}
                    <tr className="bg-gray-100">
                      <th className="sticky left-0 z-20 bg-gray-100 border border-black px-2 py-2 text-[10px] font-bold text-gray-700 w-16">
                        日付
                      </th>
                      {filteredMembers.map(member => (
                        <th
                          key={member.staff_id}
                          colSpan={3}
                          className="border-y border-black border-l border-l-black border-r border-r-black px-0 py-1 text-[9px] font-bold text-gray-700 text-center w-[78px] min-w-[78px] max-w-[78px]"
                        >
                          <span className="truncate block">{member.name}</span>
                        </th>
                      ))}
                      {/* 右側日付列ヘッダー */}
                      <th
                        className="sticky right-0 z-20 bg-gray-100 border border-black px-2 py-2 text-[10px] font-bold text-gray-700 w-16"
                      >
                        日付
                      </th>
                    </tr>
                    {/* AM/PM/夜勤 サブヘッダー */}
                    <tr className="bg-gray-50">
                      <th className="sticky left-0 z-20 bg-gray-50 border border-black px-2 py-1 text-[8px] text-gray-900"></th>
                      {filteredMembers.map((member, idx) => (
                        <React.Fragment key={`sub-${member.staff_id}`}>
                          <th className={`border-y border-black border-l ${idx === 0 ? 'border-l-black' : 'border-l-black'} border-r border-r-gray-300 px-0 py-0.5 text-[8px] text-gray-900 w-[26px] min-w-[26px] max-w-[26px]`}>AM</th>
                          <th className="border-y border-black border-r border-r-gray-300 px-0 py-0.5 text-[8px] text-gray-900 w-[26px] min-w-[26px] max-w-[26px]">PM</th>
                          <th className="border-y border-black border-r border-r-black px-0 py-0.5 text-[8px] text-gray-900 w-[26px] min-w-[26px] max-w-[26px]">夜</th>
                        </React.Fragment>
                      ))}
                      {/* 右側日付列（空） */}
                      <th className="sticky right-0 z-20 bg-gray-50 border border-black px-2 py-1 text-[8px] text-gray-900"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysData.map(day => (
                      <tr key={day.date} className={getRowBackgroundColor(day)}>
                        {/* 日付列 */}
                        <td className={`sticky left-0 z-10 border border-black px-2 py-1 text-[10px] font-bold ${getRowBackgroundColor(day)} ${getDateTextColor(day)}`}>
                          <div className="flex items-center gap-1">
                            <span>{day.day}</span>
                            <span className="text-[9px]">{WEEKDAYS[day.dayOfWeek]}</span>
                          </div>
                          {day.isHoliday && (
                            <div className="text-[7px] text-red-500 truncate max-w-[50px]">{day.holidayName}</div>
                          )}
                        </td>
                        {/* メンバーごとのセル */}
                        {filteredMembers.map(member => {
                          const content = getCellContent(day.date, member, day.dayOfWeek, day.isHoliday);

                          // 出向中・休職中の場合
                          if (content.type === 'secondment' || content.type === 'leave') {
                            const settings = content.type === 'secondment'
                              ? displaySettings.secondment
                              : displaySettings.leave_of_absence;
                            const label = settings?.label || (content.type === 'secondment' ? '出向' : '休職');
                            const textColor = settings?.color || (content.type === 'secondment' ? '#B45309' : '#4B5563');
                            const bgColor = settings?.bg_color || (content.type === 'secondment' ? '#FEF3C7' : '#E5E7EB');

                            return (
                              <td
                                key={`${day.date}-${member.staff_id}`}
                                colSpan={3}
                                className="border-y border-black border-l border-l-black border-r border-r-black px-0.5 py-1 text-center"
                                style={{ backgroundColor: bgColor }}
                              >
                                <span
                                  className="text-[9px] font-bold"
                                  style={{ color: textColor }}
                                >
                                  {label}
                                </span>
                              </td>
                            );
                          }

                          // AM/PM/夜勤すべて結合の場合
                          if (content.allMerged && content.am) {
                            return (
                              <td
                                key={`${day.date}-${member.staff_id}`}
                                colSpan={3}
                                className="border-y border-black border-l border-l-black border-r border-r-black px-0.5 py-1 text-center"
                                style={{ backgroundColor: getEffectiveBgColor(content.am.bgColor, day, member) }}
                              >
                                <span
                                  className="text-[9px] font-bold"
                                  style={{ color: content.am.color }}
                                >
                                  {content.am.label}
                                </span>
                              </td>
                            );
                          }

                          // AM/PM結合の場合
                          if (content.amPmMerged && content.am) {
                            return (
                              <React.Fragment key={`${day.date}-${member.staff_id}`}>
                                {/* AM+PM 結合セル */}
                                <td
                                  colSpan={2}
                                  className="border-y border-black border-l border-l-black border-r border-r-gray-300 px-0 py-1 text-center overflow-hidden"
                                  style={{ backgroundColor: getEffectiveBgColor(content.am.bgColor, day, member) }}
                                >
                                  <span
                                    className="text-[9px] font-bold whitespace-nowrap"
                                    style={{ color: content.am.color }}
                                  >
                                    {content.am.label}
                                  </span>
                                </td>
                                {/* 夜勤（◯×なし） */}
                                <td
                                  className="border-y border-black border-r border-r-black px-0 py-1 text-center w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                                  style={{ backgroundColor: content.night ? getEffectiveBgColor(content.night.bgColor, day, member) : getCellDefaultBgColor(day, member) }}
                                >
                                  {content.night && (
                                    <span
                                      className="text-[9px] font-bold whitespace-nowrap"
                                      style={{ color: content.night.color }}
                                    >
                                      {content.night.label}
                                    </span>
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          }

                          // 通常の3セル表示
                          return (
                            <React.Fragment key={`${day.date}-${member.staff_id}`}>
                              {/* AM セル */}
                              <td
                                className="border-y border-black border-l border-l-black border-r border-r-gray-300 px-0 py-1 text-center w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                                style={{ backgroundColor: content.am ? getEffectiveBgColor(content.am.bgColor, day, member) : getCellDefaultBgColor(day, member) }}
                              >
                                {content.am && (
                                  <span
                                    className="text-[9px] font-bold whitespace-nowrap"
                                    style={{ color: content.am.color }}
                                  >
                                    {content.am.label}
                                  </span>
                                )}
                              </td>
                              {/* PM セル */}
                              <td
                                className="border-y border-black border-r border-r-gray-300 px-0 py-1 text-center w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                                style={{ backgroundColor: content.pm ? getEffectiveBgColor(content.pm.bgColor, day, member) : getCellDefaultBgColor(day, member) }}
                              >
                                {content.pm && (
                                  <span
                                    className="text-[9px] font-bold whitespace-nowrap"
                                    style={{ color: content.pm.color }}
                                  >
                                    {content.pm.label}
                                  </span>
                                )}
                              </td>
                              {/* 夜勤（◯×なし） */}
                              <td
                                className="border-y border-black border-r border-r-black px-0 py-1 text-center w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                                style={{ backgroundColor: content.night ? getEffectiveBgColor(content.night.bgColor, day, member) : getCellDefaultBgColor(day, member) }}
                              >
                                {content.night && (
                                  <span
                                    className="text-[9px] font-bold whitespace-nowrap"
                                    style={{ color: content.night.color }}
                                  >
                                    {content.night.label}
                                  </span>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* 右側日付列 */}
                        <td className={`sticky right-0 z-10 border border-black px-2 py-1 text-[10px] font-bold ${getRowBackgroundColor(day)} ${getDateTextColor(day)}`}>
                          <div className="flex items-center gap-1">
                            <span>{day.day}</span>
                            <span className="text-[9px]">{WEEKDAYS[day.dayOfWeek]}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* 下側メンバー名ヘッダー行 */}
                    <tr className="bg-gray-100">
                      <td className="sticky left-0 z-20 bg-gray-100 border border-black px-2 py-2 text-[10px] font-bold text-gray-700">
                      </td>
                      {filteredMembers.map(member => (
                        <td key={`footer-name-${member.staff_id}`} colSpan={3}
                          className="border-y border-black border-l border-l-black border-r border-r-black px-0 py-1 text-[9px] font-bold text-gray-700 text-center">
                          <span className="truncate block">{member.name}</span>
                        </td>
                      ))}
                      <td className="sticky right-0 z-20 bg-gray-100 border border-black px-2 py-2 text-[10px] font-bold text-gray-700" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 名前一覧表タブ */}
          {isPublished && mainTab === 'nameList' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-cyan-500 rounded-full"></span>
                名前一覧表
              </h3>
              {nameListConfigs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs" style={{ borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-20 bg-cyan-100 border border-black px-1.5 py-1 text-center text-[10px] font-bold text-gray-800 min-w-[50px]">
                          日付
                        </th>
                        {nameListConfigs.map((config) => (
                          <th
                            key={`name-list-header-${config.id}`}
                            className="bg-cyan-100 border border-black px-1.5 py-1 text-center text-[10px] font-bold text-gray-800 min-w-[70px] whitespace-nowrap"
                          >
                            {config.display_label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daysData.map((day) => {
                        const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
                        return (
                          <tr
                            key={`name-list-row-${day.date}`}
                            className={`${day.isHoliday || day.dayOfWeek === 0 ? 'bg-red-50' : day.dayOfWeek === 6 ? 'bg-blue-50' : 'bg-white'}`}
                          >
                            <td
                              className={`sticky left-0 z-10 border border-black px-1 py-1 text-center text-[10px] font-bold whitespace-nowrap ${
                                day.isHoliday || day.dayOfWeek === 0
                                  ? 'bg-red-100 text-red-700'
                                  : day.dayOfWeek === 6
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {day.day}({weekdayNames[day.dayOfWeek]})
                            </td>
                            {nameListConfigs.map((config) => {
                              const names = calculateNameList(day, config);
                              return (
                                <td
                                  key={`name-list-cell-${day.date}-${config.id}`}
                                  className="border border-black px-1 py-1 text-[10px] text-gray-900"
                                >
                                  {names.join('、')}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th className="sticky left-0 z-20 bg-cyan-100 border border-black px-1.5 py-1 text-center text-[10px] font-bold text-gray-800 min-w-[50px]">
                          日付
                        </th>
                        {nameListConfigs.map((config) => (
                          <th
                            key={`name-list-footer-${config.id}`}
                            className="bg-cyan-100 border border-black px-1.5 py-1 text-center text-[10px] font-bold text-gray-800 min-w-[70px] whitespace-nowrap"
                          >
                            {config.display_label}
                          </th>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-900">
                  <p>名前一覧表の設定がありません。</p>
                  <p className="text-sm mt-2">管理者が「名前一覧表設定」から設定を追加してください。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
