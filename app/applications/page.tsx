"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { recalculatePriorities, isCurrentlyInLotteryPeriodForDate } from "@/lib/application";
import type { Database } from "@/lib/database.types";

type Application = Database["public"]["Tables"]["application"]["Row"];

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
        return "bg-gray-50";
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
              <h1 className="text-xl font-bold text-gray-900">
                年休申請一覧
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/applications/new")}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                新規申請
              </button>
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

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {applications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-gray-500 text-lg mb-4">申請がありません</p>
                <button
                  onClick={() => router.push("/applications/new")}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  新規申請する
                </button>
              </div>
            </div>
          ) : (
            <>
              {Array.from(groupByMonth(applications)).map(([yearMonth, monthApps]) => (
                <div key={yearMonth} className="space-y-4">
                  {/* 月ヘッダー */}
                  <h2 className="text-2xl font-bold text-gray-900 px-2">
                    {yearMonth}
                  </h2>

                  {/* 申請カード */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="space-y-3">
                      {monthApps.map((app) => (
                        <div
                          key={app.id}
                          className={`${getBackgroundColor(app.status)} ${getBorderColor(app.level)} border-l-4 rounded-lg p-4 transition-all hover:shadow-md`}
                        >
                          {/* ヘッダー: 日付とバッジ */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="text-lg font-semibold text-gray-900 mb-2">
                                {new Date(app.vacation_date).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  weekday: 'short'
                                })}
                                <span className="ml-2 text-sm font-normal text-gray-600">
                                  ({getPeriodLabel(app.period)})
                                </span>
                              </p>

                              {/* バッジ */}
                              <div className="flex flex-wrap gap-1.5">
                                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getLevelBadgeColor(app.level)}`}>
                                  レベル{app.level}
                                </span>

                                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                                  {getStatusLabel(app.status)}
                                </span>
                              </div>
                            </div>

                            {/* キャンセルボタン */}
                            <div className="ml-4">
                              {canCancel(app) && (
                                <button
                                  onClick={() => handleCancel(app)}
                                  disabled={cancelingId === app.id}
                                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 transition-colors"
                                >
                                  {cancelingId === app.id ? "キャンセル中..." : "キャンセル"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 詳細情報 */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            {app.status !== "cancelled" && (!(lotteryPeriodStatusMap.get(app.id) ?? false) || showLotteryPeriodApplications) && app.priority && (
                              <span>優先順位: {app.priority}</span>
                            )}
                            <span className="text-xs text-gray-400">
                              申請日時: {new Date(app.applied_at).toLocaleString("ja-JP")}
                            </span>
                          </div>

                          {/* 備考 */}
                          {app.remarks && (
                            <div className="mt-2 text-sm text-gray-700">
                              <span className="font-medium">備考:</span> {app.remarks}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
