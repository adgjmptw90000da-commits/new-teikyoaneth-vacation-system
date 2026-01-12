"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // ログイン状態をチェックし、未ログインなら認証画面へリダイレクト
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/auth/login");
    } else {
      router.push("/home");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>読み込み中...</p>
    </div>
  );
}
