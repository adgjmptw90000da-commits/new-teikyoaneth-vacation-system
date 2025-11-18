"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, isAdmin } from "@/lib/auth";
import type { User } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  calculateAnnualLeavePoints,
  checkAnnualLeavePointsAvailable,
} from "@/lib/application";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pointsInfo, setPointsInfo] = useState<{
    level1ApplicationCount: number;
    level1ConfirmedCount: number;
    level2ApplicationCount: number;
    level2ConfirmedCount: number;
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

    // 年休得点情報を取得
    const fetchPointsInfo = async () => {
      // 設定から現在の年度を取得
      const { data: settingData } = await supabase
        .from("setting")
        .select("current_fiscal_year")
        .eq("id", 1)
        .single();

      if (!settingData) return;

      // 得点計算情報を取得
      const pointsData = await calculateAnnualLeavePoints(
        currentUser.staff_id,
        settingData.current_fiscal_year
      );

      if (!pointsData) return;

      // 利用可能得点を確認
      const availabilityData = await checkAnnualLeavePointsAvailable(
        currentUser.staff_id,
        1, // とりあえずレベル1で計算
        "full_day"
      );

      if (!availabilityData) return;

      setPointsInfo({
        level1ApplicationCount: pointsData.level1ApplicationCount,
        level1ConfirmedCount: pointsData.level1ConfirmedCount,
        level2ApplicationCount: pointsData.level2ApplicationCount,
        level2ConfirmedCount: pointsData.level2ConfirmedCount,
        totalPoints: pointsData.totalPoints,
        maxPoints: availabilityData.maxPoints,
        remainingPoints: availabilityData.remainingPoints,
      });
    };

    fetchPointsInfo();

    // 管理者の場合、承認待ち申請数を取得
    const fetchPendingApprovals = async () => {
      if (!currentUser.is_admin) return;

      const { count, error } = await supabase
        .from("application")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_approval");

      if (!error && count !== null) {
        setPendingApprovalsCount(count);
      }
    };

    fetchPendingApprovals();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (!user) {
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
                年休管理システム
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.name}さん
                {user.is_admin && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    管理者
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              ようこそ、{user.name}さん
            </h2>
            <p className="mt-2 text-gray-600">職員ID: {user.staff_id}</p>
          </div>

          {/* 年休得点情報 */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm" style={{ minHeight: '180px' }}>
              {pointsInfo ? (
                <>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">年休得点状況</h3>

                  {/* 申請数・確定数テーブル（行列入れ替え版） */}
                  <div className="mb-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 border"></th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700 border bg-red-50">レベル1</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-700 border bg-blue-50">レベル2</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-3 py-2 border text-gray-900 font-medium">申請数</td>
                          <td className="px-3 py-2 border text-center text-gray-900 bg-red-50">{pointsInfo.level1ApplicationCount.toFixed(1)}</td>
                          <td className="px-3 py-2 border text-center text-gray-900 bg-blue-50">{pointsInfo.level2ApplicationCount.toFixed(1)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-3 py-2 border text-gray-900 font-medium">確定数</td>
                          <td className="px-3 py-2 border text-center text-gray-900 bg-red-50">{pointsInfo.level1ConfirmedCount.toFixed(1)}</td>
                          <td className="px-3 py-2 border text-center text-gray-900 bg-blue-50">{pointsInfo.level2ConfirmedCount.toFixed(1)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 得点情報 */}
                  <div className="text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">利用可能上限:</span> {pointsInfo.maxPoints.toFixed(1)}点
                      <span className="font-medium ml-3">残り:</span>
                      <span className={pointsInfo.remainingPoints < 0 ? "text-red-600 font-semibold" : "text-blue-600 font-semibold"}>
                        {" "}{pointsInfo.remainingPoints.toFixed(1)}点
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-sm">読み込み中...</p>
                </div>
              )}
            </div>
          </div>

          {/* 一般メニュー */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="text-2xl mr-2">👤</span>
                一般メニュー
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                年休申請や個人情報の設定を行えます
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push("/applications/new")}
                className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">📝</div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    年休申請
                  </h4>
                  <p className="mt-2 text-sm text-gray-600">
                    新しい年休を申請する
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push("/applications")}
                className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">📋</div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    申請一覧
                  </h4>
                  <p className="mt-2 text-sm text-gray-600">
                    申請履歴の確認・キャンセル
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push("/calendar")}
                className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">📆</div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    年休カレンダー
                  </h4>
                  <p className="mt-2 text-sm text-gray-600">
                    全体の年休状況を確認
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push("/settings/profile")}
                className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200"
              >
                <div className="text-center">
                  <div className="text-3xl mb-3">⚙️</div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    個人情報設定
                  </h4>
                  <p className="mt-2 text-sm text-gray-600">
                    氏名・パスワードの変更
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 管理者メニュー */}
          {isAdmin() && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-sm border-2 border-blue-200 p-6">
              <div className="mb-6">
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
                  className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 border-blue-300"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">📅</div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      管理カレンダー
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      抽選・確定処理
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/settings/holidays")}
                  className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 border-blue-300"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">🎌</div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      祝日管理
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      祝日の登録・編集
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/settings/admin")}
                  className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 border-blue-300"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">🔧</div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      管理者設定
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      組織コード・抽選期間設定
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/admin/members")}
                  className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 border-blue-300"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">👥</div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      メンバー管理
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      ユーザー管理・権限変更
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/admin/approvals")}
                  className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 border-blue-300 relative"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3 relative inline-block">
                      ✅
                      {pendingApprovalsCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      承認待ち申請
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      確定後レベル3申請の承認・却下
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/admin/data-cleanup")}
                  className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 border-blue-300"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">🗑️</div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      ログ削除
                    </h4>
                    <p className="mt-2 text-sm text-gray-600">
                      年度別データの削除
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
