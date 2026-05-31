import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@latch/contracts",
    "@latch/react",
    "@latch/policy",
    "@latch/dal",
    "@latch/audit",
    "@latch/approval",
  ],
  // Packages use Node16-style `.js` specifiers on `.ts` sources (see tsconfig `moduleResolution`).
  experimental: {
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
};

export default nextConfig;
