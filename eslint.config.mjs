import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const webFiles = ["apps/web/**/*.{js,jsx,ts,tsx,mjs,cjs}"];

function scopeToWeb(configs) {
  return configs.map((config) => {
    if (config.ignores) {
      return config;
    }

    return {
      ...config,
      files: config.files ?? webFiles,
      settings: {
        ...config.settings,
        next: {
          ...config.settings?.next,
          rootDir: "apps/web/",
        },
      },
    };
  });
}

const eslintConfig = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/next-env.d.ts",
  ]),
  ...scopeToWeb(nextVitals),
  ...scopeToWeb(nextTs),
  {
    files: ["packages/contracts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@latch/*"],
              message: "@latch/contracts must not import other @latch/* packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/react/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@latch/policy",
              message: "@latch/react must not import server-only packages.",
            },
            {
              name: "@latch/dal",
              message: "@latch/react must not import server-only packages.",
            },
            {
              name: "@latch/audit",
              message: "@latch/react must not import server-only packages.",
            },
            {
              name: "@latch/approval",
              message: "@latch/react must not import server-only packages.",
            },
            {
              name: "@latch/codegen",
              message: "@latch/react must not import server-only packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/policy/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@latch/dal", message: "@latch/policy must not import @latch/dal." },
            { name: "@latch/react", message: "@latch/policy must not import @latch/react." },
            { name: "@latch/audit", message: "@latch/policy must not import @latch/audit." },
            { name: "@latch/approval", message: "@latch/policy must not import @latch/approval." },
            { name: "@latch/codegen", message: "@latch/policy must not import @latch/codegen." },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/dal/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@latch/react", message: "@latch/dal must not import @latch/react." },
            { name: "@latch/codegen", message: "@latch/dal must not import @latch/codegen." },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/audit/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@latch/react", message: "@latch/audit must not import @latch/react." },
            { name: "@latch/dal", message: "@latch/audit must not import @latch/dal." },
            { name: "@latch/approval", message: "@latch/audit must not import @latch/approval." },
            { name: "@latch/codegen", message: "@latch/audit must not import @latch/codegen." },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/approval/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@latch/react", message: "@latch/approval must not import @latch/react." },
            { name: "@latch/dal", message: "@latch/approval must not import @latch/dal." },
            { name: "@latch/codegen", message: "@latch/approval must not import @latch/codegen." },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/codegen/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@latch/react", message: "@latch/codegen must not import @latch/react." },
            { name: "@latch/dal", message: "@latch/codegen must not import @latch/dal." },
            { name: "@latch/policy", message: "@latch/codegen must not import @latch/policy." },
            { name: "@latch/audit", message: "@latch/codegen must not import @latch/audit." },
            { name: "@latch/approval", message: "@latch/codegen must not import @latch/approval." },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
