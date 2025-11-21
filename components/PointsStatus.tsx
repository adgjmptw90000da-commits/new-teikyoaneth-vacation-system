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
        width="24"
        height="24"
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
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-blue-500">
                        <ShieldIcon />
                    </span>
                    年休得点状況
                </h3>
                {pointsInfo ? (
                    <div className="text-sm text-gray-500">
                        利用可能上限:{" "}
                        <span className="font-semibold text-gray-900">
                            {pointsInfo.maxPoints.toFixed(1)}
                        </span>{" "}
                        点
                    </div>
                ) : (
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                )}
            </div>

            <div className="p-6">
                {pointsInfo ? (
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-around">
                        {/* Main Stat */}
                        <div className="text-center">
                            <div className="text-sm text-gray-500 mb-1">残り</div>
                            <div
                                className={`text-5xl font-bold tracking-tight ${pointsInfo.remainingPoints < 0
                                        ? "text-red-500"
                                        : "text-blue-600"
                                    }`}
                            >
                                {pointsInfo.remainingPoints.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">点</div>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block h-16 w-px bg-gray-200"></div>

                        {/* Detailed Stats - 3 Columns */}
                        <div className="w-full md:w-auto flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Level 1 */}
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3 text-center">
                                    レベル1
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">確定数</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            {pointsInfo.level1ConfirmedCount.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">申請数</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            {pointsInfo.level1ApplicationCount.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Level 2 */}
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 text-center">
                                    レベル2
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">確定数</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            {pointsInfo.level2ConfirmedCount.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">申請数</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            {pointsInfo.level2ApplicationCount.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Level 3 */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3 text-center">
                                    レベル3
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">確定数</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            {pointsInfo.level3ConfirmedCount.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600">申請数</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            {pointsInfo.level3ApplicationCount.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Skeleton Loader matching the content height
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-around animate-pulse">
                        <div className="text-center flex flex-col items-center">
                            <div className="h-4 w-8 bg-gray-200 rounded mb-1"></div>
                            <div className="h-12 w-24 bg-gray-200 rounded"></div>
                            <div className="h-3 w-4 bg-gray-200 rounded mt-2"></div>
                        </div>
                        <div className="hidden md:block h-16 w-px bg-gray-200"></div>
                        <div className="w-full md:w-auto flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-100 rounded-lg p-4 h-24"></div>
                            <div className="bg-gray-100 rounded-lg p-4 h-24"></div>
                            <div className="bg-gray-100 rounded-lg p-4 h-24"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
