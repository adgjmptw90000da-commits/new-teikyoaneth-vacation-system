// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setUser } from "@/lib/auth";
import { validateStaffId, validatePassword } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // バリデーション
    const staffIdValidation = validateStaffId(staffId);
    if (!staffIdValidation.isValid) {
      setError(staffIdValidation.error || "");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || "");
      return;
    }

    setLoading(true);

    try {
      // ユーザー認証
      const { data, error: dbError } = await supabase
        .from("user")
        .select("*")
        .eq("staff_id", staffId)
        .eq("password", password)
        .single();

      if (dbError || !data) {
        setError("職員IDまたはパスワードが正しくありません");
        setLoading(false);
        return;
      }

      // ユーザー情報をLocalStorageに保存
      setUser({
        staff_id: data.staff_id,
        name: data.name,
        is_admin: data.is_admin,
      });

      // ホーム画面へ
      router.push("/home");
    } catch (err) {
      setError("エラーが発生しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            年休管理システム
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="staffId" className="sr-only">
                職員ID
              </label>
              <input
                id="staffId"
                name="staffId"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="職員ID"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/organization")}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              新規登録はこちら
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
