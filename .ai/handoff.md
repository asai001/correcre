# handoff.md

## What changed

- Employee side
  - Implemented the dashboard profile modal in `apps/employee`.
  - Added `PATCH /api/profile` for self-service profile updates.
  - Added pointer cursor behavior to the profile dashboard card.
  - Removed the optional phone-number helper text from:
    - `apps/employee/src/features/profile-edit/ui/ProfileEditDialog.tsx`
    - `apps/operator/src/features/user-registration/ui/EmployeeRegistrationDialog.tsx`
    - `apps/operator/src/features/user-registration/ui/EmployeeEditDialog.tsx`
  - Updated the dashboard philosophy flow:
    - `apps/employee/src/features/philosophy/api/server.ts` now reads `company.philosophy.entries`, filters to `displayOnDashboard: true`, sorts by `order`, and falls back to legacy `corporatePhilosophy` / `purpose`
    - `apps/employee/src/features/philosophy/model/types.ts` now uses a dashboard item array shape
    - `apps/employee/src/features/philosophy/hooks/usePhilosophyForDashboard.ts` no longer leaves the UI stuck in a skeleton state when the API returns `null`
    - `apps/employee/src/features/philosophy/ui/Philosophy.tsx` and `PhilosophyInfo.tsx` now render the configurable philosophy items at the top of the dashboard in a single centered white card that matches the reference layout more closely
- Operator side
  - Implemented company editing from the company registration screen.
  - Registered company cards now open an edit dialog in:
    - `apps/operator/src/features/company-registration/ui/CompanyRegistration.tsx`
    - `apps/operator/src/features/company-registration/ui/CompanyEditDialog.tsx`
  - Fixed the card hit area so the company-name section also opens the edit dialog while the separate navigation action stays clickable.
  - Added shared company form helpers in:
    - `apps/operator/src/features/company-registration/ui/company-form.ts`
    - `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx`
  - Added update types and client/API support in:
    - `apps/operator/src/features/company-registration/model/types.ts`
    - `apps/operator/src/features/company-registration/api/client.ts`
    - `apps/operator/src/app/api/companies/route.ts`
    - `apps/operator/src/features/user-registration/api/server.ts`
  - Added configurable philosophy entries to company create/edit:
    - operators can add any number of philosophy items
    - each item stores `label`, `content`, and `displayOnDashboard`
    - DynamoDB persistence now uses `company.philosophy.entries` map data with `order`
  - Adjusted the philosophy input area styling in `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx`.
- Shared types
  - `packages/types/src/db/company.ts` now includes typed `CompanyPhilosophyEntry` map support while keeping legacy philosophy fields for compatibility.

## Verification run

- `npx tsc --noEmit -p apps/employee/tsconfig.json`
- `npm run build --workspace @correcre/employee`
- `npm run build --workspace @correcre/operator`
- `npx tsc --noEmit -p apps/operator/tsconfig.json`
  - This repo still hits an existing intermittent issue when `apps/operator/.next-build/types/**/*.ts` references missing generated files.

## Important notes

- Browser verification for the operator company edit/philosophy flow is still pending.
- Browser verification for the employee dashboard philosophy display is still pending.
- Employee email updates still only update DynamoDB. Cognito email attributes are not updated yet.
- `apps/operator/src/features/user-registration/api/server.ts` had unrelated existing worktree changes before this task. Keep that in mind when editing or reviewing diffs.
