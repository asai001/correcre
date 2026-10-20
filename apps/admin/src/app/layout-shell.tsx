"use client";

import { usePathname } from "next/navigation";

type LayoutShellProps = Readonly<{
  children: React.ReactNode;
}>;

export default function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();

  // 請求書は A4 の紙そのものを表示・印刷するため、画面共通の余白（container）で包まない
  if (pathname.startsWith("/login") || pathname.startsWith("/info/invoice/")) {
    return children;
  }

  return <div className="container mb-10 mx-auto px-6">{children}</div>;
}
