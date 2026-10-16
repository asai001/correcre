import { joinNameParts } from "@correcre/lib/user-profile";

import { getInvoiceIssuerSettingsData, InvoiceIssuerSettingsSection } from "@operator/features/invoice-issuer-settings";
import { getNotificationSettingsData, NotificationSettingsView } from "@operator/features/notification-settings";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [currentUser, data, invoiceIssuer] = await Promise.all([
    requireCurrentOperatorUser(),
    getNotificationSettingsData(),
    getInvoiceIssuerSettingsData(),
  ]);

  return (
    <NotificationSettingsView
      data={data}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    >
      <InvoiceIssuerSettingsSection data={invoiceIssuer} />
    </NotificationSettingsView>
  );
}
