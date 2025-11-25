// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { approveCancellation, rejectCancellation } from "@/lib/cancellation";
import { recalculatePriorities } from "@/lib/application";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Database } from "@/lib/database.types";

type Application = Database["public"]["Tables"]["application"]["Row"] & {
  user: { name: string };
};

interface ApplicationWithCapacity extends Application {
  max_people: number;
  confirmed_count: number;
}

type CancellationRequest = Database["public"]["Tables"]["cancellation_request"]["Row"] & {
  application: Application;
};

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
  ),
  AlertCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [applications, setApplications] = useState<ApplicationWithCapacity[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
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
      // レベル3承認待ち申請を取得
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

      for (const app of (appsData as any[]) || []) {
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
          max_people: (calendarData as any)?.max_people || 0,
          confirmed_count: confirmedCount || 0,
        });
      }

      setApplications(appsWithCapacity);

      // キャンセル承認待ちリクエストを取得
      const { data: cancellationsData, error: cancellationsError } = await supabase
        .from("cancellation_request")
        .select("*, application:application_id(*, user:staff_id(name))")
        .eq("status", "pending")
        .order("requested_at", { ascending: true });

      if (cancellationsError) {
        console.error("Error fetching cancellation requests:", cancellationsError);
      } else {
        setCancellationRequests((cancellationsData as any[]) || []);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: ApplicationWithCapacity) => {
    const confirmed = await confirm({
      title: "承認の確認",
      message: `${app.user.name}さんの申請を承認しますか？`,
    });
    if (!confirmed) {
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
      // 優先順位は申請時に付与されたものをそのまま使用
      const { error } = await supabase
        .from("application")
        .update({ status: "confirmed" } as any)
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
    const confirmed = await confirm({
      title: "却下の確認",
      message: `${app.user.name}さんの申請を却下しますか？\n却下するとキャンセル扱いとなり、得点が回復します。`,
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);

    try {
      // 却下（ステータスをcancelledに変更 - 管理者キャンセル扱い）
      const { error } = await supabase
        .from("application")
        .update({
          status: "cancelled",
          priority: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", app.id);

      if (error) {
        alert("却下に失敗しました");
        console.error("Error:", error);
      } else {
        // 優先順位再計算
        await recalculatePriorities(app.vacation_date);

        alert("申請を却下しました。得点が回復します。");
        await fetchApplications();
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveCancellation = async (request: CancellationRequest) => {
    const confirmed = await confirm({
      title: "キャンセル承認の確認",
      message: `${request.application.user.name}さんのキャンセル申請を承認しますか？\n得点が回復します。`,
    });
    if (!confirmed) {
      return;
    }

    setProcessing(true);

    try {
      const user = getUser();
      if (!user) {
        alert("ユーザー情報の取得に失敗しました");
        setProcessing(false);
        return;
      }

      const result = await approveCancellation(request.id, user.staff_id);

      if (!result.success) {
        alert(result.error || "承認に失敗しました");
      } else {
        alert("キャンセル申請を承認しました");
        await fetchApplications();
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCancellation = async (request: CancellationRequest) => {
    const comment = prompt(`${request.application.user.name}さんのキャンセル申請を却下しますか？\n却下理由を入力してください（任意）：`);

    if (comment === null) {
      // キャンセルボタンが押された場合
      return;
    }

    setProcessing(true);

    try {
      const user = getUser();
      if (!user) {
        alert("ユーザー情報の取得に失敗しました");
        setProcessing(false);
        return;
      }

      const result = await rejectCancellation(request.id, user.staff_id, comment || undefined);

      if (!result.success) {
        alert(result.error || "却下に失敗しました");
      } else {
        alert("キャンセル申請を却下しました");
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
                <Icons.CheckCircle />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">承認待ち申請</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Icons.Home />
                ホーム
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* キャンセル承認セクション */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-purple-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">キャンセル承認待ち</h2>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start gap-3">
                <div className="text-purple-500 mt-0.5">
                  <Icons.AlertCircle />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  期間外に申請されたキャンセル要求を承認または却下できます。承認すると得点が回復します。
                </p>
              </div>
            </div>

            {cancellationRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                  <Icons.CheckCircle />
                </div>
                <p className="text-gray-500 font-medium">キャンセル承認待ちはありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          申請日時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          申請者
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          希望日
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          期間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          レベル
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          キャンセル申請日時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          アクション
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cancellationRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-purple-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(request.application.applied_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {request.application.user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.application.vacation_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {getPeriodLabel(request.application.period)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Lv.{request.application.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(request.requested_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button
                              onClick={() => handleApproveCancellation(request)}
                              disabled={processing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Icons.Check />
                              承認
                            </button>
                            <button
                              onClick={() => handleRejectCancellation(request)}
                              disabled={processing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Icons.X />
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

          {/* レベル3承認セクション */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">レベル3承認待ち</h2>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start gap-3">
                <div className="text-blue-500 mt-0.5">
                  <Icons.AlertCircle />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  確定処理後にマンパワーに余裕がある日に申請されたレベル3の申請を承認または却下できます。
                </p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                  <Icons.CheckCircle />
                </div>
                <p className="text-gray-500 font-medium">承認待ちの申請はありません</p>
              </div>
            ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        申請日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        申請者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        希望日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        期間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        レベル
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        枠状況
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        備考
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(app.applied_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {app.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {app.vacation_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getPeriodLabel(app.period)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Lv.{app.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${app.confirmed_count < app.max_people
                                ? "bg-[#e0ffe0] text-green-900"
                                : "bg-[#ffb3c8] text-red-900"
                              }`}
                          >
                            {app.confirmed_count} / {app.max_people}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {app.remarks || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={processing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Icons.Check />
                            承認
                          </button>
                          <button
                            onClick={() => handleReject(app)}
                            disabled={processing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Icons.X />
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
        </div>
      </main>

      {ConfirmDialog}
    </div>
  );
}
