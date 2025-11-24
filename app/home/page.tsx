// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, isAdmin } from "@/lib/auth";
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
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  Flag: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></svg>
  ),
  Tool: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
  ),
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [lotteryPeriodInfo, setLotteryPeriodInfo] = useState<{
    isWithinPeriod: boolean;
    targetMonth: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);
  const [pointsInfo, setPointsInfo] = useState<{
    level1ApplicationCount: number;
    level1ConfirmedCount: number;
    level2ApplicationCount: number;
    level2ConfirmedCount: number;
    level3ApplicationCount: number;
    level3ConfirmedCount: number;
    totalPoints: number;
    maxPoints: number;
    remainingPoints: number;
  } | null>(null);

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
        .select("current_fiscal_year")
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
        level2PendingCount: pointsData.level2PendingCount,
        level2ConfirmedCount: pointsData.level2ConfirmedCount,
        level2CancelledAfterLotteryCount: pointsData.level2CancelledAfterLotteryCount,
        level2Points: pointsData.level2Points,
        level3PendingCount: pointsData.level3PendingCount,
        level3ConfirmedCount: pointsData.level3ConfirmedCount,
        level3CancelledAfterLotteryCount: pointsData.level3CancelledAfterLotteryCount,
        level3Points: pointsData.level3Points,
        totalPoints: pointsData.totalPoints,
        maxPoints: availabilityData.maxPoints,
        remainingPoints: availabilityData.remainingPoints,
      });
    };

    fetchLotteryPeriodInfo();
    fetchPointsInfo();

    // 管理者の場合、承認待ち申請数を取得（レベル3承認待ち + キャンセル承認待ち）
    const fetchPendingApprovals = async () => {
      if (!currentUser.is_admin) return;

      // レベル3承認待ち
      const { count: level3Count, error: level3Error } = await supabase
        .from("application")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_approval");

      // キャンセル承認待ち
      const { count: cancellationCount, error: cancellationError } = await supabase
        .from("cancellation_request")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      const totalCount = (level3Count || 0) + (cancellationCount || 0);
      setPendingApprovalsCount(totalCount);
    };

    fetchPendingApprovals();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

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
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                年休管理システム
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-medium text-gray-900">{user.name}</span>
                <span className="text-xs text-gray-500">ID: {user.staff_id}</span>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${user.is_admin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}>
                {user.is_admin ? "管理者" : "一般"}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="ログアウト"
              >
                <Icons.Logout />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-lg text-white">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              {user.name}さん
            </h2>
            <p className="text-blue-100 max-w-xl">
              職員ID: {user.staff_id}
              {pointsInfo && pointsInfo.remainingPoints < 5 && (
                <span className="block mt-2 text-yellow-300 font-medium">
                  ⚠️ 残りポイントが少なくなっています
                </span>
              )}
            </p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 transform skew-x-12 translate-x-12"></div>
        </div>

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

        {/* Menu Grid */}
        <div className="space-y-6">
          {/* General Menu Header */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">👤</span>
              一般メニュー
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              年休申請や個人情報の設定を行えます
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => router.push("/applications/new")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="bg-blue-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.FileText />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">年休申請</h4>
              <p className="text-sm text-gray-500">新しい年休を申請する</p>
            </button>

            <button
              onClick={() => router.push("/applications")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="bg-indigo-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.List />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">申請一覧</h4>
              <p className="text-sm text-gray-500">申請履歴の確認・キャンセル</p>
            </button>

            <button
              onClick={() => router.push("/calendar")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="bg-teal-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.Calendar />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">年休カレンダー</h4>
              <p className="text-sm text-gray-500">全体の年休状況を確認</p>
            </button>

            <button
              onClick={() => router.push("/settings/profile")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="bg-gray-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-gray-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.User />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">個人情報設定</h4>
              <p className="text-sm text-gray-500">氏名・パスワードの変更</p>
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
                抽選処理、メンバー管理、システム設定などの管理機能
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
                  <p className="text-xs text-gray-500">抽選前キャンセル及び確定後年休申請の承認・却下</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/members")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
              >
                <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mr-4">
                  <Icons.Users />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">メンバー管理</h4>
                  <p className="text-xs text-gray-500">ユーザー管理・権限変更</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/settings/holidays")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
              >
                <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mr-4">
                  <Icons.Flag />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">祝日・主要学会管理</h4>
                  <p className="text-xs text-gray-500">祝日・主要学会の登録・編集</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/settings/events")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="bg-blue-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-blue-600 mr-4">
                  <Icons.Calendar />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">イベント管理</h4>
                  <p className="text-xs text-gray-500">イベントの登録・編集</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/settings/admin")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
              >
                <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mr-4">
                  <Icons.Tool />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">管理者設定</h4>
                  <p className="text-xs text-gray-500">組織コード・抽選期間設定</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/data-cleanup")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all group"
              >
                <div className="bg-red-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-red-600 mr-4 flex items-center justify-center group-hover:bg-[#ffb3c8] transition-colors">
                  <Icons.Trash />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900 group-hover:text-red-700">ログ削除</h4>
                  <p className="text-xs text-gray-500">年度別データの削除</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
