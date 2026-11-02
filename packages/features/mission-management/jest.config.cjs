// ミッション管理（運用者・管理者で共通）のユニットテスト。
// DynamoDB へ出る層は jest.mock で差し替え、検証・上限チェック・書き込み内容を確かめる。
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
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
    "^@correcre/lib$": "<rootDir>/../../lib/src/index.ts",
    "^@correcre/lib/(.*)$": "<rootDir>/../../lib/src/$1",
    "^@correcre/types$": "<rootDir>/../../types/src/index.ts",
    // "server-only" は Next.js の実行時にしか意味を持たないため、テストでは空モジュールに差し替える。
    "^server-only$": "<rootDir>/../../lib/test/stubs/server-only.ts",
  },
};
