import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import "./globals.css";
import Providers from "./providers";
import LayoutShell from "./layout-shell";

import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";

config.autoAddCss = false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "コレクレ 提携企業",
  description: "提携企業向け 商品・サービス登録および交換管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh !bg-gray-50`}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>
            <LayoutShell>{children}</LayoutShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
