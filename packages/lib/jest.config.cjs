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
          types: ["node", "jest"],
          allowJs: true,
        },
      },
    ],
  },
  // jose は ESM 専用パッケージ。CommonJS で動く Jest から読めるよう ts-jest の変換対象に含める。
  transformIgnorePatterns: ["[\\\\/]node_modules[\\\\/](?!jose[\\\\/])"],
  moduleNameMapper: {
    "^@correcre/types$": "<rootDir>/../types/src/index.ts",
    // "server-only" は Next.js の実行時にしか意味を持たないため、テストでは空モジュールに差し替える。
    "^server-only$": "<rootDir>/test/stubs/server-only.ts",
  },
};
