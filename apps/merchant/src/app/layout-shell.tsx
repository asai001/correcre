"use client";

import { usePathname } from "next/navigation";

import MerchantFooter from "@merchant/components/MerchantFooter";
import { useMerchantViewer } from "@merchant/components/MerchantViewerContext";

type LayoutShellProps = Readonly<{
  children: React.ReactNode;
}>;

// (auth) レイアウトの画面は背景色を画面全体に敷くため、中央寄せコンテナを挟まない。
// 操作ガイド（/docs）も独自のヘッダー・目次を画面幅いっぱいに置くため同じ扱いにする。
const FULL_BLEED_PATH_PREFIXES = ["/login", "/register", "/seminar", "/docs"];

export default function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();
  const { isSignedIn } = useMerchantViewer();

  if (FULL_BLEED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return children;
  }

  // ログイン後の画面は、内容が短くてもフッターが画面の下端に来るよう縦に伸ばす。
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="container mb-10 mx-auto w-full flex-1 px-6">{children}</div>
      {isSignedIn ? <MerchantFooter /> : null}
    </div>
  );
}
