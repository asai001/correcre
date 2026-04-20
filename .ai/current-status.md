# current-status.md

## Objective

運用者画面のミッション管理を「企業登録時に自動生成される」前提から外し、各企業の 5 スロットを運用者が手動で新規設定・更新できる状態に修正。
あわせて admin 各種情報画面のミッション項目一覧テーブルで、`項目名` 以外の列を左右中央揃えに調整。
あわせて admin の各種情報更新が operator app 実装へ直接依存しないよう、会社情報の shared logic を `packages/lib` / `packages/ui` へ切り出す。
あわせて `packages/ui` の部署 autocomplete で `key` prop を spread していた実装を修正し、Next.js console error を解消。

## Scope

- `apps/operator/src/features/mission-management/model/types.ts` — 5 スロット固定定数、未設定スロット用サマリー追加
- `apps/operator/src/features/mission-management/api/server.ts` — 空スロットの初回作成対応、一覧で 1〜5 スロットを常時返却、自動生成ヘルパー削除
- `apps/operator/src/features/mission-management/ui/MissionManagement.tsx` — 自動生成前提の空文言を撤去し、手動設定案内に変更
- `apps/operator/src/features/mission-management/ui/MissionCard.tsx` — 未設定カード表示と新規設定導線追加
- `apps/operator/src/features/mission-management/ui/MissionEditDialog.tsx` — 新規設定時のタイトル・確認文言・保存ラベル対応、上部入力欄を浮動ラベルに戻しつつ余白を調整
- `apps/operator/src/features/mission-management/ui/FieldBuilder.tsx` — フィールド key の自動採番と読み取り専用化
- `apps/operator/src/features/user-registration/api/server.ts` — 企業登録時のミッション自動生成を削除
- `apps/employee/src/features/mission-report/model/types.ts` — employee 側 FieldConfig に helpText を追加
- `apps/employee/src/features/mission-report/api/server.ts` — MissionField の placeholder / helpText / textarea rows を employee 側へ変換
- `apps/employee/src/app/api/mission-form-config/route.ts` — form config に helpText を含める
- `apps/employee/src/features/mission-report/ui/MissionReportDialog.tsx` — placeholder / helpText 表示、textarea / select 描画追加、open 時の最新フォーム設定再取得
- `apps/employee/src/features/mission-report/ui/MissionReportView.tsx` — ミッション一覧ダイアログの open state を保持
- `apps/employee/src/features/mission-report/ui/MissionListDialog.tsx` — MUI ダイアログで実ミッション一覧を表示
- `apps/admin/src/features/info/ui/AdminInfo.tsx` — 各種情報画面タブの active スタイル強化と、ミッション項目一覧テーブルの 2 列目以降を中央揃えに調整
- `apps/admin/src/app/api/company-info/route.ts` — admin 各種情報更新 API が operator 側 server module を再利用している経路を確認
- `apps/admin/src/lib/auth/config.ts` — admin は `ADMIN_COGNITO_*` を使用することを確認
- `apps/operator/src/features/user-registration/api/server.ts` — `updateCompanyInDynamo()` が `getRuntimeConfig()` 経由で `OPERATOR_COGNITO_*` を要求することを確認
- `apps/operator/src/lib/auth/config.ts` — `OPERATOR_COGNITO_REGION` / `OPERATOR_COGNITO_USER_POOL_ID` / `OPERATOR_COGNITO_APP_CLIENT_ID` の必須化箇所を確認
- `packages/lib/src/company-management-types.ts` — 会社情報更新で共有する型を追加
- `packages/lib/src/company-management-form.ts` — company form helper を shared module 化
- `packages/lib/src/company-management-server.ts` — 会社 CRUD / summary 変換を Cognito 非依存の shared server module へ切り出し
- `packages/ui/src/components/company-philosophy-fields.tsx` — 理念体系 UI を shared component 化
- `packages/ui/src/department-autocomplete-field.tsx` — `renderOption` の `key` を props spread せず JSX へ直接指定するよう修正
- `apps/operator/src/features/company-registration/model/types.ts` — shared company type の re-export 化
- `apps/operator/src/features/company-registration/ui/company-form.ts` — shared form helper の re-export 化
- `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx` — shared UI component の re-export 化
- `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx` — 理念体系 textarea を 3 行初期表示 + 縦リサイズ可能に調整
- `.ai/current-status.md`
- `.ai/next-actions.md`
- `.ai/handoff.md`
- `.ai/decisions.md`

## Confirmed

- `/api/missions?companyId=...` は、登録済みミッションの有無にかかわらずスロット 1〜5 を返す
- `PUT /api/missions/:slotIndex` は、未設定スロットなら version 1 の新規ミッションを作成し、既存スロットなら履歴を閉じて version を進める
- `/missions` 画面では未設定スロットがカード表示され、そこから新規設定できる
- `createCompanyInDynamo` は会社レコードのみ作成し、ミッションは自動生成しない
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — OK
- `MissionField.key` は報告値を `fieldValues[key]` に保存する内部キー、`MissionField.label` は従業員画面や集計表示に出す表示名
- `title` はミッション名、`description` はミッション内容説明、`category` は分類タグ、`label` は報告フォームの各入力項目名
- `MissionField.key` は現状日本語不可。`apps/operator/src/features/mission-management/api/server.ts` のバリデーションで英数字とアンダースコアのみに制限されている
- `MissionField.placeholder` と `MissionField.helpText` は operator 設定 UI から employee 側 API / 型 / 報告ダイアログまで接続済み
- employee ダッシュボードは初期表示時のミッション設定を保持していたため、operator 側更新直後はリロードしないと古い設定が残るケースがあった
- `MissionField.key` の自動入力は可能。ただし `fieldValues[key]` 保存と分析参照に使うため、ラベル変更に追従して再生成するのは危険
- 自動入力するなら「初回生成して固定」が安全。日本語ラベルから既存の ASCII 制約下で意味のある key を作る仕組みは現状ない
- `FieldBuilder` はフィールド追加時に `field_001` 形式の key を自動採番し、key 入力欄は読み取り専用に変更済み
- ラベルを変更しても key は変わらない
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 再実行で OK
- employee 側のミッション報告フォームは、2026-04-20 時点で `placeholder` と `helpText` を表示するように修正済み
- employee 側のミッション報告フォームは `textarea` と `select` も明示的に描画するように修正済み
- `npx tsc --noEmit -p apps/employee/tsconfig.json` — 2026-04-20 実行で OK
- employee 側の `helpText` は `MissionReportDialog` の各 `TextField` に `helperText` prop として渡しており、入力欄の下に補助文として表示される
- `MissionReportDialog` は open 時に `/api/mission-form-config` を再取得し、operator 側の最新設定をリロードなしで反映するように修正済み
- 2026-04-20 に `MissionEditDialog` 上部フォームのタイトル / 説明 / カテゴリ / 月間実施回数 / スコアを浮動ラベルへ戻し、各フィールドに上余白とラベル背景を追加して近接を緩和
- employee 側の「ミッション一覧を見る」は `MissionReportView` で open state を持ち、`MissionListDialog` に `orderedMissionItems` を渡して表示する構成
- `MissionListDialog` は `@correcre/ui` の Radix ダイアログではなく MUI `Dialog` へ切り替え、実ミッションのタイトル / カテゴリ / スコア / 月間実施回数 / 説明 / 報告項目を表示するように修正
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 浮動ラベル復帰後も OK
- `npx tsc --noEmit -p apps/employee/tsconfig.json` — 2026-04-20 ミッション一覧ダイアログ修正後も OK
- admin 各種情報画面の「理念体系の編集」で使う `CompanyPhilosophyFields` の本文 textarea は 2026-04-20 時点で `rows={3}` に変更済み
- 同 textarea は `resize: vertical` と `overflow: auto` を指定し、右下ドラッグで縦幅を変更できるように修正済み
- admin 各種情報画面のタブは `AdminInfo.tsx` 側で active 時にシアン背景 + 白文字になるように変更済み
- admin 各種情報画面のミッション項目一覧テーブルは、`項目名` 列を除く `カテゴリ / 点数 / 回数 / 入力項目数 / 状態` を中央揃えに変更済み
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 admin 各種情報画面 UI 修正後も OK
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 ミッション項目一覧の中央揃え調整後も OK
- `apps/admin/.env.example` には `ADMIN_COGNITO_*` はあるが `OPERATOR_COGNITO_*` は未記載
- admin 各種情報更新 API (`apps/admin/src/app/api/company-info/route.ts`) は `updateCompanyInDynamo()` を `@operator/features/user-registration/api/server` から再利用している
- `updateCompanyInDynamo()` は `getRuntimeConfig()` を呼び、その中で `getOperatorCognitoConfig()` が `OPERATOR_COGNITO_REGION` / `OPERATOR_COGNITO_USER_POOL_ID` / `OPERATOR_COGNITO_APP_CLIENT_ID` を必須として読む
- したがって現状実装では、admin の各種情報更新系コードパスで `OPERATOR_COGNITO_*` が必要
- 2026-04-20 に `packages/lib/src/company-management-types.ts` / `company-management-form.ts` / `company-management-server.ts` を追加し、会社情報更新ロジックを shared module 化
- `packages/lib/src/company-management-server.ts` は `AWS_REGION` と `DDB_COMPANY_TABLE_NAME` のみを読み、`OPERATOR_COGNITO_*` を参照しない
- admin 側の `apps/admin/src/app/api/company-info/route.ts` / `apps/admin/src/features/info/api/server.ts` / `apps/admin/src/features/info/ui/AdminInfo.tsx` は、2026-04-20 時点で `@operator/*` を import せず shared module のみを参照する
- operator 側の会社管理入口 (`apps/operator/src/app/api/companies/route.ts`, `/company-registration`, `/user-registration`, `/missions`, `/dashboard`) も shared company management server module を参照する形へ切替済み
- `apps/operator/src/features/company-registration/model/types.ts`, `ui/company-form.ts`, `ui/CompanyPhilosophyFields.tsx` は互換用の re-export として残し、operator 内の既存 import を壊さない構成に変更済み
- `apps/operator/src/features/user-registration/api/server.ts` から会社 CRUD / company summary 変換 / 理念体系正規化ロジックを削除し、employee 管理用の company existence check だけを保持する構成へ整理済み
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 shared company management module 切り出し後も OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 shared company management module 切り出し後も OK
- `packages/ui/src/department-autocomplete-field.tsx` は 2026-04-20 時点で `renderOption` の `key` を分離し、`<li key={key} {...optionProps}>` で描画するよう修正済み
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 部署 autocomplete の `key` 修正後も OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 部署 autocomplete の `key` 修正後も OK
- 2026-04-21 に `git status --short` / `git diff --stat` を確認し、差分は admin / employee / operator / packages / infra 横断のため、1 コミットにまとめるなら包括的な umbrella message が妥当と判断
- admin 各種情報画面の「メインカラー」は `primaryColor` としてフォーム入力・PATCH API・`Company` 型定義までは接続されている
- ただし `primaryColor` の参照箇所は `apps/admin/src/features/info/ui/AdminInfo.tsx`、`apps/admin/src/app/api/company-info/route.ts`、型定義のみで、UI テーマや表示色へ反映する実装は現状ない
- admin 各種情報画面の会社情報タブでは、2026-04-20 時点で `ステータス` と `プラン` を常時 disabled に変更済み
- admin 各種情報画面の会社情報タブでは、2026-04-20 時点で `担当者名` / `担当者メールアドレス` / `担当者電話番号` / `請求先メールアドレス` / `ロゴ URL` / `メインカラー` の入力欄を非表示化済み
- admin 各種情報画面の部署一覧テーブルの各行トグルは、2026-04-20 時点で `+ / -` 表示ではなくシェブロン型の一般的な開閉ボタンに変更済み

## Known Gaps

- ブラウザで `/missions` の手動確認は未実施
- ブラウザでミッション新規設定ダイアログ上部の浮動ラベル間隔が十分かは未確認
- ブラウザで admin 各種情報画面の理念体系 textarea が 3 行初期表示かつ縦リサイズできることは未確認
- ブラウザで admin 各種情報画面の選択中タブ色が十分に識別しやすいかは未確認
- ブラウザで admin 各種情報画面のミッション項目一覧テーブルが、`項目名` 以外左右中央揃えで崩れず表示されることは未確認
- admin の `.env.local` から `OPERATOR_COGNITO_*` を外した状態で、各種情報更新 API が実際に成功するかの実環境確認は未実施
- admin 各種情報画面の「メインカラー」は保存専用で、反映先 UI / 業務ロジックは未実装
- admin 各種情報画面から非表示にした `contactName` / `contactEmail` / `contactPhone` / `billingEmail` / `logoImageUrl` / `primaryColor` を、将来的にデータ構造からも外すかは未判断
- ブラウザで employee ダッシュボードのミッション報告ダイアログを開き、placeholder / helpText / textarea / select がリロードなしで最新設定を反映することは未確認
- ブラウザで employee ダッシュボードの「ミッション一覧を見る」押下後に実ミッション一覧ダイアログが表示されることは未確認
- ブラウザで admin / operator の従業員登録・編集ダイアログを開き、部署 autocomplete の `key` prop console error が消えたことは未確認
- 旧実装で自動生成済みのミッションデータはそのまま残る。今回の修正では削除・移行していない
- 新規企業作成後に AWS 実環境で Mission テーブルへレコードが増えないことは未確認

## Carry-over Context

- `apps/employee` のプロフィール編集モーダルとダッシュボード理念表示改修は前タスクで導入済みだが、今回の作業では再確認していない
- `apps/operator` の企業編集 / 理念設定フローも前タスクのまま。ブラウザ確認の残件は継続
- 2026-04-20 に `packages/types/src/db/mission.ts`, `apps/operator/src/features/mission-management/ui/FieldBuilder.tsx`, `apps/employee/src/features/mission-report/api/server.ts`, `packages/features/individual-analysis/src/recent-reports/api/server.ts` を確認
- 2026-04-20 に `apps/employee/src/features/mission-report/ui/MissionReportDialog.tsx`, `apps/employee/src/features/mission-report/ui/MissionReportCards.tsx`, `apps/operator/src/features/mission-management/ui/MissionCard.tsx` も確認
- 2026-04-20 に `apps/employee/src/features/mission-report/model/types.ts`, `apps/employee/src/app/api/mission-form-config/route.ts` を確認
- 2026-04-20 に `MissionField.key` 自動入力の可否を確認
  - current save path: `apps/employee/src/features/mission-report/api/server.ts`, `packages/features/individual-analysis/src/recent-reports/api/server.ts`
  - related helper: `apps/employee/src/app/api/mission-form-config/route.ts#createFieldId`
- 2026-04-20 に `apps/operator/src/features/mission-management/ui/FieldBuilder.tsx` を更新
- 2026-04-20 に `apps/employee/src/features/mission-report/model/types.ts`, `apps/employee/src/features/mission-report/api/server.ts`, `apps/employee/src/app/api/mission-form-config/route.ts`, `apps/employee/src/features/mission-report/ui/MissionReportDialog.tsx` を更新
- 2026-04-20 に `helpText` の表示位置を確認
- 2026-04-20 に employee ダッシュボードのミッション報告ダイアログが open 時に最新フォーム設定を再取得するよう更新
- 2026-04-20 に `apps/admin/src/features/info/ui/AdminInfo.tsx` のミッション項目一覧テーブルを確認し、`項目名` 以外の列を中央揃えに調整
- 2026-04-20 に company management shared module 切り出しを実施し、admin から operator app への直接 import を除去
- 2026-04-20 に `packages/ui/src/department-autocomplete-field.tsx` を確認し、MUI `Autocomplete` の `renderOption` で `key` を spread しないよう修正
- 2026-04-21 に Git 差分全体を確認し、1 コミット用の推奨メッセージを整理
