import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@latch/contracts",
    "@latch/policy",
    "@latch/dal",
    "@latch/audit",
    "@latch/react",
  ],
};

export default nextConfig;
