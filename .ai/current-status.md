# current-status.md

## Objective

- 今回の作業目的:
  - 従業員側画面（`apps/employee`）のログイン時に EMPLOYEE ロールチェックを追加する
  - 前回の管理者側画面（`apps/admin`）ADMIN ロールチェック追加に続く対応
- 成果物:
  - `apps/employee/src/lib/auth/current-user.ts` — `getEmployeeUserForSession` 追加、`requireCurrentEmployeeUser` を EMPLOYEE ロールチェック付きに修正
  - `apps/employee/src/lib/auth/errors.ts` — `employee_role_not_allowed` エラーコード追加
  - `apps/employee/src/app/lib/actions/authenticate.ts` — `authenticate` と `completeNewPassword` に EMPLOYEE ロールチェック追加
- 完了条件:
  - `roles` に `EMPLOYEE` を持たないユーザーが従業員側画面にログインできないこと

---

## Scope

- 対象 app:
  - `apps/employee`
- 対象 packages:
  - `packages/lib`（`listUsersByCognitoSub` を利用）
  - `packages/types`（`DBUserItem` 型を利用）
- 対象 infra:
  - なし

---

## Confirmed

- `apps/employee` のログイン認証フローは `apps/admin` と同じ構造
- 変更前は Cognito 認証のみでロールチェックなし
- `signInEmployee` は `{ status: "authenticated", session }` を返す
- `completeEmployeeNewPassword` は `session` を返す
- `listUsersByCognitoSub` で同一 cognitoSub の複数ユーザーを取得し、`EMPLOYEE` ロール持ちをフィルタする実装に変更済み
- TypeScript の型チェックが通ることを確認済み
- `apps/operator` は既に `OPERATOR` ロールチェックが実装済み（参考にした）

---

## Hypotheses

- なし（実装完了済み）

---

## Unknown

- 実環境での動作確認は未実施

---

## Investigated files

- `apps/employee/src/app/lib/actions/authenticate.ts`
- `apps/employee/src/lib/auth/current-user.ts`
- `apps/employee/src/lib/auth/errors.ts`
- `apps/employee/src/lib/auth/session.ts`
- `apps/employee/src/lib/auth/verify-token.ts`
- `apps/employee/src/middleware.ts`
- `apps/operator/src/lib/auth/operator.ts`（参考）
- `apps/operator/src/app/lib/actions/authenticate.ts`（参考）
- `packages/lib/src/dynamodb/user.ts`
- `packages/types/src/db/user.ts`

---

## Blockers

- なし

---

## Current assessment

- 3 app すべてでログイン時のロールチェックが実装された状態:
  - `apps/admin` → ADMIN ロール必須
  - `apps/employee` → EMPLOYEE ロール必須
  - `apps/operator` → OPERATOR ロール必須（元から実装済み）
