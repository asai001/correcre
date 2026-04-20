# next-actions.md

## 直近の確認作業

1. 1 コミットで push する場合は staged diff を再確認し、`feat: reorganize company management and mission flows across apps` のような包括メッセージを使う
2. admin / operator の従業員登録・編集ダイアログで部署 autocomplete を開き、`key` prop の console error が出ないことを確認
3. ブラウザで `/missions` を確認し、未設定企業で 5 つの空スロットカードが表示されることを確認
4. ミッション新規設定ダイアログを開き、タイトル / 説明 / カテゴリ / 月間実施回数 / スコアの浮動ラベルが重ならず表示されることを確認
5. admin 各種情報画面の理念体系 textarea が 3 行初期表示で、右下ドラッグにより縦リサイズできることを確認
6. admin 各種情報画面の選択中タブが色付きで識別できることを確認
7. admin 各種情報画面のミッション項目一覧テーブルで、`項目名` 以外が左右中央揃えで表示崩れしないことを確認
8. admin の `.env.local` から `OPERATOR_COGNITO_*` を外した状態で各種情報更新 API を実行し、shared company management module 化で依存が解消したことを確認
9. employee ダッシュボードで「ミッション一覧を見る」を押し、実ミッション一覧ダイアログが表示されることを確認
10. 未設定スロットから 1 件新規登録し、同じスロットの履歴ダイアログに version 1 が表示されることを確認
11. 新規企業登録後に Mission / MissionHistory テーブルへ自動レコードが作成されないことを実環境で確認
12. employee ダッシュボードでミッション報告ダイアログを開き、placeholder / helpText / textarea / select がリロードなしでも最新設定で反映されることを確認
13. admin 各種情報画面から外した `contactName` / `contactEmail` / `contactPhone` / `billingEmail` / `logoImageUrl` / `primaryColor` を、API / 型 / DB からも整理するか判断
14. company management shared module を `packages/types` / `packages/features` へさらに分割する必要があるかは、今回の shared 化で十分かを見てから判断
15. admin 各種情報画面の部署一覧トグルがブラウザ上で一般的な開閉ボタンとして十分わかりやすいか確認

## 保留中の検討

16. 旧実装で自動生成されたミッションデータを残すか、別途クリーンアップするか判断
17. employee / admin 側で「ミッション未設定企業」の表示が運用上問題ないかブラウザで確認

## 前タスクからの持ち越し

18. operator 企業編集 / 理念設定フローのブラウザ確認
19. employee ダッシュボードのプロフィール編集 / 理念表示のブラウザ確認
20. ミッション設定 UI のヘルプ文言が必要なら、「キーは保存用ID / ラベルは表示名」と明記する
21. 必要なら `title / description / category / label` の違いも運用者 UI 上の補足文言に追加する
22. key を読み取り専用にした説明文が運用者に十分伝わるか `/missions` の編集ダイアログで確認する
