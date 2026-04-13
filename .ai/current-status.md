# current-status.md

## Objective

- 今回の作業目的:
  - 保守環境と本番環境でも Cognito のパスワードリセット時にカスタマイズ済みメールを送る
  - 将来 `prod` だけ差出人メールアドレスを切り替えやすい構成にする
  - 管理者側の forgot-password 画面で helperText 背景を周囲のカード背景に馴染ませる
  - `apps/admin` / `apps/employee` / `apps/operator` の forgot-password / new-password 画面下部に余白を追加する
- 完了条件:
  - `dev` / `stg` / `prod` の全環境で SES + customMessage trigger が User Pool に設定される
  - `prod` だけ sender 設定を後から差し替えられる構造になっている
  - 管理者側 forgot-password 画面の helperText 背景が白ベタではなくカード背景に馴染む
  - 3 app の forgot-password / new-password 画面に下余白が入る
  - `infra` のテストと変更対象 app の lint が通る

---

## Scope

- 対象:
  - `infra`
  - `apps/admin`
  - `apps/employee`
  - `apps/operator`
- 対象ファイル:
  - `infra/lib/cognito.ts`
  - `infra/test/infra.test.ts`
  - `apps/admin/src/components/auth/ForgotPasswordForm.tsx`
  - `apps/admin/src/app/(auth)/login/forgot-password/page.tsx`
  - `apps/admin/src/app/(auth)/login/new-password/page.tsx`
  - `apps/employee/src/app/(auth)/login/forgot-password/page.tsx`
  - `apps/employee/src/app/(auth)/login/new-password/page.tsx`
  - `apps/operator/src/app/(auth)/login/forgot-password/page.tsx`
  - `apps/operator/src/app/(auth)/login/new-password/page.tsx`

---

## Confirmed

- `infra/lib/cognito.ts` の forgot-password カスタマイズを `dev` 限定から全 stage 共通へ変更した
- Cognito User Pool の `email: UserPoolEmail.withSES(...)` と `lambdaTriggers.customMessage` が `dev` / `stg` / `prod` すべてに入る構成になった
- 差出人設定は stage ごとの `getPasswordResetSenderConfig(stage)` に寄せ、`prod` は専用の sender config 定数を持つようにした
- 現時点では `prod` の sender は未確定のため、値は既存アドレスのままだが、将来は `PROD_PASSWORD_RESET_SENDER_CONFIG` のみ差し替えればよい
- forgot-password 本文と件名のカスタマイズ用 Lambda は全環境共通の `PasswordResetCustomMessageTrigger` に整理した
- `infra/test/infra.test.ts` を更新し、`dev` / `stg` / `prod` すべてで SES-backed forgot-password customization が有効であることをテストで固定した
- `apps/admin/src/components/auth/ForgotPasswordForm.tsx` では confirmation code / new password / confirm password を `fieldSx` に揃え、helperText 背景がカード背景に馴染むようにした
- `apps/admin` / `apps/employee` / `apps/operator` の forgot-password / new-password ページに `mb-16 lg:mb-20` を追加し、画面下部の詰まりを緩和した
- `npm test --workspace infra -- --runInBand infra/test/infra.test.ts` が通ることを確認済み
- `npm run lint --workspace @correcre/admin -- ...`, `@correcre/employee -- ...`, `@correcre/operator -- ...` が通ることを確認済み

---

## Blockers

- `prod` 専用の差出人メールアドレスが未確定
- 対象 AWS アカウント側で SES の送信元 identity が利用可能かは未確認
- 実ブラウザでの画面確認は未実施
