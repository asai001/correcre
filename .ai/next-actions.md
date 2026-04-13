# next-actions.md

優先度順に、次にやることを具体的に書く。
曖昧な表現は避ける。

## Next actions

1. 本番環境の差出人メールアドレスが確定したら `infra/lib/cognito.ts` の `PROD_PASSWORD_RESET_SENDER_CONFIG` を更新する
2. `stg` / `prod` の AWS アカウントで SES の送信元 identity が有効かを確認する
3. `infra` を `stg` と `prod` にデプロイする
4. `stg` / `prod` で forgot password を実行し、件名・差出人・本文がカスタマイズ文面になっていることを実メールで確認する
5. 必要なら `prod` 用 sender config を secrets / context から注入する設計へ拡張する
