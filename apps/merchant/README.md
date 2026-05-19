# Merchant App

提携企業向けアプリです。コレクレに掲載する商品・サービスの登録、編集、交換管理を行います。

提携企業ユーザーは admin/employee/operator とは別の Cognito User Pool（merchant pool）で管理しています。これは「提携企業 ↔ 利用企業」を同一メールアドレスで両立できるようにするためです。

## Environment Variables

`MERCHANT_COGNITO_*` は merchant 専用 User Pool の ID・Client ID を指定してください（admin/employee/operator が使う内部用プールとは別です）。

```bash
MERCHANT_COGNITO_REGION=ap-northeast-1
MERCHANT_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
MERCHANT_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
# Vercel Preview / Production では AWS_PROFILE の代わりに AWS_ROLE_ARN を使う
# AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/correcre-vercel-dynamodb-stg
DDB_MERCHANT_TABLE_NAME=correcre-merchant-dev
DDB_MERCHANT_USER_TABLE_NAME=correcre-merchant-user-dev
DDB_MERCHANDISE_TABLE_NAME=correcre-merchandise-dev
```

## Merchant User Provisioning

提携企業ユーザーは運用者画面（operator アプリ）から招待します。手動で Cognito / DynamoDB を編集する手順はありません。

招待された提携企業ユーザーは Cognito から仮パスワード付きの招待メールを受け取り、`/login` で初期ログインしたあと `/login/new-password` で新しいパスワードを設定します。

## Local Development

```bash
npm run dev:merchant
```

デフォルトの URL は `http://localhost:3003` です。
