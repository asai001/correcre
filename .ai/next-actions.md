# next-actions.md

優先度順に、次にやることを具体的に書く。
曖昧な表現は避ける。

## Next actions

1. 実環境で `apps/operator` のパスワードリセット画面を表示し、helperText の背景が水色になっていることを確認する
2. `apps/admin` の `ForgotPasswordForm.tsx` にも同じ問題がないか確認する（同じ `className="bg-white"` パターンを使用している）
