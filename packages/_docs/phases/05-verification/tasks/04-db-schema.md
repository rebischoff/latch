# 04 — `latch_pending_changes` schema

> **Status:** Complete (2026-06-03). Next: [05-surface-codegen.md](./05-surface-codegen.md).

## Goal

Add Postgres migration for **`latch_pending_changes`** per [00-decisions.md](./00-decisions.md) §2; document table and grants in `DATABASE.md`.

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete.
- [01-task-index.md](./01-task-index.md) read.

## Files

| File | Action |
|------|--------|
| `apps/crm/migrations/` | New migration (e.g. `006_latch_pending_changes.sql`) |
| `apps/crm/docs/DATABASE.md` | Table definition, indexes, app-role grants |

## Steps

1. Create table with columns: `id`, `surface_id`, `entity_id`, `field_ids`, `patch`, `status`, `submitted_by`, `submitted_at`, `decided_by`, `decided_at`, `comment`, `batch_id`, `supersedes_id`.
2. Add partial unique index or document app-level enforcement: one `submitted` per `(surface_id, entity_id)`.
3. Grant `latch_app` (or deployment role) `INSERT` + `UPDATE` on pending for status transitions only — align with DAL-only immutability (no DELETE).
4. FK `supersedes_id` → self, nullable.

## Verify (stop gate)

- [x] Migration applies on fresh Postgres
- [x] `DATABASE.md` documents columns and status enum
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `05-surface-codegen.md`

## Out of scope

Postgres store implementation (task **07**). DAL routing (task **06**).
