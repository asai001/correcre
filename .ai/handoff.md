# handoff.md

## 今回やったこと

- `apps/employee` のログイン認証に EMPLOYEE ロールチェックを追加した
- 前回の `apps/admin` ADMIN ロールチェック追加と同じパターンで実装した

## 変更ファイル

### `apps/employee/src/lib/auth/current-user.ts`
- `getEmployeeUserForSession(session)` を新設: `listUsersByCognitoSub` でユーザー一覧を取得し、`status !== "DELETED"` かつ `roles.includes("EMPLOYEE")` でフィルタ
- `requireCurrentEmployeeUser` を `getEmployeeUserForSession` を使う形に修正

### `apps/employee/src/lib/auth/errors.ts`
- `employee_role_not_allowed` エラーコード追加（「従業員権限がないため、ログインできません。」）

### `apps/employee/src/app/lib/actions/authenticate.ts`
- `authenticate`: `signInEmployee` 成功後に `getEmployeeUserForSession` でロールチェック。EMPLOYEE ロールがなければセッションクリア＋エラー返却
- `completeNewPassword`: `completeEmployeeNewPassword` 成功後に同様のロールチェック。EMPLOYEE ロールがなければセッションクリア＋ログイン画面へリダイレクト

## 確認できたこと

- TypeScript の型チェックが `apps/employee` で通ること
- `apps/operator` の既存 OPERATOR ロールチェック実装（参考パターン）
- 3 app すべてのログインにロールチェックが揃った

## 未確認事項

- 実環境での動作確認
- ロールなしユーザーでのエラーメッセージ表示確認

## 次にやること

1. 実環境で admin / employee のロールチェック動作を確認する
2. ロールなしユーザーでログイン試行し、エラーが正しく表示されることを確認する

## 注意点

- `getUserByCognitoSub`（単一ユーザー返却）ではなく `listUsersByCognitoSub`（複数ユーザー返却）を使っている。1つの cognitoSub が複数会社のユーザーに紐づく可能性があるため
- operator アプリは元から OPERATOR ロールチェック済みなので今回変更なし

## 対象スコープ

- `apps/employee`
- `packages/lib`（既存関数の利用のみ、変更なし）
- `packages/types`（既存型の利用のみ、変更なし）
