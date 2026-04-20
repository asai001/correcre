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

### [2026-04-18] 企業ミッションは企業登録時に自動生成しない

- Status: confirmed
- Context:
  - ユーザー要件として、企業ごとのミッションは運用者が手動で設定する運用であり、自動生成は想定外
  - 既存企業でミッション未登録のケースが実際に存在する
- Decision:
  - `createCompanyInDynamo` ではミッションを生成しない
  - 運用者 `/missions` では各企業に対して 1〜5 スロットを常時表示し、未設定スロットをその場で新規登録できるようにする
- Reason:
  - 実運用と UI/サーバー実装の前提を一致させるため
- Impact:
  - Mission 管理画面は未設定状態を正常系として扱う
  - `PUT /api/missions/:slotIndex` は初回作成と更新の両方を担う
  - 企業登録後の Mission / MissionHistory テーブル初期データ投入は行わない
- Follow-up:
  - 旧実装で自動生成済みのミッションデータを残すか整理するか判断する

### [2026-04-20] ミッション項目 key は自動採番して固定する

- Status: confirmed
- Context:
  - `MissionField.key` は `fieldValues[key]` の保存キーであり、employee の報告フォームと分析表示でも参照される
  - 手入力だと運用負荷が高く、ラベル変更時に key を変えると既存データ参照が壊れうる
- Decision:
  - ミッション項目追加時に `field_001` 形式の key を自動採番する
  - 編集画面の key は読み取り専用にし、ラベル変更では key を変更しない
- Reason:
  - 保存キーを安定化しつつ、運用者の入力負荷を下げるため
- Impact:
  - key の手編集はできなくなる
  - 新規フィールドは自動で一意な保存用IDを持つ
  - 既存の `fieldValues[key]` 参照と後方互換を維持しやすくなる
- Follow-up:
  - 必要なら key が編集不要であることを UI 上でさらに明示する

### [2026-04-20] 会社情報更新ロジックは app 間 import ではなく shared module に集約する

- Status: confirmed
- Context:
  - admin の各種情報更新 API が `@operator/features/user-registration/api/server` の `updateCompanyInDynamo()` を直接再利用していた
  - その結果、company 更新だけでも `getOperatorCognitoConfig()` が評価され、admin 側で `OPERATOR_COGNITO_*` が必要になっていた
- Decision:
  - 会社一覧 / 作成 / 更新 / summary 変換 / form helper / 理念体系 UI を `packages/lib` と `packages/ui` の shared module へ切り出す
  - admin と operator はその shared module のみを参照し、app 同士を直接 import しない
- Reason:
  - admin の company 更新を operator app 実装から切り離し、Cognito 依存を company CRUD へ混入させないため
- Impact:
  - `packages/lib/src/company-management-server.ts` は `AWS_REGION` と `DDB_COMPANY_TABLE_NAME` のみで動作する
  - admin の各種情報更新系コードパスは `OPERATOR_COGNITO_*` を前提にしない
  - operator 側の既存 company-registration import は re-export で互換維持する
- Follow-up:
  - 実環境で admin の `.env.local` から `OPERATOR_COGNITO_*` を外して各種情報更新が成功することを確認する
