# current-status.md

## Objective

- Employee dashboard
  - Added a profile edit modal behind the profile card in `apps/employee`.
  - Existing user data is prefilled and can be updated via `PATCH /api/profile`.
  - Required fields align with the operator-side user registration/edit modal.
  - Removed the optional phone-number helper copy from both operator and employee dialogs without changing validation rules.
  - Dashboard philosophy now reads `company.philosophy.entries` and renders only items with `displayOnDashboard: true`.
  - If there are no displayable `entries`, the dashboard falls back to the legacy `corporatePhilosophy` / `purpose` fields.
- Operator company registration
  - Added company edit support in `apps/operator`.
  - Clicking a registered company card on the company registration screen opens an edit dialog.
  - The dialog updates company name, status, plan, monthly fee, company point balance, and point unit.
  - Company create/edit supports configurable philosophy entries with arbitrary labels, content, and dashboard-display flags.
  - Philosophy settings are persisted on the company item as `company.philosophy.entries` map data with `order` and `displayOnDashboard`.
  - `PATCH /api/companies` persists company edits to DynamoDB while preserving existing company metadata.

## Scope

- `apps/employee`
- `apps/operator`
- `packages/types`
- `.ai`

## Confirmed

- `apps/employee/src/features/dashboard-links/ui/DashboardLinks.tsx`
  - The profile card opens a modal instead of navigating away.
  - Card hover shows the same pointer cursor as the other dashboard link cards.
- `apps/employee/src/features/profile-edit/*`
  - Profile edit dialog and update flow are implemented.
  - Existing values are prefilled.
  - Postal-code autofill works.
  - Optional phone-number behavior remains, but the helper copy was removed.
- `apps/employee/src/app/api/profile/route.ts`
  - Added employee self-service profile update endpoint.
- `apps/employee/src/features/philosophy/api/server.ts`
  - Reads dashboard philosophy data from `company.philosophy.entries`.
  - Returns only entries with `displayOnDashboard: true` and non-empty label/content.
  - Sorts dashboard items by `order`.
  - Falls back to legacy `corporatePhilosophy` / `purpose` when no displayable entries exist.
- `apps/employee/src/features/philosophy/model/types.ts`
  - Replaced the fixed philosophy shape with a dashboard item array plus `updatedAt`.
- `apps/employee/src/features/philosophy/hooks/usePhilosophyForDashboard.ts`
  - Fixed the initial loading state so a `null` response no longer leaves the dashboard stuck on a skeleton.
  - Updated the fetch error message to refer to philosophy data instead of user data.
- `apps/employee/src/features/philosophy/ui/Philosophy.tsx`
  - Shows a skeleton only while loading and hides cleanly when there is no data to render.
- `apps/employee/src/features/philosophy/ui/PhilosophyInfo.tsx`
  - Renders configurable dashboard philosophy items in a single centered white card styled to match the dashboard reference rather than separate mini-cards.
- `apps/operator/src/features/company-registration/ui/CompanyRegistration.tsx`
  - Registered company cards are clickable and open a company edit dialog.
  - The existing create form remains in place.
  - Fixed the card layering so clicking the company-name area also opens the edit dialog.
  - Added a configurable philosophy section to the company create form.
- `apps/operator/src/features/company-registration/ui/CompanyEditDialog.tsx`
  - Added a company edit modal with prefilled values.
- `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx`
  - Added reusable add/remove philosophy-entry UI.
  - Adjusted header layout, add-button sizing, entry-card hierarchy, textarea presentation, and dashboard-display checkbox styling.
- `apps/operator/src/features/company-registration/ui/company-form.ts`
  - Added variable-length philosophy form state and validation helpers.
- `apps/operator/src/features/company-registration/model/types.ts`
  - Added `philosophyItems` to operator company summary and create/update payloads.
- `apps/operator/src/app/api/companies/route.ts`
  - Added `PATCH` handler for company updates.
- `apps/operator/src/features/user-registration/api/server.ts`
  - Added DynamoDB company update logic that preserves existing fields and refreshes `updatedAt`.
  - Normalizes philosophy item arrays into DynamoDB map data under `company.philosophy.entries`.
- `packages/types/src/db/company.ts`
  - Added typed `CompanyPhilosophyEntry` map support while keeping legacy philosophy fields for compatibility.

## Verification

- `npx tsc --noEmit -p apps/employee/tsconfig.json`
- `npm run build --workspace @correcre/employee`
- `npm run build --workspace @correcre/operator`
- `npx tsc --noEmit -p apps/operator/tsconfig.json`
  - This repo still hits an existing intermittent issue when `apps/operator/.next-build/types/**/*.ts` points at missing generated files.

## Known Gaps

- Browser-based manual verification has not been completed for the operator company edit/philosophy flow.
- Browser-based manual verification has not been completed for the employee dashboard philosophy display.
- Employee email updates currently update DynamoDB only; Cognito email attributes are not synchronized.

## Worktree Notes

- There are unrelated dirty changes elsewhere in the repo, including `infra`, `packages/lib`, `apps/admin`, and `apps/operator`.
- `apps/operator/src/features/user-registration/api/server.ts` already had unrelated edits in the worktree; do not revert them blindly.
