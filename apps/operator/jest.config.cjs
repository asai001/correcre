// 運用者アプリの Route Handler / 認可ヘルパーのユニットテスト。
// - テストは src/**/__tests__/*.test.ts に置く（packages/lib と同じ規約）
// - DynamoDB・Cognito・SES などへ出る層は jest.mock で差し替え、
//   「誰が・何を・どのテナントに対して」呼び出すかを Route Handler の責務として検証する
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          types: ["node", "jest"],
          allowJs: true,
        },
      },
    ],
  },
  // jose は ESM 専用パッケージ。CommonJS で動く Jest から読めるよう ts-jest の変換対象に含める。
  transformIgnorePatterns: ["[\\\\/]node_modules[\\\\/](?!jose[\\\\/])"],
  moduleNameMapper: {
    "^@operator/(.*)$": "<rootDir>/src/$1",
    "^@correcre/lib$": "<rootDir>/../../packages/lib/src/index.ts",
    "^@correcre/lib/(.*)$": "<rootDir>/../../packages/lib/src/$1",
    "^@correcre/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^@correcre/individual-analysis$": "<rootDir>/../../packages/features/individual-analysis/src/index.ts",
    "^@correcre/individual-analysis/(.*)$": "<rootDir>/../../packages/features/individual-analysis/src/$1",
    "^@correcre/merchandise-public$": "<rootDir>/../../packages/features/merchandise-public/src/index.ts",
    // "server-only" は Next.js の実行時にしか意味を持たないため、テストでは空モジュールに差し替える。
    "^server-only$": "<rootDir>/../../packages/lib/test/stubs/server-only.ts",
  },
};
