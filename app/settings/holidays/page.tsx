// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Holiday = Database["public"]["Tables"]["holiday"]["Row"];

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
};

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
              <div className="bg-pink-500 p-1.5 rounded-lg text-white">
                <Icons.Calendar />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                祝日管理
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Icons.Home />
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 新規追加フォーム */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                祝日を追加
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleAdd} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      日付 *
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      名前 *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      placeholder="例: 元日"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex items-center gap-2 px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                  >
                    <Icons.Plus />
                    {adding ? "追加中..." : "追加"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* 祝日一覧 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                登録済み祝日
              </h2>
            </div>

            {holidays.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                  <Icons.Calendar />
                </div>
                <p className="text-gray-500 font-medium">
                  登録されている祝日がありません
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        名前
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holidays.map((holiday) => (
                      <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {holiday.holiday_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {holiday.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDelete(holiday)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                          >
                            <Icons.Trash />
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
