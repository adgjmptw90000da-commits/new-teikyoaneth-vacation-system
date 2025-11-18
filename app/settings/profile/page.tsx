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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                個人情報設定
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ホームへ
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* 氏名変更フォーム */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              氏名の変更
            </h2>
            <form onSubmit={handleNameChange} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  氏名
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? "更新中..." : "氏名を更新"}
              </button>
            </form>
          </div>

          {/* パスワード変更フォーム */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              パスワードの変更
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  現在のパスワード
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  新しいパスワード
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="半角英数6文字以上"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="newPasswordConfirmation"
                  className="block text-sm font-medium text-gray-700"
                >
                  新しいパスワード（確認）
                </label>
                <input
                  id="newPasswordConfirmation"
                  type="password"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? "更新中..." : "パスワードを更新"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
