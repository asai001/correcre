import { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate dev and build artifacts so `next build` does not clobber a running `next dev`.
  distDir: process.env.NODE_ENV === "development" ? ".next" : ".next-build",
  typedRoutes: true,
  transpilePackages: ["@correcre/validation", "@correcre/types", "@correcre/adapters", "@correcre/theme", "@correcre/lib"],
  experimental: {
    // apps/employee の外にある TS を読むため
    externalDir: true,
  },
};
export default nextConfig;
