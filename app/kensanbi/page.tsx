// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getKensanbiBalance,
  convertVacationToKensanbi,
  getDayOfWeekName,
} from "@/lib/kensanbi";

interface ConfirmedVacation {
  id: number;
  vacation_date: string;
  period: "full_day" | "am" | "pm";
  one_personnel_status: "not_applied" | "applied" | "kensanbi";
}

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Book: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  ),
};

export default function KensanbiManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [vacations, setVacations] = useState<ConfirmedVacation[]>([]);
  const [balance, setBalance] = useState<{ granted: number; used: number; balance: number }>({
    granted: 0,
    used: 0,
    balance: 0,
  });
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
  }, [router]);

  useEffect(() => {
    if (user && targetYear && targetMonth) {
      fetchData();
    }
  }, [user, targetYear, targetMonth]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // 研鑽日残高を取得
    const balanceData = await getKensanbiBalance(user.staff_id);
    setBalance(balanceData);

    // 確定済み年休を取得
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split("T")[0];

    const { data } = await supabase
      .from("application")
      .select("id, vacation_date, period, one_personnel_status")
      .eq("staff_id", user.staff_id)
      .eq("status", "confirmed")
      .gte("vacation_date", startDate)
      .lte("vacation_date", endDate)
      .order("vacation_date", { ascending: true });

    setVacations(data || []);
    setLoading(false);
  };

  // 研鑽日に変更
  const handleConvert = async (vacation: ConfirmedVacation) => {
    if (!user) return;

    const usedDays = vacation.period === "full_day" ? 1.0 : 0.5;
    if (balance.balance < usedDays) {
      alert("研鑽日の残高が不足しています");
      return;
    }

    if (!confirm(`この年休を研鑽日に変更しますか？\n消費される研鑽日: ${usedDays}日`)) return;

    setProcessing(vacation.id);
    const result = await convertVacationToKensanbi(
      vacation.id,
      user.staff_id,
      vacation.vacation_date,
      vacation.period
    );

    if (result.success) {
      await fetchData();
    } else {
      alert("エラー: " + result.error);
    }
    setProcessing(null);
  };

  // 月を変更
  const changeMonth = (delta: number) => {
    let newMonth = targetMonth + delta;
    let newYear = targetYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setTargetYear(newYear);
    setTargetMonth(newMonth);
  };

  // 期間の日本語表示
  const getPeriodLabel = (period: "full_day" | "am" | "pm") => {
    switch (period) {
      case "full_day":
        return "全日";
      case "am":
        return "AM";
      case "pm":
        return "PM";
    }
  };

  // ステータスの日本語表示とスタイル
  const getStatusInfo = (status: "not_applied" | "applied" | "kensanbi") => {
    switch (status) {
      case "not_applied":
        return { label: "One人事未申請", bgColor: "bg-gray-100", textColor: "text-gray-700" };
      case "applied":
        return { label: "One人事申請済み", bgColor: "bg-blue-100", textColor: "text-blue-700" };
      case "kensanbi":
        return { label: "研鑽日", bgColor: "bg-green-100", textColor: "text-green-700" };
    }
  };

  // ステータスに応じたカード背景色
  const getCardBackgroundColor = (status: "not_applied" | "applied" | "kensanbi") => {
    switch (status) {
      case "not_applied":
        return "bg-white";
      case "applied":
        return "bg-blue-50";
      case "kensanbi":
        return "bg-green-50";
    }
  };

  // ステータスに応じた左ボーダー色
  const getBorderColor = (status: "not_applied" | "applied" | "kensanbi") => {
    switch (status) {
      case "not_applied":
        return "bg-gray-400";
      case "applied":
        return "bg-blue-500";
      case "kensanbi":
        return "bg-green-500";
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-green-200 rounded-full mb-4"></div>
          <p className="text-gray-400 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="戻る"
              >
                <Icons.ChevronLeft />
              </button>
              <div className="bg-green-600 p-1.5 rounded-lg text-white">
                <Icons.Book />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                研鑽日管理
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

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* 研鑽日残高 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">研鑽日残高</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-600 mb-1 font-medium">付与</div>
                <div className="text-2xl font-bold text-blue-700">{balance.granted}日</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="text-sm text-orange-600 mb-1 font-medium">使用</div>
                <div className="text-2xl font-bold text-orange-700">{balance.used}日</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="text-sm text-green-600 mb-1 font-medium">残高</div>
                <div className="text-2xl font-bold text-green-700">{balance.balance}日</div>
              </div>
            </div>
          </div>

          {/* 月選択 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
              >
                <Icons.ChevronLeft />
                <span className="hidden sm:inline">前月</span>
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {targetYear}年{targetMonth}月
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
                const isActive = tabYear === targetYear && tabMonth === targetMonth;

                return (
                  <button
                    key={offset}
                    onClick={() => {
                      setTargetYear(tabYear);
                      setTargetMonth(tabMonth);
                    }}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg whitespace-nowrap text-xs sm:text-sm font-medium transition-all ${isActive
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tabMonth}月
                  </button>
                );
              })}
            </div>
          </div>

          {/* 確定済み年休一覧 */}
          {vacations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <Icons.Calendar />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">確定済み年休がありません</h3>
              <p className="text-gray-500">{targetYear}年{targetMonth}月の確定済み年休はありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 月ヘッダー */}
              <div className="flex items-center gap-2 px-2">
                <div className="h-6 w-1 bg-green-600 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-900">
                  {targetYear}年{targetMonth}月の確定済み年休
                </h2>
                <span className="text-sm text-gray-500">（{vacations.length}件）</span>
              </div>

              {/* 年休カードリスト */}
              <div className="grid gap-4">
                {vacations.map((vacation) => {
                  const status = vacation.one_personnel_status || "not_applied";
                  const statusInfo = getStatusInfo(status);
                  const usedDays = vacation.period === "full_day" ? 1.0 : 0.5;
                  const canConvert = status === "not_applied" && balance.balance >= usedDays;
                  const dayOfWeek = getDayOfWeekName(vacation.vacation_date);
                  const isSunday = dayOfWeek === "日";
                  const isSaturday = dayOfWeek === "土";

                  return (
                    <div
                      key={vacation.id}
                      className={`relative overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md ${getCardBackgroundColor(status)}`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 z-10 ${getBorderColor(status)}`}></div>

                      <div className="p-5 pl-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`text-lg font-bold ${isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-gray-900'}`}>
                                {new Date(vacation.vacation_date).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  weekday: 'short',
                                  timeZone: 'Asia/Tokyo'
                                })}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200">
                                {getPeriodLabel(vacation.period)}
                              </span>
                            </div>

                            {/* バッジ */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                {statusInfo.label}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                消費: {usedDays}日
                              </span>
                            </div>
                          </div>

                          {/* 研鑽日に変更ボタン */}
                          <div className="shrink-0">
                            {status === "not_applied" && (
                              <button
                                onClick={() => handleConvert(vacation)}
                                disabled={processing === vacation.id || !canConvert}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  canConvert
                                    ? "bg-green-600 text-white hover:bg-green-700 shadow-sm"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                } disabled:opacity-50`}
                              >
                                {processing === vacation.id ? "処理中..." : "研鑽日に変更"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 説明 */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-4">
            <h3 className="font-bold text-blue-900 mb-2">研鑽日について</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>・確定済み年休を研鑽日に変更すると、One人事への年休申請が不要になります</li>
              <li>・全日の場合は1日、AM/PMの場合は0.5日の研鑽日が消費されます</li>
              <li>・一度研鑽日に変更すると元に戻せません</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
