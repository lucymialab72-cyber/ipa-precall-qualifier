import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ipa-precall-qualifier",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
