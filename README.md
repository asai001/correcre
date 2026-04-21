# Correcre

Correcre の monorepo です。

## Directory

- `apps/admin`: 企業管理者向けアプリ
- `apps/employee`: 従業員向けアプリ
- `apps/operator`: 運用者向けアプリ
- `infra`: AWS CDK
- `packages/*`: 共有ライブラリ

## Workspace Commands

```bash
npm run dev:admin
npm run dev:employee
npm run dev:operator
npm run build
npm run lint
```

## Initial Operator Bootstrap

最初の運用者ユーザーを 1 人だけ作る手順は [apps/operator/README.md](apps/operator/README.md) を参照してください。

要点だけ書くと、次の順です。

1. Operator 用 Cognito User Pool に手動でユーザーを 1 人作成する
2. DynamoDB の User テーブルに、そのユーザーに対応するレコードを 1 行追加する
3. 運用者アプリの `/login` で初期パスワードログインし、`/login/new-password` で新しいパスワードを設定する

この最初の 1 人は、2 人目以降のユーザーや企業を運用者画面から作成していくための起点ユーザーです。

## Notes

- Operator 初回ログインでは DynamoDB の `roles` が配列で存在し、`"OPERATOR"` を含んでいる必要があります
- `gsi1pk` は Cognito の `sub` から `COGNITO_SUB#<sub>` の形式で設定する必要があります
- `email` と `gsi2pk` は同じメールアドレスを基準に揃えてください
