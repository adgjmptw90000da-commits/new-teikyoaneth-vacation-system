// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
type WorkLocation = Database["public"]["Tables"]["work_location"]["Row"];
type UserWorkLocation = Database["public"]["Tables"]["user_work_location"]["Row"];
type CountConfig = Database["public"]["Tables"]["count_config"]["Row"];
type MemberCountConfig = Database["public"]["Tables"]["member_count_config"]["Row"];
type ScoreConfig = Database["public"]["Tables"]["score_config"]["Row"];
type ShiftAssignPreset = Database["public"]["Tables"]["shift_assign_preset"]["Row"];
type DutyAssignPreset = Database["public"]["Tables"]["duty_assign_preset"]["Row"];
type NameListConfig = Database["public"]["Tables"]["name_list_config"]["Row"];

// 除外フィルターの型定義
type TargetDay = 'same_day' | 'prev_day' | 'next_day';
type VacationPeriod = 'full_day' | 'am' | 'pm';
type TimePeriod = 'am' | 'pm' | 'night';

interface DateBasedExclusionFilter {
  type: 'date_based';
  target_days: TargetDay[];
  exclude_shift_type_ids: number[];
  exclude_schedule_type_ids: number[];
  exclude_vacation: boolean;
  exclude_vacation_periods: VacationPeriod[];
}

interface WorkLocationBasedExclusionFilter {
  type: 'work_location_based';
  target_days: TargetDay[];
  target_periods: TimePeriod[];
  exclude_work_location_ids: number[];
}

type ExclusionFilter = DateBasedExclusionFilter | WorkLocationBasedExclusionFilter;

interface MemberData {
  staff_id: string;
  name: string;
  team: 'A' | 'B';
  display_order: number;
  position: '常勤' | '非常勤' | 'ローテーター' | '研修医';
  researchDay: number | null;
  isFirstYear: boolean;
  isSecondment: boolean;
  leaveOfAbsence: { start_date: string; end_date: string }[];
  schedules: { [date: string]: (UserSchedule & { schedule_type: ScheduleType })[] };
  shifts: { [date: string]: (UserShift & { shift_type: ShiftType })[] };
  vacations: { [date: string]: Application };
  nightShiftLevel: string | null;
  workLocations: { [date: string]: number }; // date -> work_location_id
  can_cardiac: boolean;
  can_obstetric: boolean;
  can_icu: boolean;
  can_remaining_duty: boolean;
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
  const [workLocationMaster, setWorkLocationMaster] = useState<WorkLocation[]>([]);

  // カウント設定
  const [countConfigs, setCountConfigs] = useState<CountConfig[]>([]);
  const [showCountConfigModal, setShowCountConfigModal] = useState(false);
  const [editingCountConfig, setEditingCountConfig] = useState<CountConfig | null>(null);
  const [newCountConfig, setNewCountConfig] = useState<{
    name: string;
    display_label: string;
    is_active: boolean;
    target_schedule_type_ids: number[];
    target_shift_type_ids: number[];
    target_work_location_ids: number[];
    target_special_types: string[];
    target_period_am: boolean;
    target_period_pm: boolean;
    target_period_night: boolean;
    filter_teams: string[];
    filter_night_shift_levels: string[];
    filter_positions: string[];
    filter_can_cardiac: boolean | null;
    filter_can_obstetric: boolean | null;
    filter_can_icu: boolean | null;
  }>({
    name: '',
    display_label: '',
    is_active: true,
    target_schedule_type_ids: [],
    target_shift_type_ids: [],
    target_work_location_ids: [],
    target_special_types: [],
    target_period_am: true,
    target_period_pm: true,
    target_period_night: true,
    filter_teams: [],
    filter_night_shift_levels: [],
    filter_positions: [],
    filter_can_cardiac: null,
    filter_can_obstetric: null,
    filter_can_icu: null,
  });

  // メンバー別カウント設定
  const [memberCountConfigs, setMemberCountConfigs] = useState<MemberCountConfig[]>([]);
  const [editingMemberCountConfig, setEditingMemberCountConfig] = useState<MemberCountConfig | null>(null);
  const [newMemberCountConfig, setNewMemberCountConfig] = useState<{
    name: string;
    display_label: string;
    is_active: boolean;
    target_schedule_type_ids: number[];
    target_shift_type_ids: number[];
    filter_day_of_weeks: number[];
    include_holiday: boolean;
    include_pre_holiday: boolean;
  }>({
    name: '',
    display_label: '',
    is_active: true,
    target_schedule_type_ids: [],
    target_shift_type_ids: [],
    filter_day_of_weeks: [],
    include_holiday: false,
    include_pre_holiday: false,
  });
  const [countConfigTab, setCountConfigTab] = useState<'date' | 'member'>('date');

  // 得点設定
  const [scoreConfigs, setScoreConfigs] = useState<ScoreConfig[]>([]);
  const [showScoreConfigModal, setShowScoreConfigModal] = useState(false);
  const [editingScoreConfig, setEditingScoreConfig] = useState<ScoreConfig | null>(null);
  const [newScoreConfig, setNewScoreConfig] = useState<{
    name: string;
    is_active: boolean;
    target_shift_type_ids: number[];
    filter_day_of_weeks: number[];
    include_holiday: boolean;
    include_pre_holiday: boolean;
    exclude_holiday: boolean;
    exclude_pre_holiday: boolean;
    points: number;
  }>({
    name: '',
    is_active: true,
    target_shift_type_ids: [],
    filter_day_of_weeks: [],
    include_holiday: false,
    include_pre_holiday: false,
    exclude_holiday: false,
    exclude_pre_holiday: false,
    points: 1,
  });

  // 名前一覧表設定
  const [nameListConfigs, setNameListConfigs] = useState<NameListConfig[]>([]);
  const [showNameListConfigModal, setShowNameListConfigModal] = useState(false);
  const [editingNameListConfig, setEditingNameListConfig] = useState<NameListConfig | null>(null);
  const [newNameListConfig, setNewNameListConfig] = useState<{
    name: string;
    display_label: string;
    is_active: boolean;
    target_schedule_type_ids: number[];
    target_shift_type_ids: number[];
    target_period_am: boolean;
    target_period_pm: boolean;
    target_period_night: boolean;
  }>({
    name: '',
    display_label: '',
    is_active: true,
    target_schedule_type_ids: [],
    target_shift_type_ids: [],
    target_period_am: true,
    target_period_pm: true,
    target_period_night: true,
  });

  // プリセット関連（一般シフト）
  const [shiftAssignPresets, setShiftAssignPresets] = useState<ShiftAssignPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [showPresetSaveModal, setShowPresetSaveModal] = useState(false);
  const [presetSaveName, setPresetSaveName] = useState('');
  const [showPresetManageModal, setShowPresetManageModal] = useState(false);

  // プリセット関連（当直）
  const [dutyAssignPresets, setDutyAssignPresets] = useState<DutyAssignPreset[]>([]);
  const [selectedDutyPresetId, setSelectedDutyPresetId] = useState<number | null>(null);
  const [showDutyPresetSaveModal, setShowDutyPresetSaveModal] = useState(false);
  const [dutyPresetSaveName, setDutyPresetSaveName] = useState('');
  const [showDutyPresetManageModal, setShowDutyPresetManageModal] = useState(false);

  // プリセット編集用
  const [editingShiftPreset, setEditingShiftPreset] = useState<ShiftAssignPreset | null>(null);
  const [editingDutyPreset, setEditingDutyPreset] = useState<DutyAssignPreset | null>(null);

  // 全体/A/B表切り替え
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'A' | 'B'>('all');

  // メインタブ切り替え（予定表/名前一覧表）
  const [mainTab, setMainTab] = useState<'schedule' | 'nameList'>('schedule');

  // モーダル
  const [selectedCell, setSelectedCell] = useState<{ date: string; member: MemberData } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 公開状態
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmissionLocked, setIsSubmissionLocked] = useState(false);

  // 非表示メンバー管理
  const [allUsersForHidden, setAllUsersForHidden] = useState<{ staff_id: string; name: string; team: 'A' | 'B' }[]>([]);
  const [hiddenMemberIds, setHiddenMemberIds] = useState<Set<string>>(new Set());
  const [showHiddenMembersModal, setShowHiddenMembersModal] = useState(false);
  const [savingHidden, setSavingHidden] = useState(false);

  // ツールバーメニュー
  const [showToolMenu, setShowToolMenu] = useState(false);
  const toolMenuRef = useRef<HTMLDivElement>(null);

  // 当直自動割り振り
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [autoAssignMode, setAutoAssignMode] = useState<'night_shift' | 'general_shift'>('night_shift'); // 当直 or 一般シフト
  // 現在表示月の初日・末日を計算
  const getMonthRange = () => {
    const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0);
    const endDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return { firstDay, endDay };
  };

  const [autoAssignConfig, setAutoAssignConfig] = useState<{
    nightShiftTypeId: number | null;
    dayAfterShiftTypeId: number | null;
    excludeNightShiftTypeIds: number[]; // 連続不可チェック対象の当直シフトタイプID群
    selectionMode: 'filter' | 'individual';
    filterTeams: ('A' | 'B')[];
    filterNightShiftLevels: string[];
    filterCanCardiac: boolean | null;
    filterCanObstetric: boolean | null;
    filterCanIcu: boolean | null;
    selectedMemberIds: string[];
    // 日付選択
    dateSelectionMode: 'period' | 'weekday' | 'specific'; // 期間のみ / 期間+曜日指定 / 個別日付選択
    startDate: string; // 期間開始日
    endDate: string;   // 期間終了日
    targetWeekdays: number[];
    includeHolidays: boolean;
    includePreHolidays: boolean;
    excludeHolidays: boolean;
    excludePreHolidays: boolean;
    specificDates: string[]; // 個別選択した日付
    priorityMode: 'count' | 'score'; // 回数ベース or 得点ベース
  }>(() => {
    // 初期値計算
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDate = new Date(year, month, 0);
    const endDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;

    return {
      nightShiftTypeId: null,
      dayAfterShiftTypeId: null,
      excludeNightShiftTypeIds: [], // 空の場合は割り振る当直のみチェック
      selectionMode: 'filter',
      filterTeams: [],
      filterNightShiftLevels: [],
      filterCanCardiac: null,
      filterCanObstetric: null,
      filterCanIcu: null,
      selectedMemberIds: [],
      dateSelectionMode: 'period', // デフォルト: 期間指定のみ
      startDate: firstDay,
      endDate: endDay,
      targetWeekdays: [],
      includeHolidays: false,
      includePreHolidays: false,
      excludeHolidays: false,
      excludePreHolidays: false,
      specificDates: [],
      priorityMode: 'count',
    };
  });
  const [autoAssignPreview, setAutoAssignPreview] = useState<{
    assignments: { date: string; staffId: string; staffName: string; type: 'night_shift' | 'day_after' }[];
    summary: Map<string, number>;
  } | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  // 一般シフト自動割り振り用の設定
  const [generalShiftConfig, setGeneralShiftConfig] = useState<{
    shiftTypeId: number | null;
    selectionMode: 'filter' | 'individual';
    filterTeams: ('A' | 'B')[];
    filterNightShiftLevels: string[];
    filterPositions: string[];
    filterCanCardiac: boolean | null;
    filterCanObstetric: boolean | null;
    filterCanIcu: boolean | null;
    filterCanRemainingDuty: boolean | null;
    selectedMemberIds: string[];
    dateSelectionMode: 'period' | 'weekday' | 'specific';
    startDate: string;
    endDate: string;
    targetWeekdays: number[];
    includeHolidays: boolean;      // 祝日も対象にする
    includePreHolidays: boolean;   // 祝前日も対象にする
    excludeHolidays: boolean;      // 祝日を除外する
    excludePreHolidays: boolean;   // 祝前日を除外する
    specificDates: string[];
    exclusionFilters: ExclusionFilter[];
    excludeNightShiftUnavailable: boolean; // 当直不可（×）の日は割り振らない
    priorityMode: 'count' | 'score'; // 回数ベース or 得点ベース
  }>(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDate = new Date(year, month, 0);
    const endDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;

    return {
      shiftTypeId: null,
      selectionMode: 'filter',
      filterTeams: [],
      filterNightShiftLevels: [],
      filterPositions: [],
      filterCanCardiac: null,
      filterCanObstetric: null,
      filterCanIcu: null,
      filterCanRemainingDuty: null,
      selectedMemberIds: [],
      dateSelectionMode: 'period',
      startDate: firstDay,
      endDate: endDay,
      targetWeekdays: [],
      includeHolidays: false,
      includePreHolidays: false,
      excludeHolidays: false,
      excludePreHolidays: false,
      specificDates: [],
      exclusionFilters: [],
      excludeNightShiftUnavailable: false,
      priorityMode: 'count',
    };
  });
  const [generalShiftPreview, setGeneralShiftPreview] = useState<{
    assignments: { date: string; staffId: string; staffName: string }[];
    summary: Map<string, number>;
  } | null>(null);

  // シフト一括削除用の設定
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteConfig, setBulkDeleteConfig] = useState<{
    shiftTypeId: number | null;
    startDate: string;
    endDate: string;
  }>(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDate = new Date(year, month, 0);
    const endDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;
    return {
      shiftTypeId: null,
      startDate: firstDay,
      endDate: endDay,
    };
  });
  const [bulkDeletePreview, setBulkDeletePreview] = useState<{
    shifts: { id: number; date: string; staffId: string; staffName: string; shiftName: string }[];
  } | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // 月が変更された時にautoAssignConfigとgeneralShiftConfigのデフォルト期間を更新
  useEffect(() => {
    const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDate = new Date(currentYear, currentMonth, 0);
    const endDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;
    setAutoAssignConfig(prev => ({
      ...prev,
      startDate: firstDay,
      endDate: endDay,
      specificDates: [], // 個別選択もクリア
    }));
    setGeneralShiftConfig(prev => ({
      ...prev,
      startDate: firstDay,
      endDate: endDay,
      specificDates: [],
    }));
    setBulkDeleteConfig(prev => ({
      ...prev,
      startDate: firstDay,
      endDate: endDay,
    }));
  }, [currentYear, currentMonth]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    if (!isAdmin()) {
      alert("管理者のみアクセスできます");
      router.push("/admin/home");
      return;
    }
    fetchData();
  }, [router, currentYear, currentMonth]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolMenuRef.current && !toolMenuRef.current.contains(event.target as Node)) {
        setShowToolMenu(false);
      }
    };

    if (showToolMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolMenu]);

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
        { data: calendarManagement },
        { data: workLocationsData },
        { data: userWorkLocationsData },
        { data: countConfigsData },
        { data: memberCountConfigsData },
        { data: scoreConfigsData },
        { data: shiftAssignPresetsData },
        { data: dutyAssignPresetsData },
        { data: hiddenMembersData },
        { data: nameListConfigsData },
      ] = await Promise.all([
        supabase.from("user").select("staff_id, name, team, display_order, night_shift_level, can_cardiac, can_obstetric, can_icu, can_remaining_duty, position").order("team").order("display_order").order("staff_id"),
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
        supabase.from("calendar_management")
          .select("vacation_date, status")
          .gte("vacation_date", startDate)
          .lte("vacation_date", endDate),
        supabase.from("work_location").select("*").order("display_order"),
        supabase.from("user_work_location")
          .select("*")
          .gte("work_date", startDate)
          .lte("work_date", endDate),
        supabase.from("count_config").select("*").order("display_order"),
        supabase.from("member_count_config").select("*").order("display_order"),
        supabase.from("score_config").select("*").order("display_order"),
        supabase.from("shift_assign_preset").select("*").order("display_order"),
        supabase.from("duty_assign_preset").select("*").order("display_order"),
        supabase.from("schedule_hidden_members").select("staff_id"),
        supabase.from("name_list_config").select("*").order("display_order"),
      ]);

      // 確定済み日付のSetを作成
      const confirmedDateSet = new Set(
        calendarManagement
          ?.filter(cm => cm.status === 'confirmation_completed')
          .map(cm => cm.vacation_date) || []
      );

      setScheduleTypes(types || []);
      setShiftTypes(shiftTypesData || []);
      setHolidays(holidaysData || []);
      setWorkLocationMaster(workLocationsData || []);
      setCountConfigs(countConfigsData || []);
      setMemberCountConfigs(memberCountConfigsData || []);
      setScoreConfigs(scoreConfigsData || []);
      setShiftAssignPresets(shiftAssignPresetsData || []);
      setDutyAssignPresets(dutyAssignPresetsData || []);
      setNameListConfigs(nameListConfigsData || []);

      // システム予約タイプからdisplaySettingsを構築
      const systemScheduleTypes = {
        research_day: (types || []).find(t => t.system_key === 'research_day'),
        secondment: (types || []).find(t => t.system_key === 'secondment'),
        leave_of_absence: (types || []).find(t => t.system_key === 'leave_of_absence'),
      };

      const systemDisplaySettings: Partial<DisplaySettings> = {};
      if (systemScheduleTypes.research_day) {
        systemDisplaySettings.research_day = {
          label: systemScheduleTypes.research_day.display_label || systemScheduleTypes.research_day.name || '研究日',
          label_first_year: systemScheduleTypes.research_day.display_label || systemScheduleTypes.research_day.name || '研究日', // 外勤は廃止
          color: systemScheduleTypes.research_day.text_color || '#000000',
          bg_color: systemScheduleTypes.research_day.color || '#FFFF99',
          default_work_location_id: systemScheduleTypes.research_day.default_work_location_id ?? undefined,
        };
      }
      if (systemScheduleTypes.secondment) {
        systemDisplaySettings.secondment = {
          label: systemScheduleTypes.secondment.display_label || systemScheduleTypes.secondment.name || '出向',
          color: systemScheduleTypes.secondment.text_color || '#000000',
          bg_color: systemScheduleTypes.secondment.color || '#FFCC99',
        };
      }
      if (systemScheduleTypes.leave_of_absence) {
        systemDisplaySettings.leave_of_absence = {
          label: systemScheduleTypes.leave_of_absence.display_label || systemScheduleTypes.leave_of_absence.name || '休職',
          color: systemScheduleTypes.leave_of_absence.text_color || '#000000',
          bg_color: systemScheduleTypes.leave_of_absence.color || '#C0C0C0',
        };
      }

      if (settingData?.display_settings) {
        setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...settingData.display_settings, ...systemDisplaySettings });
      } else {
        setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...systemDisplaySettings });
      }

      // 公開状態を設定
      if (publishData && publishData.is_published) {
        setIsPublished(true);
        setPublishedAt(publishData.published_at);
      } else {
        setIsPublished(false);
        setPublishedAt(null);
      }
      // 予定提出ロック状態を設定
      setIsSubmissionLocked(publishData?.is_submission_locked ?? false);

      // 非表示メンバー管理用：全ユーザーを保存
      setAllUsersForHidden((users || []).map(u => ({ staff_id: u.staff_id, name: u.name, team: u.team || 'A' })));

      // 非表示メンバーのSetを作成・保存
      const hiddenIds = new Set(hiddenMembersData?.map(h => h.staff_id) || []);
      setHiddenMemberIds(hiddenIds);

      // メンバーデータを構築（非表示メンバーを除外）
      const visibleUsers = (users || []).filter(u => !hiddenIds.has(u.staff_id));
      const membersData: MemberData[] = visibleUsers.map(user => {
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

        // 年休を日付でマッピング（確定状態に応じてフィルタ）
        const userVacations = applications?.filter(a => {
          if (a.staff_id !== user.staff_id) return false;

          // その日付が確定済みかチェック
          const isDateConfirmed = confirmedDateSet.has(a.vacation_date);

          if (isDateConfirmed) {
            // 確定済みの日付は confirmed のみ表示
            return a.status === 'confirmed';
          } else {
            // 未確定の日付は after_lottery + confirmed を表示
            return a.status === 'after_lottery' || a.status === 'confirmed';
          }
        }) || [];
        const vacationsByDate: { [date: string]: Application } = {};
        userVacations.forEach(v => {
          vacationsByDate[v.vacation_date] = v;
        });

        // 勤務場所を日付でマッピング
        const userWorkLocs = userWorkLocationsData?.filter(wl => wl.staff_id === user.staff_id) || [];
        const workLocationsByDate: { [date: string]: number } = {};
        userWorkLocs.forEach(wl => {
          workLocationsByDate[wl.work_date] = wl.work_location_id;
        });

        return {
          staff_id: user.staff_id,
          name: user.name,
          team: user.team || 'A',
          display_order: user.display_order || 0,
          position: user.position || '常勤',
          researchDay: researchDayRecord?.day_of_week ?? null,
          isFirstYear: researchDayRecord?.is_first_year ?? false,
          isSecondment,
          leaveOfAbsence: userLeaves.map(l => ({ start_date: l.start_date, end_date: l.end_date })),
          schedules: schedulesByDate,
          shifts: shiftsByDate,
          vacations: vacationsByDate,
          nightShiftLevel: user.night_shift_level || null,
          workLocations: workLocationsByDate,
          can_cardiac: user.can_cardiac || false,
          can_obstetric: user.can_obstetric || false,
          can_icu: user.can_icu || false,
          can_remaining_duty: user.can_remaining_duty || false,
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

  // 祝前日かどうかをチェック（翌日が祝日なら祝前日）
  const isPreHoliday = (date: string): boolean => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    return holidays.some(h => h.holiday_date === nextDayStr);
  };

  // メンバー別カウント: 日付がカウント対象かどうか判定
  const isDateMatchForMemberCount = (day: DayData, config: MemberCountConfig): boolean => {
    // 曜日マッチ（曜日が指定されていない場合は全曜日対象）
    const dayOfWeeksFilter = config.filter_day_of_weeks || [];
    if (dayOfWeeksFilter.length === 0 || dayOfWeeksFilter.includes(day.dayOfWeek)) {
      return true;
    }
    // 祝日マッチ
    if (config.include_holiday && day.isHoliday) {
      return true;
    }
    // 祝前日マッチ
    if (config.include_pre_holiday && isPreHoliday(day.date)) {
      return true;
    }
    // どれにもマッチしない
    return false;
  };

  // メンバー別カウント: メンバーのカウントを計算
  const calculateMemberCount = (member: MemberData, config: MemberCountConfig): number => {
    return daysData.filter(day => {
      // 日付フィルタチェック
      if (!isDateMatchForMemberCount(day, config)) return false;

      // シフトマッチ
      const shifts = member.shifts[day.date] || [];
      const shiftMatch = (config.target_shift_type_ids || []).some(id =>
        shifts.some(s => s.shift_type_id === id)
      );
      if (shiftMatch) return true;

      // 予定マッチ
      const schedules = member.schedules[day.date] || [];
      const scheduleMatch = (config.target_schedule_type_ids || []).some(id =>
        schedules.some(s => s.schedule_type_id === id)
      );
      if (scheduleMatch) return true;

      return false;
    }).length;
  };

  // アクティブな名前一覧設定
  const activeNameListConfigs = useMemo(() => {
    return nameListConfigs.filter(c => c.is_active).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [nameListConfigs]);

  // 名前一覧計算: 指定された日付と設定に対して該当する人の名前リストを取得
  const calculateNameList = (day: DayData, config: NameListConfig): string[] => {
    return filteredMembers
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
              const hasAm = schedule.schedule_type.position_am;
              const hasPm = schedule.schedule_type.position_pm;
              const hasNight = schedule.schedule_type.position_night;
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
              const hasAm = shift.shift_type.position_am;
              const hasPm = shift.shift_type.position_pm;
              const hasNight = shift.shift_type.position_night;
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

  // 得点計算: 日付がカウント対象かどうか判定
  const isDateMatchForScore = (day: DayData, config: ScoreConfig): boolean => {
    const dayOfWeeksFilter = config.filter_day_of_weeks || [];

    // 除外チェック（祝日・祝前日を除外）
    if (config.exclude_holiday && day.isHoliday) {
      return false;
    }
    if (config.exclude_pre_holiday && isPreHoliday(day.date)) {
      return false;
    }

    // 曜日が指定されていない場合は全曜日対象
    if (dayOfWeeksFilter.length === 0 || dayOfWeeksFilter.includes(day.dayOfWeek)) {
      return true;
    }
    // 祝日マッチ（追加）
    if (config.include_holiday && day.isHoliday) {
      return true;
    }
    // 祝前日マッチ（追加）
    if (config.include_pre_holiday && isPreHoliday(day.date)) {
      return true;
    }
    return false;
  };

  // メンバーの得点計算（全設定の合計）
  const calculateMemberScore = (member: MemberData): number => {
    const activeScoreConfigs = scoreConfigs.filter(c => c.is_active);

    const rawScore = activeScoreConfigs.reduce((totalScore, config) => {
      // このconfigに該当するシフト数をカウント
      const count = daysData.filter(day => {
        // 日付フィルタチェック
        if (!isDateMatchForScore(day, config)) return false;

        // シフトマッチ
        const shifts = member.shifts[day.date] || [];
        return (config.target_shift_type_ids || []).some(id =>
          shifts.some(s => s.shift_type_id === id)
        );
      }).length;

      // カウント × 得点を加算
      return totalScore + (count * config.points);
    }, 0);
    // 小数点以下1桁に丸める（浮動小数点精度問題対策）
    return Math.round(rawScore * 10) / 10;
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
      // AM年休: 土曜日のみ当直不可
      if (vacation.period === 'am' && dayOfWeek === 6) {
        return false;
      }
    }

    // 前日の当直による制約（前日の当直がnext_day_night_shift=falseなら当直不可）
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    // 前日のカスタム予定
    const prevSchedules = member.schedules[prevDateStr] || [];
    for (const s of prevSchedules) {
      if (!s.schedule_type.next_day_night_shift) {
        return false;
      }
    }

    // 前日のシフト
    const prevShifts = member.shifts[prevDateStr] || [];
    for (const sh of prevShifts) {
      if (!sh.shift_type.next_day_night_shift) {
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

    // シフトの当日制約
    const shifts = member.shifts[date] || [];
    for (const sh of shifts) {
      if (!sh.shift_type.same_day_night_shift) {
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

    // 翌日のシフト
    const nextShifts = member.shifts[nextDateStr] || [];
    for (const sh of nextShifts) {
      if (!sh.shift_type.prev_day_night_shift) {
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

  // 当直自動割り振り: 対象メンバーをフィルタで取得
  const getTargetMembersForAutoAssign = (): MemberData[] => {
    if (autoAssignConfig.selectionMode === 'individual') {
      return members.filter(m => autoAssignConfig.selectedMemberIds.includes(m.staff_id));
    }
    // 属性フィルタ
    return members.filter(member => {
      // チームフィルタ
      if (autoAssignConfig.filterTeams.length > 0 && !autoAssignConfig.filterTeams.includes(member.team)) {
        return false;
      }
      // 当直レベルフィルタ
      if (autoAssignConfig.filterNightShiftLevels.length > 0 && !autoAssignConfig.filterNightShiftLevels.includes(member.nightShiftLevel || '')) {
        return false;
      }
      // 心外フィルタ
      if (autoAssignConfig.filterCanCardiac !== null && member.can_cardiac !== autoAssignConfig.filterCanCardiac) {
        return false;
      }
      // 産科フィルタ
      if (autoAssignConfig.filterCanObstetric !== null && member.can_obstetric !== autoAssignConfig.filterCanObstetric) {
        return false;
      }
      // ICUフィルタ
      if (autoAssignConfig.filterCanIcu !== null && member.can_icu !== autoAssignConfig.filterCanIcu) {
        return false;
      }
      // 当直レベルが「なし」は除外
      if (member.nightShiftLevel === 'なし') {
        return false;
      }
      return true;
    });
  };

  // 当直自動割り振り: 期間から日付データを生成（月を跨いだ期間対応）
  const generateDaysForPeriod = (startDate: string, endDate: string): DayData[] => {
    const holidayDates = new Set(holidays.map(h => h.holiday_date));
    const result: DayData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      result.push({
        date: dateStr,
        day: d.getDate(),
        dayOfWeek,
        isHoliday: holidayDates.has(dateStr),
        holidayName: holidays.find(h => h.holiday_date === dateStr)?.name || null,
      });
    }
    return result;
  };

  // 当直自動割り振り: 対象日を取得
  const getTargetDatesForAutoAssign = (): DayData[] => {
    const holidayDates = new Set(holidays.map(h => h.holiday_date));
    const preHolidayDates = new Set<string>();
    holidays.forEach(h => {
      const date = new Date(h.holiday_date);
      date.setDate(date.getDate() - 1);
      preHolidayDates.add(date.toISOString().split('T')[0]);
    });

    // 期間が指定されている場合は、その期間の日付データを生成
    let baseDays: DayData[];
    if (autoAssignConfig.startDate && autoAssignConfig.endDate) {
      baseDays = generateDaysForPeriod(autoAssignConfig.startDate, autoAssignConfig.endDate);
    } else if (autoAssignConfig.startDate) {
      // 開始日のみ指定: 開始日から現在表示月の末日まで
      const lastDay = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
      baseDays = generateDaysForPeriod(autoAssignConfig.startDate, lastDay);
    } else if (autoAssignConfig.endDate) {
      // 終了日のみ指定: 現在表示月の初日から終了日まで
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      baseDays = generateDaysForPeriod(firstDay, autoAssignConfig.endDate);
    } else {
      // 期間未指定: 現在表示中の月のデータを使用
      baseDays = daysData;
    }

    // モードによる処理分岐
    switch (autoAssignConfig.dateSelectionMode) {
      case 'period':
        // 期間指定のみ: 期間内の全日が対象
        return baseDays;

      case 'specific':
        // 個別日付選択モード
        const specificSet = new Set(autoAssignConfig.specificDates || []);
        return baseDays.filter(day => specificSet.has(day.date));

      case 'weekday':
        // 期間＋曜日指定モード（祝日・祝前日オプション含む）
        return baseDays.filter(day => {
          // 除外チェック（優先）
          if (autoAssignConfig.excludeHolidays && day.isHoliday) return false;
          if (autoAssignConfig.excludePreHolidays && isPreHoliday(day.date)) return false;

          // 曜日・祝日・祝前日のいずれかにマッチすればOK
          const weekdayMatch = autoAssignConfig.targetWeekdays.includes(day.dayOfWeek);
          const holidayMatch = autoAssignConfig.includeHolidays && day.isHoliday;
          const preHolidayMatch = autoAssignConfig.includePreHolidays && isPreHoliday(day.date);

          // 全て未選択なら全日対象、どれか選択されていればORで判定
          const hasAnySelection = autoAssignConfig.targetWeekdays.length > 0 ||
                                  autoAssignConfig.includeHolidays ||
                                  autoAssignConfig.includePreHolidays;
          if (!hasAnySelection) return true;

          return weekdayMatch || holidayMatch || preHolidayMatch;
        });

      default:
        return baseDays;
    }
  };

  // 当直自動割り振り: 特定日にメンバーが当直可能かチェック（既存割り振り考慮）
  // ルール:
  // 1. 当直可否の○×チェック
  // 2. 前日に当直があれば不可（今日は当直明けになるから）
  // 3. 前々日に当直があれば不可（今日は当直明け翌日になるから）
  // 4. 翌日に当直があれば不可（翌日が当直なら今日当直を入れると明日が明けと当直の重複になる）
  // 5. 翌々日に当直があれば不可（翌々日が当直なら今日当直を入れると翌々日が明け翌日と当直の重複になる）
  // 6. 同日に同じ当直シフトがある場合はその日をスキップ
  const canAssignNightShift = (
    date: string,
    member: MemberData,
    existingAssignments: { date: string; staffId: string; type: 'night_shift' | 'day_after' }[],
    dayObj?: DayData
  ): boolean => {
    try {
      // dayObjがない場合は日付から生成（月を跨いだ期間対応）
      const holidayDates = new Set(holidays.map(h => h.holiday_date));
      let day = dayObj || daysData.find(d => d.date === date);
      if (!day) {
        const d = new Date(date);
        day = {
          date,
          dayOfWeek: d.getDay(),
          isHoliday: holidayDates.has(date),
          holidayName: holidays.find(h => h.holiday_date === date)?.name || null,
        };
      }

      // 1. 基本の当直可否チェック（○×）
      if (!checkNightShiftAvailability(date, member, day.dayOfWeek, day.isHoliday)) {
        return false;
      }

      // 日付計算用 - 前日・前々日
      const prevDate1 = new Date(date);
      prevDate1.setDate(prevDate1.getDate() - 1);
      const prevDateStr1 = prevDate1.toISOString().split('T')[0]; // 前日

      const prevDate2 = new Date(date);
      prevDate2.setDate(prevDate2.getDate() - 2);
      const prevDateStr2 = prevDate2.toISOString().split('T')[0]; // 2日前

      // 日付計算用 - 翌日・翌々日
      const nextDate1 = new Date(date);
      nextDate1.setDate(nextDate1.getDate() + 1);
      const nextDateStr1 = nextDate1.toISOString().split('T')[0]; // 翌日

      const nextDate2 = new Date(date);
      nextDate2.setDate(nextDate2.getDate() + 2);
      const nextDateStr2 = nextDate2.toISOString().split('T')[0]; // 翌々日

      const todayShifts = member.shifts?.[date] || [];
      const prevDayShifts = member.shifts?.[prevDateStr1] || [];
      const prev2DayShifts = member.shifts?.[prevDateStr2] || [];
      const nextDayShifts = member.shifts?.[nextDateStr1] || [];
      const next2DayShifts = member.shifts?.[nextDateStr2] || [];

      // === チェック対象の当直シフトタイプIDリスト ===
      // excludeNightShiftTypeIdsが空の場合はnightShiftTypeIdのみ、設定されている場合はそれを使用
      const checkTargetIds: number[] = autoAssignConfig.excludeNightShiftTypeIds.length > 0
        ? autoAssignConfig.excludeNightShiftTypeIds
        : (autoAssignConfig.nightShiftTypeId ? [autoAssignConfig.nightShiftTypeId] : []);

      // シフトが対象当直かどうかをチェックするヘルパー
      const isTargetNightShift = (shiftTypeId: number | null | undefined): boolean => {
        return shiftTypeId != null && checkTargetIds.includes(shiftTypeId);
      };

      // === 前方向チェック（過去の当直による制約）===

      // 2. 前日に当直があれば不可（今日は当直明けになる）- 新規割り振り分
      const hasNightShiftYesterday = existingAssignments.some(
        a => a.staffId === member.staff_id && a.date === prevDateStr1 && a.type === 'night_shift'
      );
      if (hasNightShiftYesterday) return false;

      // 2. 前日に当直があれば不可 - DB既存
      const hasExistingNightShiftYesterday = prevDayShifts.some(
        s => isTargetNightShift(s.shift_type_id)
      );
      if (hasExistingNightShiftYesterday) return false;

      // 3. 前々日に当直があれば不可（今日は当直明け翌日になる）- 新規割り振り分
      const hasNightShift2DaysAgo = existingAssignments.some(
        a => a.staffId === member.staff_id && a.date === prevDateStr2 && a.type === 'night_shift'
      );
      if (hasNightShift2DaysAgo) return false;

      // 3. 前々日に当直があれば不可 - DB既存
      const hasExistingNightShift2DaysAgo = prev2DayShifts.some(
        s => isTargetNightShift(s.shift_type_id)
      );
      if (hasExistingNightShift2DaysAgo) return false;

      // === 後方向チェック（未来の当直による制約）===

      // 4. 翌日に当直があれば不可（今日当直→明日明けだが、明日に当直があると重複）- 新規割り振り分
      const hasNightShiftTomorrow = existingAssignments.some(
        a => a.staffId === member.staff_id && a.date === nextDateStr1 && a.type === 'night_shift'
      );
      if (hasNightShiftTomorrow) return false;

      // 4. 翌日に当直があれば不可 - DB既存
      const hasExistingNightShiftTomorrow = nextDayShifts.some(
        s => isTargetNightShift(s.shift_type_id)
      );
      if (hasExistingNightShiftTomorrow) return false;

      // 5. 翌々日に当直があれば不可（今日当直→明日明け→明後日明け翌日だが、明後日に当直があると重複）- 新規割り振り分
      const hasNightShift2DaysLater = existingAssignments.some(
        a => a.staffId === member.staff_id && a.date === nextDateStr2 && a.type === 'night_shift'
      );
      if (hasNightShift2DaysLater) return false;

      // 5. 翌々日に当直があれば不可 - DB既存
      const hasExistingNightShift2DaysLater = next2DayShifts.some(
        s => isTargetNightShift(s.shift_type_id)
      );
      if (hasExistingNightShift2DaysLater) return false;

      // === その他のチェック ===

      // 当直明けシフトがある日も不可（念のため）- 新規割り振り分
      const hasDayAfterToday = existingAssignments.some(
        a => a.staffId === member.staff_id && a.date === date && a.type === 'day_after'
      );
      if (hasDayAfterToday) return false;

      // 当直明けシフトがある日も不可 - DB既存
      const hasExistingDayAfterToday = todayShifts.some(
        s => s.shift_type_id === autoAssignConfig.dayAfterShiftTypeId
      );
      if (hasExistingDayAfterToday) return false;

      // 既にこの日に何か割り振り済みでないか（新規割り振り分）
      const alreadyAssigned = existingAssignments.some(
        a => a.staffId === member.staff_id && a.date === date
      );
      if (alreadyAssigned) return false;

      // 既にこの日に対象当直シフトが入っていないか（DB既存）
      const hasNightShift = todayShifts.some(s => isTargetNightShift(s.shift_type_id));
      if (hasNightShift) return false;

      return true;
    } catch (e) {
      console.error('canAssignNightShift error:', e, { date, member: member.staff_id });
      return false;
    }
  };

  // 当直自動割り振り: プレビュー実行
  const handleAutoAssignPreview = () => {
    setIsAutoAssigning(true);
    try {
      const targetMembers = getTargetMembersForAutoAssign();
      if (targetMembers.length === 0) {
        alert('対象者が選択されていません');
        setIsAutoAssigning(false);
        return;
      }

      const targetDates = getTargetDatesForAutoAssign();
      if (targetDates.length === 0) {
        alert('対象日がありません');
        setIsAutoAssigning(false);
        return;
      }

      // 各メンバーの当直回数カウンタ初期化（既存の当直シフトをカウント）
      const assignmentCount = new Map<string, number>();
      targetMembers.forEach(m => {
        // 既存の当直シフト数をカウント（対象期間内）
        let existingCount = 0;
        if (m.shifts) {
          Object.entries(m.shifts).forEach(([date, shifts]) => {
            // 対象期間内かチェック
            const inPeriod = (!autoAssignConfig.startDate || date >= autoAssignConfig.startDate) &&
                            (!autoAssignConfig.endDate || date <= autoAssignConfig.endDate);
            if (inPeriod && autoAssignConfig.nightShiftTypeId) {
              const hasNightShift = shifts.some(s => s.shift_type_id === autoAssignConfig.nightShiftTypeId);
              if (hasNightShift) existingCount++;
            }
          });
        }
        assignmentCount.set(m.staff_id, existingCount);
      });

      // 結果格納用
      const assignments: { date: string; staffId: string; staffName: string; type: 'night_shift' | 'day_after' }[] = [];

      // 当直可能人数の少ない日からソートする関数
      const sortByAvailableCount = (dates: DayData[]) => {
        return [...dates].sort((a, b) => {
          const availableA = targetMembers.filter(m => canAssignNightShift(a.date, m, assignments, a)).length;
          const availableB = targetMembers.filter(m => canAssignNightShift(b.date, m, assignments, b)).length;
          return availableA - availableB;
        });
      };

      // 割り振り中のシフトを含めた得点計算（プレビュー用）
      const calculateMemberScoreWithPreview = (
        member: MemberData,
        previewAssignments: { date: string; staffId: string; staffName: string; type: 'night_shift' | 'day_after' }[],
        targetShiftTypeId: number
      ): number => {
        // 既存の得点
        let score = calculateMemberScore(member);

        // プレビューで割り振ったシフトの得点を加算
        const activeConfigs = scoreConfigs.filter(c => c.is_active);
        const memberPreviewAssignments = previewAssignments.filter(
          a => a.staffId === member.staff_id && a.type === 'night_shift'
        );

        for (const assignment of memberPreviewAssignments) {
          const day = daysData.find(d => d.date === assignment.date);
          if (!day) continue;

          for (const config of activeConfigs) {
            // 対象シフトタイプかチェック
            if (!(config.target_shift_type_ids || []).includes(targetShiftTypeId)) continue;
            // 日付フィルタチェック
            if (!isDateMatchForScore(day, config)) continue;
            // 得点加算
            score += config.points;
          }
        }

        // 小数点以下1桁に丸める（浮動小数点精度問題対策）
        return Math.round(score * 10) / 10;
      };

      // 最も割り振り回数/得点の少ないメンバーを選択（同じ場合はランダム）
      const selectLeastAssigned = (
        availableMembers: MemberData[],
        currentAssignments: { date: string; staffId: string; staffName: string; type: 'night_shift' | 'day_after' }[]
      ): MemberData | null => {
        if (availableMembers.length === 0) return null;

        if (autoAssignConfig.priorityMode === 'score') {
          // 得点ベース: プレビュー割り振りを含めた得点で判断
          const memberScores = availableMembers.map(m => ({
            member: m,
            score: calculateMemberScoreWithPreview(m, currentAssignments, autoAssignConfig.nightShiftTypeId!)
          }));
          const minScore = Math.min(...memberScores.map(ms => ms.score));
          const lowestScoreMembers = memberScores.filter(ms => ms.score === minScore).map(ms => ms.member);
          return lowestScoreMembers[Math.floor(Math.random() * lowestScoreMembers.length)];
        } else {
          // 回数ベース（現行通り）
          const minCount = Math.min(...availableMembers.map(m => assignmentCount.get(m.staff_id) || 0));
          const leastAssignedMembers = availableMembers.filter(m =>
            (assignmentCount.get(m.staff_id) || 0) === minCount
          );
          return leastAssignedMembers[Math.floor(Math.random() * leastAssignedMembers.length)];
        }
      };

      // その日に既に当直シフトが入っているかチェック（誰かに入っていたらスキップ）
      const isDayAlreadyAssigned = (date: string): boolean => {
        // DBの既存シフトをチェック
        for (const member of members) {
          const shifts = member.shifts?.[date] || [];
          if (shifts.some(s => s.shift_type_id === autoAssignConfig.nightShiftTypeId)) {
            return true;
          }
        }
        // 新規割り振り分もチェック
        return assignments.some(a => a.date === date && a.type === 'night_shift');
      };

      // 全日を難易度順（当直可能人数が少ない順）にソートして割り振り
      const sortedDates = sortByAvailableCount(targetDates);
      for (const day of sortedDates) {
        // その日に既に当直が入っていたらスキップ
        if (isDayAlreadyAssigned(day.date)) continue;

        const availableMembers = targetMembers.filter(m => canAssignNightShift(day.date, m, assignments, day));
        if (availableMembers.length > 0) {
          const selected = selectLeastAssigned(availableMembers, assignments);
          if (selected) {
            // 当直を追加
            assignments.push({ date: day.date, staffId: selected.staff_id, staffName: selected.name, type: 'night_shift' });
            // 翌日の当直明けを追加
            const nextDate = new Date(day.date);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextDateStr = nextDate.toISOString().split('T')[0];
            assignments.push({ date: nextDateStr, staffId: selected.staff_id, staffName: selected.name, type: 'day_after' });
            // カウント更新
            assignmentCount.set(selected.staff_id, (assignmentCount.get(selected.staff_id) || 0) + 1);
          }
        }
      }

      setAutoAssignPreview({ assignments, summary: assignmentCount });
    } catch (error) {
      console.error('Auto assign preview error:', error);
      alert('プレビュー生成中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // 当直自動割り振り: 適用（DBに保存）
  const handleAutoAssignApply = async () => {
    if (!autoAssignPreview || autoAssignPreview.assignments.length === 0) return;

    setIsAutoAssigning(true);
    try {
      const insertData: { staff_id: string; shift_date: string; shift_type_id: number; work_location_id?: number | null }[] = [];

      // シフトタイプのデフォルト勤務場所を取得
      const nightShiftType = shiftTypes.find(t => t.id === autoAssignConfig.nightShiftTypeId);
      const dayAfterShiftType = shiftTypes.find(t => t.id === autoAssignConfig.dayAfterShiftTypeId);

      for (const assignment of autoAssignPreview.assignments) {
        const shiftTypeId = assignment.type === 'night_shift'
          ? autoAssignConfig.nightShiftTypeId!
          : autoAssignConfig.dayAfterShiftTypeId!;
        const workLocationId = assignment.type === 'night_shift'
          ? (nightShiftType?.default_work_location_id || null)
          : (dayAfterShiftType?.default_work_location_id || null);

        insertData.push({
          staff_id: assignment.staffId,
          shift_date: assignment.date,
          shift_type_id: shiftTypeId,
          work_location_id: workLocationId,
        });
      }

      const { data, error } = await supabase
        .from('user_shift')
        .insert(insertData)
        .select('id');

      if (error) {
        console.error('Insert error:', error);
        alert('シフトの登録に失敗しました');
        return;
      }

      // localStorage に取り消し用の情報を保存
      const lastAutoAssignment = {
        timestamp: new Date().toISOString(),
        type: 'night_shift',
        insertedShiftIds: data.map(d => d.id),
      };
      localStorage.setItem('lastAutoAssignment', JSON.stringify(lastAutoAssignment));

      alert(`${autoAssignPreview.assignments.filter(a => a.type === 'night_shift').length}件の当直を割り振りました`);
      setShowAutoAssignModal(false);
      setAutoAssignPreview(null);
      fetchData(); // データ再取得
    } catch (error) {
      console.error('Apply error:', error);
      alert('適用中にエラーが発生しました');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // 当直自動割り振り: 直前の割り振りを取り消し
  const handleUndoAutoAssign = async () => {
    const lastAssignmentStr = localStorage.getItem('lastAutoAssignment');
    if (!lastAssignmentStr) {
      alert('取り消し可能な割り振りがありません');
      return;
    }

    const lastAssignment = JSON.parse(lastAssignmentStr);
    const timestamp = new Date(lastAssignment.timestamp);
    const timeDiff = Date.now() - timestamp.getTime();
    const minutesDiff = Math.floor(timeDiff / 1000 / 60);

    if (!confirm(`直前の自動割り振り（${minutesDiff}分前、${lastAssignment.insertedShiftIds.length}件）を取り消しますか？`)) {
      return;
    }

    setIsAutoAssigning(true);
    try {
      const { error } = await supabase
        .from('user_shift')
        .delete()
        .in('id', lastAssignment.insertedShiftIds);

      if (error) {
        console.error('Undo error:', error);
        alert('取り消しに失敗しました');
        return;
      }

      localStorage.removeItem('lastAutoAssignment');
      alert('割り振りを取り消しました');
      fetchData(); // データ再取得
    } catch (error) {
      console.error('Undo error:', error);
      alert('取り消し中にエラーが発生しました');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // ========================================
  // 一般シフト自動割り振り用のヘルパー関数
  // ========================================

  // 一般シフト: 対象者を取得
  const getTargetMembersForGeneralShift = (): MemberData[] => {
    if (generalShiftConfig.selectionMode === 'individual') {
      return members.filter(m => generalShiftConfig.selectedMemberIds.includes(m.staff_id));
    }
    // フィルタモード
    return members.filter(m => {
      if (generalShiftConfig.filterTeams.length > 0 && !generalShiftConfig.filterTeams.includes(m.team as 'A' | 'B')) {
        return false;
      }
      if (generalShiftConfig.filterNightShiftLevels.length > 0 && !generalShiftConfig.filterNightShiftLevels.includes(m.nightShiftLevel || '')) {
        return false;
      }
      if (generalShiftConfig.filterPositions.length > 0 && !generalShiftConfig.filterPositions.includes(m.position)) {
        return false;
      }
      if (generalShiftConfig.filterCanCardiac !== null && m.can_cardiac !== generalShiftConfig.filterCanCardiac) {
        return false;
      }
      if (generalShiftConfig.filterCanObstetric !== null && m.can_obstetric !== generalShiftConfig.filterCanObstetric) {
        return false;
      }
      if (generalShiftConfig.filterCanIcu !== null && m.can_icu !== generalShiftConfig.filterCanIcu) {
        return false;
      }
      if (generalShiftConfig.filterCanRemainingDuty !== null && m.can_remaining_duty !== generalShiftConfig.filterCanRemainingDuty) {
        return false;
      }
      return true;
    });
  };

  // 一般シフト: 対象日を取得
  const getTargetDatesForGeneralShift = (): DayData[] => {
    // 期間に基づいて日付リストを生成
    const startD = generalShiftConfig.startDate;
    const endD = generalShiftConfig.endDate;
    let baseDays: DayData[] = [];

    if (startD && endD) {
      baseDays = generateDaysForPeriod(startD, endD);
    } else {
      baseDays = daysData;
    }

    switch (generalShiftConfig.dateSelectionMode) {
      case 'period':
        return baseDays;

      case 'specific':
        const specificSet = new Set(generalShiftConfig.specificDates || []);
        return baseDays.filter(day => specificSet.has(day.date));

      case 'weekday':
        // 期間＋曜日指定モード（祝日・祝前日オプション含む）
        return baseDays.filter(day => {
          // 除外チェック（優先）
          if (generalShiftConfig.excludeHolidays && day.isHoliday) return false;
          if (generalShiftConfig.excludePreHolidays && isPreHoliday(day.date)) return false;

          // 曜日・祝日・祝前日のいずれかにマッチすればOK
          const weekdayMatch = generalShiftConfig.targetWeekdays.includes(day.dayOfWeek);
          const holidayMatch = generalShiftConfig.includeHolidays && day.isHoliday;
          const preHolidayMatch = generalShiftConfig.includePreHolidays && isPreHoliday(day.date);

          // 全て未選択なら全日対象、どれか選択されていればORで判定
          const hasAnySelection = generalShiftConfig.targetWeekdays.length > 0 ||
                                  generalShiftConfig.includeHolidays ||
                                  generalShiftConfig.includePreHolidays;
          if (!hasAnySelection) return true;

          return weekdayMatch || holidayMatch || preHolidayMatch;
        });

      default:
        return baseDays;
    }
  };

  // 一般シフト: 特定日にメンバーがシフト割り振り可能かチェック
  const canAssignGeneralShift = (
    date: string,
    member: MemberData,
    existingAssignments: { date: string; staffId: string }[],
    targetShiftType: ShiftType | undefined,
    dayOfWeek: number,
    isHoliday: boolean
  ): boolean => {
    // 出向中は不可
    if (member.isSecondment) return false;

    // 休職中は不可
    if (isDateInLeaveOfAbsence(date, member.leaveOfAbsence)) return false;

    // 当直不可（×）の日は割り振らないオプション
    if (generalShiftConfig.excludeNightShiftUnavailable) {
      if (!checkNightShiftAvailability(date, member, dayOfWeek, isHoliday)) {
        return false;
      }
    }

    // 研究日は不可（祝日・日曜は研究日にならない）
    const isResearchDay = member.researchDay !== null &&
      dayOfWeek === member.researchDay &&
      !isHoliday &&
      dayOfWeek !== 0;
    if (isResearchDay) return false;

    const todayShifts = member.shifts?.[date] || [];
    const todaySchedules = member.schedules?.[date] || [];

    // 割り振ろうとしているシフトのAM/PM設定を確認
    const targetIsAM = targetShiftType?.position_am ?? false;
    const targetIsPM = targetShiftType?.position_pm ?? false;
    const targetIsCombined = targetIsAM && targetIsPM; // AM+PM両方のシフト

    // 既存シフトとの競合チェック：同じ時間帯にシフトがあれば不可
    const targetIsNight = targetShiftType?.position_night ?? false;
    for (const existingShift of todayShifts) {
      const existingIsAM = existingShift.shift_type?.position_am ?? false;
      const existingIsPM = existingShift.shift_type?.position_pm ?? false;
      const existingIsNight = existingShift.shift_type?.position_night ?? false;

      // 時間帯が重複していれば不可
      if ((targetIsAM && existingIsAM) || (targetIsPM && existingIsPM) || (targetIsNight && existingIsNight)) {
        return false;
      }
    }

    // 既存スケジュール（カスタム予定）との競合チェック
    for (const existingSchedule of todaySchedules) {
      const existingIsAM = existingSchedule.schedule_type?.position_am ?? false;
      const existingIsPM = existingSchedule.schedule_type?.position_pm ?? false;

      if (targetIsCombined) {
        // AM+PMシフトを割り振る場合：どちらかに予定があったら不可
        if (existingIsAM || existingIsPM) return false;
      } else if (targetIsAM && !targetIsPM) {
        // AMのみのシフトを割り振る場合：既存のAMスケジュールと競合
        if (existingIsAM) return false;
      } else if (!targetIsAM && targetIsPM) {
        // PMのみのシフトを割り振る場合：既存のPMスケジュールと競合
        if (existingIsPM) return false;
      }
    }

    // 年休申請との競合チェック
    const vacation = member.vacations?.[date];
    if (vacation) {
      const vacationIsAM = vacation.period === 'am' || vacation.period === 'full_day';
      const vacationIsPM = vacation.period === 'pm' || vacation.period === 'full_day';

      if (targetIsCombined) {
        // AM+PMシフトを割り振る場合：どちらかに年休があったら不可
        if (vacationIsAM || vacationIsPM) return false;
      } else if (targetIsAM && !targetIsPM) {
        // AMのみのシフトを割り振る場合：AM年休と競合
        if (vacationIsAM) return false;
      } else if (!targetIsAM && targetIsPM) {
        // PMのみのシフトを割り振る場合：PM年休と競合
        if (vacationIsPM) return false;
      }
    }

    // 既にこの日に割り振り済みでないか（新規割り振り分）
    const alreadyAssigned = existingAssignments.some(
      a => a.staffId === member.staff_id && a.date === date
    );
    if (alreadyAssigned) return false;

    // 除外フィルターチェック
    const getPrevDate = (d: string) => {
      const dateObj = new Date(d);
      dateObj.setDate(dateObj.getDate() - 1);
      return dateObj.toISOString().split('T')[0];
    };
    const getNextDate = (d: string) => {
      const dateObj = new Date(d);
      dateObj.setDate(dateObj.getDate() + 1);
      return dateObj.toISOString().split('T')[0];
    };

    for (const filter of generalShiftConfig.exclusionFilters) {
      if (filter.type === 'date_based') {
        // 日付ベースの除外フィルター
        for (const targetDay of filter.target_days) {
          const checkDate = targetDay === 'same_day' ? date
            : targetDay === 'prev_day' ? getPrevDate(date)
            : getNextDate(date);

          // シフト除外チェック
          if (filter.exclude_shift_type_ids.length > 0) {
            // DB既存データをチェック
            const shifts = member.shifts?.[checkDate] || [];
            if (shifts.some(s => filter.exclude_shift_type_ids.includes(s.shift_type_id))) {
              return false;
            }
            // 今回の割り振り結果もチェック（現在割り振り中のシフトタイプが除外対象なら）
            if (generalShiftConfig.shiftTypeId && filter.exclude_shift_type_ids.includes(generalShiftConfig.shiftTypeId)) {
              if (existingAssignments.some(a => a.staffId === member.staff_id && a.date === checkDate)) {
                return false;
              }
            }
          }

          // 予定除外チェック
          if (filter.exclude_schedule_type_ids.length > 0) {
            const schedules = member.schedules?.[checkDate] || [];
            if (schedules.some(s => filter.exclude_schedule_type_ids.includes(s.schedule_type_id))) {
              return false;
            }
          }

          // 年休除外チェック
          if (filter.exclude_vacation && filter.exclude_vacation_periods.length > 0) {
            const vacationOnDay = member.vacations?.[checkDate];
            if (vacationOnDay && filter.exclude_vacation_periods.includes(vacationOnDay.period as VacationPeriod)) {
              return false;
            }
          }
        }
      } else if (filter.type === 'work_location_based') {
        // 勤務場所ベースの除外フィルター（時間帯別対応）
        // 表示ロジックと同じ優先順位で勤務場所を判定
        for (const targetDay of filter.target_days) {
          const checkDate = targetDay === 'same_day' ? date
            : targetDay === 'prev_day' ? getPrevDate(date)
            : getNextDate(date);

          // 対象時間帯ごとにチェック（時間帯未指定の場合は全時間帯を対象）
          const targetPeriods = filter.target_periods.length > 0
            ? filter.target_periods
            : ['am', 'pm', 'night'] as TimePeriod[];

          // 対象日のデータを取得
          const checkDayData = daysData.find(d => d.date === checkDate);
          const schedules = member.schedules?.[checkDate] || [];
          const shifts = member.shifts?.[checkDate] || [];
          const vacation = member.vacations?.[checkDate];

          // 研究日判定
          const isResearchDay = member.researchDay !== null &&
            checkDayData?.dayOfWeek === member.researchDay &&
            !checkDayData?.isHoliday &&
            checkDayData?.dayOfWeek !== 0;

          for (const period of targetPeriods) {
            // 表示ロジックと同じ優先順位で勤務場所を特定
            let workLocationId: number | null = null;

            // 1. スケジュールの直接設定
            for (const s of schedules) {
              const matchesPeriod = (
                (period === 'am' && s.schedule_type?.position_am) ||
                (period === 'pm' && s.schedule_type?.position_pm) ||
                (period === 'night' && s.schedule_type?.position_night)
              );
              if (matchesPeriod && s.work_location_id) {
                workLocationId = s.work_location_id;
                break;
              }
            }

            // 2. シフトの直接設定
            if (!workLocationId) {
              for (const s of shifts) {
                const matchesPeriod = (
                  (period === 'am' && s.shift_type?.position_am) ||
                  (period === 'pm' && s.shift_type?.position_pm) ||
                  (period === 'night' && s.shift_type?.position_night)
                );
                if (matchesPeriod && s.work_location_id) {
                  workLocationId = s.work_location_id;
                  break;
                }
              }
            }

            // 3. 年休の勤務場所（displaySettingsから）
            if (!workLocationId && vacation && period !== 'night') {
              const matchesVacationPeriod = (
                vacation.period === 'full_day' ||
                (period === 'am' && vacation.period === 'am') ||
                (period === 'pm' && vacation.period === 'pm')
              );
              if (matchesVacationPeriod) {
                const onePersonnelStatus = vacation.one_personnel_status || 'not_applied';
                let settingsKey: string;
                if (onePersonnelStatus === 'kensanbi') {
                  settingsKey = 'kensanbi_used';
                } else {
                  settingsKey = 'vacation';
                }
                const settings = displaySettings[settingsKey as keyof DisplaySettings];
                if (settings && typeof settings === 'object' && 'default_work_location_id' in settings) {
                  workLocationId = (settings as { default_work_location_id?: number }).default_work_location_id || null;
                }
              }
            }

            // 4. 研究日の勤務場所（displaySettingsから）
            if (!workLocationId && isResearchDay && period !== 'night') {
              const researchSettings = displaySettings.research_day;
              if (researchSettings?.default_work_location_id) {
                workLocationId = researchSettings.default_work_location_id;
              }
            }

            // 5. user_work_location（日単位のフォールバック）
            if (!workLocationId) {
              workLocationId = member.workLocations?.[checkDate] || null;
            }

            // 勤務場所が除外リストに含まれていれば除外
            if (workLocationId && filter.exclude_work_location_ids.includes(workLocationId)) {
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  // 一般シフト: プレビュー実行
  const handleGeneralShiftPreview = () => {
    setIsAutoAssigning(true);
    try {
      const targetMembers = getTargetMembersForGeneralShift();
      if (targetMembers.length === 0) {
        alert('対象者が選択されていません');
        setIsAutoAssigning(false);
        return;
      }

      if (!generalShiftConfig.shiftTypeId) {
        alert('シフトタイプを選択してください');
        setIsAutoAssigning(false);
        return;
      }

      // 対象シフトタイプを取得
      const targetShiftType = shiftTypes.find(st => st.id === generalShiftConfig.shiftTypeId);

      const targetDates = getTargetDatesForGeneralShift();
      if (targetDates.length === 0) {
        alert('対象日がありません');
        setIsAutoAssigning(false);
        return;
      }

      // 各メンバーのシフト回数カウンタ初期化（既存のシフトをカウント）
      const assignmentCount = new Map<string, number>();
      targetMembers.forEach(m => {
        let existingCount = 0;
        if (m.shifts) {
          Object.entries(m.shifts).forEach(([date, shifts]) => {
            const inPeriod = (!generalShiftConfig.startDate || date >= generalShiftConfig.startDate) &&
                            (!generalShiftConfig.endDate || date <= generalShiftConfig.endDate);
            if (inPeriod && generalShiftConfig.shiftTypeId) {
              const hasShift = shifts.some(s => s.shift_type_id === generalShiftConfig.shiftTypeId);
              if (hasShift) existingCount++;
            }
          });
        }
        assignmentCount.set(m.staff_id, existingCount);
      });

      // 結果格納用
      const assignments: { date: string; staffId: string; staffName: string }[] = [];

      // 割り振り中のシフトを含めた得点計算（一般シフトプレビュー用）
      const calculateMemberScoreWithPreviewGeneral = (
        member: MemberData,
        previewAssignments: { date: string; staffId: string; staffName: string }[],
        targetShiftTypeId: number
      ): number => {
        // 既存の得点
        let score = calculateMemberScore(member);

        // プレビューで割り振ったシフトの得点を加算
        const activeConfigs = scoreConfigs.filter(c => c.is_active);
        const memberPreviewAssignments = previewAssignments.filter(a => a.staffId === member.staff_id);

        for (const assignment of memberPreviewAssignments) {
          const day = daysData.find(d => d.date === assignment.date);
          if (!day) continue;

          for (const config of activeConfigs) {
            // 対象シフトタイプかチェック
            if (!(config.target_shift_type_ids || []).includes(targetShiftTypeId)) continue;
            // 日付フィルタチェック
            if (!isDateMatchForScore(day, config)) continue;
            // 得点加算
            score += config.points;
          }
        }

        // 小数点以下1桁に丸める（浮動小数点精度問題対策）
        return Math.round(score * 10) / 10;
      };

      // 最も割り振り回数/得点の少ないメンバーを選択（同じ場合はランダム）
      const selectLeastAssignedForGeneral = (
        availableMembers: MemberData[],
        currentAssignments: { date: string; staffId: string; staffName: string }[]
      ): MemberData | null => {
        if (availableMembers.length === 0) return null;

        if (generalShiftConfig.priorityMode === 'score') {
          // 得点ベース: プレビュー割り振りを含めた得点で判断
          const memberScores = availableMembers.map(m => ({
            member: m,
            score: calculateMemberScoreWithPreviewGeneral(m, currentAssignments, generalShiftConfig.shiftTypeId!)
          }));
          const minScore = Math.min(...memberScores.map(ms => ms.score));
          const lowestScoreMembers = memberScores.filter(ms => ms.score === minScore).map(ms => ms.member);
          return lowestScoreMembers[Math.floor(Math.random() * lowestScoreMembers.length)];
        } else {
          // 回数ベース（現行通り）
          const minCount = Math.min(...availableMembers.map(m => assignmentCount.get(m.staff_id) || 0));
          const leastAssignedMembers = availableMembers.filter(m =>
            (assignmentCount.get(m.staff_id) || 0) === minCount
          );
          return leastAssignedMembers[Math.floor(Math.random() * leastAssignedMembers.length)];
        }
      };

      // その日に既にシフトが入っているかチェック（誰かに入っていたらスキップ）
      const isDayAlreadyAssignedGeneral = (date: string): boolean => {
        for (const member of members) {
          const shifts = member.shifts?.[date] || [];
          if (shifts.some(s => s.shift_type_id === generalShiftConfig.shiftTypeId)) {
            return true;
          }
        }
        return assignments.some(a => a.date === date);
      };

      // 各日に割り振り
      for (const day of targetDates) {
        // その日に既にシフトが入っていたらスキップ
        if (isDayAlreadyAssignedGeneral(day.date)) continue;

        const availableMembers = targetMembers.filter(m => canAssignGeneralShift(day.date, m, assignments, targetShiftType, day.dayOfWeek, day.isHoliday));
        if (availableMembers.length > 0) {
          const selected = selectLeastAssignedForGeneral(availableMembers, assignments);
          if (selected) {
            assignments.push({ date: day.date, staffId: selected.staff_id, staffName: selected.name });
            assignmentCount.set(selected.staff_id, (assignmentCount.get(selected.staff_id) || 0) + 1);
          }
        }
      }

      setGeneralShiftPreview({ assignments, summary: assignmentCount });
    } catch (error) {
      console.error('General shift preview error:', error);
      alert('プレビュー生成中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // 一般シフト: 適用（DBに保存）
  const handleGeneralShiftApply = async () => {
    if (!generalShiftPreview || generalShiftPreview.assignments.length === 0) return;

    setIsAutoAssigning(true);
    try {
      // シフトタイプのデフォルト勤務場所を取得
      const targetShiftType = shiftTypes.find(t => t.id === generalShiftConfig.shiftTypeId);
      const workLocationId = targetShiftType?.default_work_location_id || null;

      const insertData: { staff_id: string; shift_date: string; shift_type_id: number; work_location_id?: number | null }[] = [];

      for (const assignment of generalShiftPreview.assignments) {
        insertData.push({
          staff_id: assignment.staffId,
          shift_date: assignment.date,
          shift_type_id: generalShiftConfig.shiftTypeId!,
          work_location_id: workLocationId,
        });
      }

      const { data, error } = await supabase
        .from('user_shift')
        .insert(insertData)
        .select('id');

      if (error) {
        console.error('Insert error:', error);
        alert('シフトの登録に失敗しました');
        return;
      }

      // localStorage に取り消し用の情報を保存
      const lastAutoAssignment = {
        timestamp: new Date().toISOString(),
        type: 'general_shift',
        insertedShiftIds: data.map(d => d.id),
      };
      localStorage.setItem('lastAutoAssignment', JSON.stringify(lastAutoAssignment));

      alert(`${generalShiftPreview.assignments.length}件のシフトを割り振りました`);
      setShowAutoAssignModal(false);
      setGeneralShiftPreview(null);
      fetchData(); // データ再取得
    } catch (error) {
      console.error('Apply error:', error);
      alert('適用中にエラーが発生しました');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // ========================================
  // シフト一括削除
  // ========================================

  // シフト一括削除: プレビュー
  const handleBulkDeletePreview = async () => {
    if (!bulkDeleteConfig.shiftTypeId) {
      alert('削除するシフトタイプを選択してください');
      return;
    }

    setIsBulkDeleting(true);
    try {
      // 期間内のシフトを取得
      const { data: shifts, error } = await supabase
        .from('user_shift')
        .select('id, shift_date, staff_id, shift_type_id')
        .eq('shift_type_id', bulkDeleteConfig.shiftTypeId)
        .gte('shift_date', bulkDeleteConfig.startDate)
        .lte('shift_date', bulkDeleteConfig.endDate);

      if (error) throw error;

      // メンバー情報とシフトタイプ情報を付与
      const targetShiftType = shiftTypes.find(st => st.id === bulkDeleteConfig.shiftTypeId);
      const previewShifts = (shifts || []).map(shift => {
        const member = members.find(m => m.staff_id === shift.staff_id);
        return {
          id: shift.id,
          date: shift.shift_date,
          staffId: shift.staff_id,
          staffName: member?.name || shift.staff_id,
          shiftName: targetShiftType?.display_label || targetShiftType?.name || '不明',
        };
      }).sort((a, b) => a.date.localeCompare(b.date) || a.staffName.localeCompare(b.staffName));

      setBulkDeletePreview({ shifts: previewShifts });
    } catch (error) {
      console.error('Preview error:', error);
      alert('プレビューの生成に失敗しました');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // シフト一括削除: 実行
  const handleBulkDeleteApply = async () => {
    if (!bulkDeletePreview || bulkDeletePreview.shifts.length === 0) return;

    const confirmMessage = `${bulkDeletePreview.shifts.length}件のシフトを削除します。\n\nこの操作は元に戻せません。本当に削除しますか？`;
    if (!confirm(confirmMessage)) return;

    setIsBulkDeleting(true);
    try {
      const shiftIds = bulkDeletePreview.shifts.map(s => s.id);

      const { error } = await supabase
        .from('user_shift')
        .delete()
        .in('id', shiftIds);

      if (error) throw error;

      alert(`${bulkDeletePreview.shifts.length}件のシフトを削除しました`);
      setShowBulkDeleteModal(false);
      setBulkDeletePreview(null);
      fetchData(); // データ再取得
    } catch (error) {
      console.error('Delete error:', error);
      alert('削除中にエラーが発生しました');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // 予定表をアップロード（公開）
  const handleUpload = async () => {
    const confirmMessage = isPublished
      ? `${currentYear}年${currentMonth}月の予定表を再アップロードしますか？\n\n公開中の予定表が最新の内容で更新されます。`
      : `${currentYear}年${currentMonth}月の予定表をアップロードしますか？\n\n一般ユーザーがこの月の予定表を閲覧できるようになります。`;

    if (!confirm(confirmMessage)) {
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
        workLocationMaster,
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
        const successMessage = isPublished
          ? "予定表を再アップロードしました。"
          : "予定表をアップロードしました。一般ユーザーが閲覧できるようになりました。";
        setIsPublished(true);
        setPublishedAt(new Date().toISOString());
        alert(successMessage);
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

  // 予定提出ロック切り替え
  const handleToggleSubmissionLock = async () => {
    const newLockState = !isSubmissionLocked;
    try {
      const { error } = await supabase
        .from("schedule_publish")
        .upsert({
          year: currentYear,
          month: currentMonth,
          is_submission_locked: newLockState,
        }, {
          onConflict: 'year,month',
        });

      if (error) {
        alert("ロック状態の変更に失敗しました: " + error.message);
      } else {
        setIsSubmissionLocked(newLockState);
      }
    } catch (err) {
      console.error("Error toggling submission lock:", err);
      alert("エラーが発生しました");
    }
  };

  // 非表示メンバーのトグル
  const toggleHiddenMember = (staffId: string) => {
    setHiddenMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  // 非表示メンバーの保存
  const handleSaveHiddenMembers = async () => {
    setSavingHidden(true);
    try {
      // 既存データを全削除
      const { error: deleteError } = await supabase
        .from("schedule_hidden_members")
        .delete()
        .neq("id", 0); // 全件削除

      if (deleteError) {
        alert("保存に失敗しました: " + deleteError.message);
        setSavingHidden(false);
        return;
      }

      // 新しいデータを挿入
      if (hiddenMemberIds.size > 0) {
        const { error: insertError } = await supabase
          .from("schedule_hidden_members")
          .insert(
            Array.from(hiddenMemberIds).map(staff_id => ({ staff_id }))
          );

        if (insertError) {
          alert("保存に失敗しました: " + insertError.message);
          setSavingHidden(false);
          return;
        }
      }

      alert("非表示メンバーを保存しました");
      setShowHiddenMembersModal(false);
      // データを再読み込みして画面を更新
      fetchData();
    } catch (err) {
      console.error("Error saving hidden members:", err);
      alert("エラーが発生しました");
    } finally {
      setSavingHidden(false);
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

  // セルのデフォルト背景色（予定がないとき）- 勤務場所マスタの色を使用
  const getCellDefaultBgColor = (day: DayData, member?: MemberData): string => {
    // メンバーが指定されている場合、その日の勤務場所をチェック
    if (member) {
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

  // 予定追加
  // 月間の予定タイプ別カウントを計算
  const getMonthlyScheduleTypeCount = (member: MemberData, scheduleTypeId: number): number => {
    let count = 0;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    Object.entries(member.schedules).forEach(([date, schedules]) => {
      if (date >= monthStart && date <= monthEnd) {
        schedules.forEach(s => {
          if (s.schedule_type_id === scheduleTypeId) {
            count++;
          }
        });
      }
    });
    return count;
  };

  // 月間のシフトタイプ別カウントを計算
  const getMonthlyShiftTypeCount = (member: MemberData, shiftTypeId: number): number => {
    let count = 0;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    Object.entries(member.shifts).forEach(([date, shifts]) => {
      if (date >= monthStart && date <= monthEnd) {
        shifts.forEach(s => {
          if (s.shift_type_id === shiftTypeId) {
            count++;
          }
        });
      }
    });
    return count;
  };

  const handleAddSchedule = async (typeId: number) => {
    if (!selectedCell) return;

    try {
      // スケジュールタイプからデフォルト勤務場所を取得
      const scheduleType = scheduleTypes.find(t => t.id === typeId);
      const workLocationId = scheduleType?.default_work_location_id || null;

      // 月間上限チェック
      if (scheduleType?.monthly_limit) {
        const currentCount = getMonthlyScheduleTypeCount(selectedCell.member, typeId);
        if (currentCount >= scheduleType.monthly_limit) {
          alert(`${scheduleType.name}の月間上限（${scheduleType.monthly_limit}回）に達しています。`);
          return;
        }
      }

      const { data, error } = await supabase.from("user_schedule").insert({
        staff_id: selectedCell.member.staff_id,
        schedule_date: selectedCell.date,
        schedule_type_id: typeId,
        work_location_id: workLocationId,
      }).select("*, schedule_type(*)").single();

      if (error) {
        alert("予定の追加に失敗しました: " + error.message);
      } else if (data) {
        // ローカルstateを更新
        setMembers(prev => prev.map(member => {
          if (member.staff_id !== selectedCell.member.staff_id) return member;
          const newSchedules = { ...member.schedules };
          if (!newSchedules[selectedCell.date]) {
            newSchedules[selectedCell.date] = [];
          }
          newSchedules[selectedCell.date] = [...newSchedules[selectedCell.date], data];
          return { ...member, schedules: newSchedules };
        }));
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error adding schedule:", err);
    }
  };

  // 予定削除
  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!selectedCell) return;

    try {
      const { error } = await supabase.from("user_schedule").delete().eq("id", scheduleId);

      if (error) {
        alert("予定の削除に失敗しました: " + error.message);
      } else {
        // ローカルstateを更新
        setMembers(prev => prev.map(member => {
          if (member.staff_id !== selectedCell.member.staff_id) return member;
          const newSchedules = { ...member.schedules };
          if (newSchedules[selectedCell.date]) {
            newSchedules[selectedCell.date] = newSchedules[selectedCell.date].filter(s => s.id !== scheduleId);
          }
          return { ...member, schedules: newSchedules };
        }));
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
    }
  };

  // シフト追加
  const handleAddShift = async (typeId: number) => {
    if (!selectedCell) return;

    try {
      // シフトタイプからデフォルト勤務場所を取得
      const shiftType = shiftTypes.find(t => t.id === typeId);
      const workLocationId = shiftType?.default_work_location_id || null;

      // 月間上限チェック
      if (shiftType?.monthly_limit) {
        const currentCount = getMonthlyShiftTypeCount(selectedCell.member, typeId);
        if (currentCount >= shiftType.monthly_limit) {
          alert(`${shiftType.name}の月間上限（${shiftType.monthly_limit}回）に達しています。`);
          return;
        }
      }

      const { data, error } = await supabase.from("user_shift").insert({
        staff_id: selectedCell.member.staff_id,
        shift_date: selectedCell.date,
        shift_type_id: typeId,
        work_location_id: workLocationId,
      }).select("*, shift_type(*)").single();

      if (error) {
        alert("シフトの追加に失敗しました: " + error.message);
      } else if (data) {
        // ローカルstateを更新
        setMembers(prev => prev.map(member => {
          if (member.staff_id !== selectedCell.member.staff_id) return member;
          const newShifts = { ...member.shifts };
          if (!newShifts[selectedCell.date]) {
            newShifts[selectedCell.date] = [];
          }
          newShifts[selectedCell.date] = [...newShifts[selectedCell.date], data];
          return { ...member, shifts: newShifts };
        }));
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error adding shift:", err);
    }
  };

  // シフト削除
  const handleDeleteShift = async (shiftId: number) => {
    if (!selectedCell) return;

    try {
      const { error } = await supabase.from("user_shift").delete().eq("id", shiftId);

      if (error) {
        alert("シフトの削除に失敗しました: " + error.message);
      } else {
        // ローカルstateを更新
        setMembers(prev => prev.map(member => {
          if (member.staff_id !== selectedCell.member.staff_id) return member;
          const newShifts = { ...member.shifts };
          if (newShifts[selectedCell.date]) {
            newShifts[selectedCell.date] = newShifts[selectedCell.date].filter(s => s.id !== shiftId);
          }
          return { ...member, shifts: newShifts };
        }));
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error deleting shift:", err);
    }
  };

  // 勤務場所変更
  const handleChangeWorkLocation = async (workLocationId: number) => {
    if (!selectedCell) return;

    try {
      // upsertで既存があれば更新、なければ挿入
      const { error } = await supabase.from("user_work_location").upsert({
        staff_id: selectedCell.member.staff_id,
        work_date: selectedCell.date,
        work_location_id: workLocationId,
      }, {
        onConflict: 'staff_id,work_date',
      });

      if (error) {
        alert("勤務場所の変更に失敗しました: " + error.message);
      } else {
        // ローカルstateを更新
        setMembers(prev => prev.map(member => {
          if (member.staff_id !== selectedCell.member.staff_id) return member;
          const newWorkLocations = { ...member.workLocations };
          newWorkLocations[selectedCell.date] = workLocationId;
          return { ...member, workLocations: newWorkLocations };
        }));
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error changing work location:", err);
    }
  };

  // 勤務場所をデフォルトに戻す
  const handleResetWorkLocation = async () => {
    if (!selectedCell) return;

    try {
      const { error } = await supabase.from("user_work_location")
        .delete()
        .eq("staff_id", selectedCell.member.staff_id)
        .eq("work_date", selectedCell.date);

      if (error) {
        alert("勤務場所のリセットに失敗しました: " + error.message);
      } else {
        // ローカルstateを更新
        setMembers(prev => prev.map(member => {
          if (member.staff_id !== selectedCell.member.staff_id) return member;
          const newWorkLocations = { ...member.workLocations };
          delete newWorkLocations[selectedCell.date];
          return { ...member, workLocations: newWorkLocations };
        }));
        setShowModal(false);
      }
    } catch (err) {
      console.error("Error resetting work location:", err);
    }
  };

  // セルクリック
  const handleCellClick = (e: React.MouseEvent, date: string, member: MemberData) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    // クリックしたセルの右上に表示
    let x = rect.right + 8;
    let y = rect.top;

    // ポップアップの最大高さ（80vh）を計算
    const maxPopupHeight = window.innerHeight * 0.8;
    const popupWidth = 288;

    // 画面右端を超える場合は左に表示
    if (x + popupWidth > window.innerWidth) {
      x = rect.left - popupWidth - 8;
    }
    // 左にも収まらない場合はセルの下に表示
    if (x < 10) {
      x = Math.max(10, rect.left);
    }

    // 画面下端を超える場合は上に調整
    // ポップアップが画面内に収まるように、セルの下端から上に向かって配置
    if (y + maxPopupHeight > window.innerHeight - 20) {
      // セルの下端を基準に上に向かって配置
      y = Math.max(20, window.innerHeight - maxPopupHeight - 20);
    }
    // 画面上端を超える場合
    if (y < 20) {
      y = 20;
    }

    setPopupPosition({ x, y });
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

  // 立場の表示順
  const POSITION_ORDER: { [key: string]: number } = { '常勤': 0, '非常勤': 1, 'ローテーター': 2, '研修医': 3 };

  // 選択されたチームのメンバーをフィルター
  const filteredMembers = useMemo(() => {
    return members
      .filter(m => selectedTeam === 'all' || m.team === selectedTeam)
      .sort((a, b) => {
        // 1. 全体表示時はまずチームでソート
        if (selectedTeam === 'all' && a.team !== b.team) {
          return a.team === 'A' ? -1 : 1;
        }
        // 2. 立場でソート
        const posA = POSITION_ORDER[a.position] ?? 99;
        const posB = POSITION_ORDER[b.position] ?? 99;
        if (posA !== posB) return posA - posB;
        // 3. display_orderでソート
        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
        // 4. staff_idでソート
        return a.staff_id.localeCompare(b.staff_id);
      });
  }, [members, selectedTeam]);

  const teamACount = members.filter(m => m.team === 'A').length;
  const teamBCount = members.filter(m => m.team === 'B').length;

  // アクティブなカウント設定
  const activeCountConfigs = useMemo(() => {
    return countConfigs.filter(c => c.is_active).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [countConfigs]);

  // カウント計算
  const calculateCount = (day: DayData, config: CountConfig): number => {
    return filteredMembers.filter(member => {
      // 1. メンバーフィルタ（チーム）
      if (config.filter_teams && config.filter_teams.length > 0) {
        if (!config.filter_teams.includes(member.team)) return false;
      }

      // 2. メンバーフィルタ（当直レベル）
      if (config.filter_night_shift_levels && config.filter_night_shift_levels.length > 0) {
        if (!config.filter_night_shift_levels.includes(member.nightShiftLevel || 'なし')) return false;
      }

      // 2.5. メンバーフィルタ（立場）
      if (config.filter_positions && config.filter_positions.length > 0) {
        if (!config.filter_positions.includes(member.position)) return false;
      }

      // 3. メンバーフィルタ（スキル）
      if (config.filter_can_cardiac !== null && member.can_cardiac !== config.filter_can_cardiac) return false;
      if (config.filter_can_obstetric !== null && member.can_obstetric !== config.filter_can_obstetric) return false;
      if (config.filter_can_icu !== null && member.can_icu !== config.filter_can_icu) return false;

      // 出向中・休職中は除外
      if (member.isSecondment) return false;
      if (isDateInLeaveOfAbsence(day.date, member.leaveOfAbsence)) return false;

      // 4. 対象の予定/シフト/勤務場所/特殊タイプがあるかチェック
      const schedules = member.schedules[day.date] || [];
      const shifts = member.shifts[day.date] || [];
      const vacation = member.vacations[day.date];
      const workLocationId = member.workLocations[day.date];

      // 研究日判定
      const isResearchDay = member.researchDay !== null &&
        day.dayOfWeek === member.researchDay &&
        !day.isHoliday &&
        day.dayOfWeek !== 0;

      // 当直可否判定
      const canNightShift = checkNightShiftAvailability(day.date, member, day.dayOfWeek, day.isHoliday);

      // カウント対象が設定されているかチェック
      const hasTargets = (config.target_schedule_type_ids && config.target_schedule_type_ids.length > 0) ||
        (config.target_shift_type_ids && config.target_shift_type_ids.length > 0) ||
        (config.target_work_location_ids && config.target_work_location_ids.length > 0) ||
        (config.target_special_types && config.target_special_types.length > 0);

      // カウント対象が何も設定されていない場合は、フィルタを通過したメンバーをカウント
      if (!hasTargets) return true;

      let matches = false;

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
            const hasAm = schedule.schedule_type.position_am;
            const hasPm = schedule.schedule_type.position_pm;
            const hasNight = schedule.schedule_type.position_night;
            if (checkPeriod(hasAm, hasPm, hasNight)) {
              matches = true;
              break;
            }
          }
        }
      }

      // シフトタイプチェック
      if (!matches && config.target_shift_type_ids && config.target_shift_type_ids.length > 0) {
        for (const shift of shifts) {
          if (config.target_shift_type_ids.includes(shift.shift_type_id)) {
            const hasAm = shift.shift_type.position_am;
            const hasPm = shift.shift_type.position_pm;
            const hasNight = shift.shift_type.position_night;
            if (checkPeriod(hasAm, hasPm, hasNight)) {
              matches = true;
              break;
            }
          }
        }
      }

      // 勤務場所チェック
      if (!matches && config.target_work_location_ids && config.target_work_location_ids.length > 0) {
        if (workLocationId && config.target_work_location_ids.includes(workLocationId)) {
          matches = true;
        }
      }

      // 特殊タイプチェック
      if (!matches && config.target_special_types && config.target_special_types.length > 0) {
        // 年休
        if (config.target_special_types.includes('vacation') && vacation) {
          const isAm = vacation.period === 'full_day' || vacation.period === 'am';
          const isPm = vacation.period === 'full_day' || vacation.period === 'pm';
          if (checkPeriod(isAm, isPm, false)) {
            matches = true;
          }
        }

        // 研鑽日
        if (!matches && config.target_special_types.includes('kensanbi') && vacation && vacation.one_personnel_status === 'kensanbi') {
          const isAm = vacation.period === 'full_day' || vacation.period === 'am';
          const isPm = vacation.period === 'full_day' || vacation.period === 'pm';
          if (checkPeriod(isAm, isPm, false)) {
            matches = true;
          }
        }

        // 研究日
        if (!matches && config.target_special_types.includes('research_day') && isResearchDay) {
          if (checkPeriod(true, true, false)) {
            matches = true;
          }
        }

        // 当直可○
        if (!matches && config.target_special_types.includes('night_shift_available') && canNightShift) {
          if (config.target_period_night) {
            matches = true;
          }
        }

        // 当直不可×
        if (!matches && config.target_special_types.includes('night_shift_unavailable') && !canNightShift) {
          if (config.target_period_night) {
            matches = true;
          }
        }
      }

      return matches;
    }).length;
  };

  // カウント設定保存
  const handleSaveCountConfig = async () => {
    try {
      if (editingCountConfig) {
        // 更新
        const { error } = await supabase.from("count_config").update({
          name: newCountConfig.name,
          display_label: newCountConfig.display_label,
          is_active: newCountConfig.is_active,
          target_schedule_type_ids: newCountConfig.target_schedule_type_ids,
          target_shift_type_ids: newCountConfig.target_shift_type_ids,
          target_work_location_ids: newCountConfig.target_work_location_ids,
          target_special_types: newCountConfig.target_special_types,
          target_period_am: newCountConfig.target_period_am,
          target_period_pm: newCountConfig.target_period_pm,
          target_period_night: newCountConfig.target_period_night,
          filter_teams: newCountConfig.filter_teams,
          filter_night_shift_levels: newCountConfig.filter_night_shift_levels,
          filter_positions: newCountConfig.filter_positions,
          filter_can_cardiac: newCountConfig.filter_can_cardiac,
          filter_can_obstetric: newCountConfig.filter_can_obstetric,
          filter_can_icu: newCountConfig.filter_can_icu,
          updated_at: new Date().toISOString(),
        }).eq("id", editingCountConfig.id);

        if (error) throw error;

        setCountConfigs(prev => prev.map(c =>
          c.id === editingCountConfig.id ? { ...c, ...newCountConfig } : c
        ));
      } else {
        // 新規作成
        const maxOrder = Math.max(0, ...countConfigs.map(c => c.display_order || 0));
        const { data, error } = await supabase.from("count_config").insert({
          name: newCountConfig.name,
          display_label: newCountConfig.display_label,
          is_active: newCountConfig.is_active,
          display_order: maxOrder + 1,
          target_schedule_type_ids: newCountConfig.target_schedule_type_ids,
          target_shift_type_ids: newCountConfig.target_shift_type_ids,
          target_work_location_ids: newCountConfig.target_work_location_ids,
          target_special_types: newCountConfig.target_special_types,
          target_period_am: newCountConfig.target_period_am,
          target_period_pm: newCountConfig.target_period_pm,
          target_period_night: newCountConfig.target_period_night,
          filter_teams: newCountConfig.filter_teams,
          filter_night_shift_levels: newCountConfig.filter_night_shift_levels,
          filter_positions: newCountConfig.filter_positions,
          filter_can_cardiac: newCountConfig.filter_can_cardiac,
          filter_can_obstetric: newCountConfig.filter_can_obstetric,
          filter_can_icu: newCountConfig.filter_can_icu,
        }).select().single();

        if (error) throw error;
        if (data) {
          setCountConfigs(prev => [...prev, data]);
        }
      }

      setShowCountConfigModal(false);
      setEditingCountConfig(null);
      resetCountConfigForm();
    } catch (err) {
      console.error("Error saving count config:", err);
      alert("保存に失敗しました");
    }
  };

  // カウント設定削除
  const handleDeleteCountConfig = async (id: number) => {
    if (!confirm("このカウント設定を削除しますか？")) return;

    try {
      const { error } = await supabase.from("count_config").delete().eq("id", id);
      if (error) throw error;
      setCountConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Error deleting count config:", err);
      alert("削除に失敗しました");
    }
  };

  // カウント設定の有効/無効切り替え
  const handleToggleCountConfig = async (id: number, isActive: boolean) => {
    try {
      const { error } = await supabase.from("count_config").update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (error) throw error;
      setCountConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, is_active: isActive } : c
      ));
    } catch (err) {
      console.error("Error toggling count config:", err);
    }
  };

  // フォームリセット
  const resetCountConfigForm = () => {
    setNewCountConfig({
      name: '',
      display_label: '',
      is_active: true,
      target_schedule_type_ids: [],
      target_shift_type_ids: [],
      target_work_location_ids: [],
      target_special_types: [],
      target_period_am: true,
      target_period_pm: true,
      target_period_night: true,
      filter_teams: [],
      filter_night_shift_levels: [],
      filter_positions: [],
      filter_can_cardiac: null,
      filter_can_obstetric: null,
      filter_can_icu: null,
    });
  };

  // 編集モード開始
  const handleEditCountConfig = (config: CountConfig) => {
    setEditingCountConfig(config);
    setNewCountConfig({
      name: config.name,
      display_label: config.display_label,
      is_active: config.is_active ?? true,
      target_schedule_type_ids: config.target_schedule_type_ids || [],
      target_shift_type_ids: config.target_shift_type_ids || [],
      target_work_location_ids: config.target_work_location_ids || [],
      target_special_types: config.target_special_types || [],
      target_period_am: config.target_period_am ?? true,
      target_period_pm: config.target_period_pm ?? true,
      target_period_night: config.target_period_night ?? true,
      filter_teams: config.filter_teams || [],
      filter_night_shift_levels: config.filter_night_shift_levels || [],
      filter_positions: config.filter_positions || [],
      filter_can_cardiac: config.filter_can_cardiac,
      filter_can_obstetric: config.filter_can_obstetric,
      filter_can_icu: config.filter_can_icu,
    });
    setShowCountConfigModal(true);
  };

  // メンバー別カウント設定の保存
  const handleSaveMemberCountConfig = async () => {
    try {
      if (editingMemberCountConfig) {
        // 更新
        const { error } = await supabase.from("member_count_config").update({
          name: newMemberCountConfig.name,
          display_label: newMemberCountConfig.display_label,
          is_active: newMemberCountConfig.is_active,
          target_schedule_type_ids: newMemberCountConfig.target_schedule_type_ids,
          target_shift_type_ids: newMemberCountConfig.target_shift_type_ids,
          filter_day_of_weeks: newMemberCountConfig.filter_day_of_weeks,
          include_holiday: newMemberCountConfig.include_holiday,
          include_pre_holiday: newMemberCountConfig.include_pre_holiday,
          updated_at: new Date().toISOString(),
        }).eq("id", editingMemberCountConfig.id);

        if (error) throw error;

        setMemberCountConfigs(prev => prev.map(c =>
          c.id === editingMemberCountConfig.id ? { ...c, ...newMemberCountConfig } : c
        ));
      } else {
        // 新規作成
        const maxOrder = Math.max(0, ...memberCountConfigs.map(c => c.display_order || 0));
        const { data, error } = await supabase.from("member_count_config").insert({
          name: newMemberCountConfig.name,
          display_label: newMemberCountConfig.display_label,
          is_active: newMemberCountConfig.is_active,
          display_order: maxOrder + 1,
          target_schedule_type_ids: newMemberCountConfig.target_schedule_type_ids,
          target_shift_type_ids: newMemberCountConfig.target_shift_type_ids,
          filter_day_of_weeks: newMemberCountConfig.filter_day_of_weeks,
          include_holiday: newMemberCountConfig.include_holiday,
          include_pre_holiday: newMemberCountConfig.include_pre_holiday,
        }).select().single();

        if (error) throw error;
        if (data) {
          setMemberCountConfigs(prev => [...prev, data]);
        }
      }

      setShowCountConfigModal(false);
      setEditingMemberCountConfig(null);
      resetMemberCountConfigForm();
    } catch (err) {
      console.error("Error saving member count config:", err);
      alert("保存に失敗しました");
    }
  };

  // メンバー別カウント設定削除
  const handleDeleteMemberCountConfig = async (id: number) => {
    if (!confirm("このメンバー別カウント設定を削除しますか？")) return;

    try {
      const { error } = await supabase.from("member_count_config").delete().eq("id", id);
      if (error) throw error;
      setMemberCountConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Error deleting member count config:", err);
      alert("削除に失敗しました");
    }
  };

  // メンバー別カウント設定の有効/無効切り替え
  const handleToggleMemberCountConfig = async (id: number, isActive: boolean) => {
    try {
      const { error } = await supabase.from("member_count_config").update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (error) throw error;
      setMemberCountConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, is_active: isActive } : c
      ));
    } catch (err) {
      console.error("Error toggling member count config:", err);
    }
  };

  // メンバー別カウント設定フォームリセット
  const resetMemberCountConfigForm = () => {
    setNewMemberCountConfig({
      name: '',
      display_label: '',
      is_active: true,
      target_schedule_type_ids: [],
      target_shift_type_ids: [],
      filter_day_of_weeks: [],
      include_holiday: false,
      include_pre_holiday: false,
    });
  };

  // メンバー別カウント設定の編集モード開始
  const handleEditMemberCountConfig = (config: MemberCountConfig) => {
    setEditingMemberCountConfig(config);
    setNewMemberCountConfig({
      name: config.name,
      display_label: config.display_label,
      is_active: config.is_active ?? true,
      target_schedule_type_ids: config.target_schedule_type_ids || [],
      target_shift_type_ids: config.target_shift_type_ids || [],
      filter_day_of_weeks: config.filter_day_of_weeks || [],
      include_holiday: config.include_holiday ?? false,
      include_pre_holiday: config.include_pre_holiday ?? false,
    });
    setCountConfigTab('member');
    setShowCountConfigModal(true);
  };

  // 名前一覧設定のリセット
  const resetNameListConfigForm = () => {
    setNewNameListConfig({
      name: '',
      display_label: '',
      is_active: true,
      target_schedule_type_ids: [],
      target_shift_type_ids: [],
      target_period_am: true,
      target_period_pm: true,
      target_period_night: true,
    });
  };

  // 名前一覧設定の保存
  const handleSaveNameListConfig = async () => {
    try {
      if (editingNameListConfig) {
        // 更新
        const { error } = await supabase.from("name_list_config").update({
          name: newNameListConfig.name,
          display_label: newNameListConfig.display_label,
          is_active: newNameListConfig.is_active,
          target_schedule_type_ids: newNameListConfig.target_schedule_type_ids,
          target_shift_type_ids: newNameListConfig.target_shift_type_ids,
          target_period_am: newNameListConfig.target_period_am,
          target_period_pm: newNameListConfig.target_period_pm,
          target_period_night: newNameListConfig.target_period_night,
          updated_at: new Date().toISOString(),
        }).eq("id", editingNameListConfig.id);

        if (error) throw error;

        setNameListConfigs(prev => prev.map(c =>
          c.id === editingNameListConfig.id ? { ...c, ...newNameListConfig } : c
        ));
      } else {
        // 新規作成
        const maxOrder = Math.max(0, ...nameListConfigs.map(c => c.display_order || 0));
        const { data, error } = await supabase.from("name_list_config").insert({
          name: newNameListConfig.name,
          display_label: newNameListConfig.display_label,
          is_active: newNameListConfig.is_active,
          display_order: maxOrder + 1,
          target_schedule_type_ids: newNameListConfig.target_schedule_type_ids,
          target_shift_type_ids: newNameListConfig.target_shift_type_ids,
          target_period_am: newNameListConfig.target_period_am,
          target_period_pm: newNameListConfig.target_period_pm,
          target_period_night: newNameListConfig.target_period_night,
        }).select().single();

        if (error) throw error;
        if (data) {
          setNameListConfigs(prev => [...prev, data]);
        }
      }
      setShowNameListConfigModal(false);
      setEditingNameListConfig(null);
      resetNameListConfigForm();
    } catch (error) {
      console.error("名前一覧設定の保存に失敗:", error);
      alert("保存に失敗しました");
    }
  };

  // 名前一覧設定削除
  const handleDeleteNameListConfig = async (id: number) => {
    if (!confirm("この名前一覧設定を削除しますか？")) return;

    try {
      const { error } = await supabase.from("name_list_config").delete().eq("id", id);
      if (error) throw error;
      setNameListConfigs(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("名前一覧設定の削除に失敗:", error);
      alert("削除に失敗しました");
    }
  };

  // 名前一覧設定の有効/無効切り替え
  const handleToggleNameListConfig = async (id: number, isActive: boolean) => {
    try {
      const { error } = await supabase.from("name_list_config")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setNameListConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, is_active: isActive } : c
      ));
    } catch (error) {
      console.error("名前一覧設定の更新に失敗:", error);
    }
  };

  // 名前一覧設定の編集モード開始
  const handleEditNameListConfig = (config: NameListConfig) => {
    setEditingNameListConfig(config);
    setNewNameListConfig({
      name: config.name,
      display_label: config.display_label,
      is_active: config.is_active ?? true,
      target_schedule_type_ids: config.target_schedule_type_ids || [],
      target_shift_type_ids: config.target_shift_type_ids || [],
      target_period_am: config.target_period_am ?? true,
      target_period_pm: config.target_period_pm ?? true,
      target_period_night: config.target_period_night ?? true,
    });
    setShowNameListConfigModal(true);
  };

  // 得点設定の保存
  const handleSaveScoreConfig = async () => {
    try {
      if (editingScoreConfig) {
        // 更新
        const { error } = await supabase.from("score_config").update({
          name: newScoreConfig.name,
          is_active: newScoreConfig.is_active,
          target_shift_type_ids: newScoreConfig.target_shift_type_ids,
          filter_day_of_weeks: newScoreConfig.filter_day_of_weeks,
          include_holiday: newScoreConfig.include_holiday,
          include_pre_holiday: newScoreConfig.include_pre_holiday,
          exclude_holiday: newScoreConfig.exclude_holiday,
          exclude_pre_holiday: newScoreConfig.exclude_pre_holiday,
          points: newScoreConfig.points,
          updated_at: new Date().toISOString(),
        }).eq("id", editingScoreConfig.id);

        if (error) throw error;

        setScoreConfigs(prev => prev.map(c =>
          c.id === editingScoreConfig.id ? { ...c, ...newScoreConfig } : c
        ));
      } else {
        // 新規作成
        const maxOrder = Math.max(0, ...scoreConfigs.map(c => c.display_order || 0));
        const { data, error } = await supabase.from("score_config").insert({
          name: newScoreConfig.name,
          is_active: newScoreConfig.is_active,
          display_order: maxOrder + 1,
          target_shift_type_ids: newScoreConfig.target_shift_type_ids,
          filter_day_of_weeks: newScoreConfig.filter_day_of_weeks,
          include_holiday: newScoreConfig.include_holiday,
          include_pre_holiday: newScoreConfig.include_pre_holiday,
          exclude_holiday: newScoreConfig.exclude_holiday,
          exclude_pre_holiday: newScoreConfig.exclude_pre_holiday,
          points: newScoreConfig.points,
        }).select().single();

        if (error) throw error;
        if (data) {
          setScoreConfigs(prev => [...prev, data]);
        }
      }

      setShowScoreConfigModal(false);
      setEditingScoreConfig(null);
      resetScoreConfigForm();
    } catch (err) {
      console.error("Error saving score config:", err);
      alert("保存に失敗しました");
    }
  };

  // 得点設定削除
  const handleDeleteScoreConfig = async (id: number) => {
    if (!confirm("この得点設定を削除しますか？")) return;

    try {
      const { error } = await supabase.from("score_config").delete().eq("id", id);
      if (error) throw error;
      setScoreConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Error deleting score config:", err);
      alert("削除に失敗しました");
    }
  };

  // 得点設定の有効/無効切り替え
  const handleToggleScoreConfig = async (id: number, isActive: boolean) => {
    try {
      const { error } = await supabase.from("score_config").update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (error) throw error;
      setScoreConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, is_active: isActive } : c
      ));
    } catch (err) {
      console.error("Error toggling score config:", err);
    }
  };

  // 得点設定フォームリセット
  const resetScoreConfigForm = () => {
    setNewScoreConfig({
      name: '',
      is_active: true,
      target_shift_type_ids: [],
      filter_day_of_weeks: [],
      include_holiday: false,
      include_pre_holiday: false,
      exclude_holiday: false,
      exclude_pre_holiday: false,
      points: 1,
    });
  };

  // 得点設定の編集モード開始
  const handleEditScoreConfig = (config: ScoreConfig) => {
    setEditingScoreConfig(config);
    setNewScoreConfig({
      name: config.name,
      is_active: config.is_active ?? true,
      target_shift_type_ids: config.target_shift_type_ids || [],
      filter_day_of_weeks: config.filter_day_of_weeks || [],
      include_holiday: config.include_holiday ?? false,
      include_pre_holiday: config.include_pre_holiday ?? false,
      exclude_holiday: config.exclude_holiday ?? false,
      exclude_pre_holiday: config.exclude_pre_holiday ?? false,
      points: config.points ?? 1,
    });
    setShowScoreConfigModal(true);
  };

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
          <div className="flex justify-between h-14">
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
                予定表作成
              </h1>
            </div>
            <div className="flex items-center">
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

      {/* ツールバー */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-14 z-40 px-4 py-2">
        <div className="flex justify-between items-center">
          {/* 左: メニュードロップダウン */}
          <div className="relative" ref={toolMenuRef}>
            <button
              onClick={() => setShowToolMenu(!showToolMenu)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              メニュー
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showToolMenu && (
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* シフト自動割り振り */}
                <button
                  onClick={() => {
                    const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
                    const lastDate = new Date(currentYear, currentMonth, 0);
                    const endDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;
                    setAutoAssignConfig({
                      nightShiftTypeId: null,
                      dayAfterShiftTypeId: null,
                      excludeNightShiftTypeIds: [],
                      selectionMode: 'filter',
                      filterTeams: [],
                      filterNightShiftLevels: [],
                      filterCanCardiac: null,
                      filterCanObstetric: null,
                      filterCanIcu: null,
                      selectedMemberIds: [],
                      dateSelectionMode: 'period',
                      startDate: firstDay,
                      endDate: endDay,
                      targetWeekdays: [],
                      includeHolidays: false,
                      includePreHolidays: false,
                      specificDates: [],
                    });
                    setAutoAssignPreview(null);
                    setShowAutoAssignModal(true);
                    setShowToolMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  シフト自動割り振り
                </button>
                {/* 割り振り取消 */}
                <button
                  onClick={() => {
                    handleUndoAutoAssign();
                    setShowToolMenu(false);
                  }}
                  disabled={isAutoAssigning}
                  className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  割り振り取消
                </button>
                {/* シフト一括削除 */}
                <button
                  onClick={() => {
                    const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
                    const lastDate = new Date(currentYear, currentMonth, 0);
                    const endDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;
                    setBulkDeleteConfig({
                      shiftTypeId: null,
                      startDate: firstDay,
                      endDate: endDay,
                    });
                    setBulkDeletePreview(null);
                    setShowBulkDeleteModal(true);
                    setShowToolMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  シフト一括削除
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                {/* カウント設定 */}
                <button
                  onClick={() => {
                    resetCountConfigForm();
                    setEditingCountConfig(null);
                    setShowCountConfigModal(true);
                    setShowToolMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  カウント設定
                </button>
                {/* 名前一覧表設定 */}
                <button
                  onClick={() => {
                    resetNameListConfigForm();
                    setEditingNameListConfig(null);
                    setShowNameListConfigModal(true);
                    setShowToolMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-cyan-700 hover:bg-cyan-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                  名前一覧表設定
                </button>
                {/* 得点設定 */}
                <button
                  onClick={() => {
                    resetScoreConfigForm();
                    setEditingScoreConfig(null);
                    setShowScoreConfigModal(true);
                    setShowToolMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  得点設定
                </button>
                {/* 非表示メンバー */}
                <button
                  onClick={() => {
                    setShowHiddenMembersModal(true);
                    setShowToolMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  非表示メンバー
                </button>
              </div>
            )}
          </div>

          {/* 右: アップロードボタン */}
          <div className="flex items-center gap-2">
            {isPublished ? (
              <>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isUploading ? '処理中...' : '再アップロード'}
                </button>
                <button
                  onClick={handleUnpublish}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUploading ? '処理中...' : '非公開にする'}
                </button>
              </>
            ) : (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {isUploading ? '処理中...' : '予定表をアップロード'}
              </button>
            )}
          </div>
        </div>
      </div>

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
                  {isPublished && publishedAt ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      最終更新: {new Date(publishedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      非公開
                    </span>
                  )}
                </div>
                {/* 予定提出ロック */}
                <label className="flex items-center justify-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSubmissionLocked}
                    onChange={handleToggleSubmissionLock}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className={`text-xs font-medium ${isSubmissionLocked ? 'text-red-600' : 'text-gray-600'}`}>
                    予定提出ロック
                  </span>
                </label>
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

            {/* 全体/A/B表切り替え */}
            <div className="flex justify-center gap-2 pt-4 border-t border-gray-200 mt-4">
              <span className="text-sm font-medium text-gray-600 self-center mr-2">表示:</span>
              <button
                onClick={() => setSelectedTeam('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedTeam === 'all'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全体 ({teamACount + teamBCount}名)
              </button>
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

            {/* メインタブ切り替え（予定表/名前一覧表） */}
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
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  mainTab === 'nameList'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                名前一覧表
              </button>
            </div>
          </div>

          {/* 予定表タブ */}
          {mainTab === 'schedule' && (
          <>
          {/* テーブル */}
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
                    {/* カウント列ヘッダー */}
                    {activeCountConfigs.map((config, index) => (
                      <th
                        key={`count-header-${config.id}`}
                        className="sticky z-20 bg-purple-100 border border-black px-1 py-2 text-[9px] font-bold text-purple-800 text-center w-10 min-w-10 max-w-10"
                        style={{ right: `${(activeCountConfigs.length - 1 - index) * 40}px` }}
                      >
                        <span className="truncate block" title={config.name}>{config.display_label}</span>
                      </th>
                    ))}
                  </tr>
                  {/* AM/PM/夜勤 サブヘッダー */}
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-20 bg-gray-50 border border-black px-2 py-1 text-[8px] text-gray-500"></th>
                    {filteredMembers.map(member => (
                      <React.Fragment key={`sub-${member.staff_id}`}>
                        <th className="border-y border-black border-l border-l-black border-r border-r-gray-300 px-0 py-0.5 text-[8px] text-gray-500 w-[26px] min-w-[26px] max-w-[26px]">AM</th>
                        <th className="border-y border-black border-r border-r-gray-300 px-0 py-0.5 text-[8px] text-gray-500 w-[26px] min-w-[26px] max-w-[26px]">PM</th>
                        <th className="border-y border-black border-r border-r-black px-0 py-0.5 text-[8px] text-gray-500 w-[26px] min-w-[26px] max-w-[26px]">夜</th>
                      </React.Fragment>
                    ))}
                    {/* カウント列サブヘッダー（空） */}
                    {activeCountConfigs.map((config, index) => (
                      <th
                        key={`count-sub-${config.id}`}
                        className="sticky z-20 bg-purple-50 border border-black px-1 py-0.5 text-[8px] text-purple-500 w-10 min-w-10 max-w-10"
                        style={{ right: `${(activeCountConfigs.length - 1 - index) * 40}px` }}
                      />
                    ))}
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
                              onClick={(e) => handleCellClick(e, day.date, member)}
                              className="border-y border-black border-l border-l-black border-r border-r-black px-0.5 py-1 text-center cursor-pointer hover:opacity-80"
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
                              onClick={(e) => handleCellClick(e, day.date, member)}
                              className="border-y border-black border-l border-l-black border-r border-r-black px-0.5 py-1 text-center cursor-pointer hover:opacity-80"
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
                                onClick={(e) => handleCellClick(e, day.date, member)}
                                className="border-y border-black border-l border-l-black border-r border-r-gray-300 px-0 py-1 text-center cursor-pointer hover:opacity-80 overflow-hidden"
                                style={{ backgroundColor: getEffectiveBgColor(content.am.bgColor, day, member) }}
                              >
                                <span
                                  className="text-[9px] font-bold whitespace-nowrap"
                                  style={{ color: content.am.color }}
                                >
                                  {content.am.label}
                                </span>
                              </td>
                              {/* 夜勤 + 当直可否 */}
                              <td
                                onClick={(e) => handleCellClick(e, day.date, member)}
                                className="border-y border-black border-r border-r-black px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                                style={{ backgroundColor: content.night ? getEffectiveBgColor(content.night.bgColor, day, member) : getCellDefaultBgColor(day, member) }}
                              >
                                {content.night ? (
                                  <span
                                    className="text-[9px] font-bold whitespace-nowrap"
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
                              onClick={(e) => handleCellClick(e, day.date, member)}
                              className="border-y border-black border-l border-l-black border-r border-r-gray-300 px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
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
                              onClick={(e) => handleCellClick(e, day.date, member)}
                              className="border-y border-black border-r border-r-gray-300 px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
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
                            {/* 夜勤 + 当直可否 */}
                            <td
                              onClick={(e) => handleCellClick(e, day.date, member)}
                              className="border-y border-black border-r border-r-black px-0 py-1 text-center cursor-pointer hover:opacity-80 w-[26px] min-w-[26px] max-w-[26px] overflow-hidden"
                              style={{ backgroundColor: content.night ? getEffectiveBgColor(content.night.bgColor, day, member) : getCellDefaultBgColor(day, member) }}
                            >
                              {content.night ? (
                                <span
                                  className="text-[9px] font-bold whitespace-nowrap"
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
                      {/* カウント列データ */}
                      {activeCountConfigs.map((config, index) => (
                        <td
                          key={`count-${day.date}-${config.id}`}
                          className="sticky z-10 bg-purple-50 border border-black px-1 py-1 text-center text-sm font-bold text-purple-800 w-10 min-w-10 max-w-10"
                          style={{ right: `${(activeCountConfigs.length - 1 - index) * 40}px` }}
                        >
                          {calculateCount(day, config)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* 得点合計行 */}
                  {scoreConfigs.some(c => c.is_active) && (
                    <tr className="bg-yellow-50">
                      {/* 固定列: ラベル */}
                      <td
                        className="sticky left-0 z-20 bg-yellow-100 border border-black px-2 py-1.5 text-xs font-bold text-yellow-800 whitespace-nowrap"
                        colSpan={1}
                      >
                        得点
                      </td>
                      {/* メンバー列: 得点値 */}
                      {filteredMembers.map((member) => (
                        <React.Fragment key={`score-${member.staff_id}`}>
                          {/* AM/PM/夜勤の3列を結合して得点表示 */}
                          <td
                            colSpan={3}
                            className="border border-black px-1 py-1.5 text-center text-sm font-bold text-yellow-700 bg-yellow-50"
                          >
                            {calculateMemberScore(member)}
                          </td>
                        </React.Fragment>
                      ))}
                      {/* 既存の日付別カウント列分の空セル */}
                      {activeCountConfigs.map((countConfig, index) => (
                        <td
                          key={`score-empty-${countConfig.id}`}
                          className="sticky z-10 bg-yellow-100 border border-black px-1 py-1 text-center text-xs text-gray-400 w-10 min-w-10 max-w-10"
                          style={{ right: `${(activeCountConfigs.length - 1 - index) * 40}px` }}
                        >
                          -
                        </td>
                      ))}
                    </tr>
                  )}
                  {/* メンバー別カウント行 */}
                  {memberCountConfigs.filter(c => c.is_active).map((config, configIndex) => (
                    <tr key={`member-count-${config.id}`} className="bg-orange-50">
                      {/* 固定列: ラベル */}
                      <td
                        className="sticky left-0 z-20 bg-orange-100 border border-black px-2 py-1.5 text-xs font-bold text-orange-800 whitespace-nowrap"
                        colSpan={1}
                      >
                        {config.display_label}
                      </td>
                      {/* メンバー列: カウント値 */}
                      {filteredMembers.map((member) => (
                        <React.Fragment key={`member-count-${config.id}-${member.staff_id}`}>
                          {/* AM/PM/夜勤の3列を結合してカウント表示 */}
                          <td
                            colSpan={3}
                            className="border border-black px-1 py-1.5 text-center text-sm font-bold text-orange-700 bg-orange-50"
                          >
                            {calculateMemberCount(member, config)}
                          </td>
                        </React.Fragment>
                      ))}
                      {/* 既存の日付別カウント列分の空セル */}
                      {activeCountConfigs.map((countConfig, index) => (
                        <td
                          key={`member-count-empty-${config.id}-${countConfig.id}`}
                          className="sticky z-10 bg-orange-100 border border-black px-1 py-1 text-center text-xs text-gray-400 w-10 min-w-10 max-w-10"
                          style={{ right: `${(activeCountConfigs.length - 1 - index) * 40}px` }}
                        >
                          -
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}

          {/* 名前一覧表タブ */}
          {mainTab === 'nameList' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-3 h-3 bg-cyan-500 rounded-full"></span>
                  名前一覧表
                </h3>
                {activeNameListConfigs.length === 0 && (
                  <button
                    onClick={() => {
                      resetNameListConfigForm();
                      setEditingNameListConfig(null);
                      setShowNameListConfigModal(true);
                    }}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                  >
                    設定を追加
                  </button>
                )}
              </div>
              {activeNameListConfigs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs" style={{ borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-20 bg-cyan-100 border border-black px-3 py-2 text-center text-sm font-bold text-gray-800 min-w-[60px]">
                          日付
                        </th>
                        {activeNameListConfigs.map((config) => (
                          <th
                            key={`name-list-header-${config.id}`}
                            className="bg-cyan-100 border border-black px-3 py-2 text-center text-sm font-bold text-gray-800 min-w-[120px] whitespace-nowrap"
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
                              className={`sticky left-0 z-10 border border-black px-2 py-1.5 text-center text-sm font-bold whitespace-nowrap ${
                                day.isHoliday || day.dayOfWeek === 0
                                  ? 'bg-red-100 text-red-700'
                                  : day.dayOfWeek === 6
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {day.day}({weekdayNames[day.dayOfWeek]})
                            </td>
                            {activeNameListConfigs.map((config) => {
                              const names = calculateNameList(day, config);
                              return (
                                <td
                                  key={`name-list-cell-${day.date}-${config.id}`}
                                  className="border border-black px-2 py-1.5 text-sm text-gray-900"
                                >
                                  {names.join('、')}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>名前一覧表の設定がありません。</p>
                  <p className="text-sm mt-2">ツールメニューの「名前一覧表設定」から設定を追加してください。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 編集モーダル */}
      {showModal && selectedCell && selectedCellDetails && (
        <>
          {/* オーバーレイ（クリックで閉じる） */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowModal(false)}
          />
          {/* ポップアップ */}
          <div
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-72 max-h-[80vh] overflow-y-auto"
            style={{ left: popupPosition.x, top: popupPosition.y }}
          >
            <div className="p-2 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">
                <div>{selectedCell.date.replace(/-/g, '/').slice(5)}（{WEEKDAYS[selectedCellDetails.day.dayOfWeek]}）</div>
                <div className="text-xs font-medium text-gray-600">{selectedCell.member.name}</div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-2 space-y-2">
              {/* 現在の状態 */}
              <div>
                <h3 className="text-xs font-medium text-gray-700 mb-1">現在の予定</h3>
                <ul className="space-y-1">
                  {selectedCellDetails.type === 'secondment' && (
                    <li className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">出向中</li>
                  )}
                  {selectedCellDetails.type === 'leave' && (
                    <li className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">休職中</li>
                  )}
                  {selectedCellDetails.isResearchDay && (
                    <li className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                      {selectedCell.member.isFirstYear ? '外勤(院内)' : '研究日'}
                    </li>
                  )}
                  {selectedCellDetails.vacation && (
                    <li className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                      年休{selectedCellDetails.vacation.level}（{selectedCellDetails.vacation.period === 'full_day' ? '終日' : selectedCellDetails.vacation.period === 'am' ? 'AM' : 'PM'}）
                    </li>
                  )}
                  {selectedCellDetails.schedules.map(s => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between px-2 py-1 rounded"
                      style={{ backgroundColor: s.schedule_type.color + '20' }}
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.schedule_type.color }}
                        />
                        <span className="text-xs font-medium">{s.schedule_type.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="text-red-500 hover:text-red-700 p-0.5"
                      >
                        <Icons.Trash />
                      </button>
                    </li>
                  ))}
                  {selectedCellDetails.shifts.map(s => (
                    <li
                      key={`shift-${s.id}`}
                      className="flex items-center justify-between px-2 py-1 rounded"
                      style={{ backgroundColor: s.shift_type.color + '20' }}
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.shift_type.color }}
                        />
                        <span className="text-xs font-medium">{s.shift_type.name}</span>
                        <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">シフト</span>
                      </div>
                      <button
                        onClick={() => handleDeleteShift(s.id)}
                        className="text-red-500 hover:text-red-700 p-0.5"
                      >
                        <Icons.Trash />
                      </button>
                    </li>
                  ))}
                  {selectedCellDetails.schedules.length === 0 && selectedCellDetails.shifts.length === 0 && !selectedCellDetails.vacation && !selectedCellDetails.isResearchDay && selectedCellDetails.type === 'normal' && (
                    <li className="text-xs text-gray-500">予定なし</li>
                  )}
                </ul>
              </div>

              {/* 当直可否 */}
              <div className="pt-1 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">当直:</span>
                  <span className={`text-sm font-bold ${selectedCellDetails.canNightShift ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedCellDetails.canNightShift ? '○' : '×'}
                  </span>
                </div>
              </div>

              {/* 現在の勤務場所（AM/PM/夜勤帯別） */}
              <div className="pt-1 border-t border-gray-200">
                <h3 className="text-xs font-medium text-gray-700 mb-1">勤務場所</h3>
                {(() => {
                  const day = selectedCellDetails.day;
                  const vacation = selectedCell.member.vacations[selectedCell.date];
                  const schedules = selectedCell.member.schedules[selectedCell.date] || [];
                  const shifts = selectedCell.member.shifts[selectedCell.date] || [];

                  // 研究日判定
                  const isResearchDay = selectedCell.member.researchDay !== null &&
                    day.dayOfWeek === selectedCell.member.researchDay &&
                    !day.isHoliday &&
                    day.dayOfWeek !== 0;

                  // 各時間帯の勤務場所を取得
                  const getWorkLocationForPeriod = (period: 'am' | 'pm' | 'night') => {
                    // 1. 予定/シフトに設定された勤務場所を優先
                    for (const s of schedules) {
                      const matchesPeriod = (
                        (period === 'am' && s.schedule_type.position_am) ||
                        (period === 'pm' && s.schedule_type.position_pm) ||
                        (period === 'night' && s.schedule_type.position_night)
                      );
                      if (matchesPeriod && s.work_location_id) {
                        return workLocationMaster.find(wl => wl.id === s.work_location_id);
                      }
                    }

                    for (const s of shifts) {
                      const matchesPeriod = (
                        (period === 'am' && s.shift_type.position_am) ||
                        (period === 'pm' && s.shift_type.position_pm) ||
                        (period === 'night' && s.shift_type.position_night)
                      );
                      if (matchesPeriod && s.work_location_id) {
                        return workLocationMaster.find(wl => wl.id === s.work_location_id);
                      }
                    }

                    // 2. 年休の勤務場所（displaySettingsから）
                    if (vacation && period !== 'night') {
                      const matchesPeriod = (
                        vacation.period === 'full_day' ||
                        (period === 'am' && vacation.period === 'am') ||
                        (period === 'pm' && vacation.period === 'pm')
                      );
                      if (matchesPeriod) {
                        const onePersonnelStatus = vacation.one_personnel_status || 'not_applied';
                        let settingsKey: string;
                        if (onePersonnelStatus === 'kensanbi') {
                          settingsKey = 'kensanbi_used';
                        } else {
                          settingsKey = 'vacation';
                        }
                        const settings = displaySettings[settingsKey as keyof DisplaySettings];
                        if (settings && typeof settings === 'object' && 'default_work_location_id' in settings && settings.default_work_location_id) {
                          return workLocationMaster.find(wl => wl.id === settings.default_work_location_id);
                        }
                      }
                    }

                    // 3. 研究日の勤務場所（displaySettingsから）
                    if (isResearchDay && period !== 'night') {
                      const researchSettings = displaySettings.research_day;
                      if (researchSettings && researchSettings.default_work_location_id) {
                        return workLocationMaster.find(wl => wl.id === researchSettings.default_work_location_id);
                      }
                    }

                    // 4. user_work_location（日全体の設定）
                    const userWorkLocationId = selectedCell.member.workLocations[selectedCell.date];
                    if (userWorkLocationId) {
                      return workLocationMaster.find(wl => wl.id === userWorkLocationId);
                    }

                    // 5. デフォルト勤務場所
                    if (day.isHoliday || day.dayOfWeek === 0) {
                      return workLocationMaster.find(wl => wl.is_default_holiday);
                    }
                    return workLocationMaster.find(wl => wl.is_default_weekday);
                  };

                  const amLocation = getWorkLocationForPeriod('am');
                  const pmLocation = getWorkLocationForPeriod('pm');
                  const nightLocation = getWorkLocationForPeriod('night');

                  return (
                    <div className="flex gap-2">
                      {/* AM */}
                      <div className="flex-1 text-center">
                        <div className="text-[9px] text-gray-500 mb-0.5">AM</div>
                        <span className="text-[9px] font-medium">{amLocation ? (amLocation.display_label || amLocation.name) : '-'}</span>
                      </div>
                      {/* PM */}
                      <div className="flex-1 text-center">
                        <div className="text-[9px] text-gray-500 mb-0.5">PM</div>
                        <span className="text-[9px] font-medium">{pmLocation ? (pmLocation.display_label || pmLocation.name) : '-'}</span>
                      </div>
                      {/* 夜勤 */}
                      <div className="flex-1 text-center">
                        <div className="text-[9px] text-gray-500 mb-0.5">夜勤</div>
                        <span className="text-[9px] font-medium">{nightLocation ? (nightLocation.display_label || nightLocation.name) : '-'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 予定追加 */}
              {selectedCellDetails.type === 'normal' && scheduleTypes.length > 0 && (() => {
                // 各勤務帯の使用状況をチェック
                const schedules = selectedCell.member.schedules[selectedCell.date] || [];
                const shifts = selectedCell.member.shifts[selectedCell.date] || [];
                const vacation = selectedCell.member.vacations[selectedCell.date];
                const day = selectedCellDetails.day;
                const isResearchDay = selectedCell.member.researchDay !== null &&
                  day.dayOfWeek === selectedCell.member.researchDay &&
                  !day.isHoliday &&
                  day.dayOfWeek !== 0;

                const isAmOccupied = isResearchDay ||
                  (vacation && (vacation.period === 'full_day' || vacation.period === 'am')) ||
                  schedules.some(s => s.schedule_type.position_am) ||
                  shifts.some(s => s.shift_type.position_am);
                const isPmOccupied = isResearchDay ||
                  (vacation && (vacation.period === 'full_day' || vacation.period === 'pm')) ||
                  schedules.some(s => s.schedule_type.position_pm) ||
                  shifts.some(s => s.shift_type.position_pm);
                const isNightOccupied = schedules.some(s => s.schedule_type.position_night) ||
                  shifts.some(s => s.shift_type.position_night);

                // 追加可能な予定タイプをフィルタリング
                const availableScheduleTypes = scheduleTypes.filter(type => {
                  // 追加しようとする勤務帯と既存の勤務帯が重複しないかチェック
                  if (type.position_am && isAmOccupied) return false;
                  if (type.position_pm && isPmOccupied) return false;
                  if (type.position_night && isNightOccupied) return false;
                  return true;
                });

                if (availableScheduleTypes.length === 0) return null;

                return (
                  <div className="pt-2 border-t border-gray-200">
                    <h3 className="text-xs font-medium text-gray-700 mb-1">予定を追加</h3>
                    <div className="flex flex-wrap gap-1">
                      {availableScheduleTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => handleAddSchedule(type.id)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-300 hover:opacity-80 transition-all"
                          style={{
                            backgroundColor: type.color,
                            color: type.text_color || '#000000'
                          }}
                          title={type.name}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* シフト追加 */}
              {selectedCellDetails.type === 'normal' && shiftTypes.length > 0 && (() => {
                // 各勤務帯の使用状況をチェック
                const schedules = selectedCell.member.schedules[selectedCell.date] || [];
                const shifts = selectedCell.member.shifts[selectedCell.date] || [];
                const vacation = selectedCell.member.vacations[selectedCell.date];
                const day = selectedCellDetails.day;
                const isResearchDay = selectedCell.member.researchDay !== null &&
                  day.dayOfWeek === selectedCell.member.researchDay &&
                  !day.isHoliday &&
                  day.dayOfWeek !== 0;

                const isAmOccupied = isResearchDay ||
                  (vacation && (vacation.period === 'full_day' || vacation.period === 'am')) ||
                  schedules.some(s => s.schedule_type.position_am) ||
                  shifts.some(s => s.shift_type.position_am);
                const isPmOccupied = isResearchDay ||
                  (vacation && (vacation.period === 'full_day' || vacation.period === 'pm')) ||
                  schedules.some(s => s.schedule_type.position_pm) ||
                  shifts.some(s => s.shift_type.position_pm);
                const isNightOccupied = schedules.some(s => s.schedule_type.position_night) ||
                  shifts.some(s => s.shift_type.position_night);

                // 追加可能なシフトタイプをフィルタリング
                const availableShiftTypes = shiftTypes.filter(type => {
                  // 追加しようとする勤務帯と既存の勤務帯が重複しないかチェック
                  if (type.position_am && isAmOccupied) return false;
                  if (type.position_pm && isPmOccupied) return false;
                  if (type.position_night && isNightOccupied) return false;
                  return true;
                });

                if (availableShiftTypes.length === 0) return null;

                return (
                  <div className="pt-2 border-t border-gray-200">
                    <h3 className="text-xs font-medium text-gray-700 mb-1">シフトを追加</h3>
                    <div className="flex flex-wrap gap-1">
                      {availableShiftTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => handleAddShift(type.id)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-400 hover:opacity-80 transition-all"
                          style={{
                            backgroundColor: type.color,
                            color: type.text_color || '#000000'
                          }}
                          title={type.name}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 勤務場所変更 */}
              {selectedCellDetails.type === 'normal' && workLocationMaster.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <h3 className="text-xs font-medium text-gray-700 mb-1">勤務場所を変更</h3>
                  <div className="flex flex-wrap gap-1">
                    {workLocationMaster.map(loc => {
                      const isSelected = selectedCell.member.workLocations[selectedCell.date] === loc.id;
                      return (
                        <button
                          key={loc.id}
                          onClick={() => handleChangeWorkLocation(loc.id)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border hover:opacity-80 transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                          style={{
                            backgroundColor: loc.color,
                            color: loc.text_color || '#000000',
                            borderColor: isSelected ? '#3B82F6' : '#9CA3AF'
                          }}
                          title={loc.name}
                        >
                          {loc.display_label || loc.name}
                        </button>
                      );
                    })}
                    {selectedCell.member.workLocations[selectedCell.date] && (
                      <button
                        onClick={handleResetWorkLocation}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-400 bg-white text-gray-600 hover:bg-gray-100 transition-all"
                        title="デフォルトに戻す"
                      >
                        リセット
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </>
      )}

      {/* カウント設定モーダル */}
      {showCountConfigModal && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowCountConfigModal(false);
              setEditingCountConfig(null);
              resetCountConfigForm();
            }}
          />
          {/* モーダル本体 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingCountConfig ? 'カウント設定を編集' : 'カウント設定'}
                </h2>
                <button
                  onClick={() => {
                    setShowCountConfigModal(false);
                    setEditingCountConfig(null);
                    setEditingMemberCountConfig(null);
                    resetCountConfigForm();
                    resetMemberCountConfigForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Icons.X />
                </button>
              </div>

              {/* タブ切り替え */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => {
                    setCountConfigTab('date');
                    setEditingCountConfig(null);
                    setEditingMemberCountConfig(null);
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    countConfigTab === 'date'
                      ? 'border-purple-500 text-purple-600 bg-purple-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  日付別カウント
                </button>
                <button
                  onClick={() => {
                    setCountConfigTab('member');
                    setEditingCountConfig(null);
                    setEditingMemberCountConfig(null);
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    countConfigTab === 'member'
                      ? 'border-orange-500 text-orange-600 bg-orange-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  メンバー別カウント
                </button>
              </div>

              {/* 日付別カウント設定タブ */}
              {countConfigTab === 'date' && (
              <div className="p-4 space-y-4">
                {/* 既存のカウント設定一覧 */}
                {!editingCountConfig && countConfigs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">登録済み設定</h3>
                    <div className="space-y-1">
                      {countConfigs.map(config => (
                        <div
                          key={config.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.is_active || false}
                              onChange={(e) => handleToggleCountConfig(config.id, e.target.checked)}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{config.display_label}</div>
                              <div className="text-xs text-gray-500">{config.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCountConfig(config)}
                              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteCountConfig(config.id)}
                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <hr className="my-4" />
                  </div>
                )}

                {/* 新規追加/編集フォーム */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {editingCountConfig ? '設定を編集' : '新規カウント設定'}
                  </h3>

                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">設定名（内部用）</label>
                      <input
                        type="text"
                        value={newCountConfig.name}
                        onChange={(e) => setNewCountConfig(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="例: 当直可能人数"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">表示ラベル（短い名前）</label>
                      <input
                        type="text"
                        value={newCountConfig.display_label}
                        onChange={(e) => setNewCountConfig(prev => ({ ...prev, display_label: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="例: 当直"
                      />
                    </div>
                  </div>

                  {/* カウント対象: 予定タイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カウント対象: 予定タイプ</label>
                    <div className="flex flex-wrap gap-1">
                      {scheduleTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewCountConfig(prev => ({
                              ...prev,
                              target_schedule_type_ids: prev.target_schedule_type_ids.includes(type.id)
                                ? prev.target_schedule_type_ids.filter(id => id !== type.id)
                                : [...prev.target_schedule_type_ids, type.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newCountConfig.target_schedule_type_ids.includes(type.id)
                              ? 'ring-2 ring-purple-500 border-purple-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: type.color, color: type.text_color || '#000000' }}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* カウント対象: シフトタイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カウント対象: シフトタイプ</label>
                    <div className="flex flex-wrap gap-1">
                      {shiftTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewCountConfig(prev => ({
                              ...prev,
                              target_shift_type_ids: prev.target_shift_type_ids.includes(type.id)
                                ? prev.target_shift_type_ids.filter(id => id !== type.id)
                                : [...prev.target_shift_type_ids, type.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newCountConfig.target_shift_type_ids.includes(type.id)
                              ? 'ring-2 ring-purple-500 border-purple-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: type.color, color: type.text_color || '#000000' }}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* カウント対象: 勤務場所 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カウント対象: 勤務場所</label>
                    <div className="flex flex-wrap gap-1">
                      {workLocationMaster.map(loc => (
                        <button
                          key={loc.id}
                          onClick={() => {
                            setNewCountConfig(prev => ({
                              ...prev,
                              target_work_location_ids: prev.target_work_location_ids.includes(loc.id)
                                ? prev.target_work_location_ids.filter(id => id !== loc.id)
                                : [...prev.target_work_location_ids, loc.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newCountConfig.target_work_location_ids.includes(loc.id)
                              ? 'ring-2 ring-purple-500 border-purple-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: loc.color, color: loc.text_color || '#000000' }}
                        >
                          {loc.display_label || loc.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* カウント対象: 特殊タイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カウント対象: 特殊タイプ</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'vacation', label: '年休' },
                        { key: 'kensanbi', label: '研鑽日' },
                        { key: 'research_day', label: '研究日' },
                        { key: 'night_shift_available', label: '当直可○' },
                        { key: 'night_shift_unavailable', label: '当直不可×' },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={newCountConfig.target_special_types.includes(item.key)}
                            onChange={(e) => {
                              setNewCountConfig(prev => ({
                                ...prev,
                                target_special_types: e.target.checked
                                  ? [...prev.target_special_types, item.key]
                                  : prev.target_special_types.filter(k => k !== item.key)
                              }));
                            }}
                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs text-gray-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* カウント対象勤務時間帯 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カウント対象勤務時間帯</label>
                    <div className="flex gap-4">
                      {[
                        { key: 'target_period_am', label: 'AM' },
                        { key: 'target_period_pm', label: 'PM' },
                        { key: 'target_period_night', label: '夜勤' },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={newCountConfig[item.key as 'target_period_am' | 'target_period_pm' | 'target_period_night']}
                            onChange={(e) => {
                              setNewCountConfig(prev => ({
                                ...prev,
                                [item.key]: e.target.checked
                              }));
                            }}
                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs text-gray-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <hr />

                  {/* フィルタ: チーム */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">フィルタ: チーム</label>
                    <div className="flex gap-4">
                      {['A', 'B'].map(team => (
                        <label key={team} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={newCountConfig.filter_teams.includes(team)}
                            onChange={(e) => {
                              setNewCountConfig(prev => ({
                                ...prev,
                                filter_teams: e.target.checked
                                  ? [...prev.filter_teams, team]
                                  : prev.filter_teams.filter(t => t !== team)
                              }));
                            }}
                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs text-gray-700">{team}チーム</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">選択なし = 全チーム対象</p>
                  </div>

                  {/* フィルタ: 当直レベル */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">フィルタ: 当直レベル</label>
                    <div className="flex gap-4">
                      {['なし', '上', '中', '下'].map(level => (
                        <label key={level} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={newCountConfig.filter_night_shift_levels.includes(level)}
                            onChange={(e) => {
                              setNewCountConfig(prev => ({
                                ...prev,
                                filter_night_shift_levels: e.target.checked
                                  ? [...prev.filter_night_shift_levels, level]
                                  : prev.filter_night_shift_levels.filter(l => l !== level)
                              }));
                            }}
                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs text-gray-700">{level}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">選択なし = 全レベル対象</p>
                  </div>

                  {/* フィルタ: 立場 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">フィルタ: 立場</label>
                    <div className="flex flex-wrap gap-3">
                      {['常勤', '非常勤', 'ローテーター', '研修医'].map(position => (
                        <label key={position} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={newCountConfig.filter_positions.includes(position)}
                            onChange={(e) => {
                              setNewCountConfig(prev => ({
                                ...prev,
                                filter_positions: e.target.checked
                                  ? [...prev.filter_positions, position]
                                  : prev.filter_positions.filter(p => p !== position)
                              }));
                            }}
                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs text-gray-700">{position}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">選択なし = 全立場対象</p>
                  </div>

                  {/* フィルタ: スキル */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">フィルタ: スキル</label>
                    <div className="space-y-2">
                      {[
                        { key: 'filter_can_cardiac', label: '心外対応' },
                        { key: 'filter_can_obstetric', label: '産科対応' },
                        { key: 'filter_can_icu', label: 'ICU対応' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-4">
                          <span className="text-xs text-gray-700 w-20">{item.label}:</span>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={item.key}
                              checked={newCountConfig[item.key as 'filter_can_cardiac' | 'filter_can_obstetric' | 'filter_can_icu'] === null}
                              onChange={() => {
                                setNewCountConfig(prev => ({ ...prev, [item.key]: null }));
                              }}
                              className="w-3.5 h-3.5 text-purple-600 border-gray-300 focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-700">指定なし</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={item.key}
                              checked={newCountConfig[item.key as 'filter_can_cardiac' | 'filter_can_obstetric' | 'filter_can_icu'] === true}
                              onChange={() => {
                                setNewCountConfig(prev => ({ ...prev, [item.key]: true }));
                              }}
                              className="w-3.5 h-3.5 text-purple-600 border-gray-300 focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-700">可</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={item.key}
                              checked={newCountConfig[item.key as 'filter_can_cardiac' | 'filter_can_obstetric' | 'filter_can_icu'] === false}
                              onChange={() => {
                                setNewCountConfig(prev => ({ ...prev, [item.key]: false }));
                              }}
                              className="w-3.5 h-3.5 text-purple-600 border-gray-300 focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-700">不可</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* メンバー別カウント設定タブ */}
              {countConfigTab === 'member' && (
              <div className="p-4 space-y-4">
                {/* 既存のメンバー別カウント設定一覧 */}
                {!editingMemberCountConfig && memberCountConfigs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">登録済み設定</h3>
                    <div className="space-y-1">
                      {memberCountConfigs.map(config => (
                        <div
                          key={config.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.is_active || false}
                              onChange={(e) => handleToggleMemberCountConfig(config.id, e.target.checked)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{config.display_label}</div>
                              <div className="text-xs text-gray-500">{config.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditMemberCountConfig(config)}
                              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteMemberCountConfig(config.id)}
                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <hr className="my-4" />
                  </div>
                )}

                {/* 新規追加/編集フォーム */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {editingMemberCountConfig ? '設定を編集' : '新規メンバー別カウント設定'}
                  </h3>

                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">設定名（内部用）</label>
                      <input
                        type="text"
                        value={newMemberCountConfig.name}
                        onChange={(e) => setNewMemberCountConfig(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="例: 土曜上直"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">表示ラベル（短い名前）</label>
                      <input
                        type="text"
                        value={newMemberCountConfig.display_label}
                        onChange={(e) => setNewMemberCountConfig(prev => ({ ...prev, display_label: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="例: 土上直"
                      />
                    </div>
                  </div>

                  {/* カウント対象: 予定タイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カウント対象: 予定タイプ</label>
                    <div className="flex flex-wrap gap-1">
                      {scheduleTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewMemberCountConfig(prev => ({
                              ...prev,
                              target_schedule_type_ids: prev.target_schedule_type_ids.includes(type.id)
                                ? prev.target_schedule_type_ids.filter(id => id !== type.id)
                                : [...prev.target_schedule_type_ids, type.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newMemberCountConfig.target_schedule_type_ids.includes(type.id)
                              ? 'ring-2 ring-orange-500 border-orange-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: type.color, color: type.text_color || '#000000' }}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* カウント対象: シフトタイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カウント対象: シフトタイプ</label>
                    <div className="flex flex-wrap gap-1">
                      {shiftTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewMemberCountConfig(prev => ({
                              ...prev,
                              target_shift_type_ids: prev.target_shift_type_ids.includes(type.id)
                                ? prev.target_shift_type_ids.filter(id => id !== type.id)
                                : [...prev.target_shift_type_ids, type.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newMemberCountConfig.target_shift_type_ids.includes(type.id)
                              ? 'ring-2 ring-orange-500 border-orange-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: type.color, color: type.text_color || '#000000' }}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <hr />

                  {/* 日付フィルタ: 曜日 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">対象曜日（複数選択可）</label>
                    <div className="flex gap-2">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setNewMemberCountConfig(prev => ({
                              ...prev,
                              filter_day_of_weeks: prev.filter_day_of_weeks.includes(index)
                                ? prev.filter_day_of_weeks.filter(d => d !== index)
                                : [...prev.filter_day_of_weeks, index]
                            }));
                          }}
                          className={`w-8 h-8 rounded-full text-xs font-medium border transition-all ${
                            newMemberCountConfig.filter_day_of_weeks.includes(index)
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          } ${index === 0 ? 'text-red-600' : ''} ${index === 6 ? 'text-blue-600' : ''}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">選択なし = 全曜日対象</p>
                  </div>

                  {/* 日付フィルタ: 祝日・祝前日 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">追加対象日</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newMemberCountConfig.include_holiday}
                          onChange={(e) => setNewMemberCountConfig(prev => ({ ...prev, include_holiday: e.target.checked }))}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">祝日を含む</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newMemberCountConfig.include_pre_holiday}
                          onChange={(e) => setNewMemberCountConfig(prev => ({ ...prev, include_pre_holiday: e.target.checked }))}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">祝前日を含む</span>
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">チェックすると、曜日条件に加えて祝日/祝前日もカウント対象になります</p>
                  </div>
                </div>
              </div>
              )}

              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCountConfigModal(false);
                    setEditingCountConfig(null);
                    setEditingMemberCountConfig(null);
                    resetCountConfigForm();
                    resetMemberCountConfigForm();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  キャンセル
                </button>
                {countConfigTab === 'date' ? (
                  <button
                    onClick={handleSaveCountConfig}
                    disabled={!newCountConfig.name || !newCountConfig.display_label}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingCountConfig ? '更新' : '追加'}
                  </button>
                ) : (
                  <button
                    onClick={handleSaveMemberCountConfig}
                    disabled={!newMemberCountConfig.name || !newMemberCountConfig.display_label}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingMemberCountConfig ? '更新' : '追加'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 得点設定モーダル */}
      {showScoreConfigModal && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowScoreConfigModal(false);
              setEditingScoreConfig(null);
              resetScoreConfigForm();
            }}
          />
          {/* モーダル本体 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingScoreConfig ? '得点設定を編集' : '得点設定'}
                </h2>
                <button
                  onClick={() => {
                    setShowScoreConfigModal(false);
                    setEditingScoreConfig(null);
                    resetScoreConfigForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Icons.X />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* 既存の得点設定一覧 */}
                {!editingScoreConfig && scoreConfigs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">登録済み設定</h3>
                    <div className="space-y-1">
                      {scoreConfigs.map(config => (
                        <div
                          key={config.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.is_active || false}
                              onChange={(e) => handleToggleScoreConfig(config.id, e.target.checked)}
                              className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{config.name}</div>
                              <div className="text-xs text-gray-500">{config.points}点</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditScoreConfig(config)}
                              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteScoreConfig(config.id)}
                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <hr className="my-4" />
                  </div>
                )}

                {/* 新規追加/編集フォーム */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {editingScoreConfig ? '設定を編集' : '新規得点設定'}
                  </h3>

                  {/* 設定名 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">設定名</label>
                    <input
                      type="text"
                      value={newScoreConfig.name}
                      onChange={(e) => setNewScoreConfig(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="例: 土曜上直"
                    />
                  </div>

                  {/* 対象シフトタイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">対象シフトタイプ</label>
                    <div className="flex flex-wrap gap-1">
                      {shiftTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewScoreConfig(prev => ({
                              ...prev,
                              target_shift_type_ids: prev.target_shift_type_ids.includes(type.id)
                                ? prev.target_shift_type_ids.filter(id => id !== type.id)
                                : [...prev.target_shift_type_ids, type.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newScoreConfig.target_shift_type_ids.includes(type.id)
                              ? 'ring-2 ring-yellow-500 border-yellow-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: type.color, color: type.text_color || '#000000' }}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <hr />

                  {/* 対象曜日 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">対象曜日（複数選択可）</label>
                    <div className="flex gap-2">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setNewScoreConfig(prev => ({
                              ...prev,
                              filter_day_of_weeks: prev.filter_day_of_weeks.includes(index)
                                ? prev.filter_day_of_weeks.filter(d => d !== index)
                                : [...prev.filter_day_of_weeks, index]
                            }));
                          }}
                          className={`w-8 h-8 rounded-full text-xs font-medium border transition-all ${
                            newScoreConfig.filter_day_of_weeks.includes(index)
                              ? 'bg-yellow-500 text-white border-yellow-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          } ${index === 0 ? 'text-red-600' : ''} ${index === 6 ? 'text-blue-600' : ''}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">選択なし = 全曜日対象</p>
                  </div>

                  {/* 祝日・祝前日 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">追加対象日</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newScoreConfig.include_holiday}
                          onChange={(e) => setNewScoreConfig(prev => ({ ...prev, include_holiday: e.target.checked }))}
                          className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <span className="text-sm text-gray-700">祝日を含む</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newScoreConfig.include_pre_holiday}
                          onChange={(e) => setNewScoreConfig(prev => ({ ...prev, include_pre_holiday: e.target.checked }))}
                          className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <span className="text-sm text-gray-700">祝前日を含む</span>
                      </label>
                    </div>
                  </div>

                  {/* 除外日 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">除外日</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newScoreConfig.exclude_holiday}
                          onChange={(e) => setNewScoreConfig(prev => ({ ...prev, exclude_holiday: e.target.checked }))}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">祝日を除く</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newScoreConfig.exclude_pre_holiday}
                          onChange={(e) => setNewScoreConfig(prev => ({ ...prev, exclude_pre_holiday: e.target.checked }))}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">祝前日を除く</span>
                      </label>
                    </div>
                  </div>

                  <hr />

                  {/* 付与得点 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">付与得点</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newScoreConfig.points}
                      onChange={(e) => setNewScoreConfig(prev => ({ ...prev, points: parseFloat(e.target.value) || 0 }))}
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      min="-100"
                      max="100"
                    />
                    <span className="ml-2 text-sm text-gray-500">点</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowScoreConfigModal(false);
                    setEditingScoreConfig(null);
                    resetScoreConfigForm();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveScoreConfig}
                  disabled={!newScoreConfig.name || newScoreConfig.target_shift_type_ids.length === 0}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingScoreConfig ? '更新' : '追加'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 名前一覧表設定モーダル */}
      {showNameListConfigModal && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowNameListConfigModal(false);
              setEditingNameListConfig(null);
              resetNameListConfigForm();
            }}
          />
          {/* モーダル本体 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingNameListConfig ? '名前一覧表設定を編集' : '名前一覧表設定'}
                </h2>
                <button
                  onClick={() => {
                    setShowNameListConfigModal(false);
                    setEditingNameListConfig(null);
                    resetNameListConfigForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Icons.X />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* 既存の名前一覧設定一覧 */}
                {!editingNameListConfig && nameListConfigs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">登録済み設定</h3>
                    <div className="space-y-1">
                      {nameListConfigs.map(config => (
                        <div
                          key={config.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={config.is_active || false}
                              onChange={(e) => handleToggleNameListConfig(config.id, e.target.checked)}
                              className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{config.display_label}</div>
                              <div className="text-xs text-gray-500">{config.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditNameListConfig(config)}
                              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteNameListConfig(config.id)}
                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <hr className="my-4" />
                  </div>
                )}

                {/* 新規追加/編集フォーム */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    {editingNameListConfig ? '設定を編集' : '新規名前一覧設定'}
                  </h3>

                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">設定名（内部用）</label>
                      <input
                        type="text"
                        value={newNameListConfig.name}
                        onChange={(e) => setNewNameListConfig(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="例: 上当直担当"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">表示ラベル（列ヘッダー）</label>
                      <input
                        type="text"
                        value={newNameListConfig.display_label}
                        onChange={(e) => setNewNameListConfig(prev => ({ ...prev, display_label: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        placeholder="例: 上当直"
                      />
                    </div>
                  </div>

                  {/* 対象予定タイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">対象予定タイプ</label>
                    <div className="flex flex-wrap gap-1">
                      {scheduleTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewNameListConfig(prev => ({
                              ...prev,
                              target_schedule_type_ids: prev.target_schedule_type_ids.includes(type.id)
                                ? prev.target_schedule_type_ids.filter(id => id !== type.id)
                                : [...prev.target_schedule_type_ids, type.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newNameListConfig.target_schedule_type_ids.includes(type.id)
                              ? 'ring-2 ring-cyan-500 border-cyan-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: type.color, color: type.text_color || '#000000' }}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 対象シフトタイプ */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">対象シフトタイプ</label>
                    <div className="flex flex-wrap gap-1">
                      {shiftTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewNameListConfig(prev => ({
                              ...prev,
                              target_shift_type_ids: prev.target_shift_type_ids.includes(type.id)
                                ? prev.target_shift_type_ids.filter(id => id !== type.id)
                                : [...prev.target_shift_type_ids, type.id]
                            }));
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                            newNameListConfig.target_shift_type_ids.includes(type.id)
                              ? 'ring-2 ring-cyan-500 border-cyan-500'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: type.color, color: type.text_color || '#000000' }}
                        >
                          {type.display_label || type.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 対象時間帯 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">対象時間帯</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newNameListConfig.target_period_am}
                          onChange={(e) => setNewNameListConfig(prev => ({ ...prev, target_period_am: e.target.checked }))}
                          className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">AM</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newNameListConfig.target_period_pm}
                          onChange={(e) => setNewNameListConfig(prev => ({ ...prev, target_period_pm: e.target.checked }))}
                          className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">PM</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newNameListConfig.target_period_night}
                          onChange={(e) => setNewNameListConfig(prev => ({ ...prev, target_period_night: e.target.checked }))}
                          className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">夜勤帯</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowNameListConfigModal(false);
                    setEditingNameListConfig(null);
                    resetNameListConfigForm();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveNameListConfig}
                  disabled={!newNameListConfig.name || !newNameListConfig.display_label || (newNameListConfig.target_schedule_type_ids.length === 0 && newNameListConfig.target_shift_type_ids.length === 0)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingNameListConfig ? '更新' : '追加'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* シフト自動割り振りモーダル */}
      {showAutoAssignModal && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowAutoAssignModal(false);
              setAutoAssignPreview(null);
              setGeneralShiftPreview(null);
            }}
          />
          {/* モーダル本体 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  シフト自動割り振り
                </h2>
                <button
                  onClick={() => {
                    setShowAutoAssignModal(false);
                    setAutoAssignPreview(null);
                    setGeneralShiftPreview(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Icons.X />
                </button>
              </div>

              {/* タブ切り替え */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => {
                    setAutoAssignMode('night_shift');
                    setAutoAssignPreview(null);
                    setGeneralShiftPreview(null);
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    autoAssignMode === 'night_shift'
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  当直割り振り
                </button>
                <button
                  onClick={() => {
                    setAutoAssignMode('general_shift');
                    setAutoAssignPreview(null);
                    setGeneralShiftPreview(null);
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    autoAssignMode === 'general_shift'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  一般シフト割り振り
                </button>
              </div>

              {/* 当直割り振りタブ */}
              {autoAssignMode === 'night_shift' && (
              <div className="p-4 space-y-4">
                {/* シフト選択 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700">シフト選択</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">当直シフト *</label>
                      <select
                        value={autoAssignConfig.nightShiftTypeId || ''}
                        onChange={(e) => setAutoAssignConfig(prev => ({ ...prev, nightShiftTypeId: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">選択してください</option>
                        {shiftTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.display_label || type.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">当直明けシフト *</label>
                      <select
                        value={autoAssignConfig.dayAfterShiftTypeId || ''}
                        onChange={(e) => setAutoAssignConfig(prev => ({ ...prev, dayAfterShiftTypeId: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">選択してください</option>
                        {shiftTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.display_label || type.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 連続不可チェック対象の当直 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      連続不可チェック対象の当直
                      <span className="ml-1 text-gray-400 font-normal">（未選択時は割り振る当直のみ）</span>
                    </label>
                    <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
                      {shiftTypes.map(type => (
                        <label key={type.id} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoAssignConfig.excludeNightShiftTypeIds.includes(type.id)}
                            onChange={(e) => {
                              setAutoAssignConfig(prev => ({
                                ...prev,
                                excludeNightShiftTypeIds: e.target.checked
                                  ? [...prev.excludeNightShiftTypeIds, type.id]
                                  : prev.excludeNightShiftTypeIds.filter(id => id !== type.id)
                              }));
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-xs text-gray-700">{type.display_label || type.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      選択した当直が前後2日以内にある場合、割り振り不可になります
                    </p>
                  </div>
                </div>

                {/* 候補者選択の優先順位 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-700">候補者選択の優先順位</h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="duty-priority-mode"
                        value="count"
                        checked={autoAssignConfig.priorityMode === 'count'}
                        onChange={() => setAutoAssignConfig(prev => ({ ...prev, priorityMode: 'count' }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">回数ベース</span>
                      <span className="text-xs text-gray-500">（同一シフト回数が少ない人から）</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="duty-priority-mode"
                        value="score"
                        checked={autoAssignConfig.priorityMode === 'score'}
                        onChange={() => setAutoAssignConfig(prev => ({ ...prev, priorityMode: 'score' }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">得点ベース</span>
                      <span className="text-xs text-gray-500">（総得点が低い人から）</span>
                    </label>
                  </div>
                </div>

                {/* 対象者選択 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700">対象者</h3>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selectionMode"
                        checked={autoAssignConfig.selectionMode === 'filter'}
                        onChange={() => setAutoAssignConfig(prev => ({ ...prev, selectionMode: 'filter' }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">属性で絞り込み</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selectionMode"
                        checked={autoAssignConfig.selectionMode === 'individual'}
                        onChange={() => setAutoAssignConfig(prev => ({ ...prev, selectionMode: 'individual' }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">個別選択</span>
                    </label>
                  </div>

                  {autoAssignConfig.selectionMode === 'filter' ? (
                    <div className="space-y-3 pl-2 border-l-2 border-emerald-200">
                      {/* チーム */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">チーム</label>
                        <div className="flex gap-2">
                          {(['A', 'B'] as const).map(team => (
                            <button
                              key={team}
                              onClick={() => {
                                setAutoAssignConfig(prev => ({
                                  ...prev,
                                  filterTeams: prev.filterTeams.includes(team)
                                    ? prev.filterTeams.filter(t => t !== team)
                                    : [...prev.filterTeams, team]
                                }));
                              }}
                              className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                                autoAssignConfig.filterTeams.includes(team)
                                  ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                                  : 'bg-gray-50 border-gray-300 text-gray-700'
                              }`}
                            >
                              {team}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 当直レベル */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">当直レベル</label>
                        <div className="flex gap-2">
                          {['上', '中', '下'].map(level => (
                            <button
                              key={level}
                              onClick={() => {
                                setAutoAssignConfig(prev => ({
                                  ...prev,
                                  filterNightShiftLevels: prev.filterNightShiftLevels.includes(level)
                                    ? prev.filterNightShiftLevels.filter(l => l !== level)
                                    : [...prev.filterNightShiftLevels, level]
                                }));
                              }}
                              className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                                autoAssignConfig.filterNightShiftLevels.includes(level)
                                  ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                                  : 'bg-gray-50 border-gray-300 text-gray-700'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 心外/産科/ICU */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'filterCanCardiac', label: '心外' },
                          { key: 'filterCanObstetric', label: '産科' },
                          { key: 'filterCanIcu', label: 'ICU' },
                        ].map(item => (
                          <div key={item.key}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{item.label}</label>
                            <div className="flex gap-1">
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`autoAssign_${item.key}`}
                                  checked={autoAssignConfig[item.key as keyof typeof autoAssignConfig] === null}
                                  onChange={() => {
                                    setAutoAssignConfig(prev => ({ ...prev, [item.key]: null }));
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                />
                                <span className="text-xs text-gray-700">全て</span>
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`autoAssign_${item.key}`}
                                  checked={autoAssignConfig[item.key as keyof typeof autoAssignConfig] === true}
                                  onChange={() => {
                                    setAutoAssignConfig(prev => ({ ...prev, [item.key]: true }));
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                />
                                <span className="text-xs text-gray-700">可</span>
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`autoAssign_${item.key}`}
                                  checked={autoAssignConfig[item.key as keyof typeof autoAssignConfig] === false}
                                  onChange={() => {
                                    setAutoAssignConfig(prev => ({ ...prev, [item.key]: false }));
                                  }}
                                  className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                />
                                <span className="text-xs text-gray-700">不可</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pl-2 border-l-2 border-emerald-200 max-h-40 overflow-y-auto">
                      {members.map(member => (
                        <label key={member.staff_id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={autoAssignConfig.selectedMemberIds.includes(member.staff_id)}
                            onChange={(e) => {
                              setAutoAssignConfig(prev => ({
                                ...prev,
                                selectedMemberIds: e.target.checked
                                  ? [...prev.selectedMemberIds, member.staff_id]
                                  : prev.selectedMemberIds.filter(id => id !== member.staff_id)
                              }));
                            }}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">{member.name}</span>
                          <span className="text-xs text-gray-500">({member.team})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* 対象日選択 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700">対象日</h3>

                  {/* 期間指定 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">開始日</label>
                      <input
                        type="date"
                        value={autoAssignConfig.startDate || ''}
                        onChange={(e) => setAutoAssignConfig(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">終了日</label>
                      <input
                        type="date"
                        value={autoAssignConfig.endDate || ''}
                        onChange={(e) => setAutoAssignConfig(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 日付選択モード */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">対象日選択方法</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setAutoAssignConfig(prev => ({ ...prev, dateSelectionMode: 'period' }))}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          autoAssignConfig.dateSelectionMode === 'period'
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        期間のみ
                      </button>
                      <button
                        onClick={() => setAutoAssignConfig(prev => ({ ...prev, dateSelectionMode: 'weekday' }))}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          autoAssignConfig.dateSelectionMode === 'weekday'
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        期間+曜日
                      </button>
                      <button
                        onClick={() => setAutoAssignConfig(prev => ({ ...prev, dateSelectionMode: 'specific' }))}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          autoAssignConfig.dateSelectionMode === 'specific'
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        個別選択
                      </button>
                    </div>
                  </div>

                  {/* 期間のみモードの説明 */}
                  {autoAssignConfig.dateSelectionMode === 'period' && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 border border-gray-200">
                      上記期間内の全日が対象になります
                    </div>
                  )}

                  {/* 期間＋曜日指定モード */}
                  {autoAssignConfig.dateSelectionMode === 'weekday' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">曜日（選択なしは全曜日）</label>
                        <div className="flex gap-1">
                          {WEEKDAYS.map((day, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setAutoAssignConfig(prev => ({
                                  ...prev,
                                  targetWeekdays: prev.targetWeekdays.includes(idx)
                                    ? prev.targetWeekdays.filter(w => w !== idx)
                                    : [...prev.targetWeekdays, idx]
                                }));
                              }}
                              className={`w-8 h-8 rounded text-xs font-medium border transition-all ${
                                autoAssignConfig.targetWeekdays.includes(idx)
                                  ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                                  : 'bg-gray-50 border-gray-300 text-gray-700'
                              } ${idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : ''}`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 祝日・祝前日オプション */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setAutoAssignConfig(prev => ({
                            ...prev,
                            includeHolidays: !prev.includeHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            autoAssignConfig.includeHolidays
                              ? 'bg-red-100 border-red-400 text-red-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝日
                        </button>
                        <button
                          onClick={() => setAutoAssignConfig(prev => ({
                            ...prev,
                            includePreHolidays: !prev.includePreHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            autoAssignConfig.includePreHolidays
                              ? 'bg-orange-100 border-orange-400 text-orange-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝前日
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setAutoAssignConfig(prev => ({
                            ...prev,
                            excludeHolidays: !prev.excludeHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            autoAssignConfig.excludeHolidays
                              ? 'bg-gray-700 border-gray-700 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝日除外
                        </button>
                        <button
                          onClick={() => setAutoAssignConfig(prev => ({
                            ...prev,
                            excludePreHolidays: !prev.excludePreHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            autoAssignConfig.excludePreHolidays
                              ? 'bg-gray-700 border-gray-700 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝前日除外
                        </button>
                      </div>
                    </>
                  )}

                  {/* 個別日付選択モード */}
                  {autoAssignConfig.dateSelectionMode === 'specific' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        日付をクリックして選択（選択: {(autoAssignConfig.specificDates || []).length}日）
                      </label>
                      <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
                        {(() => {
                          // 期間に基づいて日付リストを生成
                          let daysToShow: DayData[] = [];
                          const startD = autoAssignConfig.startDate;
                          const endD = autoAssignConfig.endDate;

                          if (startD && endD) {
                            daysToShow = generateDaysForPeriod(startD, endD);
                          } else if (startD) {
                            const lastDay = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
                            daysToShow = generateDaysForPeriod(startD, lastDay);
                          } else if (endD) {
                            const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
                            daysToShow = generateDaysForPeriod(firstDay, endD);
                          } else {
                            // デフォルトは現在表示中の月
                            daysToShow = daysData;
                          }

                          if (daysToShow.length === 0) {
                            return <p className="text-xs text-gray-400 text-center py-4">表示する日付がありません</p>;
                          }

                          // 月ごとにグループ化
                          const monthGroups: { [key: string]: DayData[] } = {};
                          daysToShow.forEach(day => {
                            const monthKey = day.date.slice(0, 7); // YYYY-MM
                            if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
                            monthGroups[monthKey].push(day);
                          });

                          return Object.entries(monthGroups).map(([monthKey, days]) => {
                            // カレンダー表示用に週の開始（日曜日）に揃える
                            const firstDayOfMonth = days[0];
                            const startWeekday = firstDayOfMonth.dayOfWeek; // 0=日曜
                            const emptySlots = startWeekday; // 月初めまでの空白

                            return (
                              <div key={monthKey} className="mb-4">
                                <div className="text-xs font-bold text-gray-700 mb-2 sticky top-0 bg-gray-50 py-1">
                                  {monthKey.replace('-', '年')}月
                                </div>
                                {/* 曜日ヘッダー */}
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                  {['日', '月', '火', '水', '木', '金', '土'].map((dayName, idx) => (
                                    <div
                                      key={dayName}
                                      className={`text-center text-xs font-medium py-1 ${
                                        idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
                                      }`}
                                    >
                                      {dayName}
                                    </div>
                                  ))}
                                </div>
                                {/* カレンダーグリッド */}
                                <div className="grid grid-cols-7 gap-1">
                                  {/* 月初めまでの空白 */}
                                  {Array.from({ length: emptySlots }).map((_, idx) => (
                                    <div key={`empty-${idx}`} className="h-8" />
                                  ))}
                                  {/* 日付ボタン */}
                                  {days.map(day => {
                                    const isSelected = (autoAssignConfig.specificDates || []).includes(day.date);
                                    return (
                                      <button
                                        key={day.date}
                                        onClick={() => {
                                          setAutoAssignConfig(prev => ({
                                            ...prev,
                                            specificDates: isSelected
                                              ? (prev.specificDates || []).filter(date => date !== day.date)
                                              : [...(prev.specificDates || []), day.date].sort()
                                          }));
                                        }}
                                        className={`h-8 w-full text-xs rounded border transition-all font-medium ${
                                          isSelected
                                            ? 'bg-emerald-500 border-emerald-600 text-white'
                                            : 'bg-white border-gray-200 hover:bg-gray-100'
                                        } ${!isSelected && (day.dayOfWeek === 0 || day.isHoliday) ? 'text-red-500' : ''} ${
                                          !isSelected && day.dayOfWeek === 6 ? 'text-blue-500' : ''
                                        }`}
                                        title={`${day.date}${day.holidayName ? ` (${day.holidayName})` : ''}`}
                                      >
                                        {day.day}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {(autoAssignConfig.specificDates || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(autoAssignConfig.specificDates || []).map(date => (
                            <span key={date} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                              {date}
                              <button
                                onClick={() => setAutoAssignConfig(prev => ({
                                  ...prev,
                                  specificDates: (prev.specificDates || []).filter(d => d !== date)
                                }))}
                                className="hover:text-emerald-900"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => setAutoAssignConfig(prev => ({ ...prev, specificDates: [] }))}
                            className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                          >
                            全解除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* プリセット選択 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">プリセット</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowDutyPresetSaveModal(true)}
                        className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        {editingDutyPreset ? '上書き保存' : '保存'}
                      </button>
                      <button
                        onClick={() => setShowDutyPresetManageModal(true)}
                        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        管理
                      </button>
                    </div>
                  </div>
                  {editingDutyPreset && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-sm text-emerald-700">
                        編集中: <strong>{editingDutyPreset.name}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingDutyPreset(null);
                          setDutyPresetSaveName('');
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-800"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}
                  <select
                    value={selectedDutyPresetId || ''}
                    onChange={(e) => {
                      const presetId = e.target.value ? Number(e.target.value) : null;
                      setSelectedDutyPresetId(presetId);
                      if (presetId) {
                        const preset = dutyAssignPresets.find(p => p.id === presetId);
                        if (preset) {
                          setAutoAssignConfig(prev => ({
                            ...prev,
                            nightShiftTypeId: preset.night_shift_type_id,
                            dayAfterShiftTypeId: preset.day_after_shift_type_id,
                            excludeNightShiftTypeIds: preset.exclude_night_shift_type_ids || [],
                            selectionMode: (preset.selection_mode as 'filter' | 'individual') || 'filter',
                            filterTeams: (preset.filter_teams || []) as ('A' | 'B')[],
                            filterNightShiftLevels: preset.filter_night_shift_levels || [],
                            filterCanCardiac: preset.filter_can_cardiac,
                            filterCanObstetric: preset.filter_can_obstetric,
                            filterCanIcu: preset.filter_can_icu,
                            selectedMemberIds: preset.selected_member_ids || [],
                            dateSelectionMode: (preset.date_selection_mode as 'period' | 'weekday' | 'specific') || 'period',
                            targetWeekdays: preset.target_weekdays || [],
                            includeHolidays: preset.include_holidays,
                            includePreHolidays: preset.include_pre_holidays,
                            excludeHolidays: preset.exclude_holidays || false,
                            excludePreHolidays: preset.exclude_pre_holidays || false,
                            priorityMode: (preset.priority_mode as 'count' | 'score') || 'count',
                          }));
                        }
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">プリセットを選択...</option>
                    {dutyAssignPresets.map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                </div>

                {/* プレビュー実行ボタン */}
                <div className="pt-2">
                  <button
                    onClick={handleAutoAssignPreview}
                    disabled={!autoAssignConfig.nightShiftTypeId || !autoAssignConfig.dayAfterShiftTypeId || isAutoAssigning}
                    className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAutoAssigning ? 'プレビュー生成中...' : 'プレビュー実行'}
                  </button>
                </div>

                {/* プレビュー結果 */}
                {autoAssignPreview && (
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700">プレビュー結果</h3>

                    {autoAssignPreview.assignments.length === 0 ? (
                      <p className="text-sm text-gray-500">割り振り可能な組み合わせがありません</p>
                    ) : (
                      <>
                        <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-2 space-y-1">
                          {autoAssignPreview.assignments
                            .filter(a => a.type === 'night_shift')
                            .map((assignment, idx) => {
                              const dayAfter = autoAssignPreview.assignments.find(
                                a => a.type === 'day_after' && a.staffId === assignment.staffId &&
                                  new Date(a.date).getTime() === new Date(assignment.date).getTime() + 24 * 60 * 60 * 1000
                              );
                              const date = new Date(assignment.date);
                              const dayName = WEEKDAYS[date.getDay()];
                              return (
                                <div key={idx} className="text-xs text-gray-700">
                                  {assignment.date}({dayName}) → {assignment.staffName}（当直）
                                  {dayAfter && `, ${dayAfter.date} → ${dayAfter.staffName}（明）`}
                                </div>
                              );
                            })}
                        </div>

                        {/* サマリー */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-600 mb-1">割り振り回数サマリー</h4>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(autoAssignPreview.summary.entries()).map(([staffId, count]) => {
                              const member = members.find(m => m.staff_id === staffId);
                              return (
                                <span key={staffId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {member?.name || staffId}: {count}回
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 適用ボタン */}
                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => {
                      setShowAutoAssignModal(false);
                      setAutoAssignPreview(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAutoAssignApply}
                    disabled={!autoAssignPreview || autoAssignPreview.assignments.length === 0 || isAutoAssigning}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAutoAssigning ? '適用中...' : '適用'}
                  </button>
                </div>
              </div>
              )}

              {/* 一般シフト割り振りタブ */}
              {autoAssignMode === 'general_shift' && (
              <div className="p-4 space-y-4">
                {/* シフト選択 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700">シフト選択</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">割り振るシフト *</label>
                    <select
                      value={generalShiftConfig.shiftTypeId || ''}
                      onChange={(e) => setGeneralShiftConfig(prev => ({ ...prev, shiftTypeId: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {shiftTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.display_label || type.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 当直不可の日は割り振らないオプション */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalShiftConfig.excludeNightShiftUnavailable}
                      onChange={(e) => setGeneralShiftConfig(prev => ({ ...prev, excludeNightShiftUnavailable: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">当直不可（×）の日は割り振らない</span>
                  </label>
                </div>

                {/* 候補者選択の優先順位 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-700">候補者選択の優先順位</h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="general-priority-mode"
                        value="count"
                        checked={generalShiftConfig.priorityMode === 'count'}
                        onChange={() => setGeneralShiftConfig(prev => ({ ...prev, priorityMode: 'count' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">回数ベース</span>
                      <span className="text-xs text-gray-500">（同一シフト回数が少ない人から）</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="general-priority-mode"
                        value="score"
                        checked={generalShiftConfig.priorityMode === 'score'}
                        onChange={() => setGeneralShiftConfig(prev => ({ ...prev, priorityMode: 'score' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">得点ベース</span>
                      <span className="text-xs text-gray-500">（総得点が低い人から）</span>
                    </label>
                  </div>
                </div>

                {/* 対象者選択 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700">対象者</h3>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="generalSelectionMode"
                        checked={generalShiftConfig.selectionMode === 'filter'}
                        onChange={() => setGeneralShiftConfig(prev => ({ ...prev, selectionMode: 'filter' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">属性で絞り込み</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="generalSelectionMode"
                        checked={generalShiftConfig.selectionMode === 'individual'}
                        onChange={() => setGeneralShiftConfig(prev => ({ ...prev, selectionMode: 'individual' }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">個別選択</span>
                    </label>
                  </div>

                  {generalShiftConfig.selectionMode === 'filter' && (
                    <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">チーム</label>
                        <div className="flex gap-2">
                          {['A', 'B'].map(team => (
                            <label key={team} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={generalShiftConfig.filterTeams.includes(team as 'A' | 'B')}
                                onChange={(e) => {
                                  setGeneralShiftConfig(prev => ({
                                    ...prev,
                                    filterTeams: e.target.checked
                                      ? [...prev.filterTeams, team as 'A' | 'B']
                                      : prev.filterTeams.filter(t => t !== team)
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{team}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">当直レベル</label>
                        <div className="flex gap-2">
                          {['上', '中', '下', 'なし'].map(level => (
                            <label key={level} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={generalShiftConfig.filterNightShiftLevels.includes(level)}
                                onChange={(e) => {
                                  setGeneralShiftConfig(prev => ({
                                    ...prev,
                                    filterNightShiftLevels: e.target.checked
                                      ? [...prev.filterNightShiftLevels, level]
                                      : prev.filterNightShiftLevels.filter(l => l !== level)
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{level}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">立場</label>
                        <div className="flex flex-wrap gap-2">
                          {['常勤', '非常勤', 'ローテーター', '研修医'].map(position => (
                            <label key={position} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={generalShiftConfig.filterPositions.includes(position)}
                                onChange={(e) => {
                                  setGeneralShiftConfig(prev => ({
                                    ...prev,
                                    filterPositions: e.target.checked
                                      ? [...prev.filterPositions, position]
                                      : prev.filterPositions.filter(p => p !== position)
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{position}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {/* 医療対応・残り番フィルター */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">医療対応・残り番</label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { key: 'filterCanCardiac' as const, label: '心外' },
                            { key: 'filterCanObstetric' as const, label: '産科' },
                            { key: 'filterCanIcu' as const, label: 'ICU' },
                            { key: 'filterCanRemainingDuty' as const, label: '残り番' },
                          ].map(item => (
                            <div key={item.key} className="flex flex-col">
                              <span className="text-xs text-gray-500 mb-0.5">{item.label}</span>
                              <div className="flex gap-1">
                                {[
                                  { value: null, label: '全' },
                                  { value: true, label: '可' },
                                  { value: false, label: '不可' },
                                ].map(opt => (
                                  <label key={String(opt.value)} className="flex items-center gap-0.5">
                                    <input
                                      type="radio"
                                      name={`general_${item.key}`}
                                      checked={generalShiftConfig[item.key] === opt.value}
                                      onChange={() => setGeneralShiftConfig(prev => ({ ...prev, [item.key]: opt.value }))}
                                      className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-600">{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        対象者: {getTargetMembersForGeneralShift().length}名
                        {generalShiftConfig.filterTeams.length === 0 && generalShiftConfig.filterNightShiftLevels.length === 0 && generalShiftConfig.filterPositions.length === 0 && ' （フィルタ未設定: 全員対象）'}
                      </div>
                    </div>
                  )}

                  {generalShiftConfig.selectionMode === 'individual' && (
                    <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-lg border border-gray-200">
                      {[...members].sort((a, b) => {
                        // チーム→立場→display_order→staff_id でソート
                        if (a.team !== b.team) return a.team === 'A' ? -1 : 1;
                        const posA = POSITION_ORDER[a.position] ?? 99;
                        const posB = POSITION_ORDER[b.position] ?? 99;
                        if (posA !== posB) return posA - posB;
                        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
                        return a.staff_id.localeCompare(b.staff_id);
                      }).map(member => (
                        <label key={member.staff_id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={generalShiftConfig.selectedMemberIds.includes(member.staff_id)}
                            onChange={(e) => {
                              setGeneralShiftConfig(prev => ({
                                ...prev,
                                selectedMemberIds: e.target.checked
                                  ? [...prev.selectedMemberIds, member.staff_id]
                                  : prev.selectedMemberIds.filter(id => id !== member.staff_id)
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{member.name}</span>
                          <span className="text-xs text-gray-400">{member.team} / {member.position}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* 対象日選択 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700">対象日</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">開始日</label>
                      <input
                        type="date"
                        value={generalShiftConfig.startDate}
                        onChange={(e) => setGeneralShiftConfig(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">終了日</label>
                      <input
                        type="date"
                        value={generalShiftConfig.endDate}
                        onChange={(e) => setGeneralShiftConfig(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* 日付選択モード */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGeneralShiftConfig(prev => ({ ...prev, dateSelectionMode: 'period' }))}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        generalShiftConfig.dateSelectionMode === 'period'
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      期間のみ
                    </button>
                    <button
                      onClick={() => setGeneralShiftConfig(prev => ({ ...prev, dateSelectionMode: 'weekday' }))}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        generalShiftConfig.dateSelectionMode === 'weekday'
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      期間+曜日
                    </button>
                    <button
                      onClick={() => setGeneralShiftConfig(prev => ({ ...prev, dateSelectionMode: 'specific' }))}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        generalShiftConfig.dateSelectionMode === 'specific'
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      個別選択
                    </button>
                  </div>

                  {/* 期間のみモード */}
                  {generalShiftConfig.dateSelectionMode === 'period' && (
                    <div className="text-xs text-gray-500">
                      上記期間内の全日が対象になります
                    </div>
                  )}

                  {/* 期間＋曜日指定モード */}
                  {generalShiftConfig.dateSelectionMode === 'weekday' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">曜日（選択なしは全曜日）</label>
                      <div className="flex gap-1">
                        {WEEKDAYS.map((day, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setGeneralShiftConfig(prev => ({
                                ...prev,
                                targetWeekdays: prev.targetWeekdays.includes(idx)
                                  ? prev.targetWeekdays.filter(w => w !== idx)
                                  : [...prev.targetWeekdays, idx]
                              }));
                            }}
                            className={`w-8 h-8 rounded text-xs font-medium border transition-all ${
                              generalShiftConfig.targetWeekdays.includes(idx)
                                ? 'bg-blue-100 border-blue-500 text-blue-700'
                                : 'bg-gray-50 border-gray-300 text-gray-700'
                            } ${idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : ''}`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      {/* 祝日・祝前日オプション */}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setGeneralShiftConfig(prev => ({
                            ...prev,
                            includeHolidays: !prev.includeHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            generalShiftConfig.includeHolidays
                              ? 'bg-red-100 border-red-400 text-red-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝日
                        </button>
                        <button
                          onClick={() => setGeneralShiftConfig(prev => ({
                            ...prev,
                            includePreHolidays: !prev.includePreHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            generalShiftConfig.includePreHolidays
                              ? 'bg-orange-100 border-orange-400 text-orange-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝前日
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setGeneralShiftConfig(prev => ({
                            ...prev,
                            excludeHolidays: !prev.excludeHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            generalShiftConfig.excludeHolidays
                              ? 'bg-gray-700 border-gray-700 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝日除外
                        </button>
                        <button
                          onClick={() => setGeneralShiftConfig(prev => ({
                            ...prev,
                            excludePreHolidays: !prev.excludePreHolidays
                          }))}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                            generalShiftConfig.excludePreHolidays
                              ? 'bg-gray-700 border-gray-700 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          祝前日除外
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 個別日付選択モード */}
                  {generalShiftConfig.dateSelectionMode === 'specific' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        日付をクリックして選択（選択: {(generalShiftConfig.specificDates || []).length}日）
                      </label>
                      <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
                        {(() => {
                          let daysToShow: DayData[] = [];
                          const startD = generalShiftConfig.startDate;
                          const endD = generalShiftConfig.endDate;

                          if (startD && endD) {
                            daysToShow = generateDaysForPeriod(startD, endD);
                          } else {
                            daysToShow = daysData;
                          }

                          if (daysToShow.length === 0) {
                            return <p className="text-xs text-gray-400 text-center py-4">表示する日付がありません</p>;
                          }

                          const monthGroups: { [key: string]: DayData[] } = {};
                          daysToShow.forEach(day => {
                            const monthKey = day.date.slice(0, 7);
                            if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
                            monthGroups[monthKey].push(day);
                          });

                          return Object.entries(monthGroups).map(([monthKey, days]) => {
                            const firstDayOfMonth = days[0];
                            const startWeekday = firstDayOfMonth.dayOfWeek;
                            const emptySlots = startWeekday;

                            return (
                              <div key={monthKey} className="mb-4">
                                <div className="text-xs font-bold text-gray-700 mb-2">
                                  {monthKey.replace('-', '年')}月
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                  {WEEKDAYS.map((wd, i) => (
                                    <div key={i} className={`text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                                      {wd}
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {Array(emptySlots).fill(null).map((_, i) => (
                                    <div key={`empty-${i}`} className="w-8 h-8" />
                                  ))}
                                  {days.map(day => {
                                    const isSelected = (generalShiftConfig.specificDates || []).includes(day.date);
                                    return (
                                      <button
                                        key={day.date}
                                        onClick={() => {
                                          setGeneralShiftConfig(prev => ({
                                            ...prev,
                                            specificDates: isSelected
                                              ? (prev.specificDates || []).filter(d => d !== day.date)
                                              : [...(prev.specificDates || []), day.date]
                                          }));
                                        }}
                                        className={`w-8 h-8 rounded text-xs font-medium border transition-all ${
                                          isSelected
                                            ? 'bg-blue-500 border-blue-600 text-white'
                                            : day.isHoliday
                                              ? 'bg-pink-50 border-pink-200 text-pink-600 hover:bg-pink-100'
                                              : day.dayOfWeek === 0
                                                ? 'bg-red-50 border-gray-200 text-red-600 hover:bg-red-100'
                                                : day.dayOfWeek === 6
                                                  ? 'bg-blue-50 border-gray-200 text-blue-600 hover:bg-blue-100'
                                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                                        }`}
                                      >
                                        {day.day || new Date(day.date).getDate()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* 除外フィルター */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">除外フィルター</h3>
                    <div className="relative">
                      <button
                        onClick={() => {
                          const menu = document.getElementById('exclusion-filter-menu');
                          if (menu) menu.classList.toggle('hidden');
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        + ルール追加
                      </button>
                      <div
                        id="exclusion-filter-menu"
                        className="hidden absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[180px]"
                      >
                        <button
                          onClick={() => {
                            setGeneralShiftConfig(prev => ({
                              ...prev,
                              exclusionFilters: [...prev.exclusionFilters, {
                                type: 'date_based',
                                target_days: ['same_day'],
                                exclude_shift_type_ids: [],
                                exclude_schedule_type_ids: [],
                                exclude_vacation: false,
                                exclude_vacation_periods: [],
                              }]
                            }));
                            document.getElementById('exclusion-filter-menu')?.classList.add('hidden');
                          }}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 transition-colors"
                        >
                          日付ベース（シフト/予定/年休）
                        </button>
                        <button
                          onClick={() => {
                            setGeneralShiftConfig(prev => ({
                              ...prev,
                              exclusionFilters: [...prev.exclusionFilters, {
                                type: 'work_location_based',
                                target_days: ['same_day'],
                                target_periods: [],
                                exclude_work_location_ids: [],
                              }]
                            }));
                            document.getElementById('exclusion-filter-menu')?.classList.add('hidden');
                          }}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 transition-colors"
                        >
                          勤務場所ベース
                        </button>
                      </div>
                    </div>
                  </div>

                  {generalShiftConfig.exclusionFilters.length === 0 && (
                    <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">
                      除外フィルターが設定されていません
                    </div>
                  )}

                  {generalShiftConfig.exclusionFilters.map((filter, filterIdx) => (
                    <div key={filterIdx} className="bg-gray-50 rounded-lg p-3 border border-gray-200 relative">
                      <button
                        onClick={() => {
                          setGeneralShiftConfig(prev => ({
                            ...prev,
                            exclusionFilters: prev.exclusionFilters.filter((_, i) => i !== filterIdx)
                          }));
                        }}
                        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="削除"
                      >
                        ×
                      </button>
                      <div className="text-xs font-medium text-gray-600 mb-2">
                        {filter.type === 'date_based' ? '日付ベース' : '勤務場所ベース'} ルール {filterIdx + 1}
                      </div>

                      {/* 対象日（共通） */}
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">対象日</label>
                        <div className="flex gap-2">
                          {[
                            { value: 'prev_day', label: '前日' },
                            { value: 'same_day', label: '当日' },
                            { value: 'next_day', label: '翌日' },
                          ].map(opt => (
                            <label key={opt.value} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={filter.target_days.includes(opt.value as TargetDay)}
                                onChange={(e) => {
                                  setGeneralShiftConfig(prev => ({
                                    ...prev,
                                    exclusionFilters: prev.exclusionFilters.map((f, i) =>
                                      i === filterIdx ? {
                                        ...f,
                                        target_days: e.target.checked
                                          ? [...f.target_days, opt.value as TargetDay]
                                          : f.target_days.filter(d => d !== opt.value)
                                      } : f
                                    )
                                  }));
                                }}
                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-700">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {filter.type === 'date_based' && (
                        <>
                          {/* シフトタイプ除外 */}
                          <div className="mb-2">
                            <label className="block text-xs text-gray-500 mb-1">除外シフト</label>
                            <div className="flex flex-wrap gap-1">
                              {shiftTypes.map(st => (
                                <label key={st.id} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs">
                                  <input
                                    type="checkbox"
                                    checked={filter.exclude_shift_type_ids.includes(st.id)}
                                    onChange={(e) => {
                                      setGeneralShiftConfig(prev => ({
                                        ...prev,
                                        exclusionFilters: prev.exclusionFilters.map((f, i) =>
                                          i === filterIdx && f.type === 'date_based' ? {
                                            ...f,
                                            exclude_shift_type_ids: e.target.checked
                                              ? [...f.exclude_shift_type_ids, st.id]
                                              : f.exclude_shift_type_ids.filter(id => id !== st.id)
                                          } : f
                                        )
                                      }));
                                    }}
                                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span>{st.display_label || st.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 予定タイプ除外 */}
                          <div className="mb-2">
                            <label className="block text-xs text-gray-500 mb-1">除外予定</label>
                            <div className="flex flex-wrap gap-1">
                              {scheduleTypes.map(st => (
                                <label key={st.id} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs">
                                  <input
                                    type="checkbox"
                                    checked={filter.exclude_schedule_type_ids.includes(st.id)}
                                    onChange={(e) => {
                                      setGeneralShiftConfig(prev => ({
                                        ...prev,
                                        exclusionFilters: prev.exclusionFilters.map((f, i) =>
                                          i === filterIdx && f.type === 'date_based' ? {
                                            ...f,
                                            exclude_schedule_type_ids: e.target.checked
                                              ? [...f.exclude_schedule_type_ids, st.id]
                                              : f.exclude_schedule_type_ids.filter(id => id !== st.id)
                                          } : f
                                        )
                                      }));
                                    }}
                                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span>{st.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 年休除外 */}
                          <div>
                            <label className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={filter.exclude_vacation}
                                onChange={(e) => {
                                  setGeneralShiftConfig(prev => ({
                                    ...prev,
                                    exclusionFilters: prev.exclusionFilters.map((f, i) =>
                                      i === filterIdx && f.type === 'date_based' ? {
                                        ...f,
                                        exclude_vacation: e.target.checked,
                                        exclude_vacation_periods: e.target.checked ? ['full_day', 'am', 'pm'] : []
                                      } : f
                                    )
                                  }));
                                }}
                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-500">年休を除外</span>
                            </label>
                            {filter.exclude_vacation && (
                              <div className="flex gap-2 ml-5">
                                {[
                                  { value: 'full_day', label: '全日' },
                                  { value: 'am', label: 'AM' },
                                  { value: 'pm', label: 'PM' },
                                ].map(opt => (
                                  <label key={opt.value} className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={filter.exclude_vacation_periods.includes(opt.value as VacationPeriod)}
                                      onChange={(e) => {
                                        setGeneralShiftConfig(prev => ({
                                          ...prev,
                                          exclusionFilters: prev.exclusionFilters.map((f, i) =>
                                            i === filterIdx && f.type === 'date_based' ? {
                                              ...f,
                                              exclude_vacation_periods: e.target.checked
                                                ? [...f.exclude_vacation_periods, opt.value as VacationPeriod]
                                                : f.exclude_vacation_periods.filter(p => p !== opt.value)
                                            } : f
                                          )
                                        }));
                                      }}
                                      className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-700">{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {filter.type === 'work_location_based' && (
                        <>
                          {/* 対象時間帯 */}
                          <div className="mb-2">
                            <label className="block text-xs text-gray-500 mb-1">対象時間帯</label>
                            <div className="flex gap-2">
                              {[
                                { value: 'am', label: 'AM' },
                                { value: 'pm', label: 'PM' },
                                { value: 'night', label: '夜勤' },
                              ].map(opt => (
                                <label key={opt.value} className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={filter.target_periods.includes(opt.value as TimePeriod)}
                                    onChange={(e) => {
                                      setGeneralShiftConfig(prev => ({
                                        ...prev,
                                        exclusionFilters: prev.exclusionFilters.map((f, i) =>
                                          i === filterIdx && f.type === 'work_location_based' ? {
                                            ...f,
                                            target_periods: e.target.checked
                                              ? [...f.target_periods, opt.value as TimePeriod]
                                              : f.target_periods.filter(p => p !== opt.value)
                                          } : f
                                        )
                                      }));
                                    }}
                                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-700">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 勤務場所除外 */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">除外勤務場所</label>
                            <div className="flex flex-wrap gap-1">
                              {workLocationMaster.map(loc => (
                                <label key={loc.id} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs">
                                  <input
                                    type="checkbox"
                                    checked={filter.exclude_work_location_ids.includes(loc.id)}
                                    onChange={(e) => {
                                      setGeneralShiftConfig(prev => ({
                                        ...prev,
                                        exclusionFilters: prev.exclusionFilters.map((f, i) =>
                                          i === filterIdx && f.type === 'work_location_based' ? {
                                            ...f,
                                            exclude_work_location_ids: e.target.checked
                                              ? [...f.exclude_work_location_ids, loc.id]
                                              : f.exclude_work_location_ids.filter(id => id !== loc.id)
                                          } : f
                                        )
                                      }));
                                    }}
                                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span>{loc.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* プリセット */}
                <div className="space-y-3 border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">プリセット</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPresetSaveModal(true)}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        {editingShiftPreset ? '上書き保存' : '保存'}
                      </button>
                      <button
                        onClick={() => setShowPresetManageModal(true)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        管理
                      </button>
                    </div>
                  </div>
                  {editingShiftPreset && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-sm text-blue-700">
                        編集中: <strong>{editingShiftPreset.name}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingShiftPreset(null);
                          setPresetSaveName('');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}
                  <select
                    value={selectedPresetId || ''}
                    onChange={(e) => {
                      const presetId = e.target.value ? Number(e.target.value) : null;
                      setSelectedPresetId(presetId);
                      if (presetId) {
                        const preset = shiftAssignPresets.find(p => p.id === presetId);
                        if (preset) {
                          setGeneralShiftConfig(prev => ({
                            ...prev,
                            shiftTypeId: preset.shift_type_id,
                            selectionMode: (preset.selection_mode as 'filter' | 'individual') || 'filter',
                            filterTeams: (preset.filter_teams || []) as ('A' | 'B')[],
                            filterNightShiftLevels: preset.filter_night_shift_levels || [],
                            selectedMemberIds: preset.selected_member_ids || [],
                            dateSelectionMode: (preset.date_selection_mode as 'period' | 'weekday' | 'specific') || 'period',
                            targetWeekdays: preset.target_weekdays || [],
                            includeHolidays: preset.include_holidays || false,
                            includePreHolidays: preset.include_pre_holidays || false,
                            excludeHolidays: preset.exclude_holidays || false,
                            excludePreHolidays: preset.exclude_pre_holidays || false,
                            exclusionFilters: (preset.exclusion_filters as ExclusionFilter[]) || [],
                            priorityMode: (preset.priority_mode as 'count' | 'score') || 'count',
                          }));
                        }
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">プリセットを選択...</option>
                    {shiftAssignPresets.map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.name}</option>
                    ))}
                  </select>
                </div>

                {/* プレビューボタン */}
                <div className="flex justify-center">
                  <button
                    onClick={handleGeneralShiftPreview}
                    disabled={isAutoAssigning || !generalShiftConfig.shiftTypeId}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAutoAssigning ? 'プレビュー生成中...' : 'プレビュー実行'}
                  </button>
                </div>

                {/* プレビュー結果 */}
                {generalShiftPreview && (
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-bold text-gray-700">プレビュー結果</h3>

                    {generalShiftPreview.assignments.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                        割り振り可能な日がありませんでした
                      </div>
                    ) : (
                      <>
                        <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3 text-sm">
                          {generalShiftPreview.assignments.map((a, idx) => (
                            <div key={idx} className="py-1 border-b border-gray-200 last:border-b-0">
                              <span className="font-medium">{a.date}</span>
                              <span className="mx-2">→</span>
                              <span className="text-blue-600">{a.staffName}</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3">
                          <h4 className="text-xs font-bold text-gray-700 mb-2">割り振り回数サマリー</h4>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(generalShiftPreview.summary.entries())
                              .sort((a, b) => b[1] - a[1])
                              .map(([staffId, count]) => {
                                const member = members.find(m => m.staff_id === staffId);
                                return (
                                  <span key={staffId} className="inline-flex items-center px-2 py-1 bg-white rounded text-xs">
                                    <span className="font-medium text-gray-700">{member?.name || staffId}</span>
                                    <span className="ml-1 text-blue-600 font-bold">{count}回</span>
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 適用ボタン */}
                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => {
                      setShowAutoAssignModal(false);
                      setGeneralShiftPreview(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleGeneralShiftApply}
                    disabled={!generalShiftPreview || generalShiftPreview.assignments.length === 0 || isAutoAssigning}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAutoAssigning ? '適用中...' : '適用'}
                  </button>
                </div>
              </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* プリセット保存モーダル */}
      {showPresetSaveModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => { setShowPresetSaveModal(false); setEditingShiftPreset(null); }} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-96 max-w-[90vw]">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {editingShiftPreset ? 'プリセットを編集' : 'プリセットを保存'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">プリセット名 *</label>
                <input
                  type="text"
                  value={presetSaveName}
                  onChange={(e) => setPresetSaveName(e.target.value)}
                  placeholder="例: 当直明け割り振り"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">保存される設定:</p>
                <ul className="space-y-1">
                  <li>・シフトタイプ: {shiftTypes.find(s => s.id === generalShiftConfig.shiftTypeId)?.name || '未選択'}</li>
                  <li>・対象者設定: {generalShiftConfig.selectionMode === 'filter' ? 'フィルター' : '個別選択'}</li>
                  <li>・除外フィルター: {generalShiftConfig.exclusionFilters.length}件</li>
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPresetSaveModal(false);
                  setPresetSaveName('');
                  setEditingShiftPreset(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  if (!presetSaveName.trim()) {
                    alert('プリセット名を入力してください');
                    return;
                  }
                  try {
                    const presetData = {
                      name: presetSaveName.trim(),
                      shift_type_id: generalShiftConfig.shiftTypeId,
                      selection_mode: generalShiftConfig.selectionMode,
                      filter_teams: generalShiftConfig.filterTeams,
                      filter_night_shift_levels: generalShiftConfig.filterNightShiftLevels,
                      selected_member_ids: generalShiftConfig.selectedMemberIds,
                      date_selection_mode: generalShiftConfig.dateSelectionMode,
                      target_weekdays: generalShiftConfig.targetWeekdays,
                      include_holidays: generalShiftConfig.includeHolidays,
                      include_pre_holidays: generalShiftConfig.includePreHolidays,
                      exclude_holidays: generalShiftConfig.excludeHolidays,
                      exclude_pre_holidays: generalShiftConfig.excludePreHolidays,
                      exclusion_filters: generalShiftConfig.exclusionFilters,
                      priority_mode: generalShiftConfig.priorityMode,
                    };

                    let error;
                    if (editingShiftPreset) {
                      // 更新
                      const result = await supabase.from('shift_assign_preset')
                        .update(presetData)
                        .eq('id', editingShiftPreset.id);
                      error = result.error;
                    } else {
                      // 新規作成
                      const result = await supabase.from('shift_assign_preset').insert(presetData);
                      error = result.error;
                    }
                    if (error) throw error;

                    // プリセット一覧を再取得
                    const { data: presetsData } = await supabase
                      .from('shift_assign_preset')
                      .select('*')
                      .order('display_order');
                    setShiftAssignPresets(presetsData || []);

                    setShowPresetSaveModal(false);
                    setPresetSaveName('');
                    setEditingShiftPreset(null);
                    alert(editingShiftPreset ? 'プリセットを更新しました' : 'プリセットを保存しました');
                  } catch (err) {
                    console.error('プリセット保存エラー:', err);
                    alert('プリセットの保存に失敗しました');
                  }
                }}
                disabled={!presetSaveName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingShiftPreset ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* プリセット管理モーダル */}
      {showPresetManageModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowPresetManageModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">プリセット管理</h3>
            </div>
            <div className="p-4 overflow-y-auto flex-grow">
              {shiftAssignPresets.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  保存されたプリセットがありません
                </div>
              ) : (
                <div className="space-y-2">
                  {shiftAssignPresets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-grow">
                        <div className="font-medium text-gray-800">{preset.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          シフト: {shiftTypes.find(s => s.id === preset.shift_type_id)?.name || '-'}
                          {preset.exclusion_filters && Array.isArray(preset.exclusion_filters) && (
                            <span className="ml-2">・除外フィルター: {preset.exclusion_filters.length}件</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            // プリセットの内容をフォームに読み込む
                            setEditingShiftPreset(preset);
                            setGeneralShiftConfig(prev => ({
                              ...prev,
                              shiftTypeId: preset.shift_type_id,
                              selectionMode: (preset.selection_mode as 'filter' | 'individual') || 'filter',
                              filterTeams: (preset.filter_teams || []) as ('A' | 'B')[],
                              filterNightShiftLevels: preset.filter_night_shift_levels || [],
                              selectedMemberIds: preset.selected_member_ids || [],
                              dateSelectionMode: (preset.date_selection_mode as 'period' | 'weekday' | 'specific') || 'period',
                              targetWeekdays: preset.target_weekdays || [],
                              includeHolidays: preset.include_holidays || false,
                              includePreHolidays: preset.include_pre_holidays || false,
                              excludeHolidays: preset.exclude_holidays || false,
                              excludePreHolidays: preset.exclude_pre_holidays || false,
                              exclusionFilters: (preset.exclusion_filters as ExclusionFilter[]) || [],
                              priorityMode: (preset.priority_mode as 'count' | 'score') || 'count',
                            }));
                            setPresetSaveName(preset.name);
                            setShowPresetManageModal(false);
                            // モーダルを開かず、メインパネルで編集できるようにする
                          }}
                          className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`プリセット「${preset.name}」を削除しますか？`)) return;
                            try {
                              const { error } = await supabase
                                .from('shift_assign_preset')
                                .delete()
                                .eq('id', preset.id);
                              if (error) throw error;

                              setShiftAssignPresets(prev => prev.filter(p => p.id !== preset.id));
                              if (selectedPresetId === preset.id) {
                                setSelectedPresetId(null);
                              }
                            } catch (err) {
                              console.error('プリセット削除エラー:', err);
                              alert('プリセットの削除に失敗しました');
                            }
                          }}
                          className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowPresetManageModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </>
      )}

      {/* 当直プリセット保存モーダル */}
      {showDutyPresetSaveModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => { setShowDutyPresetSaveModal(false); setEditingDutyPreset(null); }} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-96 max-w-[90vw]">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {editingDutyPreset ? '当直プリセットを編集' : '当直プリセットを保存'}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">プリセット名 *</label>
                <input
                  type="text"
                  value={dutyPresetSaveName}
                  onChange={(e) => setDutyPresetSaveName(e.target.value)}
                  placeholder="例: 休日当直割り振り"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">保存される設定:</p>
                <ul className="space-y-1">
                  <li>・当直シフト: {shiftTypes.find(s => s.id === autoAssignConfig.nightShiftTypeId)?.name || '未選択'}</li>
                  <li>・当直明けシフト: {shiftTypes.find(s => s.id === autoAssignConfig.dayAfterShiftTypeId)?.name || '未選択'}</li>
                  <li>・対象者設定: {autoAssignConfig.selectionMode === 'filter' ? 'フィルター' : '個別選択'}</li>
                </ul>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDutyPresetSaveModal(false);
                  setDutyPresetSaveName('');
                  setEditingDutyPreset(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  if (!dutyPresetSaveName.trim()) {
                    alert('プリセット名を入力してください');
                    return;
                  }
                  try {
                    const presetData = {
                      name: dutyPresetSaveName.trim(),
                      night_shift_type_id: autoAssignConfig.nightShiftTypeId,
                      day_after_shift_type_id: autoAssignConfig.dayAfterShiftTypeId,
                      exclude_night_shift_type_ids: autoAssignConfig.excludeNightShiftTypeIds,
                      selection_mode: autoAssignConfig.selectionMode,
                      filter_teams: autoAssignConfig.filterTeams,
                      filter_night_shift_levels: autoAssignConfig.filterNightShiftLevels,
                      filter_can_cardiac: autoAssignConfig.filterCanCardiac,
                      filter_can_obstetric: autoAssignConfig.filterCanObstetric,
                      filter_can_icu: autoAssignConfig.filterCanIcu,
                      selected_member_ids: autoAssignConfig.selectedMemberIds,
                      date_selection_mode: autoAssignConfig.dateSelectionMode,
                      target_weekdays: autoAssignConfig.targetWeekdays,
                      include_holidays: autoAssignConfig.includeHolidays,
                      include_pre_holidays: autoAssignConfig.includePreHolidays,
                      exclude_holidays: autoAssignConfig.excludeHolidays,
                      exclude_pre_holidays: autoAssignConfig.excludePreHolidays,
                      priority_mode: autoAssignConfig.priorityMode,
                    };

                    let error;
                    if (editingDutyPreset) {
                      // 更新
                      const result = await supabase.from('duty_assign_preset')
                        .update(presetData)
                        .eq('id', editingDutyPreset.id);
                      error = result.error;
                    } else {
                      // 新規作成
                      const result = await supabase.from('duty_assign_preset').insert(presetData);
                      error = result.error;
                    }
                    if (error) throw error;

                    // プリセット一覧を再取得
                    const { data: presetsData } = await supabase
                      .from('duty_assign_preset')
                      .select('*')
                      .order('display_order');
                    setDutyAssignPresets(presetsData || []);

                    setShowDutyPresetSaveModal(false);
                    setDutyPresetSaveName('');
                    setEditingDutyPreset(null);
                    alert(editingDutyPreset ? 'プリセットを更新しました' : 'プリセットを保存しました');
                  } catch (err) {
                    console.error('プリセット保存エラー:', err);
                    alert('プリセットの保存に失敗しました');
                  }
                }}
                disabled={!dutyPresetSaveName.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingDutyPreset ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 当直プリセット管理モーダル */}
      {showDutyPresetManageModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowDutyPresetManageModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">当直プリセット管理</h3>
            </div>
            <div className="p-4 overflow-y-auto flex-grow">
              {dutyAssignPresets.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  保存されたプリセットがありません
                </div>
              ) : (
                <div className="space-y-2">
                  {dutyAssignPresets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-grow">
                        <div className="font-medium text-gray-800">{preset.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          当直: {shiftTypes.find(s => s.id === preset.night_shift_type_id)?.name || '-'}
                          <span className="ml-2">・明け: {shiftTypes.find(s => s.id === preset.day_after_shift_type_id)?.name || '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            // プリセットの内容をフォームに読み込む
                            setEditingDutyPreset(preset);
                            setAutoAssignConfig(prev => ({
                              ...prev,
                              nightShiftTypeId: preset.night_shift_type_id,
                              dayAfterShiftTypeId: preset.day_after_shift_type_id,
                              excludeNightShiftTypeIds: preset.exclude_night_shift_type_ids || [],
                              selectionMode: (preset.selection_mode as 'filter' | 'individual') || 'filter',
                              filterTeams: (preset.filter_teams || []) as ('A' | 'B')[],
                              filterNightShiftLevels: preset.filter_night_shift_levels || [],
                              filterCanCardiac: preset.filter_can_cardiac,
                              filterCanObstetric: preset.filter_can_obstetric,
                              filterCanIcu: preset.filter_can_icu,
                              selectedMemberIds: preset.selected_member_ids || [],
                              dateSelectionMode: (preset.date_selection_mode as 'period' | 'weekday' | 'specific') || 'period',
                              targetWeekdays: preset.target_weekdays || [],
                              includeHolidays: preset.include_holidays,
                              includePreHolidays: preset.include_pre_holidays,
                              excludeHolidays: preset.exclude_holidays || false,
                              excludePreHolidays: preset.exclude_pre_holidays || false,
                              priorityMode: (preset.priority_mode as 'count' | 'score') || 'count',
                            }));
                            setDutyPresetSaveName(preset.name);
                            setShowDutyPresetManageModal(false);
                            // モーダルを開かず、メインパネルで編集できるようにする
                          }}
                          className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`プリセット「${preset.name}」を削除しますか？`)) return;
                            try {
                              const { error } = await supabase
                                .from('duty_assign_preset')
                                .delete()
                                .eq('id', preset.id);
                              if (error) throw error;

                              setDutyAssignPresets(prev => prev.filter(p => p.id !== preset.id));
                              if (selectedDutyPresetId === preset.id) {
                                setSelectedDutyPresetId(null);
                              }
                            } catch (err) {
                              console.error('プリセット削除エラー:', err);
                              alert('プリセットの削除に失敗しました');
                            }
                          }}
                          className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setShowDutyPresetManageModal(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </>
      )}

      {/* シフト一括削除モーダル */}
      {showBulkDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowBulkDeleteModal(false);
              setBulkDeletePreview(null);
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900">シフト一括削除</h2>
                <button
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setBulkDeletePreview(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Icons.X />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-grow">
                {/* シフトタイプ選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">削除するシフト *</label>
                  <select
                    value={bulkDeleteConfig.shiftTypeId || ''}
                    onChange={(e) => {
                      setBulkDeleteConfig(prev => ({ ...prev, shiftTypeId: e.target.value ? Number(e.target.value) : null }));
                      setBulkDeletePreview(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">選択してください</option>
                    {shiftTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.display_label || type.name}</option>
                    ))}
                  </select>
                </div>

                {/* 期間選択 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                    <input
                      type="date"
                      value={bulkDeleteConfig.startDate}
                      onChange={(e) => {
                        setBulkDeleteConfig(prev => ({ ...prev, startDate: e.target.value }));
                        setBulkDeletePreview(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                    <input
                      type="date"
                      value={bulkDeleteConfig.endDate}
                      onChange={(e) => {
                        setBulkDeleteConfig(prev => ({ ...prev, endDate: e.target.value }));
                        setBulkDeletePreview(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* プレビューボタン */}
                <button
                  onClick={handleBulkDeletePreview}
                  disabled={!bulkDeleteConfig.shiftTypeId || isBulkDeleting}
                  className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkDeleting ? '検索中...' : '削除対象を検索'}
                </button>

                {/* プレビュー結果 */}
                {bulkDeletePreview && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                      <span className="font-medium text-gray-700">
                        削除対象: {bulkDeletePreview.shifts.length}件
                      </span>
                    </div>
                    {bulkDeletePreview.shifts.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-gray-600">日付</th>
                              <th className="px-3 py-2 text-left text-gray-600">職員</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {bulkDeletePreview.shifts.map((shift, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{shift.date}</td>
                                <td className="px-3 py-2 text-gray-900">{shift.staffName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        削除対象のシフトが見つかりませんでした
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* フッター */}
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowBulkDeleteModal(false);
                    setBulkDeletePreview(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleBulkDeleteApply}
                  disabled={!bulkDeletePreview || bulkDeletePreview.shifts.length === 0 || isBulkDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkDeleting ? '削除中...' : '削除実行'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 非表示メンバー設定モーダル */}
      {showHiddenMembersModal && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowHiddenMembersModal(false)}
          />
          {/* モーダル本体 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900">
                  非表示メンバー設定
                </h2>
                <button
                  onClick={() => setShowHiddenMembersModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <Icons.X />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-sm text-gray-600 mb-4">
                  予定表に表示しないメンバーを選択してください。<br />
                  <span className="text-gray-500 text-xs">※非表示メンバーは当直・シフト自動割り振りからも除外されます</span>
                </p>

                <div className="space-y-4">
                  {/* A表 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">A表</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {allUsersForHidden
                        .filter(u => u.team === 'A')
                        .map(user => (
                          <label key={user.staff_id} className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hiddenMemberIds.has(user.staff_id)}
                              onChange={() => toggleHiddenMember(user.staff_id)}
                              className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                            />
                            <span className="text-sm text-gray-700">{user.name}</span>
                            {hiddenMemberIds.has(user.staff_id) && (
                              <span className="text-xs text-gray-400">（非表示）</span>
                            )}
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* B表 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">B表</h3>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {allUsersForHidden
                        .filter(u => u.team === 'B')
                        .map(user => (
                          <label key={user.staff_id} className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hiddenMemberIds.has(user.staff_id)}
                              onChange={() => toggleHiddenMember(user.staff_id)}
                              className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                            />
                            <span className="text-sm text-gray-700">{user.name}</span>
                            {hiddenMemberIds.has(user.staff_id) && (
                              <span className="text-xs text-gray-400">（非表示）</span>
                            )}
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowHiddenMembersModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveHiddenMembers}
                  disabled={savingHidden}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingHidden ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
