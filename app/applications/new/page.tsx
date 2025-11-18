// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  validateVacationDate,
  validateNotSunday,
  validateSaturdayPeriod,
} from "@/lib/validation";
import {
  isWithinLotteryPeriod,
  isHoliday,
  checkDuplicateApplication,
  calculateInitialPriority,
  isBeforeLotteryPeriod,
  getCurrentLotteryPeriodInfo,
  calculateAnnualLeavePoints,
  checkAnnualLeavePointsAvailable,
} from "@/lib/application";

export default function NewApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // フォーム入力
  const [vacationDate, setVacationDate] = useState("");
  const [period, setPeriod] = useState<"full_day" | "am" | "pm">("full_day");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [remarks, setRemarks] = useState("");

  // 抽選期間情報
  const [lotteryPeriodInfo, setLotteryPeriodInfo] = useState<{
    isWithinPeriod: boolean;
    targetMonth: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);

  // 年休得点情報
  const [pointsInfo, setPointsInfo] = useState<{
    level1ApplicationCount: number;
    level1ConfirmedCount: number;
    level2ApplicationCount: number;
    level2ConfirmedCount: number;
    totalPoints: number;
    maxPoints: number;
    remainingPoints: number;
  } | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // 抽選期間情報を取得
    const fetchLotteryPeriodInfo = async () => {
      const info = await getCurrentLotteryPeriodInfo();
      setLotteryPeriodInfo(info);
    };

    // 年休得点情報を取得
    const fetchPointsInfo = async () => {
      // 設定から現在の年度を取得
      const { data: settingData } = await supabase
        .from("setting")
        .select("current_fiscal_year")
        .eq("id", 1)
        .single();

      if (!settingData) return;

      // 得点計算情報を取得
      const pointsData = await calculateAnnualLeavePoints(
        user.staff_id,
        settingData.current_fiscal_year
      );

      if (!pointsData) return;

      // 利用可能得点を確認
      const availabilityData = await checkAnnualLeavePointsAvailable(
        user.staff_id,
        1, // とりあえずレベル1で計算
        "full_day"
      );

      if (!availabilityData) return;

      setPointsInfo({
        level1ApplicationCount: pointsData.level1ApplicationCount,
        level1ConfirmedCount: pointsData.level1ConfirmedCount,
        level2ApplicationCount: pointsData.level2ApplicationCount,
        level2ConfirmedCount: pointsData.level2ConfirmedCount,
        totalPoints: pointsData.totalPoints,
        maxPoints: availabilityData.maxPoints,
        remainingPoints: availabilityData.remainingPoints,
      });
    };

    fetchLotteryPeriodInfo();
    fetchPointsInfo();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // バリデーション: 未来日
      const dateValidation = validateVacationDate(vacationDate);
      if (!dateValidation.isValid) {
        setError(dateValidation.error || "");
        setLoading(false);
        return;
      }

      // バリデーション: 日曜日
      const sundayValidation = validateNotSunday(vacationDate);
      if (!sundayValidation.isValid) {
        setError(sundayValidation.error || "");
        setLoading(false);
        return;
      }

      // バリデーション: 土曜日のPM
      const saturdayValidation = validateSaturdayPeriod(vacationDate, period);
      if (!saturdayValidation.isValid) {
        setError(saturdayValidation.error || "");
        setLoading(false);
        return;
      }

      // バリデーション: 祝日
      const holiday = await isHoliday(vacationDate);
      if (holiday) {
        setError("祝日は年休申請できません");
        setLoading(false);
        return;
      }

      // バリデーション: 重複チェック（キャンセル以外）
      const duplicate = await checkDuplicateApplication(
        user.staff_id,
        vacationDate
      );
      if (duplicate) {
        setError("同一日付にすでに申請が存在します");
        setLoading(false);
        return;
      }

      // 抽選参加期間内かチェック
      const withinPeriod = await isWithinLotteryPeriod(vacationDate);

      // レベル1・2は抽選期間内のみ申請可能
      if ((level === 1 || level === 2) && !withinPeriod) {
        setError("レベル1・2は抽選参加期間内のみ申請可能です");
        setLoading(false);
        return;
      }

      // レベル1・2は年休得点チェック
      if (level === 1 || level === 2) {
        const pointsCheck = await checkAnnualLeavePointsAvailable(
          user.staff_id,
          level,
          period
        );

        if (!pointsCheck || !pointsCheck.canApply) {
          setError("年休得点が不足しているため申請できません");
          setLoading(false);
          return;
        }
      }

      // レベル3は抽選参加期間以降のみ申請可能
      if (level === 3) {
        const beforePeriod = await isBeforeLotteryPeriod(vacationDate);
        if (beforePeriod) {
          setError("レベル3は抽選参加期間以降のみ申請可能です");
          setLoading(false);
          return;
        }
      }

      // レベル3の確定処理後チェック
      let status: "before_lottery" | "after_lottery" | "pending_approval" = "before_lottery";
      let priority: number | null = null;

      if (level === 3) {
        // カレンダー管理情報を取得
        const { data: calendarData, error: calendarError } = await supabase
          .from("calendar_management")
          .select("*")
          .eq("vacation_date", vacationDate)
          .single();

        // 確定処理済みの場合
        if (!calendarError && calendarData && calendarData.status === "confirmation_completed") {
          // マンパワーが設定されていない場合はエラー
          if (calendarData.max_people === null) {
            setError("この日付はマンパワーが設定されていないため申請できません");
            setLoading(false);
            return;
          }

          // 確定済み申請数をカウント
          const { count: confirmedCount } = await supabase
            .from("application")
            .select("*", { count: "exact", head: true })
            .eq("vacation_date", vacationDate)
            .eq("status", "confirmed");

          // マンパワー上限に達している場合は申請不可
          if ((confirmedCount || 0) >= calendarData.max_people) {
            setError("マンパワーの上限に達しているため申請できません");
            setLoading(false);
            return;
          }

          // 余裕がある場合は承認待ちステータスで申請
          status = "pending_approval";
          priority = null; // 承認待ちは優先順位なし
        } else {
          // 確定処理前のレベル3
          status = withinPeriod ? "before_lottery" : "after_lottery";
          priority = await calculateInitialPriority(vacationDate);
        }
      } else {
        // レベル1・2
        status = "before_lottery";
        priority = await calculateInitialPriority(vacationDate);
      }

      // 申請を保存
      const { error: insertError } = await supabase
        .from("application")
        .insert({
          staff_id: user.staff_id,
          vacation_date: vacationDate,
          period,
          level,
          is_within_lottery_period: withinPeriod,
          status,
          priority,
          remarks: remarks || null,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError("申請の保存に失敗しました");
        setLoading(false);
        return;
      }

      // 成功したら申請一覧へ
      alert("年休申請が完了しました");
      router.push("/applications");
    } catch (err) {
      console.error("Error submitting application:", err);
      setError("エラーが発生しました");
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
                年休申請
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 抽選期間情報バナー */}
              {lotteryPeriodInfo && (
                <div
                  className={`${
                    lotteryPeriodInfo.isWithinPeriod
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-gray-50 border-gray-200 text-gray-700"
                  } border px-4 py-3 rounded`}
                >
                  {lotteryPeriodInfo.isWithinPeriod ? (
                    <p className="text-sm">
                      現在は<span className="font-semibold">{lotteryPeriodInfo.targetMonth}</span>の抽選参加可能期間です（{lotteryPeriodInfo.periodStart}〜{lotteryPeriodInfo.periodEnd}）
                    </p>
                  ) : (
                    <p className="text-sm">
                      現在は抽選参加可能期間外です（<span className="font-semibold">{lotteryPeriodInfo.targetMonth}</span>の抽選参加可能期間は{lotteryPeriodInfo.periodStart}〜{lotteryPeriodInfo.periodEnd}です）
                    </p>
                  )}
                </div>
              )}

              {/* 年休得点情報 */}
              <div className="bg-white border border-gray-300 rounded-lg p-4" style={{ minHeight: '180px' }}>
                {pointsInfo ? (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">年休得点状況</h3>

                    {/* 申請数・確定数テーブル（行列入れ替え版） */}
                    <div className="mb-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 border"></th>
                            <th className="px-3 py-2 text-center font-medium text-gray-700 border bg-red-50">レベル1</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-700 border bg-blue-50">レベル2</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-3 py-2 border text-gray-900 font-medium">申請数</td>
                            <td className="px-3 py-2 border text-center text-gray-900 bg-red-50">{pointsInfo.level1ApplicationCount.toFixed(1)}</td>
                            <td className="px-3 py-2 border text-center text-gray-900 bg-blue-50">{pointsInfo.level2ApplicationCount.toFixed(1)}</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="px-3 py-2 border text-gray-900 font-medium">確定数</td>
                            <td className="px-3 py-2 border text-center text-gray-900 bg-red-50">{pointsInfo.level1ConfirmedCount.toFixed(1)}</td>
                            <td className="px-3 py-2 border text-center text-gray-900 bg-blue-50">{pointsInfo.level2ConfirmedCount.toFixed(1)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 得点情報 */}
                    <div className="text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">利用可能上限:</span> {pointsInfo.maxPoints.toFixed(1)}点
                        <span className="font-medium ml-3">残り:</span>
                        <span className={pointsInfo.remainingPoints < 0 ? "text-red-600 font-semibold" : "text-blue-600 font-semibold"}>
                          {" "}{pointsInfo.remainingPoints.toFixed(1)}点
                        </span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 text-sm">読み込み中...</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  年休取得希望日 *
                </label>
                <input
                  type="date"
                  value={vacationDate}
                  onChange={(e) => setVacationDate(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  期間 *
                </label>
                <select
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value as "full_day" | "am" | "pm")
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="full_day">全日</option>
                  <option value="am">AM</option>
                  <option value="pm">PM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  レベル *
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>レベル1（必ず休みたい）</option>
                  <option value={2}>レベル2（可能な限り休みたい）</option>
                  <option value={3}>レベル3（マンパワーに余裕があれば休みたい）</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  備考
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="個人のメモとして使用できます"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push("/applications")}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? "申請中..." : "申請する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
