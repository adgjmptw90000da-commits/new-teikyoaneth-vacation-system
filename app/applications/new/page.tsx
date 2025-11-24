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
  isEvent,
  checkDuplicateApplication,
  calculateInitialPriority,
  isBeforeLotteryPeriod,
  getCurrentLotteryPeriodInfo,
  calculateAnnualLeavePoints,
  checkAnnualLeavePointsAvailable,
} from "@/lib/application";
import { PointsStatus } from "@/components/PointsStatus";

// Icons
const Icons = {
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
};

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
    level3ApplicationCount: number;
    level3ConfirmedCount: number;
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
        level1PendingCount: pointsData.level1PendingCount,
        level1ConfirmedCount: pointsData.level1ConfirmedCount,
        level1CancelledAfterLotteryCount: pointsData.level1CancelledAfterLotteryCount,
        level1Points: pointsData.level1Points,
        level2PendingCount: pointsData.level2PendingCount,
        level2ConfirmedCount: pointsData.level2ConfirmedCount,
        level2CancelledAfterLotteryCount: pointsData.level2CancelledAfterLotteryCount,
        level2Points: pointsData.level2Points,
        level3PendingCount: pointsData.level3PendingCount,
        level3ConfirmedCount: pointsData.level3ConfirmedCount,
        level3CancelledAfterLotteryCount: pointsData.level3CancelledAfterLotteryCount,
        level3Points: pointsData.level3Points,
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

      // バリデーション: 祝日・主要学会
      const holiday = await isHoliday(vacationDate);
      if (holiday) {
        setError("祝日・主要学会の日は年休申請できません");
        setLoading(false);
        return;
      }

      // イベントチェック: 警告のみ表示
      const event = await isEvent(vacationDate);
      if (event) {
        const confirmed = window.confirm(
          "イベントが登録されている日です。通常より年休枠が少ない可能性が高いですが、このまま申請しますか。"
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
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

      // 年休得点チェック（全レベル共通）
      const pointsCheck = await checkAnnualLeavePointsAvailable(
        user.staff_id,
        level,
        period
      );

      if (!pointsCheck || !pointsCheck.canApply) {
        setError(`年休得点が不足しているため申請できません。残り${pointsCheck?.remainingPoints.toFixed(1) || 0}点です。`);
        setLoading(false);
        return;
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
          priority = await calculateInitialPriority(vacationDate); // 申請時に優先順位を付与（承認時に再計算される）
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
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <Icons.FileText />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                年休申請
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Icons.Home />
                ホーム
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 抽選期間情報バナー */}
          {lotteryPeriodInfo && (
            <div
              className={`${lotteryPeriodInfo.isWithinPeriod
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-gray-50 border-gray-200 text-gray-700"
                } border px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm`}
            >
              <div className="mt-0.5 shrink-0">
                <Icons.Info />
              </div>
              <div>
                {lotteryPeriodInfo.isWithinPeriod ? (
                  <p className="text-sm font-medium">
                    現在は<span className="font-bold">{lotteryPeriodInfo.targetMonth}</span>の抽選参加可能期間です（{lotteryPeriodInfo.periodStart}〜{lotteryPeriodInfo.periodEnd}）
                  </p>
                ) : (
                  <p className="text-sm font-medium">
                    現在は抽選参加可能期間外です（<span className="font-bold">{lotteryPeriodInfo.targetMonth}</span>の抽選参加可能期間は{lotteryPeriodInfo.periodStart}〜{lotteryPeriodInfo.periodEnd}です）
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">申請フォーム</h2>
              <p className="text-sm text-gray-500 mt-1">必要な情報を入力して申請してください</p>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 年休得点情報 */}
                <PointsStatus pointsInfo={pointsInfo} className="mb-6" />

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      年休取得希望日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={vacationDate}
                      onChange={(e) => setVacationDate(e.target.value)}
                      required
                      className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-4 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      期間 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={period}
                      onChange={(e) =>
                        setPeriod(e.target.value as "full_day" | "am" | "pm")
                      }
                      className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-4 text-gray-900"
                    >
                      <option value="full_day">全日</option>
                      <option value="am">AM</option>
                      <option value="pm">PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      レベル <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3)}
                      className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-4 text-gray-900"
                    >
                      <option value={1}>レベル1（必ず休みたい）</option>
                      <option value={2}>レベル2（可能な限り休みたい）</option>
                      <option value={3}>レベル3（マンパワーに余裕があれば休みたい）</option>
                    </select>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      備考
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-3 text-gray-900"
                      placeholder="個人のメモとして使用できます"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => router.push("/applications")}
                    className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                  >
                    {loading ? "申請中..." : "申請する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
