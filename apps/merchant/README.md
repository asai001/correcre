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
DDB_EXCHANGE_HISTORY_TABLE_NAME=correcre-exchange-history-dev
DDB_SYSTEM_SETTING_TABLE_NAME=correcre-system-setting-dev
# 収支・精算画面の請求メール送信（SES）
SES_FROM_EMAIL=correcre-info@efficient-technology.com
```

請求メールの宛先は運用者アプリの「設定」画面（system-setting テーブル）で管理します。未設定の場合は correcre-info@efficient-technology.com 宛に送信されます。

## 提携企業向け説明会 申込フォーム（`/seminar`）

ログイン不要の公開ページです。申込を受け付けると、申込者へ Zoom 参加情報を自動送信し、運用者にも申込内容を通知します。申込内容は `correcre-seminar-registration-<stage>` テーブルに「説明会 ID × メールアドレス」で 1 件に集約して保存します（同じ人が再送信しても重複せず、初回申込日時と申込回数が残ります）。

```bash
# 必須。未設定だとフォームは「準備中」表示になり、申込を受け付けない
SEMINAR_ZOOM_URL=https://us06web.zoom.us/j/xxxxxxxxxx?pwd=xxxxxxxx
# 以下は任意
SEMINAR_ZOOM_MEETING_ID=000 0000 0000
SEMINAR_ZOOM_PASSCODE=000000
SEMINAR_SCHEDULE_TEXT=2026年9月10日（水）14:00〜15:00
SEMINAR_TITLE=コレクレ 提携企業向け説明会
SEMINAR_EVENT_ID=merchant-briefing
DDB_SEMINAR_REGISTRATION_TABLE_NAME=correcre-seminar-registration-dev
```

Zoom 情報は環境変数で持つため、開催回ごとの差し替えはコード変更なしで行えます。別日程で再度開催する場合は `SEMINAR_EVENT_ID` も変更すると、申込者を回ごとに分けて集計できます。

申込者一覧は DynamoDB を直接参照して取得します。

```bash
aws dynamodb query --table-name correcre-seminar-registration-prod \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk":{"S":"SEMINAR#merchant-briefing"}}'
```

## Merchant User Provisioning

提携企業ユーザーは運用者画面（operator アプリ）から招待します。手動で Cognito / DynamoDB を編集する手順はありません。

招待された提携企業ユーザーは Cognito から仮パスワード付きの招待メールを受け取り、`/login` で初期ログインしたあと `/login/new-password` で新しいパスワードを設定します。

## Local Development

```bash
npm run dev:merchant
```

デフォルトの URL は `http://localhost:3003` です。
