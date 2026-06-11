# Discussion 03 — Approval

> **Status:** Open (2026-06-05). Compartment 2.1 in the [map](../reference/compartments.md#21-approval-extension-of-permissions).

## Shared understanding

- Approval is an **extension of permissions**, not a separate system. It is **two field actions plus a staging table**:
  - `submit` (without `write`) → user *proposes* a change; it lands in the pending store, not the live row.
  - `approve` → user *accepts/rejects* someone else's proposal.
- It is **opt-in, per field**, declared in YAML via `requires_verification: true`. No flagged fields → approval does not exist for that app.
- Runtime routing happens only when the manifest has `submit` ∧ ¬`write` for the field.
- It depends on **permissions (02)** and the **runtime/DAL (04)** — it can't be tested fully in isolation from those.
- Storage is a single platform table: `latch_pending_changes`.

## Points to confirm

1. "Permission grants the ability to accept/reject another's submitted data" — `approve` is just another field action.
2. Approval is **optional**: per field (YAML flag) → per surface → per app.
3. `latch_pending_changes` is a **platform/template table** (used only when approval is enabled).
4. v1 approval is **all-or-nothing, single record, internal reviewers** — per-field/partial accept and external reviewers are deferred.

## Open questions

- Should approval ever be configurable at the **surface** level (not just per field), e.g. "all writes on this surface need approval"?
- Batch-level approval for bulk operations — in or out for our near-term apps?

## Related

- [`../reference/approval-trails.md`](../../approval/docs/approval-trails.md), [`packages/approval/src/index.ts`](../../approval/src/index.ts)

