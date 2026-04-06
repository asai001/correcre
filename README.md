## そのまま使うときの初回プロンプト

毎回エージェントに投げる文の最初に、以下の文章をつけてください。

```text
このリポジトリでは会話履歴ではなく .ai 配下の共有ファイルを正式なコンテキスト源とします。
最初に AGENT.md, .ai/project-overview.md, .ai/architecture.md, .ai/decisions.md, .ai/current-status.md, .ai/next-actions.md, .ai/handoff.md を確認してください。
今回の対象が apps/admin, apps/employee, apps/operator, packages/*, infra のどこかを最初に明確にしてください。
コードや仕様書と矛盾する場合は一次情報を優先してください。
作業後は .ai/current-status.md, .ai/next-actions.md, .ai/handoff.md を更新してください。
```
