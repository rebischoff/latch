import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const tsFiles = [
  "packages/**/*.{ts,tsx}",
  "fixtures/**/*.{ts,tsx}",
  "*.{ts,mjs}",
  "scripts/**/*.{ts,mjs}",
];

const extensionlessImportGuard = {
  patterns: [
    {
      group: ["./*.js", "./**/*.js", "../*.js", "../**/*.js"],
      message:
        "Relative imports must be extensionless (bundler monorepo convention).",
    },
    {
      group: ["./*.mjs", "./**/*.mjs", "../*.mjs", "../**/*.mjs"],
      message:
        "Relative imports must be extensionless (bundler monorepo convention).",
    },
  ],
};

const eslintConfig = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/next-env.d.ts",
    "**/generated/**",
    "tests/**",
  ]),
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: config.files ?? tsFiles,
  })),
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
    files: ["packages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["apps/*", "**/apps/*"],
              message: "packages/** must not import apps/**.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/**/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", extensionlessImportGuard],
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
