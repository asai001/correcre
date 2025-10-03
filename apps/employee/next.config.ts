import { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@correcre/validation", "@correcre/types", "@correcre/adapters", "@correcre/theme"],
  experimental: {
    // apps/employee の外にある TS を読むため
    externalDir: true,
  },
};
export default nextConfig;
