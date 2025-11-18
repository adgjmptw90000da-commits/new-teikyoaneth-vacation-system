"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { validateOrganizationCode } from "@/lib/validation";

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                管理者設定
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

          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              組織コードの変更
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              新規登録時に使用する組織コードを変更できます。
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="organizationCode"
                  className="block text-sm font-medium text-gray-700"
                >
                  組織コード
                </label>
                <input
                  id="organizationCode"
                  type="text"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value)}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  抽選参加可能期間の設定
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  レベル1・2の年休申請ができる期間を設定します。
                  <br />
                  例: 3ヶ月前の1日〜15日 → 6月の年休は3月1日〜15日に申請可能
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="lotteryPeriodMonths"
                      className="block text-sm font-medium text-gray-700"
                    >
                      何ヶ月前
                    </label>
                    <input
                      id="lotteryPeriodMonths"
                      type="number"
                      min="1"
                      required
                      className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={lotteryPeriodMonths}
                      onChange={(e) => setLotteryPeriodMonths(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">例: 3</p>
                  </div>

                  <div>
                    <label
                      htmlFor="lotteryPeriodStartDay"
                      className="block text-sm font-medium text-gray-700"
                    >
                      開始日
                    </label>
                    <input
                      id="lotteryPeriodStartDay"
                      type="number"
                      min="1"
                      max="31"
                      required
                      className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={lotteryPeriodStartDay}
                      onChange={(e) => setLotteryPeriodStartDay(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">例: 1日</p>
                  </div>

                  <div>
                    <label
                      htmlFor="lotteryPeriodEndDay"
                      className="block text-sm font-medium text-gray-700"
                    >
                      終了日
                    </label>
                    <input
                      id="lotteryPeriodEndDay"
                      type="number"
                      min="1"
                      max="31"
                      required
                      className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={lotteryPeriodEndDay}
                      onChange={(e) => setLotteryPeriodEndDay(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">例: 15日</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  カレンダー表示設定
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      抽選参加期間内の申請を表示
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      オフにすると、年休カレンダー・管理カレンダーで抽選参加期間内の申請が非表示になり、申請一覧では抽選参加期間内の申請の優先順位が非表示になります
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLotteryPeriodApplications(!showLotteryPeriodApplications)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      showLotteryPeriodApplications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showLotteryPeriodApplications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  年休得点制限設定
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  レベル1・2の申請回数を制限するための得点システムを設定します。
                  <br />
                  年度は4月開始です（例: 2025年度 = 2025年4月1日〜2026年3月31日）
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="maxAnnualLeavePoints"
                      className="block text-sm font-medium text-gray-700"
                    >
                      最大年休得点
                    </label>
                    <input
                      id="maxAnnualLeavePoints"
                      type="number"
                      min="1"
                      required
                      className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={maxAnnualLeavePoints}
                      onChange={(e) => setMaxAnnualLeavePoints(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">デフォルト: 20点</p>
                  </div>

                  <div>
                    <label
                      htmlFor="currentFiscalYear"
                      className="block text-sm font-medium text-gray-700"
                    >
                      現在の年度
                    </label>
                    <input
                      id="currentFiscalYear"
                      type="number"
                      min="2000"
                      required
                      className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={currentFiscalYear}
                      onChange={(e) => setCurrentFiscalYear(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">例: 2025（2025年4月〜2026年3月）</p>
                  </div>

                  <div>
                    <label
                      htmlFor="level1Points"
                      className="block text-sm font-medium text-gray-700"
                    >
                      レベル1消費得点
                    </label>
                    <input
                      id="level1Points"
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={level1Points}
                      onChange={(e) => setLevel1Points(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">デフォルト: 2点</p>
                  </div>

                  <div>
                    <label
                      htmlFor="level2Points"
                      className="block text-sm font-medium text-gray-700"
                    >
                      レベル2消費得点
                    </label>
                    <input
                      id="level2Points"
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={level2Points}
                      onChange={(e) => setLevel2Points(Number(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">デフォルト: 1点</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? "更新中..." : "設定を更新"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
