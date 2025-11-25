// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  isHoliday,
  isConference,
  isEvent,
  checkDuplicateApplication,
  isWithinLotteryPeriod,
  isBeforeLotteryPeriod,
  checkAnnualLeavePointsAvailable,
  calculateInitialPriority,
  calculateAnnualLeavePoints,
  getCurrentLotteryPeriodInfo,
} from "@/lib/application";
import { requestCancellation } from "@/lib/cancellation";
import { useConfirm } from "@/components/ConfirmDialog";
import { PointsStatus } from "@/components/PointsStatus";
import type { Database } from "@/lib/database.types";

type Application = Database["public"]["Tables"]["application"]["Row"];
type Holiday = Database["public"]["Tables"]["holiday"]["Row"];
type Conference = Database["public"]["Tables"]["conference"]["Row"];
type Event = Database["public"]["Tables"]["event"]["Row"];
type Setting = Database["public"]["Tables"]["setting"]["Row"];

interface DayData {
  date: string;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
  isConference: boolean;
  conferenceName?: string;
  isEvent: boolean;
  eventName?: string;
  application?: Application;
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
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
  ),
  Grid: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
};

export default function ApplicationCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [setting, setSetting] = useState<Setting | null>(null);
  const [pointsInfo, setPointsInfo] = useState<any>(null);
  const [lotteryPeriodInfo, setLotteryPeriodInfo] = useState<{
    isWithinPeriod: boolean;
    targetMonth: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  // モーダル関連
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [modalMode, setModalMode] = useState<'apply' | 'detail'>('apply');
  const [applyPeriod, setApplyPeriod] = useState<'full_day' | 'am' | 'pm'>('full_day');
  const [applyLevel, setApplyLevel] = useState<1 | 2 | 3>(1);
  const [applyRemarks, setApplyRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [selectedDayWithinPeriod, setSelectedDayWithinPeriod] = useState<boolean | null>(null);
  const [selectedDayBeforePeriod, setSelectedDayBeforePeriod] = useState<boolean | null>(null);

  // LocalStorageからviewModeを読み込む
  useEffect(() => {
    const savedViewMode = localStorage.getItem('applicationCalendarViewMode');
    if (savedViewMode === 'list' || savedViewMode === 'grid') {
      setViewMode(savedViewMode);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    setUser(currentUser);

    // 抽選期間情報を取得
    const fetchLotteryPeriodInfo = async () => {
      const info = await getCurrentLotteryPeriodInfo();
      setLotteryPeriodInfo(info);
    };
    fetchLotteryPeriodInfo();

    fetchData(currentUser.staff_id);
  }, [router, currentYear, currentMonth]);

  // viewModeが変更されたらLocalStorageに保存
  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('applicationCalendarViewMode', mode);
  };

  const fetchData = async (staffId: string) => {
    setLoading(true);
    try {
      // 月の開始日と終了日を計算
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      // データを並列取得
      const [
        { data: holidaysData },
        { data: conferencesData },
        { data: eventsData },
        { data: applicationsData },
        { data: settingData }
      ] = await Promise.all([
        supabase.from("holiday").select("*"),
        supabase.from("conference").select("*"),
        supabase.from("event").select("*"),
        supabase.from("application")
          .select("*")
          .eq("staff_id", staffId)
          .gte("vacation_date", startDate)
          .lte("vacation_date", endDate)
          .not("status", "in", "(cancelled,cancelled_before_lottery,cancelled_after_lottery)"),
        supabase.from("setting").select("*").eq("id", 1).single()
      ]);

      setSetting(settingData);

      // 申請をマップ化
      const applicationsMap = new Map<string, Application>();
      (applicationsData || []).forEach((app) => {
        applicationsMap.set(app.vacation_date, app);
      });

      // 日付ごとのデータを構築
      const days: DayData[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayOfWeek = new Date(date).getDay();
        const holiday = holidaysData?.find((h) => h.holiday_date === date);
        const conference = conferencesData?.find((c) => c.conference_date === date);
        const event = eventsData?.find((e) => e.event_date === date);

        days.push({
          date,
          dayOfWeek,
          isHoliday: !!holiday,
          holidayName: holiday?.name,
          isConference: !!conference,
          conferenceName: conference?.name,
          isEvent: !!event,
          eventName: event?.name,
          application: applicationsMap.get(date),
        });
      }

      setDaysData(days);

      // 年休得点情報を取得
      if (settingData) {
        const points = await calculateAnnualLeavePoints(staffId, settingData.current_fiscal_year);
        if (points) {
          const { data: userData } = await supabase
            .from('user')
            .select('point_retention_rate')
            .eq('staff_id', staffId)
            .single();

          const maxPoints = Math.floor(
            (settingData.max_annual_leave_points * (userData?.point_retention_rate || 100)) / 100
          );

          setPointsInfo({
            ...points,
            maxPoints,
            remainingPoints: maxPoints - points.totalPoints,
            level1PointsPerApplication: settingData.level1_points,
            level2PointsPerApplication: settingData.level2_points,
            level3PointsPerApplication: settingData.level3_points,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const getApplicationBackgroundColor = (app: Application): string => {
    if (app.level === 1) {
      return app.status === "confirmed" ? "bg-red-600 text-white shadow-sm" : "bg-[#ffb3c8] text-red-900 border border-red-300";
    } else if (app.level === 2) {
      return app.status === "confirmed" ? "bg-blue-600 text-white shadow-sm" : "bg-blue-100 text-blue-800 border border-blue-200";
    } else if (app.is_within_lottery_period) {
      return app.status === "confirmed" ? "bg-green-600 text-white shadow-sm" : "bg-[#e0ffe0] text-green-900 border border-green-300";
    } else {
      return app.status === "confirmed" ? "bg-gray-600 text-white shadow-sm" : "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "before_lottery": return "抽選前";
      case "after_lottery": return "抽選済み";
      case "confirmed": return "確定";
      case "withdrawn": return "取り消し";
      case "pending_approval": return "確定後年休承認待ち";
      case "pending_cancellation": return "キャンセル承認待ち";
      default: return status;
    }
  };

  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case "full_day": return "全日";
      case "am": return "AM";
      case "pm": return "PM";
      default: return period;
    }
  };

  // 日付をタップしたときの処理
  const handleDayClick = async (day: DayData) => {
    setSelectedDay(day);
    if (day.application) {
      setModalMode('detail');
      setSelectedDayWithinPeriod(null);
      setSelectedDayBeforePeriod(null);
    } else {
      setModalMode('apply');
      setApplyPeriod(day.dayOfWeek === 6 ? 'am' : 'full_day');
      setApplyRemarks('');

      // 選択した日付の抽選期間を判定
      const withinPeriod = await isWithinLotteryPeriod(day.date);
      const beforePeriod = await isBeforeLotteryPeriod(day.date);
      setSelectedDayWithinPeriod(withinPeriod);
      setSelectedDayBeforePeriod(beforePeriod);

      // 抽選期間内ならレベル1、期間外ならレベル3をデフォルトに
      if (withinPeriod) {
        setApplyLevel(1);
      } else {
        setApplyLevel(3);
      }
    }
    setShowModal(true);
  };

  // 申請可能かをチェック
  const canApply = (day: DayData): boolean => {
    // 既に申請済み
    if (day.application) return false;
    // 日曜日
    if (day.dayOfWeek === 0) return false;
    // 祝日
    if (day.isHoliday) return false;
    // 主要学会
    if (day.isConference) return false;
    // 過去日
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(day.date);
    if (targetDate <= today) return false;

    return true;
  };

  // キャンセル可能かをチェック
  const canCancel = (app: Application): boolean => {
    const nonCancellableStatuses = [
      "confirmed",
      "cancelled",
      "cancelled_before_lottery",
      "cancelled_after_lottery",
      "withdrawn",
      "pending_approval",
      "pending_cancellation"
    ];

    if (nonCancellableStatuses.includes(app.status)) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vacationDate = new Date(app.vacation_date);
    vacationDate.setHours(0, 0, 0, 0);

    return vacationDate > today;
  };

  // 申請処理
  const handleSubmit = async () => {
    if (!user || !selectedDay) return;

    setSubmitting(true);
    try {
      const vacationDate = selectedDay.date;

      // バリデーション1: 未来日チェック
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(vacationDate);
      if (targetDate <= today) {
        alert("過去の日付には申請できません");
        setSubmitting(false);
        return;
      }

      // バリデーション2: 日曜チェック
      if (selectedDay.dayOfWeek === 0) {
        alert("日曜日には申請できません");
        setSubmitting(false);
        return;
      }

      // バリデーション3: 土曜のPM/全日チェック
      if (selectedDay.dayOfWeek === 6 && applyPeriod !== 'am') {
        alert("土曜日はAMのみ申請可能です");
        setSubmitting(false);
        return;
      }

      // バリデーション4: 祝日チェック
      if (await isHoliday(vacationDate)) {
        alert("祝日には申請できません");
        setSubmitting(false);
        return;
      }

      // バリデーション5: 主要学会チェック
      const conference = await isConference(vacationDate);
      if (conference) {
        alert(`主要学会「${conference.name}」があるため申請できません`);
        setSubmitting(false);
        return;
      }

      // バリデーション6: イベントチェック（警告のみ）
      const event = await isEvent(vacationDate);
      if (event) {
        const proceed = await confirm({
          title: "確認",
          message: `この日は「${event.name}」があります。申請を続けますか？`,
        });
        if (!proceed) {
          setSubmitting(false);
          return;
        }
      }

      // バリデーション7: 重複チェック
      const isDuplicate = await checkDuplicateApplication(user.staff_id, vacationDate);
      if (isDuplicate) {
        alert("この日付には既に申請があります");
        setSubmitting(false);
        return;
      }

      // バリデーション8: 抽選期間チェック
      const withinPeriod = await isWithinLotteryPeriod(vacationDate);

      // バリデーション9: レベル1・2は抽選期間内のみ申請可能
      if ((applyLevel === 1 || applyLevel === 2) && !withinPeriod) {
        alert("レベル1・2は抽選参加期間内のみ申請可能です");
        setSubmitting(false);
        return;
      }

      // バリデーション10: 得点チェック
      const pointsCheck = await checkAnnualLeavePointsAvailable(
        user.staff_id,
        applyLevel,
        applyPeriod
      );
      if (!pointsCheck || !pointsCheck.canApply) {
        alert(`年休得点が不足しています（残り: ${pointsCheck?.remainingPoints?.toFixed(2) || 0}点）`);
        setSubmitting(false);
        return;
      }

      // バリデーション11: レベル3は抽選期間開始後のみ
      if (applyLevel === 3) {
        const beforePeriod = await isBeforeLotteryPeriod(vacationDate);
        if (beforePeriod) {
          alert("レベル3は抽選参加期間の開始後にのみ申請可能です");
          setSubmitting(false);
          return;
        }
      }

      // ステータスと優先順位の決定
      let status: "before_lottery" | "after_lottery" | "pending_approval" = "before_lottery";
      let priority: number | null = null;

      if (applyLevel === 3) {
        // レベル3の確定処理後チェック
        const { data: calendarData, error: calendarError } = await supabase
          .from("calendar_management")
          .select("*")
          .eq("vacation_date", vacationDate)
          .single();

        // 確定処理済みの場合
        if (!calendarError && calendarData && calendarData.status === "confirmation_completed") {
          // マンパワーが設定されていない場合はエラー
          if (calendarData.max_people === null) {
            alert("この日付はマンパワーが設定されていないため申請できません");
            setSubmitting(false);
            return;
          }

          // 確定済み申請数をカウント
          const { count: confirmedCount } = await supabase
            .from("application")
            .select("*", { count: "exact", head: true })
            .eq("vacation_date", vacationDate)
            .eq("status", "confirmed");

          // マンパワー上限に達している場合は申請不可
          if ((confirmedCount || 0) >= calendarData.max_people) {
            alert("マンパワーの上限に達しているため申請できません");
            setSubmitting(false);
            return;
          }

          // 余裕がある場合は承認待ちステータスで申請
          status = "pending_approval";
          priority = await calculateInitialPriority(vacationDate);
        } else {
          // 確定処理前のレベル3
          status = withinPeriod ? "before_lottery" : "after_lottery";
          priority = await calculateInitialPriority(vacationDate);
        }
      } else {
        // レベル1・2
        status = "before_lottery";
        priority = await calculateInitialPriority(vacationDate);
      }

      // 申請実行
      const { error } = await supabase.from("application").insert({
        staff_id: user.staff_id,
        vacation_date: vacationDate,
        period: applyPeriod,
        level: applyLevel,
        is_within_lottery_period: withinPeriod,
        status,
        priority,
        remarks: applyRemarks || null,
      });

      if (error) {
        console.error("Error submitting application:", error);
        alert("申請に失敗しました");
        setSubmitting(false);
        return;
      }

      alert("申請が完了しました");
      setShowModal(false);
      fetchData(user.staff_id);
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // キャンセル処理
  const handleCancel = async () => {
    if (!selectedDay?.application || !user) return;

    const app = selectedDay.application;

    // 期間判定
    const withinPeriod = await isWithinLotteryPeriod(app.vacation_date);

    // 確認メッセージの作成
    let confirmMessage = "";
    if (withinPeriod) {
      confirmMessage = "この申請をキャンセルしますか？\n（期間内のため、即座にキャンセルされ得点が回復します）";
    } else if (app.status === "before_lottery") {
      confirmMessage = "この申請をキャンセルしますか？\n（期間外のため、管理者の承認が必要です。承認後に得点が回復します）";
    } else if (app.status === "after_lottery") {
      confirmMessage = "この申請をキャンセルしますか？\n（抽選後のため、即座にキャンセルされますが得点は回復しません）";
    } else {
      confirmMessage = "この申請をキャンセルしますか？";
    }

    const confirmed = await confirm({
      title: "キャンセル確認",
      message: confirmMessage,
    });
    if (!confirmed) return;

    // 抽選後キャンセルの場合は2段階確認
    if (app.status === "after_lottery") {
      const secondConfirmed = await confirm({
        title: "最終確認",
        message: "本当にキャンセルしますか。年休得点は回復しません。",
        variant: "danger",
      });
      if (!secondConfirmed) return;
    }

    setCancelingId(app.id);

    try {
      const result = await requestCancellation(app.id);

      if (!result.success) {
        alert(result.error || "キャンセルに失敗しました");
        setCancelingId(null);
        return;
      }

      setShowModal(false);
      await fetchData(user.staff_id);

      if (result.requiresApproval) {
        alert("キャンセル申請を送信しました。管理者の承認をお待ちください。");
      } else if (result.pointsWillRecover) {
        alert("申請をキャンセルしました。得点が回復します。");
      } else {
        alert("申請をキャンセルしました。");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setCancelingId(null);
    }
  };

  // カレンダーグリッド用のデータ生成
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
      {ConfirmDialog}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                年休申請カレンダー
              </h1>
            </div>
            <div className="flex items-center">
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

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 抽選期間情報 */}
          {lotteryPeriodInfo && (
            <div
              className={`${
                lotteryPeriodInfo.isWithinPeriod
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              } border px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm`}
            >
              <div className="mt-0.5 shrink-0">
                <Icons.Info />
              </div>
              <div>
                {lotteryPeriodInfo.isWithinPeriod ? (
                  <p className="text-sm font-medium">
                    現在は<span className="font-bold">{lotteryPeriodInfo.targetMonth}</span>の抽選参加可能期間です（{lotteryPeriodInfo.periodStart}〜{lotteryPeriodInfo.periodEnd}）
                  </p>
                ) : (
                  <p className="text-sm font-medium">
                    現在は抽選参加可能期間外です（<span className="font-bold">{lotteryPeriodInfo.targetMonth}</span>の抽選参加可能期間は{lotteryPeriodInfo.periodStart}〜{lotteryPeriodInfo.periodEnd}です）
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 年休得点状況 */}
          <PointsStatus pointsInfo={pointsInfo} />

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* 表示切り替えボタン */}
            <div className="flex justify-end mb-4">
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icons.List />
                  <span className="hidden sm:inline">リスト</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icons.Grid />
                  <span className="hidden sm:inline">カレンダー</span>
                </button>
              </div>
            </div>

            {/* 月移動 */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
              >
                <Icons.ChevronLeft />
                <span className="hidden sm:inline text-xs sm:text-sm">前月</span>
              </button>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                {currentYear}年{currentMonth}月
              </h2>
              <button
                onClick={() => changeMonth(1)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
              >
                <span className="hidden sm:inline text-xs sm:text-sm">次月</span>
                <Icons.ChevronRight />
              </button>
            </div>

            {/* 直近5ヶ月タブ */}
            <div className="mb-4 flex justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
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
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tabYear}年{tabMonth}月
                  </button>
                );
              })}
            </div>

            {/* 凡例 */}
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <Icons.Info />
                <p className="font-bold text-[10px] sm:text-xs text-gray-900">凡例</p>
              </div>
              <div className="grid grid-cols-3 gap-1 sm:gap-2 text-[9px] sm:text-[10px] text-gray-900">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[#ffb3c8] border border-red-300 rounded"></div>
                  <span className="text-gray-900">L1申請中</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-600 rounded"></div>
                  <span className="text-gray-900">L1確定</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span className="text-gray-900">L2申請中</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span className="text-gray-900">L2確定</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[#e0ffe0] border border-green-300 rounded"></div>
                  <span className="text-gray-900">L3申請中</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span className="text-gray-900">L3確定</span>
                </div>
              </div>
            </div>
          </div>

          {/* カレンダー表示 */}
          {viewMode === 'list' ? (
            // リスト表示
            <div className="space-y-2">
              {daysData.map((day) => {
                const isApplicable = canApply(day);
                const isPast = new Date(day.date) <= new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={day.date}
                    onClick={() => (isApplicable || day.application) && handleDayClick(day)}
                    className={`rounded-xl p-3 sm:p-4 transition-all ${getDateBackgroundColor(day)} border border-gray-200 ${
                      (isApplicable || day.application) ? 'cursor-pointer hover:shadow-md' : 'opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`text-xl sm:text-2xl font-bold ${getDateTextColor(day)}`}>
                          {day.date.split('-')[2]}
                        </span>
                        <span className={`text-xs sm:text-sm px-2 py-0.5 rounded-md ${
                          day.dayOfWeek === 0 ? 'bg-[#ffb3c8] text-red-900' :
                          day.dayOfWeek === 6 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {["日", "月", "火", "水", "木", "金", "土"][day.dayOfWeek]}
                        </span>
                        {day.isHoliday && (
                          <span className="text-xs font-medium bg-[#ffb3c8] text-red-900 px-2 py-0.5 rounded-md">
                            {day.holidayName}
                          </span>
                        )}
                        {day.isConference && (
                          <span className="text-xs font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">
                            {day.conferenceName}
                          </span>
                        )}
                        {day.isEvent && (
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                            {day.eventName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {day.application ? (
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getApplicationBackgroundColor(day.application)}`}>
                            {getPeriodLabel(day.application.period)} / L{day.application.level} / {getStatusLabel(day.application.status)}
                          </div>
                        ) : isApplicable ? (
                          <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                            <Icons.Plus />
                            申請
                          </button>
                        ) : !isPast && (day.isHoliday || day.isConference || day.dayOfWeek === 0) ? (
                          <span className="text-xs text-gray-400">申請不可</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // グリッド表示
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
                    return <div key={`empty-${index}`} className="min-h-[70px] sm:min-h-[90px] bg-gray-50 rounded-lg" />;
                  }

                  const isApplicable = canApply(day);

                  return (
                    <div
                      key={day.date}
                      onClick={() => (isApplicable || day.application) && handleDayClick(day)}
                      className={`min-h-[70px] sm:min-h-[90px] rounded-lg p-1 sm:p-2 flex flex-col transition-all border border-gray-200 ${getDateBackgroundColor(day)} ${
                        (isApplicable || day.application) ? 'cursor-pointer hover:shadow-md' : 'opacity-60'
                      }`}
                    >
                      {/* 日付 */}
                      <div className="flex items-start justify-between mb-0.5 sm:mb-1">
                        <span className={`text-sm sm:text-base font-bold leading-none ${getDateTextColor(day)}`}>
                          {day.date.split('-')[2]}
                        </span>
                        {isApplicable && !day.application && (
                          <span className="text-blue-600 text-[10px] sm:text-xs">+</span>
                        )}
                      </div>

                      {/* 祝日・主要学会・イベント */}
                      {(day.isHoliday || day.isConference || day.isEvent) && (
                        <div className="text-[7px] sm:text-[9px] font-medium mb-0.5 truncate">
                          {day.isHoliday && <span className="text-red-900">{day.holidayName}</span>}
                          {day.isConference && <span className="text-orange-800">{day.conferenceName}</span>}
                          {day.isEvent && <span className="text-blue-700">{day.eventName}</span>}
                        </div>
                      )}

                      {/* 申請状況 */}
                      {day.application && (
                        <div className={`flex-1 flex items-center justify-center rounded text-[8px] sm:text-[10px] font-bold ${getApplicationBackgroundColor(day.application)}`}>
                          <span>L{day.application.level}</span>
                          <span className="mx-0.5">/</span>
                          <span>{getPeriodLabel(day.application.period)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 申請/詳細モーダル */}
      {showModal && selectedDay && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className={`text-xl font-bold ${getDateTextColor(selectedDay)}`}>
                  {currentYear}年{currentMonth}月{selectedDay.date.split('-')[2]}日
                </h3>
                <span className={`text-sm px-2 py-0.5 rounded-md ${
                  selectedDay.dayOfWeek === 0 ? 'bg-[#ffb3c8] text-red-900' :
                  selectedDay.dayOfWeek === 6 ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {["日", "月", "火", "水", "木", "金", "土"][selectedDay.dayOfWeek]}
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-6">
              {modalMode === 'apply' ? (
                // 申請フォーム
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900">年休申請</h4>

                  {selectedDay.isEvent && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      この日は「{selectedDay.eventName}」があります
                    </div>
                  )}

                  {/* 期間選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">期間</label>
                    <div className="flex gap-2">
                      {['full_day', 'am', 'pm'].map((period) => {
                        const disabled = selectedDay.dayOfWeek === 6 && period !== 'am';
                        return (
                          <button
                            key={period}
                            onClick={() => !disabled && setApplyPeriod(period as any)}
                            disabled={disabled}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              applyPeriod === period
                                ? 'bg-blue-600 text-white'
                                : disabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {getPeriodLabel(period)}
                          </button>
                        );
                      })}
                    </div>
                    {selectedDay.dayOfWeek === 6 && (
                      <p className="mt-1 text-xs text-gray-500">土曜日はAMのみ申請可能です</p>
                    )}
                  </div>

                  {/* レベル選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">レベル</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((level) => {
                        // レベル1・2は抽選期間内のみ選択可能
                        const isLevel12Disabled = (level === 1 || level === 2) && selectedDayWithinPeriod === false;
                        // レベル3は抽選期間開始後のみ選択可能
                        const isLevel3Disabled = level === 3 && selectedDayBeforePeriod === true;
                        const disabled = isLevel12Disabled || isLevel3Disabled;

                        return (
                          <button
                            key={level}
                            onClick={() => !disabled && setApplyLevel(level as any)}
                            disabled={disabled}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              applyLevel === level
                                ? level === 1 ? 'bg-red-600 text-white' :
                                  level === 2 ? 'bg-blue-600 text-white' :
                                  'bg-green-600 text-white'
                                : disabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            レベル{level}
                          </button>
                        );
                      })}
                    </div>
                    {selectedDayWithinPeriod === false && (
                      <p className="mt-1 text-xs text-orange-600">抽選参加期間外のためレベル3のみ選択可能です</p>
                    )}
                    {selectedDayBeforePeriod === true && (
                      <p className="mt-1 text-xs text-orange-600">抽選参加期間開始前のためレベル1・2のみ選択可能です</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      消費得点: {setting ? (applyPeriod === 'full_day' ? 1 : 0.5) * (applyLevel === 1 ? setting.level1_points : applyLevel === 2 ? setting.level2_points : setting.level3_points) : '-'}点
                    </p>
                  </div>

                  {/* 備考 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">備考（任意）</label>
                    <textarea
                      value={applyRemarks}
                      onChange={(e) => setApplyRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      rows={3}
                      placeholder="備考を入力..."
                    />
                  </div>

                  {/* ボタン */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {submitting ? '申請中...' : '申請する'}
                    </button>
                  </div>
                </div>
              ) : (
                // 詳細表示
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900">申請詳細</h4>

                  {selectedDay.application && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">期間</span>
                          <span className="font-medium">{getPeriodLabel(selectedDay.application.period)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">レベル</span>
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            selectedDay.application.level === 1 ? 'bg-[#ffb3c8] text-red-900' :
                            selectedDay.application.level === 2 ? 'bg-blue-100 text-blue-800' :
                            'bg-[#e0ffe0] text-green-900'
                          }`}>
                            レベル{selectedDay.application.level}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ステータス</span>
                          <span className="font-medium">{getStatusLabel(selectedDay.application.status)}</span>
                        </div>
                        {selectedDay.application.priority && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">優先順位</span>
                            <span className="font-medium">{selectedDay.application.priority}</span>
                          </div>
                        )}
                        {selectedDay.application.remarks && (
                          <div>
                            <span className="text-sm text-gray-600 block mb-1">備考</span>
                            <p className="text-sm bg-white p-2 rounded border border-gray-200">{selectedDay.application.remarks}</p>
                          </div>
                        )}
                      </div>

                      {/* キャンセルボタン */}
                      {canCancel(selectedDay.application) && (
                        <button
                          onClick={handleCancel}
                          disabled={cancelingId === selectedDay.application.id}
                          className="w-full px-4 py-2 bg-red-50 hover:bg-[#ffb3c8] text-red-600 font-medium rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                        >
                          {cancelingId === selectedDay.application.id ? 'キャンセル中...' : 'この申請をキャンセル'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
