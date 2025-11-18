"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  validateStaffId,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
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

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || "");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || "");
      return;
    }

    const passwordConfirmationValidation = validatePasswordConfirmation(
      password,
      passwordConfirmation
    );
    if (!passwordConfirmationValidation.isValid) {
      setError(passwordConfirmationValidation.error || "");
      return;
    }

    setLoading(true);

    try {
      // 職員IDの重複チェック
      const { data: existingUser } = await supabase
        .from("user")
        .select("staff_id")
        .eq("staff_id", staffId)
        .single();

      if (existingUser) {
        setError("この職員IDは既に登録されています");
        setLoading(false);
        return;
      }

      // 新規ユーザー登録
      const { error: insertError } = await supabase.from("user").insert({
        staff_id: staffId,
        name: name,
        password: password,
        is_admin: false,
      });

      if (insertError) {
        setError("登録に失敗しました");
        console.error(insertError);
        setLoading(false);
        return;
      }

      // 登録成功、ログイン画面へ
      alert("登録が完了しました。ログインしてください。");
      router.push("/auth/login");
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
            新規登録
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            職員情報を入力してください
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
                placeholder="職員ID（数字のみ）"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="name" className="sr-only">
                氏名
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="氏名（姓名の間はスペースなし）"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="パスワード（半角英数6文字以上）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="passwordConfirmation" className="sr-only">
                パスワード（確認）
              </label>
              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="パスワード（確認）"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
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
              {loading ? "登録中..." : "登録"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              既にアカウントをお持ちの方はこちら
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
