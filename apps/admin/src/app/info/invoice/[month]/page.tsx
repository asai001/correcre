import { notFound } from "next/navigation";

import { getCompanyInvoiceData } from "@admin/features/info/api/server";
import CompanyInvoiceView from "@admin/features/info/ui/CompanyInvoiceView";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ month: string }>;
};

// 月額利用料の請求書（請求情報の各月から開く）。
export default async function CompanyInvoicePage({ params }: PageProps) {
  const [currentAdminUser, { month }] = await Promise.all([requireCurrentAdminUser(), params]);
  const data = await getCompanyInvoiceData(currentAdminUser, month);

  if (!data) {
    notFound();
  }

  return <CompanyInvoiceView data={data} />;
}
