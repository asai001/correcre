## Operator App

運用側アプリです。会社登録とユーザー登録を行います。

### Environment Variables

```bash
OPERATOR_COGNITO_REGION=ap-northeast-1
OPERATOR_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
OPERATOR_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
OPERATOR_ALLOWED_EMAILS=operator1@example.com,operator2@example.com
AWS_REGION=ap-northeast-1
AWS_PROFILE=CorreCre-Dev-Account
DDB_USER_TABLE_NAME=correcre-user-dev
DDB_COMPANY_TABLE_NAME=correcre-company-dev
DDB_DEPARTMENT_TABLE_NAME=correcre-department-dev
```

- `OPERATOR_ALLOWED_EMAILS` は任意です。設定した場合は allowlist に含まれるメールアドレスだけが利用できます。
- DynamoDB table names are emitted by the CDK stack as `UserTableName`, `CompanyTableName`, and `DepartmentTableName`.
- ローカルで dev AWS account を使う場合は `AWS_PROFILE=CorreCre-Dev-Account` を設定し、事前に `aws sso login --profile CorreCre-Dev-Account` を実行してください。
