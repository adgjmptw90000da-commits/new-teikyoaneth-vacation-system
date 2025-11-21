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

interface DayData {
  date: string;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
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
};

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showLotteryPeriodApplications, setShowLotteryPeriodApplications] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lotteryPeriodStatusMap, setLotteryPeriodStatusMap] = useState<Map<number, boolean>>(new Map());

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

  const fetchData = async () => {
    setLoading(true);
    try {
      // 月の開始日と終了日を計算
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      // 祝日を一括取得
      const { data: holidaysData } = await supabase
        .from("holiday")
        .select("*");

      setHolidays(holidaysData || []);

      // カレンダー管理情報を月全体で一括取得
      const { data: calendarDataAll } = await supabase
        .from("calendar_management")
        .select("*")
        .gte("vacation_date", startDate)
        .lte("vacation_date", endDate);

      // 申請を月全体で一括取得（キャンセル以外、優先順位順）
      const { data: applicationsDataAll } = await supabase
        .from("application")
        .select("*, user:staff_id(name)")
        .gte("vacation_date", startDate)
        .lte("vacation_date", endDate)
        .neq("status", "cancelled")
        .order("vacation_date", { ascending: true })
        .order("priority", { ascending: true });

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

      // 各申請に対して動的に抽選期間内かを判定
      const lotteryStatusMap = new Map<number, boolean>();
      for (const app of (applicationsDataAll || [])) {
        const isInLotteryPeriod = await isCurrentlyInLotteryPeriodForDate(app.vacation_date);
        lotteryStatusMap.set(app.id, isInLotteryPeriod);
      }
      setLotteryPeriodStatusMap(lotteryStatusMap);

      // 日付ごとのデータを構築
      const days: DayData[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayOfWeek = new Date(date).getDay();
        const holiday = holidaysData?.find((h) => h.holiday_date === date);

        days.push({
          date,
          dayOfWeek,
          isHoliday: !!holiday,
          holidayName: holiday?.name,
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
    // 祝日・曜日に応じた背景色のみ
    if (day.isHoliday || day.dayOfWeek === 0) {
      return "bg-red-50/50";
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
      return app.status === "confirmed" ? "bg-red-600 text-white shadow-sm" : "bg-red-100 text-red-800 border border-red-200";
    } else if (app.level === 2) {
      return app.status === "confirmed" ? "bg-blue-600 text-white shadow-sm" : "bg-blue-100 text-blue-800 border border-blue-200";
    } else if (app.is_within_lottery_period) {
      return app.status === "confirmed" ? "bg-green-600 text-white shadow-sm" : "bg-green-100 text-green-800 border border-green-200";
    } else {
      return app.status === "confirmed" ? "bg-gray-600 text-white shadow-sm" : "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getDateTextColor = (day: DayData): string => {
    // 日付の文字色（日曜・祝日=赤、土曜=青）
    if (day.isHoliday || day.dayOfWeek === 0) {
      return "text-red-600";
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
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                年休カレンダー
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Icons.Home />
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* 月移動 */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => changeMonth(-1)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
              >
                <Icons.ChevronLeft />
                <span className="hidden sm:inline">前月</span>
              </button>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {currentYear}年{currentMonth}月
              </h2>
              <button
                onClick={() => changeMonth(1)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
              >
                <span className="hidden sm:inline">次月</span>
                <Icons.ChevronRight />
              </button>
            </div>

            {/* 直近4ヶ月タブ */}
            <div className="mb-6 flex justify-start sm:justify-center gap-2 overflow-x-auto pb-2">
              {[0, 1, 2, 3].map(offset => {
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
                    className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${isActive
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
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Info />
                <p className="font-bold text-sm text-gray-900">凡例</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-8 bg-red-100 border border-red-200 rounded flex items-center justify-center text-xs text-red-800 font-medium">確定以外</div>
                    <div className="w-12 h-8 bg-red-600 text-white rounded flex items-center justify-center text-xs font-bold shadow-sm">確定</div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">レベル1</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-8 bg-blue-100 border border-blue-200 rounded flex items-center justify-center text-xs text-blue-800 font-medium">確定以外</div>
                    <div className="w-12 h-8 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold shadow-sm">確定</div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">レベル2</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-8 bg-green-100 border border-green-200 rounded flex items-center justify-center text-xs text-green-800 font-medium">確定以外</div>
                    <div className="w-12 h-8 bg-green-600 text-white rounded flex items-center justify-center text-xs font-bold shadow-sm">確定</div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">レベル3(期間内)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-800 font-medium">確定以外</div>
                    <div className="w-12 h-8 bg-gray-600 text-white rounded flex items-center justify-center text-xs font-bold shadow-sm">確定</div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">レベル3(期間外)</span>
                </div>
              </div>
            </div>
          </div>

          {/* カレンダー (縦リストレイアウト維持) */}
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

                        <span className={`text-sm px-2 py-0.5 rounded-md ${day.dayOfWeek === 0 ? 'bg-red-100 text-red-700' :
                          day.dayOfWeek === 6 ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {["日", "月", "火", "水", "木", "金", "土"][day.dayOfWeek]}
                        </span>
                        {day.isHoliday && <span className="text-sm font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-md">{day.holidayName}</span>}
                      </h3>
                      <div className="flex gap-2">
                        {day.calendar?.status === "after_lottery" && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full border border-orange-200">
                            抽選済み
                          </span>
                        )}
                        {day.calendar?.status === "confirmation_completed" && (
                          <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full border border-red-200">
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
                            <span className="ml-1 text-[10px] opacity-80">(取り下げ)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
