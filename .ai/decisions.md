# decisions.md

このファイルには「確定した判断」だけを書く。
仮説・未確認情報・長い議論ログは書かない。

---

## Decisions

### [2026-04-06] コレクレでは `.ai/` を共有コンテキストの正式参照元とする

- Status: confirmed
- Context:
  - Codex 拡張と Claude Code 拡張をレートリミットに応じて切り替える運用では、会話コンテキストが分断されやすい
- Decision:
  - 会話履歴ではなく、リポジトリ内の `.ai/` 配下をエージェント間の共有コンテキストとして扱う
- Reason:
  - エージェント切り替え時の再説明コストを下げるため
- Impact:
  - すべての作業開始時・終了時に `.ai/` の確認と更新が必要になる
- Follow-up:
  - `AGENT.md` と `.ai/` テンプレートを維持する

### [2026-04-06] コレクレは monorepo 前提でスコープ確認を行う

- Status: confirmed
- Context:
  - `apps/admin`, `apps/employee`, `apps/operator`, `infra`, `packages/*` が同居している
- Decision:
  - 作業開始時に対象スコープを app / packages / infra 単位で明示する
- Reason:
  - 単一 app 前提の誤読や、共有 package の影響見落としを防ぐため
- Impact:
  - `current-status.md` に対象範囲を毎回記載する
- Follow-up:
  - 横断調査時は影響範囲も明記する

### [2026-04-06] `.ai/` でコードの代わりに長文思考ログは持たない

- Status: confirmed
- Context:
  - 共有ファイルに思考ログを蓄積すると肥大化しやすい
- Decision:
  - `.ai/` には結論・根拠・未解決事項・次アクションのみを残す
- Reason:
  - 次のエージェントが短時間で再開できる状態を維持するため
- Impact:
  - handoff や current-status は簡潔に保つ
- Follow-up:
  - 大きい調査だけ `tasks/` に分離する
