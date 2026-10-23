"use client";

import { usePathname } from "next/navigation";

type LayoutShellProps = Readonly<{
  children: React.ReactNode;
}>;

// (auth) レイアウトの画面は背景色を画面全体に敷くため、中央寄せコンテナを挟まない。
// 操作ガイド（/docs）も独自のヘッダー・目次を画面幅いっぱいに置くため同じ扱いにする。
const FULL_BLEED_PATH_PREFIXES = ["/login", "/register", "/seminar", "/docs"];

export default function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();

  if (FULL_BLEED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return children;
  }

  return <div className="container mb-10 mx-auto px-6">{children}</div>;
}
