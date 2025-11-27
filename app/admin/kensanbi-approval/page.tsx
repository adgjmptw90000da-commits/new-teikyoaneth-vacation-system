// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  generateKensanbiCandidates,
  createKensanbiHistoryBulk,
  approveKensanbi,
  rejectKensanbi,
  approveKensanbiBulk,
  getDayOfWeekName,
  createManualKensanbiHistory,
  getManualKensanbiHistory,
  calculateKensanbiDays,
  KensanbiCandidate,
} from "@/lib/kensanbi";

interface Member {
  staff_id: string;
  name: string;
}

interface Holiday {
  id: number;
  holiday_date: string;
  name: string;
}

export default function KensanbiApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ staff_id: string; name: string; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<KensanbiCandidate[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() - 1); // 2ヶ月前
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [manualForm, setManualForm] = useState({
    staffId: "",
    shiftDate: "",
    grantedDays: 0 as number,
  });
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);

  // 2ヶ月前を計算
  useEffect(() => {
    const now = new Date();
    let month = now.getMonth() - 1; // 2ヶ月前（0-indexed）
    let year = now.getFullYear();
    if (month < 0) {
      month += 12;
      year -= 1;
    }
    setTargetYear(year);
    setTargetMonth(month + 1); // 1-indexed
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }
    const userData = JSON.parse(userStr);
    if (!userData.is_admin) {
      router.push("/home");
      return;
    }
    setUser(userData);
    fetchMembers();
  }, [router]);

  useEffect(() => {
    if (targetYear && targetMonth) {
      fetchData();
    }
  }, [targetYear, targetMonth]);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("user")
      .select("staff_id, name")
      .order("display_order", { ascending: true });
    setMembers(data || []);
  };

  const fetchData = async () => {
    setLoading(true);

    // 祝日を取得
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split("T")[0];
    const nextMonthStart = new Date(targetYear, targetMonth, 1).toISOString().split("T")[0];

    const { data: holidayData } = await supabase
      .from("holiday")
      .select("*")
      .gte("holiday_date", startDate)
      .lte("holiday_date", nextMonthStart);

    setHolidays(holidayData || []);

    // シフトベースの候補を取得
    const candidateData = await generateKensanbiCandidates(targetYear, targetMonth);

    // 手動追加された履歴を取得してマージ
    const manualData = await getManualKensanbiHistory(targetYear, targetMonth);

    // マージして日付順にソート
    const allCandidates = [...candidateData, ...manualData].sort((a, b) =>
      a.shiftDate.localeCompare(b.shiftDate)
    );

    setCandidates(allCandidates);

    setLoading(false);
  };

  // 候補を一括生成（履歴に登録）
  const handleGenerateCandidates = async () => {
    setGenerating(true);
    const result = await createKensanbiHistoryBulk(candidates);
    if (result.success) {
      alert(`${result.count}件の候補を登録しました`);
      await fetchData();
    } else {
      alert("エラー: " + result.error);
    }
    setGenerating(false);
  };

  // 個別承認
  const handleApprove = async (historyId: number) => {
    if (!user) return;
    setProcessing(historyId);
    const result = await approveKensanbi(historyId, user.staff_id);
    if (result.success) {
      await fetchData();
    } else {
      alert("エラー: " + result.error);
    }
    setProcessing(null);
  };

  // 個別却下
  const handleReject = async (historyId: number) => {
    if (!user) return;
    const reason = prompt("却下理由（任意）:");
    setProcessing(historyId);
    const result = await rejectKensanbi(historyId, user.staff_id, reason || undefined);
    if (result.success) {
      await fetchData();
    } else {
      alert("エラー: " + result.error);
    }
    setProcessing(null);
  };

  // 一括承認
  const handleBulkApprove = async () => {
    if (!user) return;
    const pendingIds = candidates
      .filter((c) => c.existingStatus === "pending" && c.existingHistoryId)
      .map((c) => c.existingHistoryId!);

    if (pendingIds.length === 0) {
      alert("承認待ちの候補がありません");
      return;
    }

    if (!confirm(`${pendingIds.length}件を一括承認しますか？`)) return;

    setGenerating(true);
    const result = await approveKensanbiBulk(pendingIds, user.staff_id);
    if (result.success) {
      alert(`${result.count}件を承認しました`);
      await fetchData();
    } else {
      alert("エラー: " + result.error);
    }
    setGenerating(false);
  };

  // 手動追加時の日付変更ハンドラ（研鑽日数を自動計算）
  const handleManualDateChange = async (dateStr: string) => {
    setManualForm({ ...manualForm, shiftDate: dateStr });

    if (!dateStr) {
      setCalculatedDays(null);
      return;
    }

    // 祝日を取得して計算
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];

    const { data: holidayData } = await supabase
      .from("holiday")
      .select("*")
      .in("holiday_date", [dateStr, nextDayStr]);

    const days = calculateKensanbiDays(dateStr, holidayData || []);
    setCalculatedDays(days);
    setManualForm((prev) => ({ ...prev, shiftDate: dateStr, grantedDays: days }));
  };

  // 手動追加
  const handleManualAdd = async () => {
    if (!manualForm.staffId || !manualForm.shiftDate) {
      alert("メンバーと日付を選択してください");
      return;
    }

    if (manualForm.grantedDays === 0) {
      alert("選択した日付は平日のため研鑽日は付与されません");
      return;
    }

    setGenerating(true);
    const result = await createManualKensanbiHistory(
      manualForm.staffId,
      manualForm.shiftDate,
      manualForm.grantedDays
    );
    if (result.success) {
      alert("手動追加しました（承認待ち状態）");
      setShowManualModal(false);
      setManualForm({ staffId: "", shiftDate: "", grantedDays: 0 });
      setCalculatedDays(null);
      await fetchData();
    } else {
      alert("エラー: " + result.error);
    }
    setGenerating(false);
  };

  // 日付でグループ化
  const groupedCandidates = useMemo(() => {
    const groups: { [date: string]: KensanbiCandidate[] } = {};
    candidates.forEach((c) => {
      if (!groups[c.shiftDate]) {
        groups[c.shiftDate] = [];
      }
      groups[c.shiftDate].push(c);
    });
    return groups;
  }, [candidates]);

  // サマリー計算
  const summary = useMemo(() => {
    const total = candidates.length;
    const pending = candidates.filter((c) => c.existingStatus === "pending").length;
    const approved = candidates.filter((c) => c.existingStatus === "approved").length;
    const rejected = candidates.filter((c) => c.existingStatus === "rejected").length;
    const notRegistered = candidates.filter((c) => !c.existingHistoryId).length;
    const totalDays = candidates
      .filter((c) => c.existingStatus === "approved" || c.existingStatus === "pending")
      .reduce((sum, c) => sum + c.grantedDays, 0);

    return { total, pending, approved, rejected, notRegistered, totalDays };
  }, [candidates]);

  // 祝日名を取得
  const getHolidayName = (dateStr: string): string | null => {
    const holiday = holidays.find((h) => h.holiday_date === dateStr);
    return holiday?.name || null;
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/home")}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">研鑽日承認</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 月選択 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-lg font-bold">
              {targetYear}年{targetMonth}月
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* サマリー */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>対象件数: <strong>{summary.total}件</strong></span>
              <span className="text-yellow-600">承認待ち: <strong>{summary.pending}件</strong></span>
              <span className="text-green-600">承認済み: <strong>{summary.approved}件</strong></span>
              <span className="text-red-600">却下: <strong>{summary.rejected}件</strong></span>
              {summary.notRegistered > 0 && (
                <span className="text-gray-500">未登録: <strong>{summary.notRegistered}件</strong></span>
              )}
              <span className="text-blue-600">付与予定合計: <strong>{summary.totalDays}日</strong></span>
            </div>
            <div className="flex gap-2">
              {summary.notRegistered > 0 && (
                <button
                  onClick={handleGenerateCandidates}
                  disabled={generating}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                >
                  {generating ? "処理中..." : "候補生成"}
                </button>
              )}
              <button
                onClick={() => setShowManualModal(true)}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                手動追加
              </button>
              {summary.pending > 0 && (
                <button
                  onClick={handleBulkApprove}
                  disabled={generating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {generating ? "処理中..." : "一括承認"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 候補一覧 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            対象月に研鑽日候補はありません。<br />
            シフト設定で「研鑽日付与対象」にチェックを入れたシフトタイプがあるか確認してください。
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {Object.entries(groupedCandidates)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateCandidates]) => {
                const dayOfWeek = getDayOfWeekName(date);
                const holidayName = getHolidayName(date);
                const day = new Date(date).getDate();
                const isWeekend = dayOfWeek === "土" || dayOfWeek === "日";

                return (
                  <div key={date} className="border-b border-gray-200 last:border-b-0">
                    <div
                      className={`px-4 py-2 font-medium ${
                        holidayName
                          ? "bg-red-50 text-red-700"
                          : isWeekend
                          ? dayOfWeek === "土"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-red-50 text-red-700"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {day}日（{dayOfWeek}）
                      {holidayName && <span className="ml-2 text-sm">{holidayName}</span>}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {dateCandidates.map((candidate) => (
                        <div
                          key={candidate.userShiftId}
                          className="px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{candidate.staffName}</span>
                            <span className="text-sm text-gray-500">{candidate.shiftTypeName}</span>
                            <span className="text-blue-600 font-bold">
                              → {candidate.grantedDays}日
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!candidate.existingHistoryId ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                未登録
                              </span>
                            ) : candidate.existingStatus === "pending" ? (
                              <>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                                  承認待ち
                                </span>
                                <button
                                  onClick={() => handleApprove(candidate.existingHistoryId!)}
                                  disabled={processing === candidate.existingHistoryId}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  承認
                                </button>
                                <button
                                  onClick={() => handleReject(candidate.existingHistoryId!)}
                                  disabled={processing === candidate.existingHistoryId}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                >
                                  却下
                                </button>
                              </>
                            ) : candidate.existingStatus === "approved" ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                承認済み
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                却下
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* 手動追加モーダル */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">研鑽日を手動追加</h2>
              <p className="text-sm text-gray-500 mt-1">シフト変更等で実際の当直者と記録が異なる場合に使用</p>
            </div>

            <div className="p-6 space-y-4">
              {/* メンバー選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メンバー <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualForm.staffId}
                  onChange={(e) => setManualForm({ ...manualForm, staffId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {members.map((m) => (
                    <option key={m.staff_id} value={m.staff_id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 日付選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当直日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={manualForm.shiftDate}
                  onChange={(e) => handleManualDateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 研鑽日数（自動計算） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  研鑽日数（自動計算）
                </label>
                {calculatedDays !== null ? (
                  <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                    {calculatedDays === 0 ? (
                      <span className="text-gray-500">平日のため研鑽日は付与されません</span>
                    ) : (
                      <span className="text-blue-600 font-bold text-lg">{calculatedDays}日</span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      ※ 当日・翌日が土日祝の場合、それぞれ0.5日が加算されます
                    </p>
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-400">
                    日付を選択してください
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowManualModal(false);
                  setManualForm({ staffId: "", shiftDate: "", grantedDays: 0 });
                  setCalculatedDays(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleManualAdd}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? "追加中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
