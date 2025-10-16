import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// グローバル CSS と自動 CSS 追加の無効化（FOUC防止）
// Font Awesome 関連
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
  title: "コレクレ - 理念を行動に、行動をポイントに",
  description: "コレクレ - 理念を行動に、行動をポイントに",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh !bg-gray-50`}>
        {/* <ThemeProvider theme={theme}>{children}</ThemeProvider> */}
        {/* {children} */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
