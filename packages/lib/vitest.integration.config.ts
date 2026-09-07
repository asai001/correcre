import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// packages/lib の統合テスト設定（DynamoDB Local が必要）。
// - 4 アプリが同じテーブルを別々の役割で読み書きする「横断フロー」を、lib の関数を実際の
//   DynamoDB API に対して呼ぶことで検証する。
// - テーブルは CDK スタック (infra/lib) を合成した結果から生成するため、infra 側のキー設計や
//   GSI 名と lib 側の実装がズレていればここで落ちる。
// - 接続先は DDB_ENDPOINT（既定: http://127.0.0.1:8000）。Docker なら
//   `docker compose -f docker-compose.test.yml up -d` で起動できる。
const endpoint = process.env.DDB_ENDPOINT?.trim() || "http://127.0.0.1:8000";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/integration/**/*.test.ts"],
    globalSetup: ["./test/integration/setup/global-setup.ts"],
    env: {
      DDB_ENDPOINT: endpoint,
    },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
