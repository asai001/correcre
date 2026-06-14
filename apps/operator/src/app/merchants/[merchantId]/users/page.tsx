import { notFound } from "next/navigation";

import { getMerchantById } from "@correcre/lib/dynamodb/merchant";
import { readRequiredServerEnv } from "@correcre/lib/env/server";

import { MerchantUserManagement } from "@operator/features/merchant-management";
import { listMerchantUsersForOperator } from "@operator/features/merchant-management/api/server";
import { joinNameParts } from "@correcre/lib/user-profile";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ merchantId: string }>;
};

export default async function MerchantUsersPage({ params }: PageProps) {
  const [currentUser, { merchantId }] = await Promise.all([requireCurrentOperatorUser(), params]);

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
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
