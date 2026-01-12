// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import type { User } from "@/lib/auth";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
};

export default function ScheduleSystemPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    // 管理者チェック - 管理者でなければホームへリダイレクト
    if (!isAdmin()) {
      router.push("/admin/home");
      return;
    }
    setUser(currentUser);
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-orange-200 rounded-full mb-4"></div>
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
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="戻る"
              >
                <Icons.ChevronLeft />
              </button>
              <div className="bg-orange-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                予定表管理システム
              </h1>
            </div>
            <div className="flex items-center gap-2">
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
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* User Menu */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              メニュー
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              予定表の確認・予定の提出
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              onClick={() => router.push("/schedule/view")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all duration-200 text-left"
            >
              <div className="bg-teal-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.List />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors">予定表</h4>
              <p className="text-sm text-gray-500">全体の予定表を閲覧</p>
            </button>

            <button
              onClick={() => router.push("/schedule/submit")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 text-left"
            >
              <div className="bg-orange-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.FileText />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">予定提出</h4>
              <p className="text-sm text-gray-500">当直表作成用の予定提出</p>
            </button>

            <button
              onClick={() => router.push("/schedule/shared-calendar")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-pink-300 transition-all duration-200 text-left"
            >
              <div className="bg-pink-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-pink-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.Calendar />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-pink-600 transition-colors">予定共有カレンダー</h4>
              <p className="text-sm text-gray-500">予定を共有・閲覧</p>
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
                予定表の管理・設定
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => router.push("/admin/schedule-view")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
              >
                <div className="bg-teal-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-teal-600 mr-4">
                  <Icons.List />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">予定表作成</h4>
                  <p className="text-xs text-gray-500">全メンバーの予定確認・編集</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/schedule-settings")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all"
              >
                <div className="bg-orange-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-orange-600 mr-4">
                  <Icons.Settings />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">予定・シフト設定</h4>
                  <p className="text-xs text-gray-500">予定タイプ・シフトの管理</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/shared-calendar-settings")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-pink-300 transition-all"
              >
                <div className="bg-pink-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-pink-600 mr-4">
                  <Icons.Settings />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">予定共有カレンダー設定</h4>
                  <p className="text-xs text-gray-500">カテゴリの管理</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
