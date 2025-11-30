// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { confirmOnePersonnelApplication } from "@/lib/kensanbi";

interface Application {
  id: number;
  staff_id: string;
  vacation_date: string;
  period: "full_day" | "am" | "pm";
  one_personnel_status: "not_applied" | "applied" | "kensanbi";
  user: { name: string };
}

interface Holiday {
  id: number;
  holiday_date: string;
  name: string;
}

interface DayData {
  date: string;
  dayOfWeek: number;
  isHoliday: boolean;
  holidayName?: string;
  applications: Application[];
}

// Icons
const Icons = {
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  ),
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
};

export default function OnePersonnelPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }
    const userData = JSON.parse(userStr);
    if (!userData.is_admin) {
      router.push("/admin/home");
      return;
    }
    setUser(userData);
  }, [router]);

  useEffect(() => {
    if (currentYear && currentMonth) {
      fetchData();
    }
  }, [currentYear, currentMonth]);

  const fetchData = async () => {
    setLoading(true);

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];

    // 祝日を取得
    const { data: holidayData } = await supabase
      .from("holiday")
      .select("*")
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate);

    setHolidays(holidayData || []);

    // 確定済み年休を取得
    const { data: applications } = await supabase
      .from("application")
      .select(`
        id,
        staff_id,
        vacation_date,
        period,
        one_personnel_status,
        user:staff_id (name)
      `)
      .eq("status", "confirmed")
      .gte("vacation_date", startDate)
      .lte("vacation_date", endDate)
      .order("vacation_date", { ascending: true });

    // 日付ごとにグループ化（全日表示）
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days: DayData[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const date = new Date(dateStr);
      const holiday = (holidayData || []).find((h) => h.holiday_date === dateStr);
      const dayApplications = (applications || []).filter(
        (app) => app.vacation_date === dateStr
      );

      // 全日を表示
      days.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        applications: dayApplications,
      });
    }

    setDaysData(days);
    setLoading(false);
  };

  // 確認ボタン押下
  const handleConfirm = async (applicationId: number) => {
    setProcessing(applicationId);
    const result = await confirmOnePersonnelApplication(applicationId);
    if (result.success) {
      // ローカルstateを直接更新（スクロール位置を維持）
      setDaysData(prev => prev.map(day => ({
        ...day,
        applications: day.applications.map(app =>
          app.id === applicationId
            ? { ...app, one_personnel_status: 'applied' as const }
            : app
        )
      })));
    } else {
      alert("エラー: " + result.error);
    }
    setProcessing(null);
  };

  // 月を変更
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth() + 1);
  };

  // 背景色
  const getDateBackgroundColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) {
      return "bg-red-50/50";
    }
    if (day.dayOfWeek === 6) {
      return "bg-blue-50/50";
    }
    return "bg-white/80";
  };

  // 日付テキスト色
  const getDateTextColor = (day: DayData): string => {
    if (day.isHoliday || day.dayOfWeek === 0) {
      return "text-red-600";
    }
    if (day.dayOfWeek === 6) {
      return "text-blue-600";
    }
    return "text-gray-900";
  };

  // ステータスに応じた背景色
  const getStatusBackgroundColor = (status: "not_applied" | "applied" | "kensanbi"): string => {
    switch (status) {
      case "not_applied":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      case "applied":
        return "bg-blue-600 text-white shadow-sm";
      case "kensanbi":
        return "bg-green-600 text-white shadow-sm";
    }
  };

  // サマリー計算
  const summary = useMemo(() => {
    const allApps = daysData.flatMap((d) => d.applications);
    const total = allApps.length;
    const notApplied = allApps.filter((a) => (a.one_personnel_status || "not_applied") === "not_applied").length;
    const applied = allApps.filter((a) => a.one_personnel_status === "applied").length;
    const kensanbi = allApps.filter((a) => a.one_personnel_status === "kensanbi").length;
    return { total, notApplied, applied, kensanbi };
  }, [daysData]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="戻る"
              >
                <Icons.ChevronLeft />
              </button>
              <h1 className="text-xl font-bold text-gray-900">One人事申請確認</h1>
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
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 月選択・サマリー */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-center gap-4">
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
          <div className="flex justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
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
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-5 px-2 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-[9px] sm:text-[10px] text-gray-800 font-medium">未申請</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-5 px-2 bg-blue-600 text-white rounded flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-sm">申請済み</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-5 px-2 bg-green-600 text-white rounded flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-sm">研鑽日</div>
              </div>
            </div>
          </div>

          {/* サマリー */}
          <div className="flex flex-wrap gap-4 text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-900">合計: <strong>{summary.total}件</strong></span>
            <span className="text-gray-600">未申請: <strong>{summary.notApplied}件</strong></span>
            <span className="text-blue-600">申請済み: <strong>{summary.applied}件</strong></span>
            <span className="text-green-600">研鑽日: <strong>{summary.kensanbi}件</strong></span>
          </div>
        </div>

        {/* カレンダー */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : daysData.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            {currentYear}年{currentMonth}月の確定済み年休はありません
          </div>
        ) : (
          <div className="space-y-3">
            {daysData.map((day) => (
              <div
                key={day.date}
                className={`rounded-xl p-4 transition-all hover:shadow-md border border-gray-200 ${getDateBackgroundColor(day)}`}
              >
                <div className="flex flex-col gap-3 mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${getDateTextColor(day)}`}>
                      <span className="text-2xl">{day.date.split('-')[2]}</span>
                      <span className={`text-sm px-2 py-0.5 rounded-md ${
                        day.dayOfWeek === 0 ? 'bg-[#ffb3c8] text-red-900' :
                        day.dayOfWeek === 6 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {["日", "月", "火", "水", "木", "金", "土"][day.dayOfWeek]}
                      </span>
                      {day.isHoliday && <span className="text-sm font-medium bg-[#ffb3c8] text-red-900 px-2 py-0.5 rounded-md">{day.holidayName}</span>}
                    </h3>
                  </div>
                </div>

                {/* 申請一覧 */}
                <div className="flex flex-wrap gap-2">
                  {day.applications.map((app) => {
                    const status = app.one_personnel_status || "not_applied";
                    const showConfirmButton = status === "not_applied";

                    return (
                      <div
                        key={app.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 ${getStatusBackgroundColor(status)}`}
                      >
                        <span>
                          {(app.user as { name: string })?.name}
                          {app.period !== "full_day" && ` (${app.period.toUpperCase()})`}
                        </span>
                        {showConfirmButton && (
                          <button
                            onClick={() => handleConfirm(app.id)}
                            disabled={processing === app.id}
                            className="ml-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors disabled:opacity-50"
                            title="One人事申請済みにする"
                          >
                            {processing === app.id ? (
                              <span className="animate-spin text-[10px]">...</span>
                            ) : (
                              <Icons.Check />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
