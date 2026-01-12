"use client";

import Header from "./Header";
import type { User } from "@/lib/auth";

interface AppLayoutProps {
    children: React.ReactNode;
    user: User | null;
}

export default function AppLayout({ children, user }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <Header user={user} />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
                {children}
            </main>
        </div>
    );
}
