// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import {
  getRecordCountsByFiscalYear,
  deleteRecordsByFiscalYear,
} from "@/lib/dataCleanup";
import { useConfirm } from "@/components/ConfirmDialog";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  AlertTriangle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
  ),
};

export default function DataCleanupPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [fiscalYear, setFiscalYear] = useState<number>(2023);
  const [counts, setCounts] = useState<{
    applications: number;
    calendarRecords: number;
    holidays: number;
    conferences: number;
    events: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
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
  }, [router]);

  const handlePreview = async () => {
    if (!fiscalYear || fiscalYear < 2000 || fiscalYear > 2100) {
      alert("有効な年度を入力してください（2000〜2100）");
      return;
    }

    setLoading(true);
    try {
      const recordCounts = await getRecordCountsByFiscalYear(fiscalYear);
      if (recordCounts === null) {
        alert("レコード数の取得に失敗しました");
      } else {
        setCounts(recordCounts);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!counts) {
      alert("まずプレビューを実行してください");
      return;
    }

    const totalCount =
      counts.applications + counts.calendarRecords + counts.holidays + counts.conferences + counts.events;

    if (totalCount === 0) {
      alert("削除対象のデータがありません");
      return;
    }

    // 第1段階: レコード数を表示して確認
    const firstConfirm = await confirm({
      title: "削除の確認",
      message: `以下のデータを削除しますか？\n\n申請: ${counts.applications}件\nカレンダー: ${counts.calendarRecords}件\n祝日: ${counts.holidays}件\n主要学会: ${counts.conferences}件\nイベント: ${counts.events}件\n合計: ${totalCount}件`,
      variant: "danger",
    });

    if (!firstConfirm) {
      return;
    }

    // 第2段階: 最終確認
    const secondConfirm = await confirm({
      title: "最終確認",
      message: "本当に削除しますか？\n\nこの操作は取り消せません。",
      variant: "danger",
    });

    if (!secondConfirm) {
      return;
    }

    setProcessing(true);

    try {
      const success = await deleteRecordsByFiscalYear(fiscalYear);
      if (success) {
        alert(`${totalCount}件のデータを削除しました`);
        // プレビューをクリア
        setCounts(null);
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
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
              <div className="bg-red-600 p-1.5 rounded-lg text-white">
                <Icons.Trash />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">ログ削除</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="ホーム"
              >
                <Icons.Home />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              年度別データ削除
            </h2>
            <p className="text-sm text-gray-600">
              指定した年度の申請ログ、カレンダーデータ、祝日、主要学会、イベントデータを削除します。
              <br />
              年度は4月1日〜翌年3月31日です（例: 2023年度 = 2023/4/1〜2024/3/31）
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* 年度選択 */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <label
                htmlFor="fiscalYear"
                className="block text-sm font-bold text-gray-700 mb-3"
              >
                削除する年度を選択
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <input
                    type="number"
                    id="fiscalYear"
                    min="2000"
                    max="2100"
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value))}
                    className="w-32 pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">年度</span>
                </div>
                <button
                  onClick={handlePreview}
                  disabled={loading || processing}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icons.Search />
                  {loading ? "読み込み中..." : "プレビュー"}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500 font-medium">
                {fiscalYear}年度 = {fiscalYear}/4/1 〜 {fiscalYear + 1}/3/31
              </p>
            </div>

            {/* プレビュー結果 */}
            {counts !== null && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  削除対象データ
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-bold text-gray-500 uppercase tracking-wider">
                          種類
                        </th>
                        <th className="px-6 py-3 text-right font-bold text-gray-500 uppercase tracking-wider">
                          件数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-6 py-4 text-gray-900 font-medium">申請</td>
                        <td className="px-6 py-4 text-right text-gray-900 font-bold">
                          {counts.applications}件
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          カレンダー
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 font-bold">
                          {counts.calendarRecords}件
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-gray-900 font-medium">祝日</td>
                        <td className="px-6 py-4 text-right text-gray-900 font-bold">
                          {counts.holidays}件
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-gray-900 font-medium">主要学会</td>
                        <td className="px-6 py-4 text-right text-gray-900 font-bold">
                          {counts.conferences}件
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-gray-900 font-medium">イベント</td>
                        <td className="px-6 py-4 text-right text-gray-900 font-bold">
                          {counts.events}件
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 text-gray-900 font-bold">合計</td>
                        <td className="px-6 py-4 text-right text-gray-900 font-bold text-lg">
                          {counts.applications +
                            counts.calendarRecords +
                            counts.holidays +
                            counts.conferences +
                            counts.events}
                          件
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 削除ボタン */}
                <div className="flex justify-end">
                  <button
                    onClick={handleDelete}
                    disabled={processing}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icons.Trash />
                    {processing ? "削除中..." : "削除を実行する"}
                  </button>
                </div>
              </div>
            )}

            {/* 警告 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <div className="text-yellow-600 mt-0.5">
                <Icons.AlertTriangle />
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-800 mb-1">
                  警告
                </p>
                <p className="text-sm text-yellow-700">
                  削除したデータは復元できません。実行前に必ずバックアップを取ってください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {ConfirmDialog}
    </div>
  );
}
