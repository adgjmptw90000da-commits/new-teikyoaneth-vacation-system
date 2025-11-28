// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isCurrentlyInLotteryPeriodForDate } from "@/lib/application";
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
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
  ),
  Grid: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
  ),
};

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showLotteryPeriodApplications, setShowLotteryPeriodApplications] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lotteryPeriodStatusMap, setLotteryPeriodStatusMap] = useState<Map<number, boolean>>(new Map());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // LocalStorageからviewModeを読み込む
  useEffect(() => {
    const savedViewMode = localStorage.getItem('calendarViewMode');
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
  }, [router, currentYear, currentMonth]);

  // viewModeが変更されたらLocalStorageに保存
  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('calendarViewMode', mode);
  };

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

  // カレンダーグリッド用のデータ生成（前月・翌月の日付を含む）
  const getCalendarGridData = (): (DayData | null)[] => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 (日曜) から 6 (土曜)

    const gridData: (DayData | null)[] = [];

    // 前月の日付で埋める
    for (let i = 0; i < firstDayOfWeek; i++) {
      gridData.push(null);
    }

    // 当月の日付
    daysData.forEach(day => {
      gridData.push(day);
    });

    // 最後の週を土曜日まで埋める
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
                年休カレンダー
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/home")}
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
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                <Icons.Info />
                <p className="font-bold text-[10px] sm:text-xs text-gray-900">凡例</p>
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

          {/* カレンダー表示 */}
          {viewMode === 'list' ? (
            // リスト表示
            <div className="space-y-3">
              {daysData.map((day) => {
                const visibleApplications = getVisibleApplications(day.applications);

                return (
                  <div
                    key={day.date}
                    className={`rounded-xl p-4 transition-all hover:shadow-md ${getDateBackgroundColor(day)} ${getDateBorderClass(day)}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
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
                      <div className="text-sm font-medium text-gray-500 bg-white/50 px-3 py-1 rounded-lg border border-gray-100">
                        枠数: <span className="text-gray-900 font-bold">{day.calendar?.max_people !== null && day.calendar?.max_people !== undefined ? `${day.calendar.max_people}名` : '未設定'}</span>
                      </div>
                    </div>

                    {/* 申請一覧 */}
                    {visibleApplications.length === 0 ? (
                      <p className="text-gray-400 text-sm italic pl-1">申請なし</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {visibleApplications.map((app) => (
                          <div
                            key={app.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 ${getApplicationBackgroundColor(app)}`}
                          >
                            <span>
                              {app.user.name}
                              {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                              {app.priority && ` [${app.priority}]`}
                            </span>
                            {app.status === "withdrawn" && (
                              <span className="ml-1 text-[10px] opacity-80">(取り消し)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // グリッド表示
            <div>
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
                    return <div key={`empty-${index}`} className="min-h-[80px] sm:min-h-[100px] md:aspect-square bg-gray-50 rounded-lg" />;
                  }

                  const visibleApplications = getVisibleApplications(day.applications);
                  const showModal = visibleApplications.length > 3;

                  return (
                    <div
                      key={day.date}
                      className={`min-h-[80px] sm:min-h-[100px] md:aspect-square rounded-lg p-1 sm:p-2 flex flex-col transition-all ${getDateBackgroundColor(day)} ${getDateBorderClass(day)}`}
                    >
                      {/* 日付と枠数 */}
                      <div className="flex items-start justify-between mb-0.5 sm:mb-1">
                        <div className="flex flex-col">
                          <span className={`text-sm sm:text-base md:text-lg font-bold leading-none ${getDateTextColor(day)}`}>
                            {day.date.split('-')[2]}
                          </span>
                          <span className="text-[8px] sm:text-[9px] text-gray-500 mt-0.5">
                            枠:{day.calendar?.max_people !== null && day.calendar?.max_people !== undefined ? `${day.calendar.max_people}` : '-'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {day.calendar?.status === "confirmation_completed" && (
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-600 rounded-full" title="確定処理済み" />
                          )}
                          {day.calendar?.status === "after_lottery" && (
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full" title="抽選済み" />
                          )}
                        </div>
                      </div>

                      {/* 祝日・主要学会・イベント */}
                      {(day.isHoliday || day.isConference || day.isEvent) && (
                        <div className="text-[8px] sm:text-[9px] md:text-[10px] font-medium mb-0.5 sm:mb-1 truncate">
                          {day.isHoliday && <span className="text-red-900">{day.holidayName}</span>}
                          {day.isConference && <span className="text-orange-800">{day.conferenceName}</span>}
                          {day.isEvent && <span className="text-blue-700">{day.eventName}</span>}
                        </div>
                      )}

                      {/* 申請者表示 */}
                      <div className="flex-1 flex flex-col gap-0.5 text-[8px] sm:text-[9px] md:text-[10px] overflow-hidden">
                        {visibleApplications.length === 0 ? (
                          <span className="text-gray-400 italic text-[8px] sm:text-[9px]">申請なし</span>
                        ) : showModal ? (
                          <>
                            {/* 最初の2名を表示 */}
                            {visibleApplications.slice(0, 2).map((app) => (
                              <div
                                key={app.id}
                                className={`px-0.5 sm:px-1 py-0.5 rounded truncate font-bold ${getApplicationBackgroundColor(app)}`}
                              >
                                <span className="hidden sm:inline">
                                  {app.user.name}
                                  {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                                </span>
                                <span className="sm:hidden">
                                  {app.user.name.split(' ')[0]}
                                  {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                                </span>
                              </div>
                            ))}
                            {/* 残りの人数ボタン */}
                            <button
                              onClick={() => setSelectedDay(day)}
                              className="text-center font-bold text-gray-700 bg-white/70 hover:bg-white rounded px-0.5 sm:px-1 py-0.5 transition-colors border border-gray-300 text-[8px] sm:text-[9px]"
                            >
                              +{visibleApplications.length - 2}名
                            </button>
                          </>
                        ) : (
                          visibleApplications.map((app) => (
                            <div
                              key={app.id}
                              className={`px-0.5 sm:px-1 py-0.5 rounded truncate font-bold ${getApplicationBackgroundColor(app)}`}
                            >
                              <span className="hidden sm:inline">
                                {app.user.name}
                                {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                              </span>
                              <span className="sm:hidden">
                                {app.user.name.split(' ')[0]}
                                {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ポップアップモーダル */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className={`text-2xl font-bold ${getDateTextColor(selectedDay)}`}>
                  {currentYear}年{currentMonth}月{selectedDay.date.split('-')[2]}日
                </h3>
                <span className={`text-sm px-2 py-0.5 rounded-md ${
                  selectedDay.dayOfWeek === 0 ? 'bg-[#ffb3c8] text-red-900' :
                  selectedDay.dayOfWeek === 6 ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {["日", "月", "火", "水", "木", "金", "土"][selectedDay.dayOfWeek]}
                </span>
                {selectedDay.isHoliday && (
                  <span className="text-sm font-medium bg-[#ffb3c8] text-red-900 px-2 py-0.5 rounded-md">
                    {selectedDay.holidayName}
                  </span>
                )}
                {selectedDay.isConference && (
                  <span className="text-sm font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">
                    {selectedDay.conferenceName}
                  </span>
                )}
                {selectedDay.isEvent && (
                  <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                    {selectedDay.eventName}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {selectedDay.calendar?.status === "after_lottery" && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full border border-orange-200">
                      抽選済み
                    </span>
                  )}
                  {selectedDay.calendar?.status === "confirmation_completed" && (
                    <span className="px-2.5 py-1 text-xs font-medium bg-[#ffb3c8] text-red-900 rounded-full border border-red-300">
                      確定処理済み
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  枠数: <span className="text-gray-900 font-bold">
                    {selectedDay.calendar?.max_people !== null && selectedDay.calendar?.max_people !== undefined
                      ? `${selectedDay.calendar.max_people}名`
                      : '未設定'}
                  </span>
                </div>
              </div>

              <h4 className="text-lg font-bold text-gray-900 mb-3">申請者一覧</h4>
              {getVisibleApplications(selectedDay.applications).length === 0 ? (
                <p className="text-gray-400 text-sm italic">申請なし</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {getVisibleApplications(selectedDay.applications).map((app) => (
                    <div
                      key={app.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${getApplicationBackgroundColor(app)}`}
                    >
                      <span>
                        {app.user.name}
                        {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                        {app.priority && ` [${app.priority}]`}
                      </span>
                      {app.status === "withdrawn" && (
                        <span className="ml-1 text-[10px] opacity-80">(取り消し)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
