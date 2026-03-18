import { NextConfig } from "next";

const isLocalProductionBuild =
  process.env.NODE_ENV !== "development" && !process.env.CI && !process.env.VERCEL;

const nextConfig: NextConfig = {
  // Keep local `next build` output separate, but use the standard `.next` directory in CI/Vercel.
  distDir: isLocalProductionBuild ? ".next-build" : ".next",
  typedRoutes: true,
  transpilePackages: ["@correcre/validation", "@correcre/types", "@correcre/adapters", "@correcre/theme", "@correcre/lib"],
  experimental: {
    // apps/employee の外にある TS を読むため
    externalDir: true,
  },
};
export default nextConfig;
