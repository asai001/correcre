import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { SessionExpiryGuard } from "@correcre/ui";
import "./globals.css";
import Providers from "./providers";
import LayoutShell from "./layout-shell";
import { MerchantViewerProvider } from "@merchant/components/MerchantViewerContext";
import { getMerchantAccessStatus, isMerchantAdminUser } from "@merchant/lib/auth/merchant";

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
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ナビの「ユーザー管理」表示判定。未ログイン画面（ログイン・登録申請など）では
  // セッション Cookie が無ければ DB 参照なしで即 false になる。
  const access = await getMerchantAccessStatus();
  const canManageUsers = access.allowed && isMerchantAdminUser(access.user);

  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh !bg-gray-50`}>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>
            <SessionExpiryGuard />
            <MerchantViewerProvider canManageUsers={canManageUsers}>
              <LayoutShell>{children}</LayoutShell>
            </MerchantViewerProvider>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
