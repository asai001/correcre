import path from "node:path";

import { NextConfig } from "next";

const isLocalProductionBuild =
  process.env.NODE_ENV !== "development" && !process.env.CI && !process.env.VERCEL;

const nextConfig: NextConfig = {
  // Keep local `next build` output separate, but use the standard `.next` directory in CI/Vercel.
  distDir: isLocalProductionBuild ? ".next-build" : ".next",
  typedRoutes: true,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@admin": path.join(process.cwd(), "src"),
      "@employee": path.join(process.cwd(), "..", "employee", "src"),
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
    externalDir: true,
  },
};
export default nextConfig;
