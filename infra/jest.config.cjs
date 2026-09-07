// CDK スタックの合成テンプレートに対する回帰テスト (test/infra.test.ts) を TypeScript のまま実行する。
// ts-jest は devDependencies に入っているが preset 指定が無く、`npm test` が構文エラーで落ちていた。
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
};
