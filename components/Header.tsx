"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import type { User } from "@/lib/auth";

interface HeaderProps {
    user: User | null;
}

export default function Header({ user }: HeaderProps) {
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/auth/login");
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm transition-all duration-200">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => router.push("/home")}
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-md group-hover:shadow-lg transition-all duration-200 transform group-hover:scale-105">
                        V
                    </div>
                    <span className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        年休管理システム
                    </span>
                </div>

                {user && (
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {user.is_admin ? "管理者" : "一般職員"}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-red-600 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-95"
                        >
                            ログアウト
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
