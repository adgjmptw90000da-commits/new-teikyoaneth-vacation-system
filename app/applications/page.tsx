// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { recalculatePriorities, isCurrentlyInLotteryPeriodForDate } from "@/lib/application";
import type { Database } from "@/lib/database.types";

type Application = Database["public"]["Tables"]["application"]["Row"];

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ),
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [showLotteryPeriodApplications, setShowLotteryPeriodApplications] = useState(true);
  const [lotteryPeriodStatusMap, setLotteryPeriodStatusMap] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
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
    fetchApplications();
  }, [router]);

  const fetchApplications = async () => {
    const user = getUser();
    if (!user) return;

    try {
      // 現在の月の初日を計算
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const currentMonthStr = currentMonth.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("application")
        .select("*")
        .eq("staff_id", user.staff_id)
        .gte("vacation_date", currentMonthStr) // 現在の月以降のみ
        .order("vacation_date", { ascending: true }); // 古い順

      if (error) {
        console.error("Error fetching applications:", error);
      } else {
        setApplications(data || []);

        // 各申請に対して動的に抽選期間内かを判定
        const lotteryStatusMap = new Map<number, boolean>();
        for (const app of (data || [])) {
          const isInLotteryPeriod = await isCurrentlyInLotteryPeriodForDate(app.vacation_date);
          lotteryStatusMap.set(app.id, isInLotteryPeriod);
        }
        setLotteryPeriodStatusMap(lotteryStatusMap);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const canCancel = (app: Application): boolean => {
    // キャンセル可能条件:
    // - 抽選参加期間内のレベル1・2申請（動的判定）
    // - 確定・取り下げ・承認待ち前のレベル3申請（期間内・期間外問わず）

    if (app.status === "confirmed" || app.status === "withdrawn" || app.status === "pending_approval") {
      return false;
    }

    if (app.level === 3) {
      return true; // レベル3は確定・取り下げ・承認待ち前ならキャンセル可能
    }

    // レベル1・2は現在が抽選参加期間内の場合のみキャンセル可能（動的判定）
    return lotteryPeriodStatusMap.get(app.id) ?? false;
  };

  const handleCancel = async (app: Application) => {
    if (!window.confirm("この申請をキャンセルしますか？")) {
      return;
    }

    setCancelingId(app.id);

    try {
      // ステータスをキャンセルに、優先順位をNULLに
      const { error: updateError } = await supabase
        .from("application")
        .update({
          status: "cancelled",
          priority: null,
        })
        .eq("id", app.id);

      if (updateError) {
        alert("キャンセルに失敗しました");
        console.error("Error canceling:", updateError);
        setCancelingId(null);
        return;
      }

      // 同一希望日の優先順位を再計算
      await recalculatePriorities(app.vacation_date);

      // 一覧を再取得
      await fetchApplications();
      alert("申請をキャンセルしました");
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "before_lottery":
        return "抽選前";
      case "after_lottery":
        return "抽選済み";
      case "confirmed":
        return "確定";
      case "withdrawn":
        return "取り下げ";
      case "cancelled":
        return "キャンセル";
      case "pending_approval":
        return "承認待ち";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "before_lottery":
        return "bg-gray-100 text-gray-800";
      case "after_lottery":
        return "bg-orange-100 text-orange-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "withdrawn":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case "full_day":
        return "全日";
      case "am":
        return "AM";
      case "pm":
        return "PM";
      default:
        return period;
    }
  };

  // 申請を月ごとにグループ化
  const groupByMonth = (apps: Application[]): Map<string, Application[]> => {
    const grouped = new Map<string, Application[]>();

    apps.forEach(app => {
      const date = new Date(app.vacation_date);
      const yearMonth = `${date.getFullYear()}年${date.getMonth() + 1}月`;

      if (!grouped.has(yearMonth)) {
        grouped.set(yearMonth, []);
      }
      grouped.get(yearMonth)!.push(app);
    });

    return grouped;
  };

  // レベルごとのボーダー色
  const getBorderColor = (level: number): string => {
    switch (level) {
      case 1:
        return "border-l-red-500";
      case 2:
        return "border-l-blue-500";
      case 3:
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  // ステータスごとの背景色
  const getBackgroundColor = (status: string): string => {
    switch (status) {
      case "confirmed":
        return "bg-red-50";
      case "after_lottery":
        return "bg-blue-50";
      case "withdrawn":
      case "cancelled":
        return "bg-gray-100 opacity-60";
      default:
        return "bg-white";
    }
  };

  // レベルバッジの色
  const getLevelBadgeColor = (level: number): string => {
    switch (level) {
      case 1:
        return "bg-red-100 text-red-800";
      case 2:
        return "bg-blue-100 text-blue-800";
      case 3:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
                <Icons.List />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                年休申請一覧
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/applications/new")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Icons.Plus />
                新規申請
              </button>
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

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {applications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <Icons.Calendar />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">申請がありません</h3>
              <p className="text-gray-500 mb-6">新しい年休申請を作成してください</p>
              <button
                onClick={() => router.push("/applications/new")}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Icons.Plus />
                <span className="ml-2">新規申請する</span>
              </button>
            </div>
          ) : (
            <>
              {Array.from(groupByMonth(applications)).map(([yearMonth, monthApps]) => (
                <div key={yearMonth} className="space-y-4">
                  {/* 月ヘッダー */}
                  <div className="flex items-center gap-2 px-2">
                    <div className="h-6 w-1 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {yearMonth}
                    </h2>
                  </div>

                  {/* 申請カードリスト */}
                  <div className="grid gap-4">
                    {monthApps.map((app) => (
                      <div
                        key={app.id}
                        className={`relative overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md ${getBackgroundColor(app.status)}`}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBorderColor(app.level).replace('border-l-', 'bg-')}`}></div>

                        <div className="p-5 pl-6">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                  {new Date(app.vacation_date).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'short',
                                    timeZone: 'Asia/Tokyo'
                                  })}
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200">
                                  {getPeriodLabel(app.period)}
                                </span>
                              </div>

                              {/* バッジ */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(app.level)}`}>
                                  レベル{app.level}
                                </span>

                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                  {getStatusLabel(app.status)}
                                </span>
                              </div>

                              {/* 詳細情報 */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                                {app.status !== "cancelled" && (!(lotteryPeriodStatusMap.get(app.id) ?? false) || showLotteryPeriodApplications) && app.priority && (
                                  <span className="font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    優先順位: {app.priority}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Icons.Clock />
                                  申請日時: {new Date(app.applied_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                                </span>
                              </div>

                              {/* 備考 */}
                              {app.remarks && (
                                <div className="mt-3 text-sm text-gray-600 bg-white/50 p-2 rounded border border-gray-100">
                                  <span className="font-medium text-gray-900">備考:</span> {app.remarks}
                                </div>
                              )}
                            </div>

                            {/* キャンセルボタン */}
                            <div className="shrink-0">
                              {canCancel(app) && (
                                <button
                                  onClick={() => handleCancel(app)}
                                  disabled={cancelingId === app.id}
                                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {cancelingId === app.id ? "キャンセル中..." : "キャンセル"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
