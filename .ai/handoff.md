# handoff.md

## What changed

- 運用者ミッション管理の前提を「企業登録時自動生成」から「運用者による手動設定」に変更
- `apps/operator/src/features/mission-management/api/server.ts`
  - 一覧 API でスロット 1〜5 を常時返すように変更
  - `PUT /api/missions/:slotIndex` で未設定スロットの初回作成を追加
  - `createDefaultMissionsForCompany` を削除
- `apps/operator/src/features/mission-management/ui/`
  - 未設定スロットカードを追加
  - 自動生成前提の空文言を削除
  - 新規設定時のダイアログ文言に対応
  - `FieldBuilder` で key を `field_001` 形式に自動採番し、読み取り専用表示に変更
- `apps/operator/src/features/mission-management/ui/MissionEditDialog.tsx`
  - 上部フォームのタイトル / 説明 / カテゴリ / 月間実施回数 / スコアを浮動ラベルへ戻し、各フィールドに上余白とラベル背景を追加
- `apps/operator/src/features/user-registration/api/server.ts`
  - `createCompanyInDynamo` からミッション自動生成処理を削除
- `apps/employee/src/features/mission-report/model/types.ts`
  - `FieldConfig` に `helpText` を追加
- `apps/employee/src/features/mission-report/api/server.ts`
  - `MissionField` の `placeholder` / `helpText` / textarea rows を employee 側へ引き渡すように変更
- `apps/employee/src/app/api/mission-form-config/route.ts`
  - form config に `helpText` を追加
- `apps/employee/src/features/mission-report/ui/MissionReportDialog.tsx`
  - `placeholder` と `helperText` を `TextField` に表示
  - `textarea` / `select` を明示的に描画
  - ダイアログ open 時に `/api/mission-form-config` を再取得して最新フォーム設定を反映
- `apps/employee/src/features/mission-report/ui/MissionReportView.tsx`
  - ミッション一覧ダイアログの open state を保持し、`MissionListDialog` に実ミッション配列を渡すように変更
- `apps/employee/src/features/mission-report/ui/MissionListDialog.tsx`
  - `@correcre/ui` の Radix ダイアログから MUI `Dialog` に切り替え
  - 実ミッションのタイトル / カテゴリ / スコア / 月間実施回数 / 説明 / 報告項目を一覧表示
- `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx`
  - 理念体系の本文 textarea を 3 行初期表示に変更
  - `resize: vertical` を付与し、右下ドラッグで縦方向にリサイズ可能に変更
- `apps/admin/src/features/info/ui/AdminInfo.tsx`
  - 各種情報画面の選択中タブがシアン背景 + 白文字で判別できるよう active スタイルを追加
  - ミッション項目一覧テーブルで `項目名` 以外の列を左右中央揃えに調整
- `apps/admin/src/app/api/company-info/route.ts`
  - `updateCompanyInDynamo()` を `@operator/features/user-registration/api/server` から再利用していることを確認
- `apps/operator/src/features/user-registration/api/server.ts`
  - `updateCompanyInDynamo()` が `getRuntimeConfig()` を呼び、その中で `getOperatorCognitoConfig()` を通じて `OPERATOR_COGNITO_*` を要求することを確認
- `apps/admin/.env.example`
  - `ADMIN_COGNITO_*` はあるが `OPERATOR_COGNITO_*` は未記載であることを確認
- `packages/lib/src/company-management-types.ts`
  - 会社管理の shared type (`CompanySummary`, `CreateCompanyInput`, `UpdateCompanyInput` など) を追加
- `packages/lib/src/company-management-form.ts`
  - 会社フォーム helper を shared module 化
- `packages/lib/src/company-management-server.ts`
  - 会社一覧 / 作成 / 更新 / summary 変換を Cognito 非依存の shared server module として追加
  - `AWS_REGION` と `DDB_COMPANY_TABLE_NAME` だけを読み、`OPERATOR_COGNITO_*` を参照しない
- `packages/ui/src/components/company-philosophy-fields.tsx`
  - 理念体系 UI を shared component 化
- `packages/ui/src/department-autocomplete-field.tsx`
  - MUI `Autocomplete` の `renderOption` で `props.key` を spread せず、`<li key={key} {...optionProps}>` に分離して Next.js console error を回避
- 2026-04-21 に `git status --short` / `git diff --stat` を確認
  - 差分は admin / employee / operator / packages / infra 横断
  - 1 コミットでまとめる場合の推奨メッセージは `feat: reorganize company management and mission flows across apps`
- `apps/admin/src/app/api/company-info/route.ts`
  - `updateCompanyInDynamo()` を shared company management server module 参照へ切り替え
- `apps/admin/src/features/info/api/server.ts`
  - `toCompanySummary()` を shared company management server module から利用する形に変更
- `apps/admin/src/features/info/ui/AdminInfo.tsx`
  - company form helper と `CompanyPhilosophyFields` を shared module 参照へ切り替え
- `apps/operator/src/app/api/companies/route.ts`
  - 会社 CRUD の参照先を shared company management server module へ切り替え
- `apps/operator/src/app/company-registration/page.tsx`
  - 会社一覧の参照先を shared company management server module へ切り替え
- `apps/operator/src/app/user-registration/page.tsx`
  - 会社一覧の参照先を shared company management server module へ切り替え
- `apps/operator/src/app/missions/page.tsx`
  - 会社一覧の参照先を shared company management server module へ切り替え
- `apps/operator/src/app/dashboard/page.tsx`
  - 会社一覧の参照先を shared company management server module へ切り替え
- `apps/operator/src/features/company-registration/model/types.ts`
  - shared company type の re-export に変更
- `apps/operator/src/features/company-registration/ui/company-form.ts`
  - shared form helper の re-export に変更
- `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx`
  - shared `CompanyPhilosophyFields` component の re-export に変更
- `apps/operator/src/features/user-registration/api/server.ts`
  - 会社 CRUD / summary 変換 / 理念体系正規化ロジックを削除し、employee 管理用ロジックに専念する形へ整理
- `.ai/current-status.md`, `.ai/next-actions.md`, `.ai/handoff.md`, `.ai/decisions.md` を更新
- 2026-04-20 にミッション新規設定の `key` / `label` の意味を確認
  - `key`: `fieldValues[key]` に保存される内部キー
  - `label`: 従業員画面・分析表示に出る表示名
- 2026-04-20 に `title / description / category / label` の役割差も確認
  - `title`: ミッション名
  - `description`: ミッションの説明文
  - `category`: ミッションの分類タグ
  - `label`: 報告フォーム内の各入力項目名
- 2026-04-20 に `label / placeholder / helpText` の現状も確認
  - `label`: 入力欄の項目名として使われる
  - `placeholder`: employee API / 型 / 報告ダイアログまで接続済み
  - `helpText`: operator 設定 UI から employee 側の型・表示まで接続済み
- 2026-04-20 時点の `helpText` 表示位置
  - operator のミッション設定画面で入力
  - employee API で `field.helpText` に変換
  - `MissionReportDialog` の `TextField helperText` として入力欄の下に表示
- `key` の日本語許可は現状未対応
  - `apps/operator/src/features/mission-management/api/server.ts` で `/^[a-zA-Z0-9_]+$/` 制約
  - 技術的に変更は可能だが、`key` は保存・参照用の内部識別子なので安定した ASCII のままが安全
- 2026-04-20 に `key` 自動入力の可否も確認
  - 実装は可能
  - ただし `fieldValues[key]` 保存と分析参照に使うので、ラベル変更に合わせて key を再生成する方式は避けるべき
  - 方針どおり、フィールド追加時に `field_001` 形式の安定IDを初回だけ発行して固定する実装に変更済み
- 2026-04-20 に admin 各種情報画面の `メインカラー` (`primaryColor`) 利用状況を確認
  - 参照箇所は `apps/admin/src/features/info/ui/AdminInfo.tsx`、`apps/admin/src/app/api/company-info/route.ts`、`packages/types/src/db/company.ts`、`apps/admin/src/features/info/model/types.ts` のみ
  - 現状はフォーム入力と company レコード保存までで、UI テーマや表示色へ適用する実装はない
- 2026-04-20 に admin 各種情報画面の会社情報タブ UI を調整
  - `ステータス` と `プラン` は常時 disabled に変更
  - `担当者名` / `担当者メールアドレス` / `担当者電話番号` / `請求先メールアドレス` / `ロゴ URL` / `メインカラー` の入力欄を削除
  - 既存値を保存時に消さないよう、state / payload には残したまま表示のみ外している
- 2026-04-20 に admin 各種情報画面の部署一覧トグル UI を調整
  - `+ / -` 表示をやめ、右向きシェブロンが展開時に回転する一般的な開閉ボタンへ変更

## Verification run

- `npx tsc --noEmit -p apps/operator/tsconfig.json` — OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 再確認 OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 ミッション設定ダイアログ余白調整後も OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 浮動ラベル復帰後も OK
- `npx tsc --noEmit -p apps/employee/tsconfig.json` — 2026-04-20 OK
- `npx tsc --noEmit -p apps/employee/tsconfig.json` — 2026-04-20 ミッション一覧ダイアログ修正後も OK
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 admin 各種情報画面 UI 修正後も OK
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 ミッション項目一覧の中央揃え調整後も OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 理念体系 textarea 修正後も OK
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 company management shared module 切り出し後も OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 company management shared module 切り出し後も OK
- `npx tsc --noEmit -p apps/admin/tsconfig.json` — 2026-04-20 部署 autocomplete の `key` 修正後も OK
- `npx tsc --noEmit -p apps/operator/tsconfig.json` — 2026-04-20 部署 autocomplete の `key` 修正後も OK

## Unverified

- ブラウザでの `/missions` 手動確認
- ブラウザでミッション新規設定ダイアログ上部の浮動ラベル間隔確認
- ブラウザで admin 各種情報画面の理念体系 textarea が 3 行初期表示かつ縦リサイズできるかの確認
- ブラウザで admin 各種情報画面の選択中タブ色の視認性確認
- ブラウザで admin 各種情報画面のミッション項目一覧テーブルが、`項目名` 以外左右中央揃えで崩れず表示されるかの確認
- admin の `.env.local` から `OPERATOR_COGNITO_*` を外した状態で、各種情報更新 API が実際に成功するかの確認
- admin 各種情報画面から外した `contactName` / `contactEmail` / `contactPhone` / `billingEmail` / `logoImageUrl` / `primaryColor` を、データ構造として残すかどうかの判断
- admin 各種情報画面の部署一覧トグルの視認性がブラウザ上で十分かの確認
- ブラウザで employee ダッシュボードの「ミッション一覧を見る」押下後のダイアログ表示確認
- ブラウザで employee ミッション報告ダイアログの placeholder / helpText / textarea / select 表示確認
- operator 側でミッション設定を更新したあと、employee ダッシュボードでリロードなしに最新設定が反映されることの確認
- ブラウザで admin / operator の従業員登録・編集ダイアログを開き、部署 autocomplete の `key` prop console error が消えたことの確認
- 新規企業登録後に Mission / MissionHistory レコードが自動作成されないことの実環境確認
- 旧自動生成データの扱い

## Next

- 未設定企業で `/missions` を開き、5 スロットの新規設定導線を確認
- 1 スロット登録後に履歴表示と再編集で version が増えることを確認
- admin 各種情報画面のミッション項目一覧テーブルが、`項目名` 以外左右中央揃えで崩れず表示されることを確認
- employee ダッシュボードでミッション報告ダイアログを開き直したとき、最新フォーム設定が反映されることを確認
- admin / operator の従業員登録・編集ダイアログで部署 autocomplete を開き、`key` prop の console error が出ないことを確認
- 1 コミットで push するなら staged diff を最終確認し、包括的な umbrella message でコミットする
- admin の `.env.local` から `OPERATOR_COGNITO_*` を外し、各種情報更新 API が `ADMIN_COGNITO_*` のみで完結することを確認
- admin 各種情報画面から外した項目群を API / 型 / DB まで整理するか判断
- 必要なら旧自動生成ミッションの棚卸しと整理方針を決める

## Notes

- 既存データの削除や移行は今回実施していない
- dirty worktree なので、他 app / infra の既存差分には触れていない
- employee ダッシュボードは初期読込時のミッション設定を保持していたため、operator 側更新直後はリロードしないと古い設定が残るケースがあった。`MissionReportDialog` で open 時に最新 form config を再取得するよう修正済み

## Carry-over Context

- 前タスクで入った `apps/operator` の企業編集 / 理念設定フロー、`apps/employee` のプロフィール編集 / 理念表示フローは未再検証
- employee のメール更新が Cognito 属性まで同期されるかどうかは今回も未対応

## Scope

- `apps/admin/.env.example`
- `apps/admin/src/app/api/company-info/route.ts`
- `apps/admin/src/lib/auth/config.ts`
- `apps/operator/src/features/user-registration/api/server.ts`
- `apps/operator/src/lib/auth/config.ts`
- `apps/admin/src/features/info/ui/AdminInfo.tsx`
- `apps/operator/src/features/company-registration/ui/CompanyPhilosophyFields.tsx`
- `apps/operator/src/features/mission-management`
- `apps/operator/src/features/user-registration/api/server.ts`
- `apps/employee/src/features/mission-report`
- `apps/employee/src/app/api/mission-form-config/route.ts`
- `packages/ui/src/department-autocomplete-field.tsx`
- `.ai/*`
