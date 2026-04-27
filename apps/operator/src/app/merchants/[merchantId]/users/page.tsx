import { notFound } from "next/navigation";

import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import { MerchantUserManagement } from "@operator/features/merchant-management";
import { listMerchantUsersForOperator } from "@operator/features/merchant-management/api/server";
import { getOperatorDisplayName } from "@operator/lib/auth/display-name";
import { requireOperatorSession } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchantId: string }>;
};

export default async function MerchantUsersPage({ params }: PageProps) {
  const [session, { merchantId }] = await Promise.all([requireOperatorSession(), params]);

  const merchant = await getMerchantById(
    {
      region: readRequiredServerEnv("AWS_REGION"),
      tableName: readRequiredServerEnv("DDB_MERCHANT_TABLE_NAME"),
    },
    merchantId,
  );

  if (!merchant) {
    notFound();
  }

  const users = await listMerchantUsersForOperator(merchantId);

  return (
    <MerchantUserManagement
      merchant={merchant}
      initialUsers={users}
      operatorName={getOperatorDisplayName(session)}
    />
  );
}
