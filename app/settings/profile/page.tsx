// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, setUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  validateName,
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/validation";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffId, setStaffId] = useState("");

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setName(user.name);
    setStaffId(user.staff_id);
  }, [router]);

  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || "");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("user")
        .update({ name })
        .eq("staff_id", staffId);

      if (updateError) {
        setError("氏名の更新に失敗しました");
        setLoading(false);
        return;
      }

      // LocalStorageの情報を更新
      const user = getUser();
      if (user) {
        setUser({ ...user, name });
      }

      setSuccess("氏名を更新しました");
    } catch (err) {
      setError("エラーが発生しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || "");
      return;
    }

    const confirmationValidation = validatePasswordConfirmation(
      newPassword,
      newPasswordConfirmation
    );
    if (!confirmationValidation.isValid) {
      setError(confirmationValidation.error || "");
      return;
    }

    setLoading(true);

    try {
      // 現在のパスワードを確認
      const { data: userData, error: fetchError } = await supabase
        .from("user")
        .select("password")
        .eq("staff_id", staffId)
        .single();

      if (fetchError || !userData) {
        setError("現在のパスワードの確認に失敗しました");
        setLoading(false);
        return;
      }

      if (userData.password !== currentPassword) {
        setError("現在のパスワードが正しくありません");
        setLoading(false);
        return;
      }

      // パスワードを更新
      const { error: updateError } = await supabase
        .from("user")
        .update({ password: newPassword })
        .eq("staff_id", staffId);

      if (updateError) {
        setError("パスワードの更新に失敗しました");
        setLoading(false);
        return;
      }

      setSuccess("パスワードを更新しました");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
    } catch (err) {
      setError("エラーが発生しました");
      console.error(err);
    } finally {
      setLoading(false);
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
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <Icons.Settings />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                個人情報設定
              </h1>
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

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm font-medium flex items-center gap-2">
              <Icons.Check />
              {success}
            </div>
          )}

          {/* 氏名変更フォーム */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icons.User />
                氏名の変更
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleNameChange} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-bold text-gray-700 mb-1"
                  >
                    氏名
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-4 text-gray-900"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                  >
                    {loading ? "更新中..." : "氏名を更新"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* パスワード変更フォーム */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icons.Lock />
                パスワードの変更
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-bold text-gray-700 mb-1"
                  >
                    現在のパスワード
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    required
                    className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-4 text-gray-900"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-bold text-gray-700 mb-1"
                  >
                    新しいパスワード
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-4 text-gray-900"
                    placeholder="半角英数6文字以上"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="newPasswordConfirmation"
                    className="block text-sm font-bold text-gray-700 mb-1"
                  >
                    新しいパスワード（確認）
                  </label>
                  <input
                    id="newPasswordConfirmation"
                    type="password"
                    required
                    className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-4 text-gray-900"
                    value={newPasswordConfirmation}
                    onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                  >
                    {loading ? "更新中..." : "パスワードを更新"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
