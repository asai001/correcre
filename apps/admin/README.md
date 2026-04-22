# 管理者向けアプリ

このアプリは [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) をベースに作成した [Next.js](https://nextjs.org) アプリケーションです。

## Cognito ログイン設定

管理者向けアプリでは、以下の環境変数を設定してください。

```bash
ADMIN_COGNITO_REGION=ap-northeast-1
ADMIN_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
ADMIN_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
# Vercel Preview / Production では AWS_PROFILE の代わりに環境変数で認証情報を設定します
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_SESSION_TOKEN=...  # 任意
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_DEPARTMENT_TABLE_NAME=correcre-department-dev
DDB_MISSION_TABLE_NAME=correcre-mission-dev
DDB_MISSION_REPORT_TABLE_NAME=correcre-mission-report-dev
DDB_USER_MONTHLY_STATS_TABLE_NAME=correcre-user-monthly-stats-dev
DDB_EXCHANGE_HISTORY_TABLE_NAME=correcre-exchange-history-dev
```

`ADMIN_COGNITO_REGION`、`ADMIN_COGNITO_USER_POOL_ID`、`ADMIN_COGNITO_APP_CLIENT_ID` の値は、CDK スタックの `AdminCognitoRegion`、`AdminCognitoUserPoolId`、`AdminCognitoUserPoolClientId` として出力されます。

DynamoDB のテーブル名は、CDK スタックから `UserTableName`、`CompanyTableName`、`DepartmentTableName`、`MissionTableName`、`MissionReportTableName`、`UserMonthlyStatsTableName`、`ExchangeHistoryTableName` として出力されます。

dev AWS アカウントに対してローカル開発を行う場合は `AWS_PROFILE=CorreCre-Dev-Account` を使用し、事前に `aws sso login --profile CorreCre-Dev-Account` を実行してください。

Vercel Preview / Production では `AWS_PROFILE` は使用しません。代わりに、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、必要に応じて `AWS_SESSION_TOKEN` をプロジェクトの環境変数に設定してください。

`AdminCognitoUserPoolId` は従業員向けアプリと共通で、2 つのアプリで異なるのは app client ID のみです。

認証方式はメールアドレス + パスワードです。実質的なパスワードルールは「英数字のみ、かつ 8 文字以上」です。Cognito 自体は 8 文字以上のみを必須とし、英数字のみという制約は新しいパスワード設定時にアプリ側で検証します。

管理者画面の権限制御は DynamoDB の User テーブル `roles` フィールドで行います。Cognito でログインしたユーザーが User レコードを持ち、`roles` に `ADMIN` が含まれている場合のみ管理者画面にアクセスできます。

Cognito コンソールから一時パスワード付きでユーザーを作成した場合、管理者向けアプリは `/login/new-password` にリダイレクトし、そこで `NEW_PASSWORD_REQUIRED` チャレンジを完了します。

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
