# 05 — Retire `apps/web`; doc sweep

## Goal

Delete `apps/web` (nothing should reference it after `04`) and update the docs that describe `apps/web` as the pilot / schema home / metadata root.

## Prerequisites

- [`04-relocate-domain.md`](./04-relocate-domain.md) complete — codegen, db-migrate, build, and tests no longer point at `apps/web`.

## Files

| File | Action |
|------|--------|
| `apps/web/**` | **Delete** the app (modules, migrations, src already moved in `04`) |
| `package.json` (root), `tsconfig.json`, `eslint.config.mjs`, `.vscode/launch.json` | Remove `@latch/web` / `apps/web` references |
| `docs/reference/packages.md` | Target layout: `apps/crm` only; `dal` = generic kernel; `policy` = loader |
| `docs/foundations/architecture-overview.md` | Drop "`apps/web` — thin pilot"; note single app |
| `docs/reference/crm-and-phases.md` | `apps/crm` is the only app; remove "copy from apps/web" guidance |
| `apps/crm/docs/DATABASE.md` | Rewrite: CRM **owns** schema + migrations (was "schema lives with the platform / CRM adds no tables") |
| `docs/foundations/scope.md` | Deployment/Surfaces notes reference `apps/crm`, not `apps/web` |
| `docs/README.md` | Fix any `apps/web` pointer |

## Steps

1. Confirm zero references: grep `apps/web` and `@latch/web` across repo (excluding history) returns nothing meaningful.
2. Delete `apps/web/`.
3. Sweep the docs above; keep each fact in one canonical place (per doc-style rule).
4. `npm run build`, `npm run test`, `npm run codegen:check` green.

## Verify (stop gate)

- [ ] `apps/web` deleted; no `@latch/web` / `apps/web` references remain in code or tooling
- [ ] `packages.md`, `architecture-overview.md`, `crm-and-phases.md`, `DATABASE.md`, `scope.md`, `docs/README.md` updated
- [ ] `npm run build` / `test` / `codegen:check` green
- [ ] `../STATUS.md` **Execute now** → `06-verify-parity.md`

## Out of scope

- Behavior changes; this is deletion + docs only.
