import { joinNameParts } from "@correcre/lib/user-profile";

import { getSupportInquiryListData, SupportInquiryList } from "@operator/features/support-inquiries";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function SupportInquiriesPage() {
  const [currentUser, data] = await Promise.all([
    requireCurrentOperatorUser(),
    getSupportInquiryListData(),
  ]);

  return (
    <SupportInquiryList
      data={data}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName) || currentUser.email}
    />
  );
}
