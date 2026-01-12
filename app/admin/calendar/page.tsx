// @ts-nocheck
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  performLottery,
  performLotteryForDate,
  confirmApplications,
  confirmAllApplicationsForMonth,
  confirmSingleApplication,
  cancelConfirmation,
  recalculatePriorities,
  isCurrentlyInLotteryPeriodForDate,
} from "@/lib/application";
import { exchangePriorityAndLevel } from "@/lib/priority-exchange";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Database } from "@/lib/database.types";

type Application = Database["public"]["Tables"]["application"]["Row"] & {
  user: { name: string };
};
type CalendarManagement = Database["public"]["Tables"]["calendar_management"]["Row"];
type Holiday = Database["public"]["Tables"]["holiday"]["Row"];
type Conference = Database["public"]["Tables"]["conference"]["Row"];
type Event = Database["public"]["Tables"]["event"]["Row"];

interface DayData {
  date: string;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
  isConference: boolean;
  conferenceName?: string;
  isEvent: boolean;
  eventName?: string;
  calendar?: CalendarManagement;
  applications: Application[];
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
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  RefreshCw: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
  ),
};

function AdminCalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);

  // URLパラメータから年月を取得、なければ現在の年月を使用
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [processing, setProcessing] = useState(false);
  const [capacities, setCapacities] = useState<Record<string, string>>({});
  const [showLotteryPeriodApplications, setShowLotteryPeriodApplications] = useState(true);
  const [lotteryPeriodStatusMap, setLotteryPeriodStatusMap] = useState<Map<number, boolean>>(new Map());
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // URLパラメータから年月を取得
  useEffect(() => {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    if (yearParam) setCurrentYear(parseInt(yearParam));
    if (monthParam) setCurrentMonth(parseInt(monthParam));
  }, [searchParams]);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!isAdmin()) {
      alert("管理者のみアクセスできます");
      router.push("/admin/home");
      return;
    }

    // システム表示設定を取得
    const fetchSystemSettings = async () => {
      const { data, error } = await supabase
        .from("setting")
        .select("show_lottery_period_applications")
        .eq("id", 1)
        .single();

      if (!error && data) {
        setShowLotteryPeriodApplications(data.show_lottery_period_applications ?? true);
      }
    };

    fetchSystemSettings();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, currentYear, currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 月の開始日と終了日を計算
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      // データを並列取得（パフォーマンス改善）
      const [
        { data: holidaysData },
        { data: conferencesData },
        { data: eventsData },
        { data: calendarDataAll },
        { data: applicationsDataAll },
        { data: setting }
      ] = await Promise.all([
        supabase.from("holiday").select("*"),
        supabase.from("conference").select("*"),
        supabase.from("event").select("*"),
        supabase.from("calendar_management").select("*").gte("vacation_date", startDate).lte("vacation_date", endDate),
        supabase.from("application").select("*, user:staff_id(name)").gte("vacation_date", startDate).lte("vacation_date", endDate).not("status", "in", "(cancelled,cancelled_before_lottery,cancelled_after_lottery)").order("vacation_date", { ascending: true }).order("priority", { ascending: true }),
        supabase.from("setting").select("*").eq("id", 1).single()
      ]);

      setHolidays(holidaysData || []);
      setConferences(conferencesData || []);
      setEvents(eventsData || []);

      // 日付ごとにデータを整理
      const calendarMap = new Map<string, CalendarManagement>();
      calendarDataAll?.forEach((cal) => {
        calendarMap.set(cal.vacation_date, cal);
      });

      const applicationsMap = new Map<string, Application[]>();
      (applicationsDataAll || []).forEach((app) => {
        const apps = applicationsMap.get(app.vacation_date) || [];
        apps.push(app as Application);
        applicationsMap.set(app.vacation_date, apps);
      });

      // 各申請に対して抽選期間内かを判定（クライアント側で計算 - パフォーマンス改善）
      const lotteryStatusMap = new Map<number, boolean>();
      if (setting) {
        const today = new Date();
        for (const app of (applicationsDataAll || [])) {
          const vacation = new Date(app.vacation_date);
          // 注意: setMonthを使うと月末日の問題が発生するため、年月を直接計算する
          const vacationYear = vacation.getFullYear();
          const vacationMonth = vacation.getMonth();

          // Xヶ月前を計算（年をまたぐ場合も考慮）
          let targetYear = vacationYear;
          let targetMonth = vacationMonth - setting.lottery_period_months;
          while (targetMonth < 0) {
            targetMonth += 12;
            targetYear -= 1;
          }

          const startDate = new Date(
            targetYear,
            targetMonth,
            setting.lottery_period_start_day
          );
          const endDate = new Date(
            targetYear,
            targetMonth,
            setting.lottery_period_end_day,
            23, 59, 59
          );

          const isInLotteryPeriod = today >= startDate && today <= endDate;
          lotteryStatusMap.set(app.id, isInLotteryPeriod);
        }
      }
      setLotteryPeriodStatusMap(lotteryStatusMap);

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
          calendar: calendarMap.get(date),
          applications: applicationsMap.get(date) || [],
        });
      }

      setDaysData(days);

      // マンパワーの初期値を設定
      const initialCapacities: Record<string, string> = {};
      days.forEach((day) => {
        if (day.calendar?.max_people !== null && day.calendar?.max_people !== undefined) {
          initialCapacities[day.date] = String(day.calendar.max_people);
        }
      });
      setCapacities(initialCapacities);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLottery = async () => {
    const confirmed = await confirm({
      title: "抽選の確認",
      message: `${currentYear}年${currentMonth}月の抽選を実施しますか？`,
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);
    const result = await performLottery(currentYear, currentMonth);

    if (result.success) {
      alert("抽選を実施しました");
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } else {
      alert(result.error || "抽選に失敗しました");
    }

    setProcessing(false);
  };

  const handleLotteryForDate = async (date: string) => {
    const confirmed = await confirm({
      title: "抽選の確認",
      message: `${date}の抽選を実施しますか？`,
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);
    const result = await performLotteryForDate(date);

    if (result.success) {
      alert("抽選を実施しました");
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } else {
      alert(result.error || "抽選に失敗しました");
    }

    setProcessing(false);
  };

  const handleBatchConfirm = async () => {
    const confirmed = await confirm({
      title: "一括確定の確認",
      message: `${currentYear}年${currentMonth}月のマンパワー設定済み日程を一括確定しますか？`,
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);
    const result = await confirmAllApplicationsForMonth(currentYear, currentMonth);

    if (result.success) {
      alert(`${result.processedCount || 0}日分の確定処理が完了しました`);
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } else {
      alert(result.error || "一括確定に失敗しました");
    }

    setProcessing(false);
  };

  const handleConfirmAll = async (date: string) => {
    const confirmed = await confirm({
      title: "確定の確認",
      message: `${date}の年休を確定しますか？`,
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);
    const result = await confirmApplications(date);

    if (result.success) {
      alert("年休を確定しました");
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } else {
      alert(result.error || "確定に失敗しました");
    }

    setProcessing(false);
  };

  const handleConfirmSingle = async (applicationId: number) => {
    const confirmed = await confirm({
      title: "確定の確認",
      message: "この申請を確定しますか？",
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);
    const result = await confirmSingleApplication(applicationId);

    if (result.success) {
      alert("申請を確定しました");
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } else {
      alert(result.error || "確定に失敗しました");
    }

    setProcessing(false);
  };

  const handleCancelConfirmation = async (applicationId: number) => {
    const confirmed = await confirm({
      title: "確定解除の確認",
      message: "確定を解除しますか？",
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);
    const result = await cancelConfirmation(applicationId);

    if (result.success) {
      alert("確定を解除しました");
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } else {
      alert(result.error || "確定解除に失敗しました");
    }

    setProcessing(false);
  };

  const handleCancelConfirmationAll = async (date: string) => {
    const confirmed = await confirm({
      title: "確定解除の確認",
      message: `${date}の確定を解除しますか？`,
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);

    try {
      // その日付の確定済みおよび取り消し申請をすべて抽選済みに戻す
      const { error } = await supabase
        .from("application")
        .update({ status: "after_lottery" })
        .eq("vacation_date", date)
        .in("status", ["confirmed", "withdrawn"]);

      if (error) {
        alert("確定解除に失敗しました");
        console.error("Error:", error);
        setProcessing(false);
        return;
      }

      // カレンダー管理のステータスを抽選済みに戻す
      await supabase
        .from("calendar_management")
        .update({ status: "after_lottery" })
        .eq("vacation_date", date);

      alert("確定を解除しました");
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleAdminCancel = async (app: Application) => {
    const confirmed = await confirm({
      title: "キャンセルの確認",
      message: `${app.user.name}さんの申請をキャンセルしますか？`,
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);

    try {
      // ステータスをキャンセルに、優先順位をNULLに
      const { error } = await supabase
        .from("application")
        .update({
          status: "cancelled",
          priority: null,
        })
        .eq("id", app.id);

      if (error) {
        alert("キャンセルに失敗しました");
        console.error("Error:", error);
        setProcessing(false);
        return;
      }

      // 優先順位を再計算
      await recalculatePriorities(app.vacation_date);

      alert("申請をキャンセルしました");
      await fetchData();
      // スクロール位置を復元（DOM更新後に実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleApplicationSelect = (appId: number, vacationDate: string) => {
    setSelectedApplications(prev => {
      if (prev.includes(appId)) {
        // 選択解除
        return prev.filter(id => id !== appId);
      } else {
        // 選択追加（同じ日付の申請のみ選択可能）
        const currentSelected = prev.length > 0 ? daysData
          .flatMap(day => day.applications)
          .find(app => app.id === prev[0]) : null;

        if (currentSelected && currentSelected.vacation_date !== vacationDate) {
          alert("異なる日付の申請は同時に選択できません");
          return prev;
        }

        if (prev.length >= 2) {
          alert("交換は2つの申請のみ選択可能です");
          return prev;
        }

        return [...prev, appId];
      }
    });
  };

  const handleExchange = () => {
    if (selectedApplications.length !== 2) {
      alert("交換する2つの申請を選択してください");
      return;
    }
    setExchangeDialogOpen(true);
  };

  const handleExchangeConfirm = async () => {
    if (selectedApplications.length !== 2) return;

    const scrollY = window.scrollY;
    setProcessing(true);
    setExchangeDialogOpen(false);

    try {
      const user = getUser();
      if (!user) {
        alert("ユーザー情報の取得に失敗しました");
        return;
      }

      const result = await exchangePriorityAndLevel(
        selectedApplications[0],
        selectedApplications[1],
        user.staff_id
      );

      if (result.success) {
        alert("順位・レベル・ステータスを交換しました");
        setSelectedApplications([]);
        await fetchData();
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      } else {
        alert(result.error || "交換に失敗しました");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth() + 1;
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
    // URLを更新
    router.push(`/admin/calendar?year=${newYear}&month=${newMonth}`);
  };

  const handleMaxPeopleChange = (date: string, value: string) => {
    // ローカルステートを即座に更新（関数型で最新状態を参照）
    setCapacities(prev => ({ ...prev, [date]: value }));

    // 既存のタイマーをクリア
    if (debounceTimers.current[date]) {
      clearTimeout(debounceTimers.current[date]);
    }

    // デバウンス: 500ms後にDB保存
    debounceTimers.current[date] = setTimeout(async () => {
      // 空欄の場合はnullに設定
      if (value === "" || value === null) {
        try {
          const { error } = await supabase.from("calendar_management").upsert({
            vacation_date: date,
            max_people: null,
          });
          if (error) {
            console.error("Error updating max_people:", error);
            alert("マンパワーの更新に失敗しました");
          }
        } catch (err) {
          console.error("Error:", err);
        }
        return;
      }

      // 数値として有効なら保存
      const maxPeople = parseInt(value);
      if (!isNaN(maxPeople) && maxPeople >= 0) {
        try {
          const { error } = await supabase.from("calendar_management").upsert({
            vacation_date: date,
            max_people: maxPeople,
          });
          if (error) {
            console.error("Error updating max_people:", error);
            alert("マンパワーの更新に失敗しました");
          }
        } catch (err) {
          console.error("Error:", err);
        }
      }
    }, 500);
  };

  const getDateBackgroundColor = (day: DayData): string => {
    // 祝日・主要学会・曜日に応じた背景色のみ
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

  const getDateBorderClass = (day: DayData): string => {
    // ステータスに応じた枠線
    if (day.calendar?.status === "confirmation_completed") {
      return "border-l-4 border-l-red-600 border-y border-r border-gray-200";
    }
    if (day.calendar?.status === "after_lottery") {
      return "border-l-4 border-l-orange-500 border-y border-r border-gray-200";
    }
    return "border border-gray-200";
  };

  const getApplicationBackgroundColor = (app: Application): string => {
    // レベルに応じた背景色
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

  const getDateTextColor = (day: DayData): string => {
    // 日付の文字色（日曜・祝日=赤、主要学会=オレンジ、土曜=青）
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

  // 表示すべき申請をフィルタリング（動的判定）
  const getVisibleApplications = (applications: Application[]): Application[] => {
    if (showLotteryPeriodApplications) {
      return applications;
    }
    // 現在の日付が、各申請の年休取得希望日の抽選参加期間内かを動的に判定
    return applications.filter(app => {
      const isCurrentlyInLotteryPeriod = lotteryPeriodStatusMap.get(app.id) ?? false;
      return !isCurrentlyInLotteryPeriod;
    });
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
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">管理カレンダー</h1>
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

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* 月移動とアクションボタン */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
              <div className="flex justify-between items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
                >
                  <Icons.ChevronLeft />
                  <span className="hidden sm:inline text-xs sm:text-sm">前月</span>
                </button>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{currentYear}年{currentMonth}月</h2>
                <button
                  onClick={() => changeMonth(1)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
                >
                  <span className="hidden sm:inline text-xs sm:text-sm">次月</span>
                  <Icons.ChevronRight />
                </button>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={handleLottery}
                  disabled={processing}
                  className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400 text-xs sm:text-sm font-bold shadow-sm transition-all"
                >
                  {processing ? "抽選中..." : "一括抽選"}
                </button>
                <button
                  onClick={handleBatchConfirm}
                  disabled={processing}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-xs sm:text-sm font-bold shadow-sm transition-all"
                >
                  一括確定
                </button>
              </div>
            </div>

            {/* 直近5ヶ月タブ */}
            <div className="mb-4 flex justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
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
                      // URLを更新
                      router.push(`/admin/calendar?year=${tabYear}&month=${tabMonth}`);
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
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <Icons.Info />
                <p className="font-bold text-xs text-gray-900">凡例</p>
              </div>
              <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {/* レベル1 */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] font-medium text-gray-700 text-center">レベル1</span>
                  <div className="flex flex-col gap-0.5">
                    <div className="h-5 bg-[#ffb3c8] border border-red-300 rounded flex items-center justify-center text-[8px] sm:text-[9px] text-red-900 font-medium">確定以外</div>
                    <div className="h-5 bg-red-600 text-white rounded flex items-center justify-center text-[8px] sm:text-[9px] font-bold shadow-sm">確定</div>
                  </div>
                </div>

                {/* レベル2 */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] font-medium text-gray-700 text-center">レベル2</span>
                  <div className="flex flex-col gap-0.5">
                    <div className="h-5 bg-blue-100 border border-blue-200 rounded flex items-center justify-center text-[8px] sm:text-[9px] text-blue-800 font-medium">確定以外</div>
                    <div className="h-5 bg-blue-600 text-white rounded flex items-center justify-center text-[8px] sm:text-[9px] font-bold shadow-sm">確定</div>
                  </div>
                </div>

                {/* レベル3(期間内) */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] font-medium text-gray-700 text-center">レベル3(期間内)</span>
                  <div className="flex flex-col gap-0.5">
                    <div className="h-5 bg-[#e0ffe0] border border-green-300 rounded flex items-center justify-center text-[8px] sm:text-[9px] text-green-900 font-medium">確定以外</div>
                    <div className="h-5 bg-green-600 text-white rounded flex items-center justify-center text-[8px] sm:text-[9px] font-bold shadow-sm">確定</div>
                  </div>
                </div>

                {/* レベル3(期間外) */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] font-medium text-gray-700 text-center">レベル3(期間外)</span>
                  <div className="flex flex-col gap-0.5">
                    <div className="h-5 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-[8px] sm:text-[9px] text-gray-800 font-medium">確定以外</div>
                    <div className="h-5 bg-gray-600 text-white rounded flex items-center justify-center text-[8px] sm:text-[9px] font-bold shadow-sm">確定</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* カレンダー */}
          <div className="space-y-3">
            {daysData.map((day) => {
              const visibleApplications = getVisibleApplications(day.applications);

              return (
                <div
                  key={day.date}
                  className={`rounded-xl p-4 transition-all hover:shadow-md ${getDateBackgroundColor(day)} ${getDateBorderClass(day)}`}
                >
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <h3 className={`text-lg font-bold flex items-center gap-2 ${getDateTextColor(day)}`}>
                        <span className="text-2xl">{day.date.split('-')[2]}</span>

                        <span className={`text-sm px-2 py-0.5 rounded-md ${day.dayOfWeek === 0 ? 'bg-[#ffb3c8] text-red-900' :
                          day.dayOfWeek === 6 ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {["日", "月", "火", "水", "木", "金", "土"][day.dayOfWeek]}
                        </span>
                        {day.isHoliday && <span className="text-sm font-medium bg-[#ffb3c8] text-red-900 px-2 py-0.5 rounded-md">{day.holidayName}</span>}
                        {day.isConference && <span className="text-sm font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">{day.conferenceName}</span>}
                        {day.isEvent && <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">{day.eventName}</span>}
                      </h3>
                      <div className="flex gap-2">
                        {day.calendar?.status === "after_lottery" && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full border border-orange-200">
                            抽選済み
                          </span>
                        )}
                        {day.calendar?.status === "confirmation_completed" && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-[#ffb3c8] text-red-900 rounded-full border border-red-300">
                            確定処理済み
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <label className="text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap">枠数:</label>
                        <input
                          type="number"
                          min="0"
                          value={capacities[day.date] ?? ""}
                          onChange={(e) => handleMaxPeopleChange(day.date, e.target.value)}
                          className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="未設定"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleLotteryForDate(day.date)}
                          disabled={processing}
                          className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 disabled:opacity-50 shadow-sm transition-all"
                        >
                          抽選
                        </button>
                        <button
                          onClick={() => handleConfirmAll(day.date)}
                          disabled={processing}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 shadow-sm transition-all"
                        >
                          確定
                        </button>
                        <button
                          onClick={() => handleCancelConfirmationAll(day.date)}
                          disabled={processing}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 disabled:opacity-50 shadow-sm transition-all"
                        >
                          確定解除
                        </button>
                        {(() => {
                          const selectedInThisDate = visibleApplications.filter(app =>
                            selectedApplications.includes(app.id)
                          );
                          const canExchange = selectedInThisDate.length === 2;
                          return canExchange && (
                            <button
                              onClick={handleExchange}
                              disabled={processing}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-all flex items-center gap-1"
                            >
                              <Icons.RefreshCw />
                              交換
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* 申請一覧 */}
                  {visibleApplications.length === 0 ? (
                    <p className="text-gray-400 text-sm italic pl-1">申請なし</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {visibleApplications.map((app) => {
                        const isAfterLottery = app.status === "after_lottery";
                        const isSelected = selectedApplications.includes(app.id);
                        return (
                          <div
                            key={app.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 ${getApplicationBackgroundColor(app)} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                          >
                            {isAfterLottery && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleApplicationSelect(app.id, app.vacation_date)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                title="交換対象として選択"
                              />
                            )}
                            <span>
                              {app.user.name}
                              {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                              {app.priority && ` [${app.priority}]`}
                            </span>
                            {app.status !== "confirmed" &&
                             app.status !== "withdrawn" &&
                             app.status !== "cancelled" &&
                             app.status !== "cancelled_before_lottery" &&
                             app.status !== "cancelled_after_lottery" && (
                              <button
                                onClick={() => handleAdminCancel(app)}
                                disabled={processing}
                                className="ml-1 bg-white/20 hover:bg-white/40 rounded-full w-5 h-5 flex items-center justify-center transition-colors disabled:opacity-50"
                                title="この申請をキャンセルする"
                              >
                                <Icons.X />
                              </button>
                            )}
                            {app.status === "withdrawn" && (
                              <span className="ml-1 text-[10px] opacity-80">(取り消し)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* 交換確認ダイアログ */}
      {exchangeDialogOpen && selectedApplications.length === 2 && (() => {
        const apps = daysData
          .flatMap(day => day.applications)
          .filter(app => selectedApplications.includes(app.id));

        if (apps.length !== 2) return null;

        const app1 = apps[0];
        const app2 = apps[1];

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">順位・レベル・ステータス交換の確認</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2">交換前</h4>
                  <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-gray-700 min-w-[20px]">A:</span>
                      <div>
                        <p className="font-medium text-gray-900">{app1.user.name} (職員ID: {app1.staff_id})</p>
                        <p className="text-sm text-gray-600">レベル: {app1.level}</p>
                        <p className="text-sm text-gray-600">順位: {app1.priority}</p>
                        <p className="text-sm text-gray-600">ステータス: {app1.status === 'confirmed' ? '確定済み' : app1.status === 'withdrawn' ? '取り消し' : app1.status === 'after_lottery' ? '抽選後' : app1.status}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-gray-700 min-w-[20px]">B:</span>
                      <div>
                        <p className="font-medium text-gray-900">{app2.user.name} (職員ID: {app2.staff_id})</p>
                        <p className="text-sm text-gray-600">レベル: {app2.level}</p>
                        <p className="text-sm text-gray-600">順位: {app2.priority}</p>
                        <p className="text-sm text-gray-600">ステータス: {app2.status === 'confirmed' ? '確定済み' : app2.status === 'withdrawn' ? '取り消し' : app2.status === 'after_lottery' ? '抽選後' : app2.status}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <Icons.RefreshCw />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2">交換後</h4>
                  <div className="space-y-2 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-gray-700 min-w-[20px]">A:</span>
                      <div>
                        <p className="font-medium text-gray-900">{app1.user.name} (職員ID: {app1.staff_id})</p>
                        <p className="text-sm text-blue-700 font-bold">レベル: {app2.level}</p>
                        <p className="text-sm text-blue-700 font-bold">順位: {app2.priority}</p>
                        <p className="text-sm text-blue-700 font-bold">ステータス: {app2.status === 'confirmed' ? '確定済み' : app2.status === 'withdrawn' ? '取り消し' : app2.status === 'after_lottery' ? '抽選後' : app2.status}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-gray-700 min-w-[20px]">B:</span>
                      <div>
                        <p className="font-medium text-gray-900">{app2.user.name} (職員ID: {app2.staff_id})</p>
                        <p className="text-sm text-blue-700 font-bold">レベル: {app1.level}</p>
                        <p className="text-sm text-blue-700 font-bold">順位: {app1.priority}</p>
                        <p className="text-sm text-blue-700 font-bold">ステータス: {app1.status === 'confirmed' ? '確定済み' : app1.status === 'withdrawn' ? '取り消し' : app1.status === 'after_lottery' ? '抽選後' : app1.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setExchangeDialogOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleExchangeConfirm}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold transition-colors"
                >
                  {processing ? "交換中..." : "交換する"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {ConfirmDialog}
    </div>
  );
}

export default function AdminCalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-200 rounded-full mb-4"></div>
          <p className="text-gray-400 font-medium">読み込み中...</p>
        </div>
      </div>
    }>
      <AdminCalendarPageContent />
    </Suspense>
  );
}
