# 02 — UI dependencies

> **Status:** Complete (2026-06-12). Next: [03-app-shell-layout.md](./03-app-shell-layout.md).

## Goal

Add Ant Design, React Hook Form, TanStack Query, and SSR registry dependencies to `@latch/subhub`.

## Prerequisites

[00-decisions.md](./00-decisions.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/subhub/package.json` | Add dependencies |
| `apps/subhub/app/layout.tsx` | Wrap with `AntdRegistry` |
| `apps/subhub/app/providers.tsx` | **Create** — `QueryClientProvider` (client) |

## Steps

1. Add dependencies (align with monorepo lockfile versions where present):
   - `antd`, `@ant-design/icons`, `@ant-design/nextjs-registry`
   - `react-hook-form`, `@hookform/resolvers`
   - `@tanstack/react-query`
2. Root `layout.tsx`: import `AntdRegistry` from `@ant-design/nextjs-registry`.
3. Create client `providers.tsx` with `QueryClientProvider`; mount from `(app)/layout.tsx` (not public home if avoiding client bundle there).
4. `npm install` at repo root.

## Verify (stop gate)

- [x] `npm run build -w @latch/subhub` succeeds
- [x] Dev server starts on port 3003
- [x] No hydration warnings from Ant Design on home page
- [x] [`../../STATUS.md`](../../STATUS.md) → [03-app-shell-layout.md](./03-app-shell-layout.md)

## Out of scope

- Shell layout, forms, API routes

## Reference

- [routing-and-libraries.md](../routing-and-libraries.md)
