// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Holiday = Database["public"]["Tables"]["holiday"]["Row"];

export default function HolidaysPage() {
  const router = useRouter();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // 新規追加フォーム
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

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

    fetchHolidays();
  }, [router]);

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from("holiday")
        .select("*")
        .order("holiday_date", { ascending: true });

      if (error) {
        console.error("Error fetching holidays:", error);
      } else {
        setHolidays(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newDate || !newName) {
      setError("日付と名前を入力してください");
      return;
    }

    setAdding(true);

    try {
      const { error: insertError } = await supabase
        .from("holiday")
        .insert({
          holiday_date: newDate,
          name: newName,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          // 重複エラー
          setError("その日付は既に登録されています");
        } else {
          setError("登録に失敗しました");
          console.error("Insert error:", insertError);
        }
        setAdding(false);
        return;
      }

      // 成功したらフォームをリセット
      setNewDate("");
      setNewName("");
      await fetchHolidays();
      alert("祝日を登録しました");
    } catch (err) {
      console.error("Error:", err);
      setError("エラーが発生しました");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (holiday: Holiday) => {
    if (!window.confirm(`${holiday.name}（${holiday.holiday_date}）を削除しますか？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("holiday")
        .delete()
        .eq("id", holiday.id);

      if (error) {
        alert("削除に失敗しました");
        console.error("Delete error:", error);
        return;
      }

      await fetchHolidays();
      alert("祝日を削除しました");
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
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
              <h1 className="text-xl font-bold text-gray-900">
                祝日管理
              </h1>
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
          {/* 新規追加フォーム */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              祝日を追加
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    日付 *
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    名前 *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder="例: 元日"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {adding ? "追加中..." : "追加"}
                </button>
              </div>
            </form>
          </div>

          {/* 祝日一覧 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              登録済み祝日
            </h2>

            {holidays.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                登録されている祝日がありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        名前
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holidays.map((holiday) => (
                      <tr key={holiday.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holiday.holiday_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holiday.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDelete(holiday)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
