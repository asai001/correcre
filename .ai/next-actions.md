# next-actions.md

優先度順に、次にやることを具体的に書く。
曖昧な表現は避ける。

## Next actions

1. 実環境で `apps/admin` と `apps/employee` のロールチェックの動作確認を行う
2. ADMIN / EMPLOYEE ロールを持たないユーザーでログインし、エラーメッセージが正しく表示されることを確認する
3. 新パスワード設定フロー（`completeNewPassword`）でもロールチェックが効いていることを確認する
4. `apps/admin/src/lib/auth/current-user.ts` の `requireCurrentAdminUser` がページアクセス時に ADMIN ロールを正しくチェックしていることを確認する
5. `apps/employee/src/lib/auth/current-user.ts` の `requireCurrentEmployeeUser` がページアクセス時に EMPLOYEE ロールを正しくチェックしていることを確認する
