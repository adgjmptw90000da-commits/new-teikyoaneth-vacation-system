"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { validateOrganizationCode } from "@/lib/validation";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            組織コード認証
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            組織コードを入力してください
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="code" className="sr-only">
              組織コード
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="組織コード"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
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
              {loading ? "確認中..." : "次へ"}
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
