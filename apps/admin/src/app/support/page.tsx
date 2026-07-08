import { getCompanyById } from "@correcre/lib/dynamodb/company";
import { readRequiredServerEnv } from "@correcre/lib/env/server";
import { joinNameParts } from "@correcre/lib/user-profile";

import { SupportInquiryForm } from "@admin/features/support-inquiry";
import { requireCurrentAdminUser } from "@admin/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const currentUser = await requireCurrentAdminUser();
  const company = await getCompanyById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_COMPANY_TABLE_NAME"),
    },
    currentUser.companyId,
  );
  const companyName = company?.shortName?.trim() || company?.name?.trim() || currentUser.companyId;

  return (
    <SupportInquiryForm
      adminName={joinNameParts(currentUser.lastName, currentUser.firstName) || currentUser.email}
      companyName={companyName}
    />
  );
}
