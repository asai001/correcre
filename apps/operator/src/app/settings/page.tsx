import { joinNameParts } from "@correcre/lib/user-profile";

import { getNotificationSettingsData, NotificationSettingsView } from "@operator/features/notification-settings";
import { requireCurrentOperatorUser } from "@operator/lib/auth/operator";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [currentUser, data] = await Promise.all([
    requireCurrentOperatorUser(),
    getNotificationSettingsData(),
  ]);

  return (
    <NotificationSettingsView
      data={data}
      operatorName={joinNameParts(currentUser.lastName, currentUser.firstName)}
    />
  );
}
