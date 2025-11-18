"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import {
  getRecordCountsByFiscalYear,
  deleteRecordsByFiscalYear,
} from "@/lib/dataCleanup";

export default function DataCleanupPage() {
  const router = useRouter();
  const [fiscalYear, setFiscalYear] = useState<number>(2023);
  const [counts, setCounts] = useState<{
    applications: number;
    calendarRecords: number;
    holidays: number;
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
      counts.applications + counts.calendarRecords + counts.holidays;

    if (totalCount === 0) {
      alert("削除対象のデータがありません");
      return;
    }

    // 第1段階: レコード数を表示して確認
    const firstConfirm = window.confirm(
      `以下のデータを削除しますか？\n\n` +
        `申請: ${counts.applications}件\n` +
        `カレンダー: ${counts.calendarRecords}件\n` +
        `祝日: ${counts.holidays}件\n` +
        `合計: ${totalCount}件`
    );

    if (!firstConfirm) {
      return;
    }

    // 第2段階: 最終確認
    const secondConfirm = window.confirm(
      `本当に削除しますか？\n\nこの操作は取り消せません。`
    );

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ログ削除</h1>
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

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                年度別データ削除
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                指定した年度の申請ログ、カレンダーデータ、祝日データを削除します。
                <br />
                年度は4月1日〜翌年3月31日です（例: 2023年度 = 2023/4/1〜2024/3/31）
              </p>

              {/* 年度選択 */}
              <div className="mb-6">
                <label
                  htmlFor="fiscalYear"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  削除する年度を選択
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    id="fiscalYear"
                    min="2000"
                    max="2100"
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(Number(e.target.value))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">年度</span>
                  <button
                    onClick={handlePreview}
                    disabled={loading || processing}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "読み込み中..." : "プレビュー"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {fiscalYear}年度 = {fiscalYear}/4/1 〜 {fiscalYear + 1}/3/31
                </p>
              </div>

              {/* プレビュー結果 */}
              {counts !== null && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    削除対象データ
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="px-4 py-2 text-left font-medium text-gray-700">
                            種類
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">
                            件数
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-2 text-gray-900">申請</td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {counts.applications}件
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-2 text-gray-900">
                            カレンダー
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {counts.calendarRecords}件
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-2 text-gray-900">祝日</td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {counts.holidays}件
                          </td>
                        </tr>
                        <tr className="font-semibold">
                          <td className="px-4 py-2 text-gray-900">合計</td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {counts.applications +
                              counts.calendarRecords +
                              counts.holidays}
                            件
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 削除ボタン */}
                  <div className="mt-4">
                    <button
                      onClick={handleDelete}
                      disabled={processing}
                      className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? "削除中..." : "削除実行"}
                    </button>
                  </div>
                </div>
              )}

              {/* 警告 */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>警告:</strong>{" "}
                      削除したデータは復元できません。実行前に必ずバックアップを取ってください。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
