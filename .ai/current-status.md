# current-status.md

## Objective

- 今回の作業目的:
  - 保守環境と本番環境でも Cognito のパスワードリセット時にカスタマイズ済みメールを送る
  - 将来 `prod` だけ差出人メールアドレスを切り替えやすい構成にする
- 完了条件:
  - `dev` / `stg` / `prod` の全環境で SES + customMessage trigger が User Pool に設定される
  - `prod` だけ sender 設定を後から差し替えられる構造になっている
  - `infra` のテストが新仕様で通る

---

## Scope

- 対象:
  - `infra`
- 対象ファイル:
  - `infra/lib/cognito.ts`
  - `infra/test/infra.test.ts`

---

## Confirmed

- `infra/lib/cognito.ts` の forgot-password カスタマイズを `dev` 限定から全 stage 共通へ変更した
- Cognito User Pool の `email: UserPoolEmail.withSES(...)` と `lambdaTriggers.customMessage` が `dev` / `stg` / `prod` すべてに入る構成になった
- 差出人設定は stage ごとの `getPasswordResetSenderConfig(stage)` に寄せ、`prod` は専用の sender config 定数を持つようにした
- 現時点では `prod` の sender は未確定のため、値は既存アドレスのままだが、将来は `PROD_PASSWORD_RESET_SENDER_CONFIG` のみ差し替えればよい
- forgot-password 本文と件名のカスタマイズ用 Lambda は全環境共通の `PasswordResetCustomMessageTrigger` に整理した
- `infra/test/infra.test.ts` を更新し、`dev` / `stg` / `prod` すべてで SES-backed forgot-password customization が有効であることをテストで固定した
- `npm test --workspace infra -- --runInBand infra/test/infra.test.ts` が通ることを確認済み

---

## Blockers

- `prod` 専用の差出人メールアドレスが未確定
- 対象 AWS アカウント側で SES の送信元 identity が利用可能かは未確認
