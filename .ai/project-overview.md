# project-overview.md

## Project summary

- プロジェクト名: correcre
- 概要:
  - Correcre の monorepo リポジトリ
  - 複数の Next.js アプリ、共通 packages、AWS CDK ベースの infra を含む
- このリポジトリの目的:
  - フロントエンド / 共通 UI・型・バリデーション / インフラを一元管理すること

---

## Workspace structure

このリポジトリは npm workspaces を使用している。

ワークスペース:

- `infra`
- `apps/*`
- `packages/*`
- `packages/features/*`

ルート scripts:

- `npm run dev:employee`
- `npm run dev:admin`
- `npm run dev:operator`
- `npm run build`
- `npm run lint`
- `npm run test`

---

## Applications

### `apps/admin`

- 管理者向けアプリ
- Next.js ベース
- React / TypeScript
- MUI, Emotion, Chart.js などを使用

### `apps/employee`

- 従業員向けアプリ
- Next.js ベース
- React / TypeScript
- MUI, Emotion, Chart.js などを使用

### `apps/operator`

- 運営・オペレーター向けアプリ
- Next.js ベース
- React / TypeScript
- MUI, Emotion, Chart.js などを使用

---

## Shared packages

### `packages/adapters`

- 外部接続・アダプタ層の置き場候補

### `packages/features/*`

- 機能単位の共通ロジック
- 現時点では `individual-analysis` が見える

### `packages/lib`

- 共通ユーティリティ・共通ロジックの置き場

### `packages/theme`

- 共通テーマ・UI設定の置き場

### `packages/types`

- 共通型定義の置き場

### `packages/validation`

- バリデーション関連の共通化置き場

---

## Infrastructure

### `infra`

- AWS CDK ベース
- dev / stg / prod の deploy script がある
- 認証、環境、AWS リソースとの関連確認先になりうる

---

## Primary tech stack

- Monorepo: npm workspaces
- Frontend: Next.js 15
- UI: MUI, Emotion, Tailwind v4 系, Font Awesome
- Language: TypeScript
- Infra: AWS CDK
- Auth related dependency:
  - `@aws-sdk/client-cognito-identity-provider`
  - `jose`

---

## Important directories

- `apps/admin/src`
- `apps/employee/src`
- `apps/operator/src`
- `packages/theme/src`
- `packages/types/src`
- `packages/lib/src`
- `infra/lib`
- `infra/bin`

---

## Important reminders

- このリポジトリは単一 app 前提で読まないこと
- 共通 package の変更は複数 app に波及しうる
- app 側の不具合や仕様は infra / auth / env 設定起因の可能性がある
- ある app の実装を他 app に自動的に一般化しないこと

---

## Notes

- README と実ディレクトリ構成の差分がある場合は、一次情報は実ファイルを優先する
