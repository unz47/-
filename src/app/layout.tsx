import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { TabBar } from "@/components/ui/tab-bar";
import { AppBootstrap } from "@/components/app-bootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "支出管理",
  description: "サブスク対応 個人支出管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-base text-text-primary">
        {/* モバイル幅で中央寄せした 1 カラムのアプリシェル */}
        <AppBootstrap />
        <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col">
          <main className="flex-1 pb-24">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
