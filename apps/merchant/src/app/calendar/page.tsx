import { CalendarPage } from "@merchant/features/calendar";
import { getCalendarForMerchant } from "@merchant/features/calendar/api/server";
import {
  getMerchantHeaderInfo,
  getMerchantViewerName,
  requireCurrentMerchantUser,
} from "@merchant/lib/auth/merchant";

export const dynamic = "force-dynamic";

export default async function MerchantCalendarPage() {
  const user = await requireCurrentMerchantUser();

  const [calendar, headerInfo] = await Promise.all([
    getCalendarForMerchant(user.merchantId),
    getMerchantHeaderInfo(user.merchantId),
  ]);

  return (
    <CalendarPage
      initial={calendar}
      merchantName={getMerchantViewerName(user)}
      merchantDisplayName={headerInfo.displayName}
    />
  );
}
