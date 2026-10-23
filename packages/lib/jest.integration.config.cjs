// packages/lib の統合テスト設定（DynamoDB Local が必要）。
// - 4 アプリが同じテーブルを別々の役割で読み書きする「横断フロー」を、lib の関数を実際の
//   DynamoDB API に対して呼ぶことで検証する。
// - テーブルは CDK スタック (infra/lib) を合成した結果から生成するため、infra 側のキー設計や
//   GSI 名と lib 側の実装がズレていればここで落ちる。
// - 接続先は DDB_ENDPOINT（既定: http://127.0.0.1:8000）。`npm run ddb:local` で起動できる。
// 実行: npm run test:integration （ユニットテストの `npm test` には含まれない）
// Node を --experimental-vm-modules 付きで起動している理由: AWS SDK の @smithy/node-http-handler が
// http:// エンドポイントに対して `import('node:http')` を動的に呼ぶため、Jest の既定 VM では失敗する。
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test/integration"],
  testMatch: ["**/*.test.ts"],
  setupFiles: ["<rootDir>/test/integration/setup/env.ts"],
  globalSetup: "<rootDir>/test/integration/setup/global-setup.ts",
  testTimeout: 30_000,
  transform: {
    "^.+\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          types: ["node", "jest"],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@correcre/types$": "<rootDir>/../types/src/index.ts",
    // "server-only" は Next.js の実行時にしか意味を持たないため、テストでは空モジュールに差し替える。
    "^server-only$": "<rootDir>/test/stubs/server-only.ts",
  },
};
