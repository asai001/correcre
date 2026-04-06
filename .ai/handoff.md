# handoff.md

## 今回やったこと

- Codex 向けの指示ファイル名を `CODEX.md` から `AGENTS.md` に変更した
- `CLAUDE.md` と `.ai/` 配下を共有コンテキスト運用の入口として整理した
- `.ai/handoff.md` の記述を実在ファイルに合わせて更新した

## 確認できたこと

- コレクレは npm workspaces の monorepo 構成である
- app は `admin`, `employee`, `operator` の3つ
- 共通 package 群と `infra` が同居している
- 共有コンテキストは `.ai/` 配下に分割されている
- Codex 側のルート指示ファイルは `AGENTS.md`、Claude 側は `CLAUDE.md` である

## 未確認

- 各 app の具体的な責務分担
- 共有 package の利用実態
- `middleware.ts` の役割差分
- auth / Cognito / infra の接続詳細

## 次にやること

1. 各 app の `src/app` と `src/features` を読んで役割を整理する
2. 共有 package の import 元と責務を確認する
3. infra と app 側認証の接続点を確認する

## 注意点

- 単一 app 前提で読まないこと
- 共通 package の変更影響を必ず意識すること
- `.ai/` は補助記録なので、コードや設定ファイルと矛盾したら一次情報を優先すること

## 次のエージェント向けメモ

- 参照すべきファイル:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.ai/agent-rules.md`
  - `.ai/current-status.md`
  - `.ai/next-actions.md`
  - `.ai/decisions.md`
  - `package.json`
  - `apps/*/package.json`
  - `infra/package.json`
  - 各 app の `src/app`, `src/features`, `src/lib`, `middleware.ts`
- 優先して見るべき論点:
  - app 間の責務差分
  - 共有 package の波及範囲
  - auth / infra の接続
- 勝手に前提化しない方がよい点:
  - 3 app の画面・権限・責務が完全に同じであるという前提
