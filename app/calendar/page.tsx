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
      return "bg-red-50";
    }
    if (day.dayOfWeek === 6) {
      return "bg-blue-50";
    }
    return "bg-white";
  };

  const getDateBorderClass = (day: DayData): string => {
    // ステータスに応じた枠線
    if (day.calendar?.status === "confirmation_completed") {
      return "border-4 border-red-600";
    }
    if (day.calendar?.status === "after_lottery") {
      return "border-4 border-orange-500";
    }
    return "border border-gray-200";
  };

  const getApplicationBackgroundColor = (app: Application): string => {
    // レベルに応じた背景色
    if (app.level === 1) {
      return app.status === "confirmed" ? "bg-red-600 text-white" : "bg-red-300 text-black";
    } else if (app.level === 2) {
      return app.status === "confirmed" ? "bg-blue-600 text-white" : "bg-blue-300 text-black";
    } else if (app.is_within_lottery_period) {
      return app.status === "confirmed" ? "bg-green-600 text-white" : "bg-green-300 text-black";
    } else {
      return app.status === "confirmed" ? "bg-gray-600 text-white" : "bg-gray-300 text-black";
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
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">年休カレンダー</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-3 sm:p-6">
            {/* 月移動 */}
            <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <span className="hidden sm:inline">← 前月</span>
                <span className="sm:hidden">←</span>
              </button>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold whitespace-nowrap">{currentYear}年{currentMonth}月</h2>
              <button
                onClick={() => changeMonth(1)}
                className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-200 rounded hover:bg-gray-300 text-xs sm:text-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <span className="hidden sm:inline">次月 →</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>

            {/* 直近4ヶ月タブ */}
            <div className="mb-4 flex justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
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
                    className={`px-3 py-2 sm:px-4 sm:py-2 rounded whitespace-nowrap text-xs sm:text-sm min-h-[44px] flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">{tabYear}年{tabMonth}月</span>
                    <span className="sm:hidden">{tabMonth}月</span>
                  </button>
                );
              })}
            </div>

            {/* 凡例 */}
            <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded text-sm">
              <p className="font-semibold mb-2 sm:mb-3 text-xs sm:text-sm">凡例</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-12 sm:w-16 h-6 bg-red-300 rounded flex items-center justify-center text-xs shrink-0">確定以外</div>
                  <div className="w-12 sm:w-16 h-6 bg-red-600 text-white rounded flex items-center justify-center text-xs shrink-0">確定</div>
                  <span className="text-xs">レベル1</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-12 sm:w-16 h-6 bg-blue-300 rounded flex items-center justify-center text-xs shrink-0">確定以外</div>
                  <div className="w-12 sm:w-16 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs shrink-0">確定</div>
                  <span className="text-xs">レベル2</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-12 sm:w-16 h-6 bg-green-300 rounded flex items-center justify-center text-xs shrink-0">確定以外</div>
                  <div className="w-12 sm:w-16 h-6 bg-green-600 text-white rounded flex items-center justify-center text-xs shrink-0">確定</div>
                  <span className="text-xs">レベル3(期間内)</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-12 sm:w-16 h-6 bg-gray-300 rounded flex items-center justify-center text-xs shrink-0">確定以外</div>
                  <div className="w-12 sm:w-16 h-6 bg-gray-600 text-white rounded flex items-center justify-center text-xs shrink-0">確定</div>
                  <span className="text-xs">レベル3(期間外)</span>
                </div>
              </div>
            </div>
          </div>

          {/* カレンダー */}
          <div className="space-y-4">
            {daysData.map((day) => {
              const visibleApplications = getVisibleApplications(day.applications);

              return (
                <div
                  key={day.date}
                  className={`shadow rounded-lg p-3 sm:p-4 ${getDateBackgroundColor(day)} ${getDateBorderClass(day)}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <h3 className={`text-base sm:text-lg font-semibold ${getDateTextColor(day)}`}>
                        {day.date} ({["日", "月", "火", "水", "木", "金", "土"][day.dayOfWeek]})
                        {day.isHoliday && <span className="ml-1 sm:ml-2">({day.holidayName})</span>}
                      </h3>
                      <div className="flex gap-2">
                        {day.calendar?.status === "after_lottery" && (
                          <span className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded">
                            抽選済み
                          </span>
                        )}
                        {day.calendar?.status === "confirmation_completed" && (
                          <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">
                            確定処理済み
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      枠数: {day.calendar?.max_people !== null && day.calendar?.max_people !== undefined ? `${day.calendar.max_people}名` : '未設定'}
                    </div>
                  </div>

                  {/* 申請一覧 */}
                  {visibleApplications.length === 0 ? (
                    <p className="text-gray-400 text-sm">申請なし</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {visibleApplications.map((app) => (
                        <div
                          key={app.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getApplicationBackgroundColor(app)}`}
                        >
                          <span>
                            {app.user.name}
                            {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                            {app.priority && ` [${app.priority}]`}
                          </span>
                          {app.status === "withdrawn" && (
                            <span className="ml-1 text-xs">(取り下げ)</span>
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
