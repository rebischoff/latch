# 03 — App shell scaffold

> **Status:** Complete (2026-06-03). Next: [04-better-auth.md](./04-better-auth.md).
>
> **Planning locked (2026-06-03):** Implement together with [02-monorepo-entry.md](./02-monorepo-entry.md) in one pass.

## Goal

Minimal Next.js 16 App Router shell: Ant Design chrome, public login route, protected `(app)` group, empty nav — **no Surfaces yet**.

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete.
- Normally follows **02**; when combined, deliver **02 + 03** verify gates together.

## Files

| File | Action |
|------|--------|
| `apps/test1/src/app/layout.tsx` | **Create** — root layout, Ant Design `ConfigProvider` |
| `apps/test1/src/app/(app)/layout.tsx` | **Create** — `AppShell` + placeholder nav `[]` |
| `apps/test1/src/app/(app)/page.tsx` | **Create** — redirect to first route or welcome stub |
| `apps/test1/src/app/login/page.tsx` | **Create** — placeholder (wired in task 04) |
| `apps/test1/src/components/AppShell.tsx` | **Create** — mirror CRM header/sider/content |
| `apps/test1/src/lib/nav.ts` | **Create** — `resolveNavItems` + empty `NAV_CATALOG` |
| `apps/test1/src/lib/latch.ts` | **Create** — stub `resolveContext` throwing "not wired" |

## Steps

1. Copy layout structure from [`apps/crm/src/components/AppShell.tsx`](../../../crm/src/components/AppShell.tsx) and [`apps/crm/src/app/layout.tsx`](../../../crm/src/app/layout.tsx) — simplify, no CRM routes.
2. Use session gate placeholder in `(app)/layout` (hard redirect to `/login` until task 04, or temporary no-op for build).
3. Header title: "test1 (Latch learn)" per [../LAYOUT.md](../LAYOUT.md).
4. Confirm **no Tailwind** in dependencies or config.
5. `npm run build` in `apps/test1` succeeds (Turbopack default per [../decisions.md](../decisions.md)).

## Verify (stop gate)

- [x] `npm run dev:test1` — login page and empty shell render
- [x] Ant Design Layout visible; sider menu empty
- [x] No `db.*` imports outside future DAL paths
- [x] [../STATUS.md](../STATUS.md) → **04-better-auth.md**

## Out of scope

- Better Auth session (task **04**)
- `getPrincipal` DB roles (task **04**–**05**)
- Business pages
- Filling `apps/test1/.env.local` (optional until **04**/**05**)
