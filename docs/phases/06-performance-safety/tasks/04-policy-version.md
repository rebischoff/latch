# 04 — `policyVersion` storage and bump

> **Status:** Complete (2026-06-03). Next: [`05-manifest-cache-seam.md`](./05-manifest-cache-seam.md).

## Goal

Add **`latch_policy_version`** (single-row counter), bump on IAM role assign/revoke, and expose **`policyVersion`** on `Principal` for cache keys and invalidation.

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete.
- [01-task-index.md](./01-task-index.md) read.

## Files

| File | Action |
|------|--------|
| `apps/crm/migrations/` | New migration (e.g. `007_latch_policy_version.sql`) |
| `apps/crm/docs/DATABASE.md` | Document table + bump semantics |
| `packages/contracts/` | `policyVersion?: number` on `Principal` (and `Manifest` if locked in 00) |
| `apps/crm/src/lib/iam/` | Bump version after assign/revoke |
| `apps/crm/src/lib/policy/` or auth bootstrap | Load version when building `Principal` |

## Steps

1. Create `latch_policy_version` (single row `version BIGINT NOT NULL DEFAULT 1`). Use repo migration style: `BEGIN; … COMMIT;`, header comment, idempotent guards (`CREATE TABLE IF NOT EXISTS`, seed row with `ON CONFLICT DO NOTHING`).
2. **Grant `latch_app`** `SELECT, UPDATE` on `latch_policy_version` inside the migration (guarded `IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'latch_app')`), matching the pattern in [`006`](../../../../apps/crm/migrations/006_latch_pending_changes.sql).
3. Add `bumpPolicyVersion()` (SQL `UPDATE … SET version = version + 1`) called from IAM assign/revoke paths only in v1 (runs as `latch_app`).
4. Document manual bump when repo YAML policies change (no codegen hook required in Phase 06).
5. `getPrincipal` ([`apps/crm/src/lib/auth/getPrincipal.ts`](../../../../apps/crm/src/lib/auth/getPrincipal.ts)) reads current version into `Principal.policyVersion`. **Stub path** (`LATCH_STUB_USER`/`LATCH_STUB_ROLE`, no DB) → `policyVersion` undefined or `0`; cache treats undefined as its own key bucket (document).
6. `policyVersion?: number` already absent on `Principal` ([`packages/contracts/src/types.ts`](../../../../packages/contracts/src/types.ts)) — add it (optional, client-safe).
7. Unit test: assign role → version increments; two consecutive reads return new version.

## Verify (stop gate)

- [x] `npm run db:migrate` applies on fresh Postgres; `latch_app` has `SELECT, UPDATE`
- [x] IAM assign/revoke bumps version
- [x] `Principal` includes `policyVersion` in CRM tests; stub path documented
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `05-manifest-cache-seam.md`

## Out of scope

Manifest cache wrapper (task **05**). YAML-change auto-bump (document only).
