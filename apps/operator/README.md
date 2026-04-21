# Operator App

運用者向けアプリです。

## Environment Variables

```bash
OPERATOR_COGNITO_REGION=ap-northeast-1
OPERATOR_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
OPERATOR_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
# Vercel Preview / Production では AWS_PROFILE の代わりに AWS_ROLE_ARN を使う
# AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/correcre-vercel-dynamodb-stg
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_DEPARTMENT_TABLE_NAME=correcre-department-dev
```

## First Operator User

最初の運用者ユーザーは、Cognito と DynamoDB を手動で 1 回だけ初期化します。

目的は、最初の運用者 1 人を起点にして、2 人目以降のユーザー作成や企業登録を運用者画面から進められる状態を作ることです。

### 1. Cognito でユーザーを作成する

Operator 用 User Pool にユーザーを 1 人作成します。

- Username はメールアドレスを使う
- 初期パスワードを設定する
- 作成後に Cognito の `sub` を控える

この `sub` を DynamoDB の `cognitoSub` と `gsi1pk` に使います。

### 2. DynamoDB User テーブルに 1 行追加する

User テーブルに次の形式でレコードを追加します。

```json
{
  "companyId": "xxx",
  "sk": "USER#xxx",
  "userId": "xxx",
  "cognitoSub": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "lastName": "Operator",
  "firstName": "User",
  "email": "operator@example.com",
  "roles": ["OPERATOR"],
  "status": "INVITED",
  "currentPointBalance": 0,
  "currentMonthCompletionRate": 0,
  "createdAt": "2026-04-21T00:00:00.000Z",
  "updatedAt": "2026-04-21T00:00:00.000Z",
  "gsi1pk": "COGNITO_SUB#xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "gsi2pk": "EMAIL#operator@example.com"
}
```

### Required Fields

- `companyId`: 任意の ID
- `sk`: `USER#<userId>`
- `userId`: 任意の ID
- `cognitoSub`: Cognito の `sub`
- `roles`: List 型で設定し、`"OPERATOR"` を含める
- `status`: 初回ログイン前は `"INVITED"`
- `gsi1pk`: `COGNITO_SUB#<cognitoSub>`
- `gsi2pk`: `EMAIL#<emailを小文字化した値>`

### Important

- `roles` は文字列ではなく List 型にする
- `roles` が無いと `user.roles.includes("OPERATOR")` でログイン時に落ちる
- `gsi1pk` が無いと Cognito の `sub` からユーザーを引けない
- `status` は `"DELETED"` 以外にする
- `email` は Cognito 側のログインメールアドレスと一致させる

この 1 行は、運用者画面に入るための最小レコードです。以後のユーザー追加は、この初期運用者でログインしたあとに画面から実施します。

## First Login

この状態で運用者アプリのログイン画面を開きます。

1. Cognito で作成したメールアドレスと初期パスワードで `/login` にログインする
2. `NEW_PASSWORD_REQUIRED` により `/login/new-password` へ遷移する
3. 新しいパスワードを設定する
4. 正常終了後、`status` はアプリ側で `ACTIVE` に更新される

ログイン後は `/dashboard` から企業登録、ユーザー登録、ミッション管理へ進めます。2 人目以降のユーザーは手動で DynamoDB を編集せず、運用者画面から追加する前提です。

## Local Development

```bash
npm run dev --workspace @correcre/operator
```

デフォルトの URL は `http://localhost:3002` です。
