import { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@correcre/validation", "@correcre/types", "@correcre/adapters"],
};
export default nextConfig;
