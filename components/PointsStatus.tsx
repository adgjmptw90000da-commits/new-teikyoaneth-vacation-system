import React from "react";

type PointsInfo = {
    level1PendingCount: number;
    level1ConfirmedCount: number;
    level1CancelledAfterLotteryCount: number;
    level1Points: number;
    level1PointsPerApplication: number;
    level2PendingCount: number;
    level2ConfirmedCount: number;
    level2CancelledAfterLotteryCount: number;
    level2Points: number;
    level2PointsPerApplication: number;
    level3PendingCount: number;
    level3ConfirmedCount: number;
    level3CancelledAfterLotteryCount: number;
    level3Points: number;
    level3PointsPerApplication: number;
    totalPoints: number;
    maxPoints: number;
    remainingPoints: number;
};

type PointsStatusProps = {
    pointsInfo: PointsInfo | null;
    className?: string;
    fiscalYear?: number | null;
    defaultFiscalYear?: number | null;
    onFiscalYearChange?: (year: number) => void;
};

const ShieldIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

export const PointsStatus: React.FC<PointsStatusProps> = ({
    pointsInfo,
    className = "",
    fiscalYear,
    defaultFiscalYear,
    onFiscalYearChange,
}) => {
    const showYearTabs = defaultFiscalYear && onFiscalYearChange;

    return (
        <div
            className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
        >
            <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex justify-between items-center">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-blue-500">
                            <ShieldIcon />
                        </span>
                        年休得点状況
                    </h3>
                    {pointsInfo ? (
                        <div className="text-xs sm:text-sm text-gray-500">
                            上限:{" "}
                            <span className="font-semibold text-gray-900">
                                {pointsInfo.maxPoints.toFixed(2)}点
                            </span>
                        </div>
                    ) : (
                        <div className="h-5 w-20 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                    )}
                </div>

                {/* 年度タブ */}
                {showYearTabs && (
                    <div className="flex gap-1 mt-3">
                        {[defaultFiscalYear - 1, defaultFiscalYear, defaultFiscalYear + 1].map(year => (
                            <button
                                key={year}
                                type="button"
                                onClick={() => onFiscalYearChange(year)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    fiscalYear === year
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {year}年度
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 sm:p-6">
                {pointsInfo ? (
                    <div className="space-y-4">
                        {/* Remaining Points - Compact */}
                        <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <span className="text-sm font-medium text-gray-700">残り</span>
                            <div className="flex items-baseline gap-1">
                                <span
                                    className={`text-2xl sm:text-3xl font-bold ${pointsInfo.remainingPoints < 0
                                        ? "text-red-500"
                                        : "text-blue-600"
                                        }`}
                                >
                                    {pointsInfo.remainingPoints.toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500">点</span>
                            </div>
                        </div>

                        {/* Level Stats - Compact Grid */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {/* Level 1 */}
                            <div className="bg-red-50 rounded-lg p-2 sm:p-3 border border-red-100">
                                <div className="text-[10px] sm:text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 text-center">
                                    Lv1 ({pointsInfo.level1PointsPerApplication}点/申請)
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">申請中</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level1PendingCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">確定</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level1ConfirmedCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] sm:text-xs text-gray-600">抽選後キャンセル</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level1CancelledAfterLotteryCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-red-200">
                                        <span className="text-[10px] sm:text-xs text-red-700 font-semibold">消費得点</span>
                                        <span className="text-sm sm:text-base font-bold text-red-700 text-center min-w-[2rem]">
                                            {pointsInfo.level1Points.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Level 2 */}
                            <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-100">
                                <div className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 text-center">
                                    Lv2 ({pointsInfo.level2PointsPerApplication}点/申請)
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">申請中</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level2PendingCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">確定</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level2ConfirmedCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] sm:text-xs text-gray-600">抽選後キャンセル</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level2CancelledAfterLotteryCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-blue-200">
                                        <span className="text-[10px] sm:text-xs text-blue-700 font-semibold">消費得点</span>
                                        <span className="text-sm sm:text-base font-bold text-blue-700 text-center min-w-[2rem]">
                                            {pointsInfo.level2Points.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Level 3 */}
                            <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-100">
                                <div className="text-[10px] sm:text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 text-center">
                                    Lv3 ({pointsInfo.level3PointsPerApplication}点/申請)
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">申請中</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level3PendingCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">確定</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level3ConfirmedCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] sm:text-xs text-gray-600">抽選後キャンセル</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level3CancelledAfterLotteryCount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-200">
                                        <span className="text-[10px] sm:text-xs text-green-700 font-semibold">消費得点</span>
                                        <span className="text-sm sm:text-base font-bold text-green-700 text-center min-w-[2rem]">
                                            {pointsInfo.level3Points.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Skeleton Loader
                    <div className="space-y-4 animate-pulse">
                        <div className="h-12 bg-gray-100 rounded-lg"></div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div className="bg-gray-100 rounded-lg h-32 sm:h-36"></div>
                            <div className="bg-gray-100 rounded-lg h-32 sm:h-36"></div>
                            <div className="bg-gray-100 rounded-lg h-32 sm:h-36"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
