"use client";

import { createContext, useContext } from "react";

// ログイン中ユーザーの表示制御に使う情報。ルートレイアウト（サーバー）で解決して配る。
// 権限の強制はサーバー側（requireCurrentMerchantAdminUser / API の authorize）が担い、
// ここはナビ表示の出し分けにのみ使う。
type MerchantViewer = {
  // ログイン中か。フッターメニュー（問い合わせ・利用規約）の表示可否を決める。
  isSignedIn: boolean;
  // MERCHANT_ADMIN ロールを持つか。収支・精算 / 会社情報 / ユーザー管理の表示可否を決める。
  isAdmin: boolean;
};

const MerchantViewerContext = createContext<MerchantViewer>({ isSignedIn: false, isAdmin: false });

export function MerchantViewerProvider({
  isSignedIn,
  isAdmin,
  children,
}: Readonly<{ isSignedIn: boolean; isAdmin: boolean; children: React.ReactNode }>) {
  return <MerchantViewerContext.Provider value={{ isSignedIn, isAdmin }}>{children}</MerchantViewerContext.Provider>;
}

export function useMerchantViewer() {
  return useContext(MerchantViewerContext);
}
