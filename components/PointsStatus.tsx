import React from "react";

type PointsInfo = {
    level1ApplicationCount: number;
    level1ConfirmedCount: number;
    level2ApplicationCount: number;
    level2ConfirmedCount: number;
    level3ApplicationCount: number;
    level3ConfirmedCount: number;
    totalPoints: number;
    maxPoints: number;
    remainingPoints: number;
};

type PointsStatusProps = {
    pointsInfo: PointsInfo | null;
    className?: string;
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
}) => {
    return (
        <div
            className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
        >
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
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
                            {pointsInfo.maxPoints.toFixed(1)}点
                        </span>
                    </div>
                ) : (
                    <div className="h-5 w-20 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
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
                                    {pointsInfo.remainingPoints.toFixed(1)}
                                </span>
                                <span className="text-xs text-gray-500">点</span>
                            </div>
                        </div>

                        {/* Level Stats - Compact Grid */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {/* Level 1 */}
                            <div className="bg-red-50 rounded-lg p-2 sm:p-3 border border-red-100">
                                <div className="text-[10px] sm:text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 text-center">
                                    Lv1
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">確定</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level1ConfirmedCount.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">申請</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level1ApplicationCount.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Level 2 */}
                            <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-100">
                                <div className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 text-center">
                                    Lv2
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">確定</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level2ConfirmedCount.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">申請</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level2ApplicationCount.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Level 3 */}
                            <div className="bg-green-50 rounded-lg p-2 sm:p-3 border border-green-100">
                                <div className="text-[10px] sm:text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 text-center">
                                    Lv3
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">確定</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level3ConfirmedCount.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] sm:text-xs text-gray-600">申請</span>
                                        <span className="text-sm sm:text-base font-bold text-gray-900 text-center min-w-[2rem]">
                                            {pointsInfo.level3ApplicationCount.toFixed(1)}
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
                            <div className="bg-gray-100 rounded-lg h-20 sm:h-24"></div>
                            <div className="bg-gray-100 rounded-lg h-20 sm:h-24"></div>
                            <div className="bg-gray-100 rounded-lg h-20 sm:h-24"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
