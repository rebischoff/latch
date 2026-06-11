import type { NextConfig } from "next";

const latchPackages = [
  "@latch/audit",
  "@latch/contracts",
  "@latch/dal",
  "@latch/policy",
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: latchPackages,
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
