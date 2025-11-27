// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database, DisplaySettings } from "@/lib/database.types";

// デフォルトの表示設定（12月予定表の色に合わせる - パステル調）
const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  research_day: {
    label: "研究日",
    label_first_year: "外勤",
    color: "#000000",  // 黒（文字色）
    bg_color: "#FFFF99",  // 薄い黄色（背景色）
  },
  vacation: {
    label_full: "年休",
    label_am: "AM",
    label_pm: "PM",
    color: "#000000",  // 黒（文字色）
    bg_color: "#FFCCCC",  // 薄いピンク（背景色）
  },
  vacation_applied: {
    color: "#000000",  // 黒（文字色）
    bg_color: "#99CCFF",  // 薄い青（背景色）- One人事申請済み
  },
  kensanbi_used: {
    label: "研鑽日",
    color: "#000000",  // 黒（文字色）
    bg_color: "#99FF99",  // 薄い緑（背景色）
  },
  secondment: {
    label: "出向",
    color: "#000000",  // 黒（文字色）
    bg_color: "#FFCC99",  // 薄いオレンジ（背景色）
  },
  leave_of_absence: {
    label: "休職",
    color: "#000000",  // 黒（文字色）
    bg_color: "#C0C0C0",  // グレー（背景色）
  },
};

type User = Database["public"]["Tables"]["user"]["Row"];
type Application = Database["public"]["Tables"]["application"]["Row"];
type Holiday = Database["public"]["Tables"]["holiday"]["Row"];
type ScheduleType = Database["public"]["Tables"]["schedule_type"]["Row"];
type UserSchedule = Database["public"]["Tables"]["user_schedule"]["Row"];
type ShiftType = Database["public"]["Tables"]["shift_type"]["Row"];
type UserShift = Database["public"]["Tables"]["user_shift"]["Row"];

interface MemberData {
  staff_id: string;
  name: string;
  team: 'A' | 'B';
  display_order: number;
  researchDay: number | null;
  isFirstYear: boolean;
  isSecondment: boolean;
  leaveOfAbsence: { start_date: string; end_date: string }[];
  schedules: { [date: string]: (UserSchedule & { schedule_type: ScheduleType })[] };
  shifts: { [date: string]: (UserShift & { shift_type: ShiftType })[] };
  vacations: { [date: string]: Application };
  nightShiftLevel: string | null;
}

interface DayData {
  date: string;
  day: number;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
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
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
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
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  // A/B表切り替え
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B'>('A');

  // モーダル
  const [selectedCell, setSelectedCell] = useState<{ date: string; member: MemberData } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 公開状態
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    if (!isAdmin()) {
      alert("管理者のみアクセスできます");
      router.push("/home");
      return;
    }
    fetchData();
  }, [router, currentYear, currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      const [
        { data: users },
        { data: types },
        { data: shiftTypesData },
        { data: holidaysData },
        { data: allSchedules },
        { data: allShifts },
        { data: researchDays },
        { data: secondments },
        { data: leaveData },
        { data: applications },
        { data: settingData },
        { data: publishData },
      ] = await Promise.all([
        supabase.from("user").select("staff_id, name, team, display_order, night_shift_level").order("team").order("display_order").order("staff_id"),
        supabase.from("schedule_type").select("*").order("display_order"),
        supabase.from("shift_type").select("*").order("display_order"),
        supabase.from("holiday").select("*"),
        supabase.from("user_schedule")
          .select("*, schedule_type(*)")
          .gte("schedule_date", startDate)
          .lte("schedule_date", endDate),
        supabase.from("user_shift")
          .select("*, shift_type(*)")
          .gte("shift_date", startDate)
          .lte("shift_date", endDate),
        supabase.from("user_research_day").select("*"),
        supabase.from("user_secondment")
          .select("*")
          .eq("year", currentYear)
          .eq("month", currentMonth),
        supabase.from("user_leave_of_absence").select("*"),
        supabase.from("application")
          .select("*")
          .gte("vacation_date", startDate)
          .lte("vacation_date", endDate)
          .in("status", ["after_lottery", "confirmed"]),
        supabase.from("setting").select("display_settings").single(),
        supabase.from("schedule_publish").select("*").eq("year", currentYear).eq("month", currentMonth).maybeSingle(),
      ]);

      setScheduleTypes(types || []);
      setShiftTypes(shiftTypesData || []);
      setHolidays(holidaysData || []);
      if (settingData?.display_settings) {
        setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...settingData.display_settings });
      }

      // 公開状態を設定
      if (publishData && publishData.is_published) {
        setIsPublished(true);
        setPublishedAt(publishData.published_at);
      } else {
        setIsPublished(false);
        setPublishedAt(null);
      }

      // メンバーデータを構築
      const membersData: MemberData[] = (users || []).map(user => {
        const researchDayRecord = researchDays?.find(r => r.staff_id === user.staff_id);
        const isSecondment = secondments?.some(s => s.staff_id === user.staff_id) || false;
        const userLeaves = leaveData?.filter(l => l.staff_id === user.staff_id) || [];

        // スケジュールを日付でグループ化
        const userSchedules = allSchedules?.filter(s => s.staff_id === user.staff_id) || [];
        const schedulesByDate: { [date: string]: (UserSchedule & { schedule_type: ScheduleType })[] } = {};
        userSchedules.forEach(s => {
          if (!schedulesByDate[s.schedule_date]) {
            schedulesByDate[s.schedule_date] = [];
          }
          schedulesByDate[s.schedule_date].push(s);
        });

        // シフトを日付でグループ化
        const userShifts = allShifts?.filter(s => s.staff_id === user.staff_id) || [];
        const shiftsByDate: { [date: string]: (UserShift & { shift_type: ShiftType })[] } = {};
        userShifts.forEach(s => {
          if (!shiftsByDate[s.shift_date]) {
            shiftsByDate[s.shift_date] = [];
          }
          shiftsByDate[s.shift_date].push(s);
        });

        // 年休を日付でマッピング
        const userVacations = applications?.filter(a => a.staff_id === user.staff_id) || [];
        const vacationsByDate: { [date: string]: Application } = {};
        userVacations.forEach(v => {
          vacationsByDate[v.vacation_date] = v;
        });

        return {
          staff_id: user.staff_id,
          name: user.name,
          team: user.team || 'A',
          display_order: user.display_order || 0,
          researchDay: researchDayRecord?.day_of_week ?? null,
          isFirstYear: researchDayRecord?.is_first_year ?? false,
          isSecondment,
          leaveOfAbsence: userLeaves.map(l => ({ start_date: l.start_date, end_date: l.end_date })),
          schedules: schedulesByDate,
          shifts: shiftsByDate,
          vacations: vacationsByDate,
          nightShiftLevel: user.night_shift_level || null,
        };
      });

      setMembers(membersData);
    } catch (err) {
      console.error("Error fetching data:", err);
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

  // 当直可否を計算
  const checkNightShiftAvailability = (
    date: string,
    member: MemberData,
    dayOfWeek: number,
    isHoliday: boolean
  ): boolean => {
    // 当直レベル「なし」は当直不可
    if (member.nightShiftLevel === 'なし') return false;

    // 出向中・休職中は当直不可
    if (member.isSecondment) return false;
    if (isDateInLeaveOfAbsence(date, member.leaveOfAbsence)) return false;

    // 研究日: 当直不可
    const isResearchDay = member.researchDay !== null &&
      dayOfWeek === member.researchDay &&
      !isHoliday &&
      dayOfWeek !== 0;

    if (isResearchDay) return false;

    // 年休チェック
    const vacation = member.vacations[date];
    if (vacation) {
      if (vacation.period === 'full_day' || vacation.period === 'pm') {
        return false;
      }
    }

    // カスタム予定の当日制約
    const schedules = member.schedules[date] || [];
    for (const s of schedules) {
      if (!s.schedule_type.same_day_night_shift) {
        return false;
      }
    }

    // 翌日の予定による制約
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const nextDayOfWeek = nextDate.getDay();
    const nextHoliday = holidays.find(h => h.holiday_date === nextDateStr);

    // 翌日が研究日
    const nextIsResearchDay = member.researchDay !== null &&
      nextDayOfWeek === member.researchDay &&
      !nextHoliday &&
      nextDayOfWeek !== 0;
    if (nextIsResearchDay) return false;

    // 翌日が年休
    const nextVacation = member.vacations[nextDateStr];
    if (nextVacation) return false;

    // 翌日のカスタム予定
    const nextSchedules = member.schedules[nextDateStr] || [];
    for (const s of nextSchedules) {
      if (!s.schedule_type.prev_day_night_shift) {
        return false;
      }
    }

    return true;
  };

  // セルの内容を取得
  const getCellContent = (date: string, member: MemberData, dayOfWeek: number, isHoliday: boolean) => {
    // 出向中
    if (member.isSecondment) {
      return { type: 'secondment', am: null, pm: null, night: null, amPmMerged: false, allMerged: false, canNightShift: false };
    }

    // 休職中
    if (isDateInLeaveOfAbsence(date, member.leaveOfAbsence)) {
      return { type: 'leave', am: null, pm: null, night: null, amPmMerged: false, allMerged: false, canNightShift: false };
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
    let amPmMerged = false; // AM/PM結合表示フラグ
    let allMerged = false; // AM/PM/夜勤すべて結合フラグ

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

    // 年休（ステータスに応じて表示を変更）
    if (vacation) {
      const onePersonnelStatus = vacation.one_personnel_status || 'not_applied';
      const priorityDisplay = vacation.priority ?? vacation.level;

      let color: string;
      let bgColor: string;
      let labelPrefix: string;

      if (onePersonnelStatus === 'kensanbi') {
        // 研鑽日
        const kensanbiSettings = displaySettings.kensanbi_used;
        color = kensanbiSettings?.color || '#000000';
        bgColor = kensanbiSettings?.bg_color || '#99FF99';
        labelPrefix = kensanbiSettings?.label || '研鑽日';
      } else if (onePersonnelStatus === 'applied') {
        // One人事申請済み（ラベルは年休のまま、色だけ変更）
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
        // 未申請（従来通り）
        const vacationSettings = displaySettings.vacation;
        color = vacationSettings?.color || '#000000';
        bgColor = vacationSettings?.bg_color || '#FFCCCC';
        labelPrefix = vacation.period === 'full_day'
          ? (vacationSettings?.label_full || '年休')
          : vacation.period === 'am'
            ? (vacationSettings?.label_am || 'AM')
            : (vacationSettings?.label_pm || 'PM');
      }

      // 研鑽日の場合は番号なしで「研鑽日」と表示、それ以外は番号付き
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
      const label = s.schedule_type.display_label || s.schedule_type.name;
      const textColor = s.schedule_type.text_color || '#000000';
      const bgColor = s.schedule_type.color;
      const hasAm = s.schedule_type.position_am;
      const hasPm = s.schedule_type.position_pm;
      const hasNight = s.schedule_type.position_night;

      // AM+PM+夜勤すべての予定は3セル結合
      if (hasAm && hasPm && hasNight && !amContent && !pmContent && !nightContent) {
        amContent = { label, color: textColor, bgColor };
        pmContent = { label, color: textColor, bgColor };
        nightContent = { label, color: textColor, bgColor };
        allMerged = true;
        amPmMerged = true;
      } else if (hasAm && hasPm && !amContent && !pmContent) {
        // AM+PM両方の予定は結合表示
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

    // シフト（管理者が割り当てたもの）
    const shifts = member.shifts[date] || [];
    shifts.forEach(s => {
      const label = s.shift_type.display_label || s.shift_type.name;
      const textColor = s.shift_type.text_color || '#000000';
      const bgColor = s.shift_type.color;
      const hasAm = s.shift_type.position_am;
      const hasPm = s.shift_type.position_pm;
      const hasNight = s.shift_type.position_night;

      // AM+PM+夜勤すべてのシフトは3セル結合
      if (hasAm && hasPm && hasNight && !amContent && !pmContent && !nightContent) {
        amContent = { label, color: textColor, bgColor };
        pmContent = { label, color: textColor, bgColor };
        nightContent = { label, color: textColor, bgColor };
        allMerged = true;
        amPmMerged = true;
      } else if (hasAm && hasPm && !amContent && !pmContent) {
        // AM+PM両方のシフトは結合表示
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

    // AM/PM/夜勤すべて同じ内容・色なら3セル結合
    if (amContent && pmContent && nightContent &&
        amContent.label === pmContent.label && amContent.label === nightContent.label &&
        amContent.color === pmContent.color && amContent.color === nightContent.color &&
        amContent.bgColor === pmContent.bgColor && amContent.bgColor === nightContent.bgColor) {
      allMerged = true;
      amPmMerged = true;
    }

    const canNightShift = checkNightShiftAvailability(date, member, dayOfWeek, isHoliday);

    return { type: 'normal', am: amContent, pm: pmContent, night: nightContent, amPmMerged, allMerged, canNightShift };
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth() + 1);
  };

  // 予定表をアップロード（公開）
  const handleUpload = async () => {
    if (!confirm(`${currentYear}年${currentMonth}月の予定表をアップロードしますか？\n\n一般ユーザーがこの月の予定表を閲覧できるようになります。`)) {
      return;
    }

    setIsUploading(true);
    try {
      const currentUser = getUser();
      // スナップショットデータを作成
      const snapshotData = {
        members,
        holidays,
        displaySettings,
        generatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("schedule_publish")
        .upsert({
          year: currentYear,
          month: currentMonth,
          is_published: true,
          published_at: new Date().toISOString(),
          published_by_staff_id: currentUser?.staff_id || null,
          snapshot_data: snapshotData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'year,month',
        });

      if (error) {
        alert("アップロードに失敗しました: " + error.message);
      } else {
        setIsPublished(true);
        setPublishedAt(new Date().toISOString());
        alert("予定表をアップロードしました。一般ユーザーが閲覧できるようになりました。");
      }
    } catch (err) {
      console.error("Error uploading:", err);
      alert("エラーが発生しました");
    } finally {
      setIsUploading(false);
    }
  };

  // 予定表を非公開にする
  const handleUnpublish = async () => {
    if (!confirm(`${currentYear}年${currentMonth}月の予定表を非公開にしますか？\n\n一般ユーザーはこの月の予定表を閲覧できなくなります。`)) {
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from("schedule_publish")
        .update({
          is_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq("year", currentYear)
        .eq("month", currentMonth);

      if (error) {
        alert("非公開化に失敗しました: " + error.message);
      } else {
        setIsPublished(false);
        setPublishedAt(null);
        alert("予定表を非公開にしました。");
      }
    } catch (err) {
      console.error("Error unpublishing:", err);
      alert("エラーが発生しました");
    } finally {
      setIsUploading(false);
    }
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

  // セルのデフォルト背景色（予定がないとき）- パステル調
  const getCellDefaultBgColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) return "#C0C0C0"; // 日曜・祝日は薄いグレー
    return "#CCFFFF"; // それ以外は薄い水色
  };

  // 背景色を取得（transparentの場合はデフォルト背景色を使用）
  const getEffectiveBgColor = (bgColor: string | undefined, day: DayData): string => {
    if (!bgColor || bgColor === 'transparent') {
      return getCellDefaultBgColor(day);
    }
    return bgColor;
  };

  // 予定追加
  const handleAddSchedule = async (typeId: number) => {
    if (!selectedCell) return;

    try {
      const { error } = await supabase.from("user_schedule").insert({
        staff_id: selectedCell.member.staff_id,
        schedule_date: selectedCell.date,
        schedule_type_id: typeId,
      });

      if (error) {
        alert("予定の追加に失敗しました: " + error.message);
      } else {
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error adding schedule:", err);
    }
  };

  // 予定削除
  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      const { error } = await supabase.from("user_schedule").delete().eq("id", scheduleId);

      if (error) {
        alert("予定の削除に失敗しました: " + error.message);
      } else {
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
    }
  };

  // シフト追加
  const handleAddShift = async (typeId: number) => {
    if (!selectedCell) return;

    try {
      const { error } = await supabase.from("user_shift").insert({
        staff_id: selectedCell.member.staff_id,
        shift_date: selectedCell.date,
        shift_type_id: typeId,
      });

      if (error) {
        alert("シフトの追加に失敗しました: " + error.message);
      } else {
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error adding shift:", err);
    }
  };

  // シフト削除
  const handleDeleteShift = async (shiftId: number) => {
    try {
      const { error } = await supabase.from("user_shift").delete().eq("id", shiftId);

      if (error) {
        alert("シフトの削除に失敗しました: " + error.message);
      } else {
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting shift:", err);
    }
  };

  // セルクリック
  const handleCellClick = (date: string, member: MemberData) => {
    setSelectedCell({ date, member });
    setShowModal(true);
  };

  // 選択されたセルの詳細情報
  const selectedCellDetails = useMemo(() => {
    if (!selectedCell) return null;

    const day = daysData.find(d => d.date === selectedCell.date);
    if (!day) return null;

    const content = getCellContent(selectedCell.date, selectedCell.member, day.dayOfWeek, day.isHoliday);
    const schedules = selectedCell.member.schedules[selectedCell.date] || [];
    const shifts = selectedCell.member.shifts[selectedCell.date] || [];
    const vacation = selectedCell.member.vacations[selectedCell.date];

    const isResearchDay = selectedCell.member.researchDay !== null &&
      day.dayOfWeek === selectedCell.member.researchDay &&
      !day.isHoliday &&
      day.dayOfWeek !== 0;

    return {
      ...content,
      schedules,
      shifts,
      vacation,
      isResearchDay,
      day,
    };
  }, [selectedCell, daysData]);

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
              <div className="bg-teal-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                予定一覧
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* アップロード/非公開ボタン */}
              {isPublished ? (
                <button
                  onClick={handleUnpublish}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUploading ? '処理中...' : '非公開にする'}
                </button>
              ) : (
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUploading ? '処理中...' : '予定表をアップロード'}
                </button>
              )}
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
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {currentYear}年{currentMonth}月
                </h2>
                {/* 公開状態バッジ */}
                <div className="mt-1">
                  {isPublished ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      公開中
                      {publishedAt && (
                        <span className="text-green-600 ml-1">
                          ({new Date(publishedAt).toLocaleDateString('ja-JP')})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      未公開
                    </span>
                  )}
                </div>
              </div>
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
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tabMonth}月
                  </button>
                );
              })}
            </div>

            {/* A/B表切り替え */}
            <div className="flex justify-center gap-2 pt-4 border-t border-gray-200 mt-4">
              <span className="text-sm font-medium text-gray-600 self-center mr-2">表示:</span>
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
          </div>

          {/* テーブル */}
          <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="border-collapse table-fixed w-auto">
                <thead>
                  {/* メンバー名ヘッダー */}
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 z-20 bg-gray-100 border border-black px-2 py-2 text-xs font-bold text-gray-700 w-16">
                      日付
                    </th>
                    {filteredMembers.map(member => (
                      <th
                        key={member.staff_id}
                        colSpan={3}
                        className="border border-black px-0 py-1 text-[10px] font-bold text-gray-700 text-center w-[78px] min-w-[78px] max-w-[78px]"
                      >
                        <span className="truncate block">{member.name}</span>
                      </th>
                    ))}
                  </tr>
                  {/* AM/PM/夜勤 サブヘッダー */}
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-20 bg-gray-50 border border-black px-2 py-1 text-[10px] text-gray-500"></th>
                    {filteredMembers.map(member => (
                      <React.Fragment key={`sub-${member.staff_id}`}>
                        <th className="border border-black px-0 py-0.5 text-[9px] text-gray-500 w-[26px] min-w-[26px] max-w-[26px]">AM</th>
                        <th className="border border-black px-0 py-0.5 text-[9px] text-gray-500 w-[26px] min-w-[26px] max-w-[26px]">PM</th>
                        <th className="border border-black px-0 py-0.5 text-[9px] text-gray-500 w-[26px] min-w-[26px] max-w-[26px]">夜</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysData.map(day => (
                    <tr key={day.date} className={getRowBackgroundColor(day)}>
                      {/* 日付列 */}
                      <td className={`sticky left-0 z-10 border border-black px-2 py-1 text-xs font-bold ${getRowBackgroundColor(day)} ${getDateTextColor(day)}`}>
                        <div className="flex items-center gap-1">
                          <span>{day.day}</span>
                          <span className="text-[10px]">{WEEKDAYS[day.dayOfWeek]}</span>
                        </div>
                        {day.isHoliday && (
                          <div className="text-[8px] text-red-500 truncate max-w-[50px]">{day.holidayName}</div>
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
                              onClick={() => handleCellClick(day.date, member)}
                              className="border border-black px-0.5 py-1 text-center cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: bgColor }}
                            >
                              <span
                                className="text-[10px] font-bold"
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
                              onClick={() => handleCellClick(day.date, member)}
                              className="border border-black px-0.5 py-1 text-center cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: getEffectiveBgColor(content.am.bgColor, day) }}
                            >
                              <span
                                className="text-[10px] font-bold"
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
                                onClick={() => handleCellClick(day.date, member)}
                                className="border border-black px-0 py-1 text-center cursor-pointer hover:opacity-80 overflow-hidden"
                                style={{ backgroundColor: getEffectiveBgColor(content.am.bgColor, day) }}
                              >
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: content.am.color }}
                                >
                                  {content.am.label}
                                </span>
                              </td>
                              {/* 夜勤 + 当直可否 */}
                              <td
                                onClick={() => handleCellClick(day.date, member)}
                                className="border border-black px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                                style={{ backgroundColor: content.night ? getEffectiveBgColor(content.night.bgColor, day) : getCellDefaultBgColor(day) }}
                              >
                                {content.night ? (
                                  <span
                                    className="text-[10px] font-bold whitespace-nowrap"
                                    style={{ color: content.night.color }}
                                  >
                                    {content.night.label}
                                  </span>
                                ) : (
                                  <span className={`text-sm font-bold ${content.canNightShift ? 'text-green-500' : 'text-red-400'}`}>
                                    {content.canNightShift ? '○' : '×'}
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
                              onClick={() => handleCellClick(day.date, member)}
                              className="border border-black px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                              style={{ backgroundColor: content.am ? getEffectiveBgColor(content.am.bgColor, day) : getCellDefaultBgColor(day) }}
                            >
                              {content.am && (
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: content.am.color }}
                                >
                                  {content.am.label}
                                </span>
                              )}
                            </td>
                            {/* PM セル */}
                            <td
                              onClick={() => handleCellClick(day.date, member)}
                              className="border border-black px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                              style={{ backgroundColor: content.pm ? getEffectiveBgColor(content.pm.bgColor, day) : getCellDefaultBgColor(day) }}
                            >
                              {content.pm && (
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: content.pm.color }}
                                >
                                  {content.pm.label}
                                </span>
                              )}
                            </td>
                            {/* 夜勤 + 当直可否 */}
                            <td
                              onClick={() => handleCellClick(day.date, member)}
                              className="border border-black px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                              style={{ backgroundColor: content.night ? getEffectiveBgColor(content.night.bgColor, day) : getCellDefaultBgColor(day) }}
                            >
                              {content.night ? (
                                <span
                                  className="text-[10px] font-bold whitespace-nowrap"
                                  style={{ color: content.night.color }}
                                >
                                  {content.night.label}
                                </span>
                              ) : (
                                <span className={`text-sm font-bold ${content.canNightShift ? 'text-green-500' : 'text-red-400'}`}>
                                  {content.canNightShift ? '○' : '×'}
                                </span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* 編集モーダル */}
      {showModal && selectedCell && selectedCellDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedCell.date.replace(/-/g, '/')}（{WEEKDAYS[selectedCellDetails.day.dayOfWeek]}） - {selectedCell.member.name}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 現在の状態 */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">現在の予定</h3>
                <ul className="space-y-2">
                  {selectedCellDetails.type === 'secondment' && (
                    <li className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">出向中</li>
                  )}
                  {selectedCellDetails.type === 'leave' && (
                    <li className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">休職中</li>
                  )}
                  {selectedCellDetails.isResearchDay && (
                    <li className="text-sm text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg">
                      {selectedCell.member.isFirstYear ? '外勤(院内)' : '研究日'}
                    </li>
                  )}
                  {selectedCellDetails.vacation && (
                    <li className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      年休 レベル{selectedCellDetails.vacation.level}（{selectedCellDetails.vacation.period === 'full_day' ? '終日' : selectedCellDetails.vacation.period === 'am' ? 'AM' : 'PM'}）
                    </li>
                  )}
                  {selectedCellDetails.schedules.map(s => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ backgroundColor: s.schedule_type.color + '20' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.schedule_type.color }}
                        />
                        <span className="text-sm font-medium">{s.schedule_type.name}</span>
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
                  {selectedCellDetails.shifts.map(s => (
                    <li
                      key={`shift-${s.id}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ backgroundColor: s.shift_type.color + '20' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.shift_type.color }}
                        />
                        <span className="text-sm font-medium">{s.shift_type.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">シフト</span>
                        <span className="text-xs text-gray-500">
                          ({s.shift_type.position_am && 'AM'}
                          {s.shift_type.position_am && s.shift_type.position_pm && '/'}
                          {s.shift_type.position_pm && 'PM'}
                          {(s.shift_type.position_am || s.shift_type.position_pm) && s.shift_type.position_night && '/'}
                          {s.shift_type.position_night && '夜勤'})
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteShift(s.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Icons.Trash />
                      </button>
                    </li>
                  ))}
                  {selectedCellDetails.schedules.length === 0 && selectedCellDetails.shifts.length === 0 && !selectedCellDetails.vacation && !selectedCellDetails.isResearchDay && selectedCellDetails.type === 'normal' && (
                    <li className="text-sm text-gray-500">予定なし</li>
                  )}
                </ul>
              </div>

              {/* 当直可否 */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">当直:</span>
                  <span className={`text-lg font-bold ${selectedCellDetails.canNightShift ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedCellDetails.canNightShift ? '○ 可能' : '× 不可'}
                  </span>
                </div>
              </div>

              {/* 予定追加 */}
              {selectedCellDetails.type === 'normal' && scheduleTypes.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">予定を追加</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {scheduleTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => handleAddSchedule(type.id)}
                        className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-xs font-medium text-gray-900 truncate">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* シフト追加 */}
              {selectedCellDetails.type === 'normal' && shiftTypes.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">シフトを追加</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {shiftTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => handleAddShift(type.id)}
                        className="flex items-center gap-2 p-2 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all text-left bg-blue-50"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-xs font-medium text-gray-900 truncate">{type.name}</span>
                      </button>
                    ))}
                  </div>
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
