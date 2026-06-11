# Phase 02 — UI sync (`@latch/react`, `apps/crm`)

> **Home packages:** `@latch/react`, `@latch/dal`, `apps/crm` (canonical proof) · **Status:** active · **Phase STATUS:** [`STATUS.md`](./STATUS.md) · **Tasks:** [`tasks/01-task-index.md`](./tasks/01-task-index.md)

## Goal

Make the UI render **entirely from the manifest** — hidden / read-only / editable per Field, nav showing only permitted routes — and prove it on a second Surface (`customer_detail`) with a cross-Surface link from jobs. The UI is never a security boundary; the server omits forbidden data before it reaches the client.

## Depends on

- **Phase 00** — manifest + `@latch/contracts`.
- **Phase 01** — list/detail DAL for the Surfaces being rendered.

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| `CapabilitiesProvider` from RSC-provided manifest | Identity / login UI (Phase 03) |
| `<Can>` for conditional sections | Verification reviewer UX (Phase 05) |
| `<FieldControl>`: hidden / read-only / editable from manifest | Restore-from-audit UI (Phase 04) |
| Nav manifest with `minimal` scope | Polished theming beyond consistent Tailwind |
| **`customer_detail` backend slice** — schema (`customers`, `sites`, `jobs.customer_id`), Surface YAML + policies, codegen, DAL `get`/`patch`, API routes | `customer_list`; customer `delete` (jobs already prove hard delete) |
| `customer_detail` CRM page + cross-Surface link (`customer_ref` on `job_detail`) | — |

## Sub-goals — what this phase proves

1. No Field value without `read` reaches the client (T2/T14 at the UI layer).
2. `read` but no `write` → control renders **read-only** (your client read-only requirement).
3. Nav lists only routes the user may open (no leakage of Surface IDs).
4. A second Surface reuses the same components with no bespoke permission code.

## Definition of done

- [x] `CapabilitiesProvider` + `<Can>` + `<FieldControl>` consumed by `apps/crm` (jobs — pilot)
- [x] Same components on `customer_detail` CRM page
- [x] `customer_detail` Surface YAML + policies + page
- [x] Cross-Surface link job → customer respects manifest
- [x] Snapshot tests: nav + DTO per role (no unauthorized Surface IDs / Fields)

## References

- [`../../reference/permissions-and-ui-sync.md`](../../reference/permissions-and-ui-sync.md) · [`../../foundations/use-cases.md`](../../foundations/use-cases.md)
- [`../../reference/access-control.md`](../../../policy/docs/access-control.md) (omit vs read-only vs deny)
