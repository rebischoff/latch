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
};

export default nextConfig;
