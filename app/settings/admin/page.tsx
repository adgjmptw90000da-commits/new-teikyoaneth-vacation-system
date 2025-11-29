// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { validateOrganizationCode } from "@/lib/validation";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  ),
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="22.01" /><line x1="15" y1="22" x2="15" y2="22.01" /><line x1="12" y1="22" x2="12" y2="22.01" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="4" y1="14" x2="20" y2="14" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Award: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
  ),
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [organizationCode, setOrganizationCode] = useState("");
  const [lotteryPeriodMonths, setLotteryPeriodMonths] = useState(3);
  const [lotteryPeriodStartDay, setLotteryPeriodStartDay] = useState(1);
  const [lotteryPeriodEndDay, setLotteryPeriodEndDay] = useState(15);
  const [showLotteryPeriodApplications, setShowLotteryPeriodApplications] = useState(true);
  const [maxAnnualLeavePoints, setMaxAnnualLeavePoints] = useState(20);
  const [level1Points, setLevel1Points] = useState(2);
  const [level2Points, setLevel2Points] = useState(1);
  const [level3Points, setLevel3Points] = useState(0.1);
  const [currentFiscalYear, setCurrentFiscalYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!isAdmin()) {
      alert("管理者権限がありません");
      router.push("/home");
      return;
    }

    // 現在の設定を取得
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("setting")
        .select("*")
        .eq("id", 1)
        .single();

      if (!error && data) {
        setOrganizationCode(data.organization_code);
        setLotteryPeriodMonths(data.lottery_period_months);
        setLotteryPeriodStartDay(data.lottery_period_start_day);
        setLotteryPeriodEndDay(data.lottery_period_end_day);
        setShowLotteryPeriodApplications(data.show_lottery_period_applications ?? true);
        setMaxAnnualLeavePoints(data.max_annual_leave_points ?? 20);
        setLevel1Points(data.level1_points ?? 2);
        setLevel2Points(data.level2_points ?? 1);
        setLevel3Points(data.level3_points ?? 0.1);
        setCurrentFiscalYear(data.current_fiscal_year ?? new Date().getFullYear());
      }
    };

    fetchSettings();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validation = validateOrganizationCode(organizationCode);
    if (!validation.isValid) {
      setError(validation.error || "");
      return;
    }

    // 抽選期間のバリデーション
    if (lotteryPeriodStartDay < 1 || lotteryPeriodStartDay > 31) {
      setError("抽選開始日は1〜31の範囲で入力してください");
      return;
    }
    if (lotteryPeriodEndDay < 1 || lotteryPeriodEndDay > 31) {
      setError("抽選終了日は1〜31の範囲で入力してください");
      return;
    }
    if (lotteryPeriodMonths < 1) {
      setError("抽選期間（何ヶ月前）は1以上で入力してください");
      return;
    }

    // 年休得点のバリデーション
    if (maxAnnualLeavePoints < 1) {
      setError("最大年休得点は1以上で入力してください");
      return;
    }
    if (level1Points < 0) {
      setError("レベル1消費得点は0以上で入力してください");
      return;
    }
    if (level2Points < 0) {
      setError("レベル2消費得点は0以上で入力してください");
      return;
    }
    if (level3Points < 0) {
      setError("レベル3消費得点は0以上で入力してください");
      return;
    }
    if (currentFiscalYear < 2000) {
      setError("年度は2000以上で入力してください");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("setting")
        .update({
          organization_code: organizationCode,
          lottery_period_months: lotteryPeriodMonths,
          lottery_period_start_day: lotteryPeriodStartDay,
          lottery_period_end_day: lotteryPeriodEndDay,
          show_lottery_period_applications: showLotteryPeriodApplications,
          max_annual_leave_points: maxAnnualLeavePoints,
          level1_points: level1Points,
          level2_points: level2Points,
          level3_points: level3Points,
          current_fiscal_year: currentFiscalYear,
        })
        .eq("id", 1);

      if (updateError) {
        setError("設定の更新に失敗しました");
        setLoading(false);
        return;
      }

      setSuccess("設定を更新しました");
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
              <div className="bg-gray-700 p-1.5 rounded-lg text-white">
                <Icons.Settings />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                管理者設定
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push(isAdmin() ? "/admin/home" : "/home")}
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
              <p className="text-red-600 text-sm font-bold">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2">
              <p className="text-green-600 text-sm font-bold">{success}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
              {/* 組織コード */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-blue-600">
                    <Icons.Building />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    組織コードの変更
                  </h2>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  新規登録時に使用する組織コードを変更できます。
                </p>
                <div>
                  <label
                    htmlFor="organizationCode"
                    className="block text-sm font-bold text-gray-700 mb-2"
                  >
                    組織コード
                  </label>
                  <input
                    id="organizationCode"
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={organizationCode}
                    onChange={(e) => setOrganizationCode(e.target.value)}
                  />
                </div>
              </div>

              {/* 抽選参加可能期間 */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-blue-600">
                    <Icons.Calendar />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    抽選参加可能期間の設定
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  レベル1・2の年休申請ができる期間を設定します。
                  <br />
                  例: 3ヶ月前の1日〜15日 → 6月の年休は3月1日〜15日に申請可能
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label
                      htmlFor="lotteryPeriodMonths"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      何ヶ月前
                    </label>
                    <input
                      id="lotteryPeriodMonths"
                      type="number"
                      min="1"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={lotteryPeriodMonths}
                      onChange={(e) => setLotteryPeriodMonths(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">例: 3</p>
                  </div>

                  <div>
                    <label
                      htmlFor="lotteryPeriodStartDay"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      開始日
                    </label>
                    <input
                      id="lotteryPeriodStartDay"
                      type="number"
                      min="1"
                      max="31"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={lotteryPeriodStartDay}
                      onChange={(e) => setLotteryPeriodStartDay(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">例: 1日</p>
                  </div>

                  <div>
                    <label
                      htmlFor="lotteryPeriodEndDay"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      終了日
                    </label>
                    <input
                      id="lotteryPeriodEndDay"
                      type="number"
                      min="1"
                      max="31"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={lotteryPeriodEndDay}
                      onChange={(e) => setLotteryPeriodEndDay(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">例: 15日</p>
                  </div>
                </div>
              </div>

              {/* カレンダー表示設定 */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-blue-600">
                    <Icons.Eye />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    カレンダー表示設定
                  </h3>
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      抽選参加期間内の申請を表示
                    </label>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      オフにすると、年休カレンダー・管理カレンダーで抽選参加期間内の申請が非表示になり、申請一覧では抽選参加期間内の申請の順位が非表示になります
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLotteryPeriodApplications(!showLotteryPeriodApplications)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showLotteryPeriodApplications ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showLotteryPeriodApplications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* 年休得点制限設定 */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-blue-600">
                    <Icons.Award />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    年休得点制限設定
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  レベル1・2の申請回数を制限するための得点システムを設定します。
                  <br />
                  年度は4月開始です（例: 2025年度 = 2025年4月1日〜2026年3月31日）
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="maxAnnualLeavePoints"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      最大年休得点
                    </label>
                    <input
                      id="maxAnnualLeavePoints"
                      type="number"
                      min="1"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={maxAnnualLeavePoints}
                      onChange={(e) => setMaxAnnualLeavePoints(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">デフォルト: 20点</p>
                  </div>

                  <div>
                    <label
                      htmlFor="currentFiscalYear"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      現在の年度
                    </label>
                    <input
                      id="currentFiscalYear"
                      type="number"
                      min="2000"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={currentFiscalYear}
                      onChange={(e) => setCurrentFiscalYear(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">例: 2025（2025年4月〜2026年3月）</p>
                  </div>

                  <div>
                    <label
                      htmlFor="level1Points"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      レベル1消費得点
                    </label>
                    <input
                      id="level1Points"
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={level1Points}
                      onChange={(e) => setLevel1Points(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">デフォルト: 2点</p>
                  </div>

                  <div>
                    <label
                      htmlFor="level2Points"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      レベル2消費得点
                    </label>
                    <input
                      id="level2Points"
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={level2Points}
                      onChange={(e) => setLevel2Points(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">デフォルト: 1点</p>
                  </div>

                  <div>
                    <label
                      htmlFor="level3Points"
                      className="block text-sm font-bold text-gray-700 mb-2"
                    >
                      レベル3消費得点
                    </label>
                    <input
                      id="level3Points"
                      type="number"
                      min="0"
                      step="0.1"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={level3Points}
                      onChange={(e) => setLevel3Points(Number(e.target.value))}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 font-medium">デフォルト: 0.1点（0に設定すると得点に関係なく申請可能）</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? "更新中..." : "設定を更新"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
