import { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@correcre/validation", "@correcre/types", "@correcre/adapters", "@correcre/theme", "@correcre/lib"],
};
export default nextConfig;
