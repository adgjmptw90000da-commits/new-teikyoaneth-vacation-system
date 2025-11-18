// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
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

export default function AdminCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  // URLパラメータから年月を取得、なければ現在の年月を使用
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(
    searchParams.get('year') ? parseInt(searchParams.get('year')!) : today.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    searchParams.get('month') ? parseInt(searchParams.get('month')!) : today.getMonth() + 1
  );
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [processing, setProcessing] = useState(false);
  const [capacities, setCapacities] = useState<Record<string, string>>({});
  const [showLotteryPeriodApplications, setShowLotteryPeriodApplications] = useState(true);
  const [lotteryPeriodStatusMap, setLotteryPeriodStatusMap] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!isAdmin()) {
      alert("管理者のみアクセスできます");
      router.push("/home");
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
    if (!window.confirm(`${currentYear}年${currentMonth}月の抽選を実施しますか？`)) {
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
    if (!window.confirm(`${date}の抽選を実施しますか？`)) {
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
    if (!window.confirm(`${currentYear}年${currentMonth}月のマンパワー設定済み日程を一括確定しますか？`)) {
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
    if (!window.confirm(`${date}の年休を一括確定しますか？`)) {
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
    if (!window.confirm("この申請を確定しますか？")) {
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
    if (!window.confirm("確定を解除しますか？")) {
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
    if (!window.confirm(`${date}の確定を解除しますか？`)) {
      return;
    }

    // スクロール位置を保存
    const scrollY = window.scrollY;

    setProcessing(true);

    try {
      // その日付の確定済みおよび取り下げ申請をすべて抽選済みに戻す
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
    if (!window.confirm(`${app.user.name}さんの申請をキャンセルしますか？`)) {
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

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth - 1 + offset, 1);
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth() + 1;
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
    // URLを更新
    router.push(`/admin/calendar?year=${newYear}&month=${newMonth}`);
  };

  const handleMaxPeopleChange = async (date: string, value: string) => {
    // ローカルステートを更新
    setCapacities({ ...capacities, [date]: value });

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

    // 数値として有効なら自動保存
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
              <h1 className="text-xl font-bold text-gray-900">管理カレンダー</h1>
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
          <div className="bg-white shadow rounded-lg p-6">
            {/* 月移動とアクションボタン */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => changeMonth(-1)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                ← 前月
              </button>
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold">{currentYear}年{currentMonth}月</h2>
                <button
                  onClick={handleLottery}
                  disabled={processing}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
                >
                  {processing ? "抽選中..." : "一括抽選"}
                </button>
                <button
                  onClick={handleBatchConfirm}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  一括確定
                </button>
              </div>
              <button
                onClick={() => changeMonth(1)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                次月 →
              </button>
            </div>

            {/* 直近4ヶ月タブ */}
            <div className="mb-4 flex justify-center space-x-2 overflow-x-auto">
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
                      // URLを更新
                      router.push(`/admin/calendar?year=${tabYear}&month=${tabMonth}`);
                    }}
                    className={`px-4 py-2 rounded whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {tabYear}年{tabMonth}月
                  </button>
                );
              })}
            </div>

            {/* 凡例 */}
            <div className="mb-4 p-4 bg-gray-50 rounded text-sm">
              <p className="font-semibold mb-3">凡例</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-6 bg-red-300 rounded flex items-center justify-center text-xs">確定以外</div>
                  <div className="w-16 h-6 bg-red-600 text-white rounded flex items-center justify-center text-xs">確定</div>
                  <span className="text-xs">レベル1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-6 bg-blue-300 rounded flex items-center justify-center text-xs">確定以外</div>
                  <div className="w-16 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs">確定</div>
                  <span className="text-xs">レベル2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-6 bg-green-300 rounded flex items-center justify-center text-xs">確定以外</div>
                  <div className="w-16 h-6 bg-green-600 text-white rounded flex items-center justify-center text-xs">確定</div>
                  <span className="text-xs">レベル3(期間内)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-6 bg-gray-300 rounded flex items-center justify-center text-xs">確定以外</div>
                  <div className="w-16 h-6 bg-gray-600 text-white rounded flex items-center justify-center text-xs">確定</div>
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
                className={`shadow rounded-lg p-4 ${getDateBackgroundColor(day)} ${getDateBorderClass(day)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-4">
                    <h3 className={`text-lg font-semibold ${getDateTextColor(day)}`}>
                      {day.date} ({["日", "月", "火", "水", "木", "金", "土"][day.dayOfWeek]})
                      {day.isHoliday && <span className="ml-2">({day.holidayName})</span>}
                    </h3>
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
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">枠数:</label>
                    <input
                      type="number"
                      min="0"
                      value={capacities[day.date] ?? ""}
                      onChange={(e) => handleMaxPeopleChange(day.date, e.target.value)}
                      className="w-20 border border-gray-300 rounded px-2 py-1"
                      placeholder="未設定"
                    />
                    <button
                      onClick={() => handleLotteryForDate(day.date)}
                      disabled={processing}
                      className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:bg-gray-400"
                    >
                      抽選
                    </button>
                    <button
                      onClick={() => handleConfirmAll(day.date)}
                      disabled={processing}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
                    >
                      確定
                    </button>
                    <button
                      onClick={() => handleCancelConfirmationAll(day.date)}
                      disabled={processing}
                      className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      確定解除
                    </button>
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
                        {app.status !== "confirmed" && app.status !== "withdrawn" && app.status !== "cancelled" && (
                          <button
                            onClick={() => handleAdminCancel(app)}
                            disabled={processing}
                            className="ml-1 bg-white text-black hover:bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center transition-colors disabled:opacity-50 font-bold border border-gray-300 shadow-sm"
                            title="この申請をキャンセルする"
                          >
                            ×
                          </button>
                        )}
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
