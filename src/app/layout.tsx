import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/store/useStore";

export const metadata: Metadata = {
  title: "我的资产看板 · Tidal",
  description: "个人资产看板 · 行情来自 stock-sdk · 数据存储在本地",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
