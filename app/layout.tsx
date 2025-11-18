import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "年休管理システム",
  description: "職員の年休を管理するシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
