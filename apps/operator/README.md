## Operator App

運用者向けの専用アプリです。`admin` / `employee` とは分けて、ユーザー登録・管理だけを扱います。

### Environment Variables

```bash
OPERATOR_COGNITO_REGION=ap-northeast-1
OPERATOR_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxx
OPERATOR_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
OPERATOR_ALLOWED_EMAILS=operator1@example.com,operator2@example.com
```

- `OPERATOR_ALLOWED_EMAILS` は任意です
- 設定した場合、このアプリは allowlist に含まれるメールアドレスだけが利用できます
- 一時パスワードのユーザーは `/login/new-password` で初回パスワード設定を行います
