// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { validateOrganizationCode } from "@/lib/validation";

// Icons
const Icons = {
  Key: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
  ),
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="22" /><line x1="15" y1="22" x2="15" y2="22" /><line x1="12" y1="22" x2="12" y2="22" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
  ),
};

export default function OrganizationPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // バリデーション
    const validation = validateOrganizationCode(code);
    if (!validation.isValid) {
      setError(validation.error || "");
      return;
    }

    setLoading(true);

    try {
      // Supabaseから組織コードを取得
      const { data, error: dbError } = await supabase
        .from("setting")
        .select("organization_code")
        .eq("id", 1)
        .single();

      if (dbError) {
        setError("組織コードの確認に失敗しました");
        setLoading(false);
        return;
      }

      // 組織コードの照合
      if (data.organization_code === code) {
        // 正しいコードの場合、新規登録画面へ
        router.push("/auth/register");
      } else {
        setError("組織コードが正しくありません");
      }
    } catch (err) {
      setError("エラーが発生しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Icons.Building />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            組織コード認証
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            組織コードを入力してください
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="relative">
            <label htmlFor="code" className="sr-only">
              組織コード
            </label>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Icons.Key />
            </div>
            <input
              id="code"
              name="code"
              type="text"
              required
              className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm bg-white/50"
              placeholder="組織コード"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? "確認中..." : "次へ"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors hover:underline"
            >
              既にアカウントをお持ちの方はこちら
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
