// @ts-nocheck
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShiftSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 統合ページのシフトタブにリダイレクト
    router.replace("/admin/schedule-settings?tab=shift");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">リダイレクト中...</div>
    </div>
  );
}
