# tasks/README.md

このディレクトリには、コレクレ内の個別調査・個別論点ごとのメモを置く。

## 使いどころ

- app ごとの差分を整理したい
- 共有 package の影響範囲を整理したい
- auth / middleware / infra の論点を分けたい
- 見積もりや改修の根拠を残したい
- 複数回に分けて調査する論点がある

## 推奨ファイル名

- `admin-screen-map.md`
- `employee-screen-map.md`
- `operator-screen-map.md`
- `shared-theme-impact.md`
- `shared-types-usage.md`
- `auth-middleware-check.md`
- `infra-cognito-check.md`

## 推奨テンプレート

```md
# task-title

## Objective

- このタスクの目的

## Scope

- 対象 app / package / infra

## Confirmed

- 確認済み事項

## Hypotheses

- 仮説

## Unknown

- 未確認事項

## Evidence

- 参照したファイル・資料

## Next actions

1.
2.
3.
```
