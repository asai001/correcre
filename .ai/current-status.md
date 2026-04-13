# current-status.md

## Objective

- 今回の作業目的:
  - `apps/operator` のユーザー管理一覧で編集ボタンを廃止し、データ行クリックで編集モーダルを開く
  - ユーザー登録 / 編集モーダルの所属部署で既存部署の選択と未登録部署の新規入力を両立する
  - 保存 / 更新時に未登録の部署名を DynamoDB に登録し、その部署をユーザー情報へ反映する
- 完了条件:
  - ユーザー一覧の行クリックで編集モーダルが開く
  - 削除ボタン押下時に行クリック編集が誤発火しない
  - 所属部署で自由入力した名称が保存 / 更新時に DB 登録される
  - `apps/operator` の lint と TypeScript チェックが通る

---

## Scope

- 対象:
  - `apps/operator`
- 対象ファイル:
  - `apps/operator/src/components/Table.tsx`
  - `apps/operator/src/features/user-registration/api/server.ts`
  - `apps/operator/src/features/user-registration/ui/DepartmentAutocompleteField.tsx`
  - `apps/operator/src/features/user-registration/ui/EmployeeManagement.tsx`
  - `apps/operator/src/features/user-registration/ui/EmployeeRegistrationDialog.tsx`
  - `apps/operator/src/features/user-registration/ui/EmployeeEditDialog.tsx`

---

## Confirmed

- `apps/operator/src/components/Table.tsx` に行クリック・キーボード操作用の `onRowClick` / `getRowKey` / `getRowAriaLabel` を追加した
- `apps/operator/src/features/user-registration/ui/EmployeeManagement.tsx` で編集アイコンを削除し、行クリックで編集モーダルを開く構成へ変更した
- 同一覧の削除ボタンには `stopPropagation()` を入れ、クリック時とキーボード操作時に編集モーダルが誤発火しないようにした
- `apps/operator/src/features/user-registration/ui/DepartmentAutocompleteField.tsx` を追加し、所属部署で既存部署候補の選択と新規部署名の自由入力を両立した
- `apps/operator/src/features/user-registration/ui/EmployeeRegistrationDialog.tsx` / `EmployeeEditDialog.tsx` の所属部署入力を上記コンポーネントへ差し替えた
- `apps/operator/src/features/user-registration/api/server.ts` では、ユーザー登録 / 更新時に部署が未登録なら新規作成してから user レコードへ反映するようにした
- `createDepartmentInDynamo` も共通の部署レコード生成ロジックを使うように揃えた
- `npm run lint --workspace @correcre/operator -- "src/components/Table.tsx" "src/features/user-registration/api/server.ts" "src/features/user-registration/ui/DepartmentAutocompleteField.tsx" "src/features/user-registration/ui/EmployeeManagement.tsx" "src/features/user-registration/ui/EmployeeRegistrationDialog.tsx" "src/features/user-registration/ui/EmployeeEditDialog.tsx"` が通過した
- `npx tsc --noEmit -p apps/operator/tsconfig.json` が通過した

---

## Blockers

- 実ブラウザでの操作確認は未実施
- 実 DB を使った新規部署追加フローの手動確認は未実施
