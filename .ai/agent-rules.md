# agent-rules.md

このリポジトリでは、会話履歴ではなく `.ai/` 配下のファイルをエージェント間の共有コンテキストの正式な参照元とする。

このリポジトリは monorepo であり、以下をまたいで確認・実装・調査が発生しうる。

- `apps/admin`
- `apps/employee`
- `apps/operator`
- `infra`
- `packages/*`
- `packages/features/*`

Codex / Claude Code / その他のエージェントは、作業開始時と作業終了時に必ず `.ai/` 配下を確認・更新すること。

---

## Source of truth

優先順位は以下の通り。

1. ユーザーから今回明示的に与えられた指示
2. コードベース・設定ファイル・仕様書などの一次情報
3. `.ai/decisions.md`
4. `.ai/current-status.md`
5. `.ai/handoff.md`

`.ai/` 配下は共有用の補助記録であり、コードや仕様書と矛盾する場合は一次情報を優先すること。
矛盾を見つけた場合は、作業後に `.ai/current-status.md` または `.ai/decisions.md` に反映すること。

---

## Monorepo handling rules

### 1. Scope first

作業開始時に、まず対象範囲を明確にすること。

対象範囲の例:

- `apps/admin` のみ
- `apps/employee` と `packages/theme`
- `apps/operator` と `packages/types`
- `infra` のみ
- 複数 app 横断
- app + infra 横断

`current-status.md` に今回の対象範囲を明記すること。

### 2. Shared package awareness

`packages/*` と `packages/features/*` は複数 app に影響しうる。
共通パッケージを変更・調査する場合は、影響対象の app を必ず意識すること。

### 3. Infra awareness

`infra` は CDK 管理であり、アプリ実装と独立して見えても、認証・環境変数・デプロイ構成・AWS リソース定義に影響する可能性がある。
UI 側だけで完結すると決めつけないこと。

### 4. Do not assume single-app truth

ある app に実装があることを、他 app にも同様に存在すると自動的にみなさないこと。
`admin` / `employee` / `operator` は別々に確認すること。

---

## Update rules

### 1. decisions.md

「確定した方針」だけを書くこと。
例:

- 設計判断
- 実装方針
- 調査方針
- 見積もり方針
- app 間の責務整理
- 共有 package の扱い方

未確定の案や思考ログは書かないこと。

### 2. current-status.md

現在地を記録すること。

- どこまで確認したか
- どの app / package / infra を見たか
- 何が確認済みか
- 何が未確認か
- どこで詰まっているか

### 3. next-actions.md

次にやるべき具体的な作業を短く列挙すること。
ファイル名・ディレクトリ名・観点を含めること。

### 4. handoff.md

作業終了時は必ず更新すること。
次のエージェントが最短で再開できるように、以下を簡潔に残すこと。

- 今回やったこと
- 確認できたこと
- 未確認事項
- 次にやること
- 注意点
- どの app / package / infra を見たか

---

## Writing rules

### Facts vs hypotheses

事実と仮説を明確に分けること。
混在させないこと。

良い例:

- Confirmed: `apps/admin/src/app/...` に管理画面用のルートが存在する
- Hypothesis: `packages/theme` の変更で 3 app すべてに影響が出る可能性がある

悪い例:

- たぶん admin と employee は同じ構造

### Keep it concise

長い思考ログは残さないこと。
残すのは以下に限ること。

- 結論
- 根拠
- 未解決事項
- 次アクション

### Do not destroy history carelessly

既存記述を無造作に消さず、整理して更新すること。
古くなった情報は、必要に応じて要約して置き換えること。

---

## Task files

大きな論点や個別調査は `.ai/tasks/` 配下に追加してよい。

例:

- `.ai/tasks/admin-auth-check.md`
- `.ai/tasks/employee-ui-gap.md`
- `.ai/tasks/operator-role-design.md`
- `.ai/tasks/shared-theme-impact.md`
- `.ai/tasks/infra-cognito-check.md`

タスクファイルには以下を書くこと。

- 目的
- 対象範囲
- 確認結果
- 未解決事項
- 次アクション
