# 02 — Monorepo entry

> **Status:** Complete (2026-06-03). Next: [04-better-auth.md](./04-better-auth.md) (task **03** done in same pass).
>
> **Planning locked (2026-06-03):** Execute **02 + 03 together**; codegen document-only; Turbopack default; add `apps/test1/.env.example` (not `.env.local`). See [../decisions.md](../decisions.md).

## Goal

Register `apps/test1` in the npm workspace so the app can be installed, linted, and run on port **3003** without touching CRM.

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete.
- [01-task-index.md](./01-task-index.md) read.

## Files

| File | Action |
|------|--------|
| `apps/test1/package.json` | **Create** — `@latch/test1`, Next 16, AntD, RHF, `@latch/*`, `better-auth` (exact version at install time) |
| Root `package.json` | **Edit** — ensure `apps/*` includes test1; add `"dev:test1": "npm -w apps/test1 run dev"` |
| `apps/test1/tsconfig.json` | **Create** — extend root/tsconfig pattern from CRM |
| `apps/test1/next.config.ts` | **Create** — minimal; Turbopack default (no `webpack()` block until DAL imports) |
| `apps/test1/eslint.config.mjs` | **Create** — extend root ESLint |
| `apps/test1/.env.example` | **Create** — template per [../CONFIG.md](../CONFIG.md) (no secrets) |
| `@latch/codegen` | **No change** — document-only; see [`../../crm/docs/CODEGEN.md`](../../crm/docs/CODEGEN.md) |

## Steps

1. Copy dependency **shape** from [`apps/crm/package.json`](../../../crm/package.json); replace `next-auth` with `better-auth`; set dev port **3003**; scripts `next dev` / `next build` **without** `--webpack` unless build fails without CRM-style aliases.
2. Add workspace script at repo root; verify `npm install` resolves `@latch/*` from workspace.
3. Add **`apps/test1/.env.example`** from [../CONFIG.md](../CONFIG.md); do **not** commit `.env.local`.
4. Implement [03-app-shell-scaffold.md](./03-app-shell-scaffold.md) in the same pass so `npm run build` / `dev:test1` verify cleanly.
5. Do **not** add Tailwind; do **not** change `@latch/codegen` (task **10** generalizes multi-app scan).

## Verify (stop gate)

- [x] `npm install` from repo root succeeds
- [x] `npm run dev:test1` starts and serves shell (with task **03** files)
- [x] `apps/test1/.env.example` committed; ESLint config present; no forbidden client imports of `@latch/dal`
- [x] [../STATUS.md](../STATUS.md) → **04-better-auth.md** (after **03** verify passes in same pass)

## Out of scope

- Better Auth wiring (task **04**)
- Surface YAML / codegen platform change (task **10**)
- Root `STATUS.md` update
- Populating `apps/test1/.env.local` (developer machine; optional until **04**/**05**)
