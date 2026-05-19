"use client";

import { usePathname } from "next/navigation";

type LayoutShellProps = Readonly<{
  children: React.ReactNode;
}>;

export default function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/login")) {
    return children;
  }

  return <div className="container mb-10 mx-auto px-6">{children}</div>;
}
