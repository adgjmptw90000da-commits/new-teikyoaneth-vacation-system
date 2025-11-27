// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import type { User } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  calculateAnnualLeavePoints,
  checkAnnualLeavePointsAvailable,
  getCurrentLotteryPeriodInfo,
} from "@/lib/application";
import { PointsStatus } from "@/components/PointsStatus";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
  ),
  Bot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  ),
};

export default function VacationSystemPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [lotteryPeriodInfo, setLotteryPeriodInfo] = useState<{
    isWithinPeriod: boolean;
    targetMonth: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);
  const [pointsInfo, setPointsInfo] = useState<any>(null);

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

    // 年休得点情報を取得
    const fetchPointsInfo = async () => {
      const { data: settingData } = await supabase
        .from("setting")
        .select("current_fiscal_year, level1_points, level2_points, level3_points")
        .eq("id", 1)
        .single();

      if (!settingData) return;

      const pointsData = await calculateAnnualLeavePoints(
        currentUser.staff_id,
        settingData.current_fiscal_year
      );

      if (!pointsData) return;

      const availabilityData = await checkAnnualLeavePointsAvailable(
        currentUser.staff_id,
        1,
        "full_day"
      );

      if (!availabilityData) return;

      setPointsInfo({
        level1PendingCount: pointsData.level1PendingCount,
        level1ConfirmedCount: pointsData.level1ConfirmedCount,
        level1CancelledAfterLotteryCount: pointsData.level1CancelledAfterLotteryCount,
        level1Points: pointsData.level1Points,
        level1PointsPerApplication: settingData.level1_points,
        level2PendingCount: pointsData.level2PendingCount,
        level2ConfirmedCount: pointsData.level2ConfirmedCount,
        level2CancelledAfterLotteryCount: pointsData.level2CancelledAfterLotteryCount,
        level2Points: pointsData.level2Points,
        level2PointsPerApplication: settingData.level2_points,
        level3PendingCount: pointsData.level3PendingCount,
        level3ConfirmedCount: pointsData.level3ConfirmedCount,
        level3CancelledAfterLotteryCount: pointsData.level3CancelledAfterLotteryCount,
        level3Points: pointsData.level3Points,
        level3PointsPerApplication: settingData.level3_points,
        totalPoints: pointsData.totalPoints,
        maxPoints: availabilityData.maxPoints,
        remainingPoints: availabilityData.remainingPoints,
      });
    };

    fetchLotteryPeriodInfo();
    fetchPointsInfo();

    // 管理者の場合、承認待ち申請数を取得
    const fetchPendingApprovals = async () => {
      if (!currentUser.is_admin) return;

      const { count: level3Count } = await supabase
        .from("application")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_approval");

      const { count: cancellationCount } = await supabase
        .from("cancellation_request")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      const totalCount = (level3Count || 0) + (cancellationCount || 0);
      setPendingApprovalsCount(totalCount);
    };

    fetchPendingApprovals();
  }, [router]);

  if (!user) {
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
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.Home />
                ホーム
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                  <Icons.Calendar />
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  年休管理システム
                </h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Lottery Period Info */}
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

        {/* Points Info Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PointsStatus pointsInfo={pointsInfo} className="lg:col-span-3" />
        </div>

        {/* User Menu */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              メニュー
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              年休の申請・確認・管理
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => router.push("/applications/calendar")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="bg-blue-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.Calendar />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">年休申請カレンダー</h4>
              <p className="text-sm text-gray-500">カレンダーから年休を申請</p>
            </button>

            <button
              onClick={() => router.push("/applications")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-200 text-left"
            >
              <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.List />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">年休一覧</h4>
              <p className="text-sm text-gray-500">申請履歴の確認・キャンセル</p>
            </button>

            <button
              onClick={() => router.push("/calendar")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all duration-200 text-left"
            >
              <div className="bg-teal-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.Calendar />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">年休カレンダー</h4>
              <p className="text-sm text-gray-500">全体の年休状況を確認</p>
            </button>

            <button
              onClick={() => router.push("/kensanbi")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 text-left"
            >
              <div className="bg-green-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.CheckCircle />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">研鑽日管理</h4>
              <p className="text-sm text-gray-500">確定済み年休を研鑽日に変更</p>
            </button>
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin() && (
          <div className="pt-8 border-t border-gray-200 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="text-2xl mr-2">🔑</span>
                管理者メニュー
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                抽選処理、承認、年休管理機能
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push("/admin/calendar")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
              >
                <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mr-4">
                  <Icons.Calendar />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">管理カレンダー</h4>
                  <p className="text-xs text-gray-500">抽選・確定処理</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/approvals")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all relative overflow-hidden"
              >
                <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mr-4 relative">
                  <Icons.CheckCircle />
                  {pendingApprovalsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">承認待ち申請</h4>
                  <p className="text-xs text-gray-500">キャンセル・確定後年休の承認</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/kensanbi-approval")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all"
              >
                <div className="bg-green-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-green-600 mr-4">
                  <Icons.CheckCircle />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">研鑽日承認</h4>
                  <p className="text-xs text-gray-500">当直による研鑽日の承認</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/one-personnel")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="bg-blue-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-blue-600 mr-4">
                  <Icons.CheckCircle />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">One人事申請確認</h4>
                  <p className="text-xs text-gray-500">年休のOne人事申請状況確認</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/ai-assist")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
              >
                <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mr-4">
                  <Icons.Bot />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">AIアシスト</h4>
                  <p className="text-xs text-gray-500">自然言語でDB操作</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
