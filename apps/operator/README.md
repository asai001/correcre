## Operator App

運用者向けアプリです。企業登録とユーザー登録を行います。

### Environment Variables

```bash
OPERATOR_COGNITO_REGION=ap-northeast-1
OPERATOR_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
OPERATOR_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
# For Vercel Preview/Production, use OIDC-backed env vars instead of AWS_PROFILE:
# AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/correcre-vercel-dynamodb-stg
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_DEPARTMENT_TABLE_NAME=correcre-department-dev
```

- `OPERATOR_COGNITO_REGION`、`OPERATOR_COGNITO_USER_POOL_ID`、`OPERATOR_COGNITO_APP_CLIENT_ID` の値は、CDK スタックの `OperatorCognitoRegion`、`OperatorCognitoUserPoolId`、`OperatorCognitoUserPoolClientId` として出力されます。
- operator アプリの認可は `User` テーブルで `roles` に `OPERATOR` を持つユーザーに限定されます。
- operator 用のユーザーは `cognitoSub` が紐づいた `User` レコードを用意してください。
- DynamoDB table names are emitted by the CDK stack as `UserTableName`, `CompanyTableName`, and `DepartmentTableName`.
- ローカルで dev AWS account を使う場合は `AWS_PROFILE=CorreCre-Dev-Account` を設定し、必要に応じて `aws sso login --profile CorreCre-Dev-Account` を実行してください。
