"use client";

import { createContext, useContext } from "react";

// ログイン中ユーザーの表示制御に使う情報。ルートレイアウト（サーバー）で解決して配る。
// 権限の強制はサーバー側（requireCurrentMerchantAdminUser / API の authorize）が担い、
// ここはナビ表示の出し分けにのみ使う。
type MerchantViewer = {
  canManageUsers: boolean;
};

const MerchantViewerContext = createContext<MerchantViewer>({ canManageUsers: false });

export function MerchantViewerProvider({
  canManageUsers,
  children,
}: Readonly<{ canManageUsers: boolean; children: React.ReactNode }>) {
  return <MerchantViewerContext.Provider value={{ canManageUsers }}>{children}</MerchantViewerContext.Provider>;
}

export function useMerchantViewer() {
  return useContext(MerchantViewerContext);
}
