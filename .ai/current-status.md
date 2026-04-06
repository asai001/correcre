# current-status.md

## Objective

- 今回の作業目的:
  - コレクレの monorepo 運用に適したエージェント共有コンテキストの土台を整備する
- 成果物:
  - `AGENT.md`
  - `.ai/project-overview.md`
  - `.ai/architecture.md`
  - `.ai/decisions.md`
  - `.ai/current-status.md`
  - `.ai/next-actions.md`
  - `.ai/handoff.md`
  - `.ai/tasks/README.md`
- 完了条件:
  - 別エージェントに切り替わっても、`.ai/` を読めば再開しやすい状態になっていること

---

## Scope

- 対象 app:
  - 共通
- 対象 packages:
  - 共通
- 対象 infra:
  - `infra`
- 今回は実装変更ではなく、共有コンテキスト設計が対象

---

## Confirmed

- ルート `package.json` で npm workspaces が定義されている
- workspaces には `infra`, `apps/*`, `packages/*`, `packages/features/*` が含まれる
- app は `apps/admin`, `apps/employee`, `apps/operator` の3つがある
- 各 app は Next.js 15 / React 19 / TypeScript ベースで構成されている
- `infra` は AWS CDK ベースで、dev / stg / prod の deploy script を持つ
- 共通 package として `adapters`, `features`, `lib`, `theme`, `types`, `validation` が存在する

---

## Hypotheses

- `admin`, `employee`, `operator` は似た構造を持つが、画面や責務の差分がある可能性が高い
- `packages/theme` と `packages/types` は複数 app に強く影響する共有基盤の可能性が高い
- 認証や middleware の理解には app 側だけでなく `infra` の確認も必要になる可能性がある

---

## Unknown

- 各 app の具体的な責務分担
- `packages/features/individual-analysis` の実際の適用先
- `middleware.ts` の app 間差分
- Cognito など認証関連の infra との実接続構成

---

## Investigated files

- `package.json`
- `README.md`
- `apps/admin/package.json`
- `apps/employee/package.json`
- `apps/operator/package.json`
- `infra/package.json`

---

## Blockers

- 現時点では全コード読解はしていないため、責務分担の詳細は未確認

---

## Current assessment

- コレクレは app / shared packages / infra をまたぐ monorepo として扱うべき
- コンテキスト共有は単一 `context.md` より、`overview / architecture / decisions / status / handoff` 分割の方が運用しやすい
