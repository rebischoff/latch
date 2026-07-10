# 37z — Item commercial inherit UI

> **Status:** Complete (2026-07-09). Next: [37h](./37a-category-scope-decision-dbml-migration.md) job FK renames (parallel OK).
>
> **Decision:** [item commercial margin inherit checkbox](../decisions/catalog.md#decision-item-commercial-margin-inherit-checkbox-2026-07-09) (**Z1–Z5**). **No schema change.** **Touches:** `ItemCommercialFields`, `item-commercial-display` helpers, tests.

## Problem

Freight / incidental / markup FKs resolve via ancestry in costing, but `/items` only showed those pickers on scope/category nodes with no child inherit checkbox — unlike estimate **C** configuration.

## Locked summary (do not re-litigate)

| # | Choice |
|---|--------|
| **Z1** | Show F/I/M on every `node_type` (incl. quotable leaves) |
| **Z2** | Child (`parent_id != null`): checkbox — unchecked = ancestry read-only; checked = own FK |
| **Z3** | Root: no checkbox; always own |
| **Z4** | No migration — null FK = inherit |
| **Z5** | Explicit zero via catalog **None** type (manual admin entry) |

## Implementation steps

### Step 1 — Docs

| Action |
|--------|
| Decision Z1–Z5 in [catalog.md](../decisions/catalog.md) |
| This task file + STATUS + task index |

### Verify (Step 1)

- [x] Decision present; task linked

### Step 2 — Display helpers

| Action |
|--------|
| Add `resolveAncestryRateTypeId`, `hasCommercialRateOverride`, `displayCommercialRateTypeId` in `item-commercial-display.ts` |
| Unit tests for override/display logic |

### Verify (Step 2)

- [x] Helpers tested; `resolveRate` unchanged

### Step 3 — UI

| Action |
|--------|
| Refactor [`ItemCommercialFields.tsx`](../../components/catalog/ItemCommercialFields.tsx): per-family field with `FormFieldItem` `controlPrefix` checkbox on children |
| Mirror estimate complexity `forceOverride` when ancestry is also null |
| Keep labor-phase + fallback unit cost UX unchanged |

### Verify (Step 3)

- [x] F/I/M visible on scope, category, and leaf nodes
- [x] Child unchecked shows ancestry read-only; checked allows edit
- [x] Root has no checkbox

### Step 4 — Stop gate

| Action |
|--------|
| `npm run test` — subhub unit tests green |
| Update STATUS + task index |

### Verify (Step 4)

- [x] Tests pass
- [x] STATUS + index updated
