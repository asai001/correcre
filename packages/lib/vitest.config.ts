import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// packages/lib のユニットテスト設定。
// - "server-only" は Next.js の実行時にしか意味を持たないため、テストでは空モジュールに差し替える。
// - テスト対象は純粋ロジック（ポイント計算・請求・翌月反映・ステータス遷移・日付整形）に限定し、
//   DynamoDB / S3 / SES へ実際にアクセスするコードはここでは対象外とする。
export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
