import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const betterAuthNextJs = join(
  appRoot,
  "node_modules/better-auth/dist/integrations/next-js.mjs",
);

const latchPackages = [
  "@latch/adapter-better-auth",
  "@latch/adapter-neon",
  "@latch/adapter-pg-audit",
  "@latch/app-kit",
  "@latch/approval",
  "@latch/audit",
  "@latch/contracts",
  "@latch/dal",
  "@latch/pg-session",
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
    config.resolve.alias = {
      ...config.resolve.alias,
      "better-auth/next-js": betterAuthNextJs,
    };
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mjs"],
    };
    return config;
  },
};

export default nextConfig;
