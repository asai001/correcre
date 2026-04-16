# next-actions.md

## Next actions

1. Manually verify the operator company registration screen in the browser:
   - clicking a registered company card opens the edit dialog
   - clicking the company-name area opens the dialog as well
   - clicking the separate navigation action still navigates without opening the dialog
   - adding/removing philosophy entries works in both create and edit flows
   - textarea placeholder, add-button spacing, and entry-card spacing look correct in both narrow and wide layouts
   - `displayOnDashboard` checkbox state persists after save and reload
2. Manually verify the employee dashboard philosophy block in the browser:
   - only `company.philosophy.entries` items with `displayOnDashboard: true` are shown
   - entry order follows the stored `order`
   - multi-line content wraps cleanly
   - the philosophy card layout, spacing, and centered typography match the intended top-of-dashboard reference
   - companies without displayable entries still show the legacy `corporatePhilosophy` / `purpose` values if present
3. Decide whether existing legacy philosophy fields should be migrated into `company.philosophy.entries`.
4. Decide whether company editing should also support additional company fields not currently exposed in the UI, such as `shortName`, contact fields, or contract dates.
5. Decide whether employee email updates should also synchronize Cognito attributes instead of DynamoDB only.
6. When touching `apps/operator/src/features/user-registration/api/server.ts` again, review the existing unrelated dirty diff carefully before editing.
