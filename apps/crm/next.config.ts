import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.resolve(__dirname, "../..");

/** One physical module per `@latch/*` package — avoids duplicate audit singletons in route bundles. */
const latchPackageAlias = (name: string): [string, string] => [
  `@latch/${name}`,
  path.join(repoRoot, `packages/${name}/src/index.ts`),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@latch/contracts",
    "@latch/policy",
    "@latch/dal",
    "@latch/audit",
  ],
  experimental: {
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(
        ["contracts", "policy", "dal", "audit", "approval"].map(latchPackageAlias),
      ),
    };
    return config;
  },
};

export default nextConfig;
