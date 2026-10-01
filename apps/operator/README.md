# Operator App

運用者向けアプリです。

## 本番で必須の環境変数

次の環境変数は Vercel の **Production** と **Preview（stage）** の両方に設定してください。
本番（`VERCEL_ENV=production`）のビルドでは、1 つでも欠けていると `next.config.ts` のチェックでビルドが失敗します。Vercel はビルドに失敗すると本番を差し替えないため、設定漏れがあっても稼働中の本番は壊れません。Preview では警告をビルドログに出すだけで、ビルドは止めません。

環境変数を読むコードを追加・変更したら、`packages/lib/src/env/required-env.ts` の一覧とこの表を合わせて更新してください。

| 環境変数 | 用途 |
|---|---|
| `AWS_REGION` | AWS のリージョン（ap-northeast-1） |
| `AWS_ROLE_ARN` | Vercel OIDC で引き受ける IAM Role（`correcre-vercel-dynamodb-<stage>`） |
| `SESSION_SECRET` | ログインセッションの署名鍵（32 文字以上） |
| `DDB_SESSION_TABLE_NAME` | ログインセッションの保存先 |
| `OPERATOR_COGNITO_REGION` | ログイン用 Cognito（CDK の出力値） |
| `OPERATOR_COGNITO_USER_POOL_ID` | ログイン用 Cognito（CDK の出力値） |
| `OPERATOR_COGNITO_APP_CLIENT_ID` | ログイン用 Cognito（CDK の出力値） |
| `MERCHANT_COGNITO_REGION` | 提携企業用 User Pool（提携企業ユーザーの招待・管理に使う） |
| `MERCHANT_COGNITO_USER_POOL_ID` | 提携企業用 User Pool（提携企業ユーザーの招待・管理に使う） |
| `DDB_COMPANY_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_DEPARTMENT_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_EXCHANGE_HISTORY_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MERCHANDISE_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MERCHANT_CALENDAR_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MERCHANT_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MERCHANT_USER_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MISSION_HISTORY_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MISSION_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_OPERATOR_AUDIT_LOG_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_POINT_TRANSACTION_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_SCHEDULE_EVENT_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_SYSTEM_SETTING_TABLE_NAME` | 「設定」画面（通知先メールアドレス）の保存先 |
| `DDB_USER_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `S3_MERCHANDISE_IMAGE_BUCKET_NAME` | S3 バケット名（CDK の出力値） |
| `EMPLOYEE_APP_URL` | 通知メールに入れる従業員画面のURL（本番: `https://app.correcre.jp`）。無いとメールからリンクが消える |
| `MERCHANT_APP_URL` | 通知メールに入れる提携企業画面のURL（本番: `https://merchant.correcre.jp`）。無いとメールからリンクが消える |
| `CRON_SECRET` | 日次バッチ（Vercel Cron）の認証。無いとバッチが毎回 503 で止まる |

## Environment Variables

```bash
OPERATOR_COGNITO_REGION=ap-northeast-1
OPERATOR_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
OPERATOR_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
# 提携企業ユーザーは別 User Pool に作成するため、運用者画面は
# その User Pool を AdminCreateUser などで操作する必要がある
MERCHANT_COGNITO_REGION=ap-northeast-1
MERCHANT_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
# Vercel Preview / Production では AWS_PROFILE の代わりに AWS_ROLE_ARN を使う
# AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/correcre-vercel-dynamodb-stg
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_DEPARTMENT_TABLE_NAME=correcre-department-dev
# 「設定」画面（通知先メールアドレス）の保存先
DDB_SYSTEM_SETTING_TABLE_NAME=correcre-system-setting-dev
```

「設定」画面で保存した通知先メールアドレス（複数登録可）は、提携企業からの請求メールと、管理者画面でのユーザー追加通知メールの宛先として使用されます。

## 提携企業 一斉メール

`/merchant-broadcast`（ヘッダーの「一斉メール」）から、選択した提携企業へお知らせメールをまとめて送信できます。

- 宛先は、提携企業のログインユーザー（停止・削除済みを除く）と、提携企業に登録された連絡先メールアドレスです。同じアドレスには 1 通だけ送ります
- 他社のアドレスが見えないよう、宛先ごとに 1 通ずつ SES で送信します（1 回あたり最大 300 件）
- 本文の `{{提携企業名}}` `{{担当者名}}` は宛先ごとに置き換わり、末尾には配信元の案内と `MERCHANT_APP_URL` が自動で付きます
- 「自分にテスト送信」は、操作中の運用者のメールアドレスにだけ送ります
- 送信履歴は `DDB_SYSTEM_SETTING_TABLE_NAME` のテーブルに `settingKey = MERCHANT_BROADCAST#<送信日時>#<ID>` で保存します（新しいテーブル・環境変数は不要）

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
