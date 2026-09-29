import path from "node:path";

import { NextConfig } from "next";

import { assertRequiredEnvForDeploy } from "../../packages/lib/src/env/required-env";

// 本番ビルドで必須の環境変数が欠けていたらビルドを失敗させる（稼働中の本番を壊さずに設定漏れに気づくため）
assertRequiredEnvForDeploy("employee");

const isLocalProductionBuild =
  process.env.NODE_ENV !== "development" && !process.env.CI && !process.env.VERCEL;

const nextConfig: NextConfig = {
  // Keep local `next build` output separate, but use the standard `.next` directory in CI/Vercel.
  distDir: isLocalProductionBuild ? ".next-build" : ".next",
  typedRoutes: true,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@admin": path.join(process.cwd(), "..", "admin", "src"),
      "@employee": path.join(process.cwd(), "src"),
      "@operator": path.join(process.cwd(), "..", "operator", "src"),
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
    "@correcre/individual-analysis",
    "@correcre/merchandise-public",
  ],
  experimental: {
    // apps/employee の外にある TS を読むため
    externalDir: true,
  },
};
export default nextConfig;
