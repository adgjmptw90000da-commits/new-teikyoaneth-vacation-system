// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, isAdmin } from "@/lib/auth";
import type { User } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Icons
const Icons = {
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Tool: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
};

// 通知の型定義
type Notification = {
  id: number;
  type: 'application_approved' | 'application_rejected' | 'cancellation_approved' | 'cancellation_rejected';
  vacation_date: string;
  message: string;
  sourceType: 'application' | 'cancellation_request';
};

export default function AdminHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    // 管理者チェック - 管理者でなければ一般ホームへリダイレクト
    if (!currentUser.is_admin) {
      router.push("/admin/home");
      return;
    }
    setUser(currentUser);

    // 通知を取得（自分の申請で承認/却下されたが未確認のもの）
    const fetchNotifications = async () => {
      const notifs: Notification[] = [];

      // 1. 確定後レベル3申請で承認されたもの（confirmed + user_notified=false）
      const { data: approvedApps } = await supabase
        .from("application")
        .select("id, vacation_date")
        .eq("staff_id", currentUser.staff_id)
        .eq("status", "confirmed")
        .eq("user_notified", false);

      if (approvedApps) {
        approvedApps.forEach(app => {
          notifs.push({
            id: app.id,
            type: 'application_approved',
            vacation_date: app.vacation_date,
            message: `${app.vacation_date} の年休申請が承認されました`,
            sourceType: 'application'
          });
        });
      }

      // 2. 確定後レベル3申請で却下されたもの（cancelled + user_notified=false）
      const { data: rejectedApps } = await supabase
        .from("application")
        .select("id, vacation_date")
        .eq("staff_id", currentUser.staff_id)
        .eq("status", "cancelled")
        .eq("user_notified", false);

      if (rejectedApps) {
        rejectedApps.forEach(app => {
          notifs.push({
            id: app.id,
            type: 'application_rejected',
            vacation_date: app.vacation_date,
            message: `${app.vacation_date} の年休申請が却下されました`,
            sourceType: 'application'
          });
        });
      }

      // 3. キャンセル申請で承認されたもの
      const { data: approvedCancellations } = await supabase
        .from("cancellation_request")
        .select("id, status, application:application_id(vacation_date, staff_id)")
        .eq("status", "approved")
        .eq("user_notified", false);

      if (approvedCancellations) {
        approvedCancellations.forEach((req: any) => {
          if (req.application?.staff_id === currentUser.staff_id) {
            notifs.push({
              id: req.id,
              type: 'cancellation_approved',
              vacation_date: req.application.vacation_date,
              message: `${req.application.vacation_date} のキャンセル申請が承認されました`,
              sourceType: 'cancellation_request'
            });
          }
        });
      }

      // 4. キャンセル申請で却下されたもの
      const { data: rejectedCancellations } = await supabase
        .from("cancellation_request")
        .select("id, status, application:application_id(vacation_date, staff_id)")
        .eq("status", "rejected")
        .eq("user_notified", false);

      if (rejectedCancellations) {
        rejectedCancellations.forEach((req: any) => {
          if (req.application?.staff_id === currentUser.staff_id) {
            notifs.push({
              id: req.id,
              type: 'cancellation_rejected',
              vacation_date: req.application.vacation_date,
              message: `${req.application.vacation_date} のキャンセル申請が却下されました`,
              sourceType: 'cancellation_request'
            });
          }
        });
      }

      setNotifications(notifs);
    };

    fetchNotifications();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  // 通知を既読にする
  const handleDismissNotification = async (notification: Notification) => {
    const table = notification.sourceType === 'application' ? 'application' : 'cancellation_request';

    const { error } = await supabase
      .from(table)
      .update({ user_notified: true })
      .eq('id', notification.id);

    if (!error) {
      setNotifications(prev => prev.filter(n => !(n.id === notification.id && n.sourceType === notification.sourceType)));
    }
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
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                ホーム
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
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={`${notification.sourceType}-${notification.id}`}
                className={`rounded-xl border p-4 shadow-sm flex items-center justify-between ${
                  notification.type.includes('approved')
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    notification.type.includes('approved')
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {notification.type.includes('approved') ? (
                      <Icons.CheckCircle />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    )}
                  </div>
                  <p className={`font-medium ${
                    notification.type.includes('approved')
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => handleDismissNotification(notification)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    notification.type.includes('approved')
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  了解
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-lg text-white">
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              ようこそ、{user.name}さん
            </h2>
            <p className="text-blue-100 max-w-xl">
              職員ID: {user.staff_id}
            </p>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 transform skew-x-12 translate-x-12"></div>
        </div>

        {/* Main Menu */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              メインメニュー
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              システムを選択してください
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push("/vacation-system")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left"
            >
              <div className="bg-blue-50 w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.Calendar />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">年休管理システム</h4>
              <p className="text-sm text-gray-500">年休申請・確認・研鑽日管理</p>
            </button>

            <button
              onClick={() => router.push("/schedule-system")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 text-left"
            >
              <div className="bg-orange-50 w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                <Icons.FileText />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">予定表管理システム</h4>
              <p className="text-sm text-gray-500">予定表閲覧・予定提出</p>
            </button>

            <button
              onClick={() => router.push("/settings/profile")}
              className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 text-left"
            >
              <div className="bg-gray-100 w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-gray-600 mb-4 group-hover:scale-110 transition-transform">
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
                メンバー管理・システム設定
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                onClick={() => router.push("/admin/calendar-settings")}
                className="flex items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
              >
                <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-purple-600 mr-4">
                  <Icons.Calendar />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">カレンダー設定</h4>
                  <p className="text-xs text-gray-500">祝日・主要学会・イベントの登録</p>
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
