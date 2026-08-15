"use client";

import { createContext, useContext } from "react";

// ログイン中ユーザーの表示制御に使う情報。ルートレイアウト（サーバー）で解決して配る。
// 権限の強制はサーバー側（requireCurrentMerchantAdminUser / API の authorize）が担い、
// ここはナビ表示の出し分けにのみ使う。
type MerchantViewer = {
  // MERCHANT_ADMIN ロールを持つか。収支・精算 / 会社情報 / ユーザー管理の表示可否を決める。
  isAdmin: boolean;
};

const MerchantViewerContext = createContext<MerchantViewer>({ isAdmin: false });

export function MerchantViewerProvider({
  isAdmin,
  children,
}: Readonly<{ isAdmin: boolean; children: React.ReactNode }>) {
  return <MerchantViewerContext.Provider value={{ isAdmin }}>{children}</MerchantViewerContext.Provider>;
}

export function useMerchantViewer() {
  return useContext(MerchantViewerContext);
}
