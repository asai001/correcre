# 従業員向けアプリ

このアプリは [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) をベースに作成した [Next.js](https://nextjs.org) アプリケーションです。

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
| `EMPLOYEE_COGNITO_REGION` | ログイン用 Cognito（CDK の出力値） |
| `EMPLOYEE_COGNITO_USER_POOL_ID` | ログイン用 Cognito（CDK の出力値） |
| `EMPLOYEE_COGNITO_APP_CLIENT_ID` | ログイン用 Cognito（CDK の出力値） |
| `DDB_COMPANY_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_EXCHANGE_FAVORITE_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_EXCHANGE_HISTORY_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MERCHANDISE_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MERCHANT_CALENDAR_TABLE_NAME` | 提携企業の休業日。コード上は任意だが、無いと休業日を無視したお届け候補日になるため必須扱い |
| `DDB_MERCHANT_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MERCHANT_USER_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MISSION_HISTORY_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MISSION_REPORT_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_MISSION_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_POINT_TRANSACTION_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_SCHEDULE_EVENT_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_USER_MONTHLY_STATS_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `DDB_USER_TABLE_NAME` | DynamoDB テーブル名（`correcre-<名前>-<stage>`） |
| `S3_MERCHANDISE_IMAGE_BUCKET_NAME` | S3 バケット名（CDK の出力値） |
| `S3_MISSION_REPORT_IMAGE_BUCKET_NAME` | S3 バケット名（CDK の出力値） |
| `EMPLOYEE_APP_URL` | 通知メールに入れる従業員画面のURL（本番: `https://app.correcre.jp`）。無いとメールからリンクが消える |
| `MERCHANT_APP_URL` | 通知メールに入れる提携企業画面のURL（本番: `https://merchant.correcre.jp`）。無いとメールからリンクが消える |

## Cognito ログイン設定

従業員向けアプリでは、以下の環境変数を設定してください。

```bash
EMPLOYEE_COGNITO_REGION=ap-northeast-1
EMPLOYEE_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
EMPLOYEE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
# Vercel Preview / Production では AWS_PROFILE の代わりに AWS_ROLE_ARN（Vercel OIDC）を使う
# AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/correcre-vercel-dynamodb-stg
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_MISSION_TABLE_NAME=correcre-mission-dev
DDB_MISSION_REPORT_TABLE_NAME=correcre-mission-report-dev
DDB_USER_MONTHLY_STATS_TABLE_NAME=correcre-user-monthly-stats-dev
DDB_EXCHANGE_HISTORY_TABLE_NAME=correcre-exchange-history-dev
DDB_POINT_TRANSACTION_TABLE_NAME=correcre-point-transaction-dev
DDB_MERCHANDISE_TABLE_NAME=correcre-merchandise-dev
DDB_MERCHANT_TABLE_NAME=correcre-merchant-dev
DDB_MERCHANT_USER_TABLE_NAME=correcre-merchant-user-dev
DDB_EXCHANGE_FAVORITE_TABLE_NAME=correcre-exchange-favorite-dev
DDB_SESSION_TABLE_NAME=correcre-session-dev
S3_MISSION_REPORT_IMAGE_BUCKET_NAME=correcre-mission-report-image-dev-<account-id>
S3_MERCHANDISE_IMAGE_BUCKET_NAME=correcre-merchandise-image-dev-<account-id>
MERCHANT_APP_URL=http://localhost:3003
SES_FROM_EMAIL=correcre-info@efficient-technology.com
```

`EMPLOYEE_COGNITO_REGION`、`EMPLOYEE_COGNITO_USER_POOL_ID`、`EMPLOYEE_COGNITO_APP_CLIENT_ID` の値は、CDK スタックの `EmployeeCognitoRegion`、`EmployeeCognitoUserPoolId`、`EmployeeCognitoUserPoolClientId` として出力されます。

DynamoDB / S3 のリソース名は、CDK スタックの各 `*TableName` / `*BucketName` 出力を設定してください。

dev AWS アカウントに対してローカル開発を行う場合は `AWS_PROFILE=CorreCre-Dev-Account` を使用し、事前に `aws sso login --profile CorreCre-Dev-Account` を実行してください。

Vercel Preview / Production では `AWS_PROFILE` は使用しません。Vercel の OIDC を有効にしたうえで、`AWS_ROLE_ARN` に CDK が作成する IAM Role（`correcre-vercel-dynamodb-<stage>`）を設定してください。

`EmployeeCognitoUserPoolId` は管理者向けアプリと共通で、2 つのアプリで異なるのは app client ID のみです。

認証方式はメールアドレス + パスワードです。実質的なパスワードルールは「英数字のみ、かつ 8 文字以上」です。Cognito 自体は 8 文字以上のみを必須とし、英数字のみという制約は新しいパスワード設定時にアプリ側で検証します。

## 開発を始める

まず、開発サーバーを起動します。

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くとアプリを確認できます。

`app/page.tsx` を編集すると、変更内容は自動で反映されます。

このプロジェクトでは [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) を利用して、Vercel のフォントファミリーである [Geist](https://vercel.com/font) を自動で最適化・読み込みします。

## 参考情報

Next.js について詳しく知りたい場合は、以下を参照してください。

- [Next.js Documentation](https://nextjs.org/docs): Next.js の機能や API を確認できます。
- [Learn Next.js](https://nextjs.org/learn): インタラクティブな Next.js チュートリアルです。

フィードバックやコントリビュートは [Next.js GitHub repository](https://github.com/vercel/next.js) でも確認できます。

## Vercel へのデプロイ

Next.js アプリをデプロイする最も簡単な方法は、Next.js の提供元が提供している [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) を利用することです。

詳細は [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。
