# UI（shadcn）ガイド

共通の shadcn コンポーネントは **`packages/ui`** に集約し、各アプリ（`apps/employee`, `apps/admin`）から利用します。  
**shadcn のコマンドは必ず `packages/ui` で実行**してください（`-w` は使いません）。
例：`cd packages/ui && npx shadcn@latest button`
**:warning: `各プロジェクトの npm パッケージはルートディレクトリで -w オプションをつけてインストールしますが、shadcn では packages/uiに移動して -w を使わずにインストールします。 `**

---
