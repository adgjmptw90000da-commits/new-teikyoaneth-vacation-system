"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Application = Database["public"]["Tables"]["application"]["Row"] & {
  user: { name: string };
};

interface ApplicationWithCapacity extends Application {
  max_people: number;
  confirmed_count: number;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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

    fetchApplications();
  }, [router]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // 承認待ち申請を取得
      const { data: appsData, error } = await supabase
        .from("application")
        .select("*, user:staff_id(name)")
        .eq("status", "pending_approval")
        .order("vacation_date", { ascending: true })
        .order("applied_at", { ascending: true });

      if (error) {
        console.error("Error fetching applications:", error);
        alert("申請の取得に失敗しました");
        setLoading(false);
        return;
      }

      // 各申請の日付に対してマンパワーと確定数を取得
      const appsWithCapacity: ApplicationWithCapacity[] = [];

      for (const app of appsData || []) {
        // カレンダー管理情報を取得
        const { data: calendarData } = await supabase
          .from("calendar_management")
          .select("*")
          .eq("vacation_date", app.vacation_date)
          .single();

        // 確定済み数を取得
        const { count: confirmedCount } = await supabase
          .from("application")
          .select("*", { count: "exact", head: true })
          .eq("vacation_date", app.vacation_date)
          .eq("status", "confirmed");

        appsWithCapacity.push({
          ...(app as Application),
          max_people: calendarData?.max_people || 0,
          confirmed_count: confirmedCount || 0,
        });
      }

      setApplications(appsWithCapacity);
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: ApplicationWithCapacity) => {
    if (!window.confirm(`${app.user.name}さんの申請を承認しますか？`)) {
      return;
    }

    setProcessing(true);

    try {
      // 現在の確定数を再確認
      const { count: confirmedCount } = await supabase
        .from("application")
        .select("*", { count: "exact", head: true })
        .eq("vacation_date", app.vacation_date)
        .eq("status", "confirmed");

      if ((confirmedCount || 0) >= app.max_people) {
        alert("マンパワーの上限に達しているため承認できません");
        setProcessing(false);
        await fetchApplications(); // 最新データに更新
        return;
      }

      // 承認（ステータスを確定に変更）
      const { error } = await supabase
        .from("application")
        .update({ status: "confirmed" })
        .eq("id", app.id);

      if (error) {
        alert("承認に失敗しました");
        console.error("Error:", error);
      } else {
        alert("申請を承認しました");
        await fetchApplications();
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (app: ApplicationWithCapacity) => {
    if (!window.confirm(`${app.user.name}さんの申請を却下しますか？`)) {
      return;
    }

    setProcessing(true);

    try {
      // 却下（ステータスをキャンセルに変更）
      const { error } = await supabase
        .from("application")
        .update({ status: "cancelled" })
        .eq("id", app.id);

      if (error) {
        alert("却下に失敗しました");
        console.error("Error:", error);
      } else {
        alert("申請を却下しました");
        await fetchApplications();
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
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
              <h1 className="text-xl font-bold text-gray-900">承認待ち申請</h1>
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
          <div className="bg-white shadow rounded-lg p-6 mb-4">
            <p className="text-sm text-gray-600">
              確定処理後にマンパワーに余裕がある日に申請されたレベル3の申請を承認または却下できます。
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-12 bg-white shadow rounded-lg">
              <p className="text-gray-500">承認待ちの申請はありません</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        申請日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        申請者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        希望日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        期間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        レベル
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        枠状況
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        備考
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((app) => (
                      <tr key={app.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(app.applied_at).toLocaleString("ja-JP")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {app.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {app.vacation_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getPeriodLabel(app.period)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded ${
                              app.confirmed_count < app.max_people
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {app.confirmed_count} / {app.max_people}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {app.remarks || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={processing}
                            className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => handleReject(app)}
                            disabled={processing}
                            className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            却下
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
