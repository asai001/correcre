import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCompanyInvoiceData } from "@admin/features/info/api/server";
import CompanyInvoiceView from "@admin/features/info/ui/CompanyInvoiceView";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ month: string }>;
};

// 「PDF に保存」したときの既定のファイル名になる。
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month } = await params;
  const [year, mon] = month.split("-");
  return { title: year && mon ? `請求書_コレクレ_${year}年${Number(mon)}月分` : "請求書_コレクレ" };
}

// 月額利用料の請求書（請求情報の各月から開く）。
export default async function CompanyInvoicePage({ params }: PageProps) {
  const [currentAdminUser, { month }] = await Promise.all([requireCurrentAdminUser(), params]);
  const data = await getCompanyInvoiceData(currentAdminUser, month);

  if (!data) {
    notFound();
  }

  return <CompanyInvoiceView data={data} />;
}
