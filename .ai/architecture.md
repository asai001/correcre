# architecture.md

## High-level view

このリポジトリは、3つの Next.js app と複数の共通 packages、AWS CDK による infra で構成される monorepo である。

---

## Layer structure

### App layer

- `apps/admin`
- `apps/employee`
- `apps/operator`

役割:

- 画面
- 画面ルーティング
- app 固有 UI
- app 固有 feature 組み立て
- middleware
- 認証・表示制御の app 側実装

### Shared package layer

- `packages/features/*`
- `packages/lib`
- `packages/theme`
- `packages/types`
- `packages/validation`
- `packages/adapters`

役割:

- 共通 feature
- 共通型
- 共通テーマ
- 共通ユーティリティ
- 共通バリデーション
- 外部接続の抽象化候補

### Infrastructure layer

- `infra`

役割:

- AWS リソース定義
- 環境差分管理
- deploy 管理
- app と AWS の接続前提の提供

---

## Expected dependency direction

基本想定:

- app -> shared packages
- app -> AWS/認証設定を利用
- infra -> デプロイ環境・リソース定義

避けたいこと:

- app 間の密結合
- app 固有仕様が shared package に無秩序に混入すること
- 影響範囲未確認のまま shared package を変更すること

---

## Investigation checklist

作業時は必要に応じて以下を確認すること。

### App 調査時

- 対象 app はどれか
- `src/app` のルート構成
- `src/features` の責務
- `src/components` の役割
- `src/lib` の共通処理
- `middleware.ts` の役割

### Shared package 調査時

- どの app から使われているか
- package 名と import 先
- 変更時の波及範囲
- app 固有ロジックが混ざっていないか

### Infra 調査時

- 対象環境は dev / stg / prod のどれか
- Cognito など認証系との関係
- app 側設定との整合
- デプロイコマンド・profile 依存

---

## Current known risks

- 共通 package の変更影響が見落とされる可能性
- 3 app の構造が似ていても、実装差分がある可能性
- auth / middleware / infra の責務分界が未確認だと誤認しやすい
