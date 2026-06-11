# `@latch/dal` — task plan

> **Quarterback for DAL package work.** Phase delivery history: [`docs/phases/01-data-access`](../../../docs/phases/01-data-access/STATUS.md) (list/bulk), [`docs/phases/06-performance-safety`](../../../docs/phases/06-performance-safety/STATUS.md) (cache wiring). **Updated:** 2026-06-10.

---

## Right now — do this next

**→ [01 — Scoped row filter](./01-scoped-row-filter.md)** — honor `manifest.rowScope === "scope"` + `scopeIds` on list/get/bulk. **Blocked by:** [`@latch/policy` 05b](../../../policy/docs/tasks/05b-scoped-rls-resolve.md).

---

## Execution sequence

| Step | Task | Deliverable | State |
|------|------|-------------|-------|
| — | *(phase 01)* list, projection, bulk | `createSurfaceDal`, `StoreAdapter` | **complete** |
| — | *(phase 06)* cache wiring | CRM `CachingPolicyService` on reads | **complete** |
| 1 | [01 — Scoped row filter](./01-scoped-row-filter.md) | `scope` rung + `scopeIds` in kernel + adapters | **pending** |

---

## Related

- Phase 08: [`docs/phases/08-scoped-access`](../../../docs/phases/08-scoped-access/STATUS.md)
- Policy resolve: [`packages/policy/docs/tasks/05b-scoped-rls-resolve.md`](../../../policy/docs/tasks/05b-scoped-rls-resolve.md)
- Row-scope rules: [`docs/reference/access-control.md`](../../../policy/docs/access-control.md)
