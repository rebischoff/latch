# Phase 08 — decisions

> Phase-scoped decisions. Canonical model: [`../../discussions/09-role-delegation-and-scope.md`](../../discussions/09-role-delegation-and-scope.md).

## Locked before implementation (no planning gate stop)

| Topic | Choice | Source |
|-------|--------|--------|
| Scope primitive shape | `latch_scopes` + nullable `latch_user_roles.scope_id` + `row_scope: scope` | Discussion 09 (2026-06-09) |
| Manifest authority | `manifest.scopeIds` drives DAL row filter | Invariant 1; access-control.md |
| Rung semantics | `own ⊂ scope ⊂ all`; `mergeRowScope` most-permissive | `packages/policy/src/merge.ts` |
| System classes | Always unscoped (`scope_id = NULL`); synthesis `rowScope: all` | Discussion 09 |
| Delegation | App validation (three dials); spike reference impl | Task 05 Phase C — **done** |
| Business row column | App-owned `scope_id` FK → `latch_scopes.id` on scoped business tables | access-control.md |

### Decision: empty `scopeIds` on `scope` rung (2026-06-10)

**Choice:** When merged `rowScope === "scope"` but the principal has **no** scoped bindings for any contributing `scope`-rung role policy, `manifest.scopeIds` is **`[]`** (empty array). DAL treats empty `scopeIds` as **no rows visible** (same as `WHERE scope_id IN ()`).

**Rationale:** Default-closed. A `scope`-rung grant without a scoped assignment is a configuration error, not company-wide access.

### Decision: two-harness proof model — repoint task 04 (2026-06-10)

**Choice:** Split scoped-access proof across **two disposable apps**. Do **not** restore `apps/crm` or add business tables to `apps/spike_policy`.

| Harness | Proves | Business DDL |
|---------|--------|--------------|
| **`apps/spike_policy`** | `@latch/policy` — resolve, grants, scoped assignment, delegation, manifest inspector | **No** (vocabulary-only surfaces) |
| **`apps/spike_business`** *(new; task 04)* | Consumer integration — app-owned `scope_id` on rows, store adapter, DAL list/get/bulk under `rowScope: scope` | **Yes** (minimal; one table sufficient) |

- **Task 04** targets **`apps/spike_business`**, not `apps/crm`. Minimum bar: migration + seed + memory (or Postgres) store + scoped persona test under `apps/**` vitest. No CRM UI or full trades domain required.
- **`spike_business` graduates** into the [business-app template](../../discussions/07-template-scaffold.md) when that lands; it is the first slice of discussion 07, not a throwaway duplicate of CRM.
- **Policy closeout split:** Task 05 Phase **B1** (`resolve` → `scopeIds`) and **B2** (DAL kernel) are package-complete. Task **05c** full closeout and Phase 08 DoD still require task 04 consumer proof.

**Rationale:** `apps/crm` was removed (P10, 2026-06-08); root `tests/` no longer runs. `spike_policy` deliberately excludes business tables — scoped delegation there does not prove row filtering on domain rows. A sibling business spike keeps policy proof bounded while unblocking scoped RLS without rebuilding the full CRM harness.

## Deferred (not Phase 08)

- Per-scope differential field grants
- Scope hierarchy traversal beyond one `parent_id`
- Native Postgres RLS → Phase 07
