import path from "node:path";

import { NextConfig } from "next";

import { assertRequiredEnvForDeploy } from "../../packages/lib/src/env/required-env";

// 本番ビルドで必須の環境変数が欠けていたらビルドを失敗させる（稼働中の本番を壊さずに設定漏れに気づくため）
assertRequiredEnvForDeploy("merchant");

const isLocalProductionBuild =
  process.env.NODE_ENV !== "development" && !process.env.CI && !process.env.VERCEL;

const nextConfig: NextConfig = {
  // Keep local `next build` output separate, but use the standard `.next` directory in CI/Vercel.
  distDir: isLocalProductionBuild ? ".next-build" : ".next",
  typedRoutes: true,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@merchant": path.join(process.cwd(), "src"),
    };

    return config;
  },
  transpilePackages: [
    "@correcre/validation",
    "@correcre/types",
    "@correcre/adapters",
    "@correcre/ui",
    "@correcre/theme",
    "@correcre/lib",
    "@correcre/merchandise-public",
  ],
};
export default nextConfig;
