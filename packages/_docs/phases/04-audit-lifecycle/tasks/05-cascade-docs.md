# 05 — Cascade documentation (per Surface)

> **Status:** Complete (2026-06-02). Next: [`06-delete-audit-snapshots.md`](./06-delete-audit-snapshots.md).

## Goal

Document hard-delete cascade behavior per pilot Surface in canonical reference docs so operators and restore tooling share one contract. **Docs only.**

## Prerequisites

- [04-audit-role-grants.md](./04-audit-role-grants.md) complete.

## Files

| File | Action |
|------|--------|
| [`../../../reference/audit-and-lifecycle.md`](../../../../audit/docs/audit-and-lifecycle.md) | Decision block + cascade table (anchor → children, FK, audit responsibility) |
| [`../../../../apps/crm/docs/DATABASE.md`](../../../../../apps/crm/docs/DATABASE.md) | FK cascade section aligned with schema |
| [`../decisions.md`](../decisions.md) | Move cascade item from Open → Decided (if not done in **00**) |

## Steps

1. Copy cascade table from [`00-decisions.md`](./00-decisions.md) §1 into `audit-and-lifecycle.md` as a dated **Decision**.
2. For each Surface with `delete` today or planned:
   - **`job_detail` / `job_list`** — `jobs` anchor; `assignments` CASCADE; audit on anchor only.
   - **`customer_detail`** — `customers` anchor; `sites` CASCADE; note customer delete deferred in CRM.
   - **`user_roles_detail`** — `latch_users` anchor; `latch_user_roles` CASCADE; user delete deferred.
3. State explicitly: **`jobs.customer_id`** → RESTRICT (customer cannot be deleted while jobs reference it).
4. Cross-link restore contract (task **06** / **07**) — restore replays embedded children from anchor `before`.
5. No schema or FK changes unless a doc/implementation mismatch is found (fix in separate task).

## Verify (stop gate)

- [x] Cascade table present in `audit-and-lifecycle.md` and `DATABASE.md`
- [x] No unchecked cascade item in [`../decisions.md`](../decisions.md)
- [x] No new files under `packages/*` or `apps/crm/src` (docs-only)
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `06-delete-audit-snapshots.md`

## Out of scope

- Code changes to `auditSnapshot` (task **06**)
- Customer or user delete Surfaces
- Ordered multi-table DAL delete without CASCADE
