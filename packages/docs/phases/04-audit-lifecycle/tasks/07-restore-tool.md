# 07 — Restore-from-audit tool

> **Status:** Complete (2026-06-02). Next: [`08-retention-seam.md`](./08-retention-seam.md).

## Goal

Implement privileged **restore-from-audit** replay: read a `delete` audit row, re-insert anchor + embedded children, write `restore` audit row. Expose via `@latch/audit` API + CRM operator script.

## Prerequisites

- [06-delete-audit-snapshots.md](./06-delete-audit-snapshots.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/audit/src/restore.ts` | **Create** — `restoreFromAuditEntry` (or equivalent) |
| `packages/audit/src/index.ts` | Export restore API |
| `packages/audit/src/restore.test.ts` | **Create** — memory store replay |
| `apps/crm/scripts/restore-audit.ts` | **Create** — CLI: audit id + actor context |
| `package.json` (root or `apps/crm`) | `npm run restore-audit` script |
| `apps/crm/docs/DATABASE.md` | Operator runbook: invoke script, required role (`restore`) |

## Steps

1. Read [`00-decisions.md`](./00-decisions.md) §3 — restore operator contract.
2. **Eligibility:** `action === 'delete'`, `before` non-null, known `entity_type`.
3. **Authz:** caller manifest must grant **`restore`** on the Surface tied to `module_id` / entity (re-resolve manifest; do not trust CLI flags alone).
4. **Conflict:** live row with same PK → **409** (default; no `--force` in v1 unless decisions updated).
5. **Replay order:** INSERT anchor, then children (`assignments`, `sites`, …) from embedded keys.
6. **Audit:** `writeAudit({ action: 'restore', before: null, after: … })`.
7. CLI accepts audit row id (and principal id for dev); uses memory store in tests, Postgres path when wired.
8. **No** CRM React page; **no** public REST route unless explicitly added with same authz.

## Verify (stop gate)

- [x] `npm run test` — restore unit tests green
- [x] Manual or scripted flow: delete job → restore by audit id → job + assignments visible in store
- [x] Second restore of same entity → 409
- [x] Principal without `restore` → forbidden
- [x] `npm run build` passes
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `08-retention-seam.md`

## Out of scope

- CRM admin UI
- Restore from `update` / `approve` audit rows (Phase 05)
- Generic `createSurfaceDal.restore()` method
- `--force` overwrite (unless decision amended)
