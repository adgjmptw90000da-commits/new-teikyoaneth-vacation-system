// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type User = Database["public"]["Tables"]["user"]["Row"];

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
};

export default function MembersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ staff_id: string } | null>(null);
  const [editingRetentionRates, setEditingRetentionRates] = useState<{ [key: string]: number }>({});

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

    setCurrentUser(user);
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user")
        .select("*")
        .order("staff_id", { ascending: true });

      if (error) {
        console.error("Error fetching users:", error);
        alert("ユーザー一覧の取得に失敗しました");
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const getAdminCount = (): number => {
    return users.filter(u => u.is_admin).length;
  };

  const handleToggleAdmin = async (user: User) => {
    // 自分自身は変更不可
    if (currentUser && user.staff_id === currentUser.staff_id) {
      alert("自分自身の権限は変更できません");
      return;
    }

    // 最後の管理者は変更不可
    if (user.is_admin && getAdminCount() === 1) {
      alert("最後の管理者の権限は変更できません");
      return;
    }

    const newAdminStatus = !user.is_admin;
    const action = newAdminStatus ? "管理者権限を付与" : "管理者権限を解除";

    if (!window.confirm(`${user.name}さんの${action}しますか？`)) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("user")
        .update({ is_admin: newAdminStatus })
        .eq("staff_id", user.staff_id);

      if (error) {
        alert("権限の変更に失敗しました");
        console.error("Error:", error);
      } else {
        alert(`${action}しました`);
        await fetchUsers();
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    // 自分自身は削除不可
    if (currentUser && user.staff_id === currentUser.staff_id) {
      alert("自分自身は削除できません");
      return;
    }

    // 最後の管理者は削除不可
    if (user.is_admin && getAdminCount() === 1) {
      alert("最後の管理者は削除できません");
      return;
    }

    if (!window.confirm(`${user.name}さん（職員ID: ${user.staff_id}）を削除しますか？\n\nこの操作は取り消せません。過去の申請データは残りますが、ユーザー情報は完全に削除されます。`)) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("user")
        .delete()
        .eq("staff_id", user.staff_id);

      if (error) {
        alert("ユーザーの削除に失敗しました");
        console.error("Error:", error);
      } else {
        alert("ユーザーを削除しました");
        await fetchUsers();
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleRetentionRateChange = (staffId: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    setEditingRetentionRates(prev => ({
      ...prev,
      [staffId]: numValue
    }));
  };

  const handleRetentionRateBlur = async (user: User) => {
    const newRate = editingRetentionRates[user.staff_id];

    // 編集中の値がない場合は何もしない
    if (newRate === undefined) return;

    // 元の値と同じ場合は何もしない
    if (newRate === (user.point_retention_rate ?? 100)) {
      // 編集状態をクリア
      setEditingRetentionRates(prev => {
        const newState = { ...prev };
        delete newState[user.staff_id];
        return newState;
      });
      return;
    }

    // バリデーション
    if (newRate < 0 || newRate > 100) {
      alert("得点保持率は0〜100の範囲で入力してください");
      // 元の値に戻す
      setEditingRetentionRates(prev => {
        const newState = { ...prev };
        delete newState[user.staff_id];
        return newState;
      });
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("user")
        .update({ point_retention_rate: newRate })
        .eq("staff_id", user.staff_id);

      if (error) {
        alert("得点保持率の更新に失敗しました");
        console.error("Error:", error);
      } else {
        await fetchUsers();
        // 編集状態をクリア
        setEditingRetentionRates(prev => {
          const newState = { ...prev };
          delete newState[user.staff_id];
          return newState;
        });
      }
    } catch (err) {
      console.error("Error:", err);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };

  const handleRetentionRateKeyDown = async (e: React.KeyboardEvent, user: User) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleRetentionRateBlur(user);
    } else if (e.key === "Escape") {
      // Escキーで編集をキャンセル
      setEditingRetentionRates(prev => {
        const newState = { ...prev };
        delete newState[user.staff_id];
        return newState;
      });
    }
  };

  const isCurrentUser = (user: User): boolean => {
    return currentUser ? user.staff_id === currentUser.staff_id : false;
  };

  const cannotModify = (user: User): boolean => {
    // 自分自身または最後の管理者は変更不可
    return isCurrentUser(user) || (user.is_admin && getAdminCount() === 1);
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
                <Icons.Users />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">メンバー管理</h1>
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

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                登録メンバー一覧
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                全{users.length}名（管理者: {getAdminCount()}名）
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    職員ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    氏名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    登録日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    管理者権限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    得点保持率
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.staff_id} className={`hover:bg-gray-50 transition-colors ${isCurrentUser(user) ? "bg-blue-50/50" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.staff_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {isCurrentUser(user) && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                            あなた
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          disabled={cannotModify(user) || processing}
                          onClick={() => handleToggleAdmin(user)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${user.is_admin ? 'bg-blue-600' : 'bg-gray-200'
                            } ${cannotModify(user) || processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.is_admin ? 'translate-x-5' : 'translate-x-0'
                              }`}
                          />
                        </button>
                        <span className={`text-sm font-medium flex items-center gap-1 ${user.is_admin ? 'text-blue-700' : 'text-gray-500'}`}>
                          {user.is_admin ? (
                            <>
                              <Icons.Shield />
                              管理者
                            </>
                          ) : (
                            <>
                              <Icons.User />
                              一般
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingRetentionRates[user.staff_id] ?? user.point_retention_rate ?? 100}
                          onChange={(e) => handleRetentionRateChange(user.staff_id, e.target.value)}
                          onBlur={() => handleRetentionRateBlur(user)}
                          onKeyDown={(e) => handleRetentionRateKeyDown(e, user)}
                          disabled={processing}
                          className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all"
                        />
                        <span className="text-gray-600 font-medium">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={cannotModify(user) || processing}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </main>
    </div>
  );
}
