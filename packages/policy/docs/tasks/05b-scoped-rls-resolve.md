# 05b — Scoped RLS: `resolve` → `manifest.scopeIds`

> **Status:** Complete (2026-06-10). Next: [dal 01 — scoped row filter](../../../dal/docs/tasks/01-scoped-row-filter.md) → [05c-policy-closeout](./05c-policy-closeout.md). Parent: [05-scope-and-delegation](./05-scope-and-delegation.md). Phase: [08 task 02](../../../docs/phases/08-scoped-access/tasks/02-resolve-scope-ids.md).

## Goal

Implement Phase B **policy half**: when `PolicyService.resolve` merges to `rowScope: "scope"`, populate `manifest.scopeIds` — the deduplicated union of `scopeId` values from the principal's bindings for roles that contributed a **`scope`-rung grant on this surface**.

Downstream (`@latch/dal` [01-scoped-row-filter](../../../dal/docs/tasks/01-scoped-row-filter.md)) will filter rows with `WHERE scope_id IN (manifest.scopeIds)`. This task does **not** touch the DAL.

## Definition of done

1. `PolicyService.resolve` is the **sole** source of `manifest.scopeIds` (no app-layer patch).
2. Locked semantics table below holds for all matrix cases 6a–6j.
3. `npm run test -w @latch/policy` green; spike `resolveAllManifests` simplified (subtask 8).
4. Task + phase 02 Status/verify updated per [45-phase-tasks](../../../../.cursor/rules/45-phase-tasks.mdc).

## Background — what exists today

| Piece | State |
|-------|--------|
| `@latch/contracts` | `RowScope` includes `"scope"`; `Principal.bindings` is `{ roleId, scopeId \| null }[]`; `Manifest.scopeIds?: ScopeId[]` |
| [`mergeRowScope`](../../src/merge.ts) | `all` beats `scope` beats `own` — **no change in this task** |
| [`PolicyService.resolve`](../../src/policy-service.ts) | Builds `rolePolicies` from system synthesis + one batch `grantProvider.grantsFor(...)`; returns `rowScope` — **`scopeIds` not set** |
| [`RoleGrantProvider`](../../src/grant-provider.ts) | `grantsFor(roleIds[], surface)` returns flat `RoleGrant[]` **without** source `roleId`; `MemoryRoleGrantProvider` already loops per `roleId` internally |
| Phase A + C | DDL seam, `getPrincipal` bindings, scoped delegation in `apps/spike_policy` — **complete** |
| Spike workaround | [`apps/spike_policy/lib/iam-user/resolve-all-manifests.ts`](../../../../apps/spike_policy/lib/iam-user/resolve-all-manifests.ts) patches `scopeIds` **after** `resolve` — **remove in subtask 8** |

## Prerequisites

- [x] Phase 08 [decisions](../../../docs/phases/08-scoped-access/decisions.md) locked (empty `scopeIds` → `[]`, default-closed)
- [x] No planning-gate forks — grant pairing uses **per-role `grantsFor` calls** (option A; no interface change)

## Locked semantics (do not re-litigate)

| Case | `rowScope` | `scopeIds` |
|------|------------|------------|
| Merged rung is `all` or `own` | as merged | **omit** (`undefined`) — even if principal holds a `scope`-rung grant on another role |
| Merged rung is `scope`, principal has scoped bindings for contributing roles | `"scope"` | deduped union of those `scopeId`s |
| Merged rung is `scope`, no qualifying scoped bindings | `"scope"` | **`[]`** (DAL → no rows) |
| `system_data` / `system_iam` synthesis | contributes `all` only | never contributes to `scopeIds` |

**Contributing role** = a `roleId` whose **per-role** runtime grant on this surface has `rowScope === "scope"` (evaluated **before** merge). Bindings for roles that only contributed `own`, `all`, or `undefined` rowScope are ignored.

**Dedupe order:** lexicographic sort on `ScopeId` strings (stable; matches current spike helper).

### Canonical algorithm (pseudocode)

```ts
// Inside resolve(principal, scope) after surfaceDef lookup:

const contributions: { roleId: RoleId; policy: RoleSurfacePolicy }[] = [];

// System synthesis — unchanged; rowScope always "all" (no roleId tracking needed)
// ... push synthesis policies into contributions without roleId, or skip tracking them

for (const roleId of principalRoleIds(principal)) {
  for (const grant of grantProvider.grantsFor([roleId], scope.surface)) {
    contributions.push({ roleId, policy: { rowScope: grant.rowScope, fields: grant.fields } });
    // surfaceActions collected as today
  }
}

const rolePolicies = contributions.map((c) => c.policy);
const merged = mergeStrategy.mergeRolePolicies(rolePolicies, mergeOptions);

const scopeContributingRoleIds = new Set(
  contributions
    .filter((c) => c.policy.rowScope === "scope")
    .map((c) => c.roleId),
);

let scopeIds: ScopeId[] | undefined;
if (merged.rowScope === "scope") {
  scopeIds = [
    ...new Set(
      principal.bindings
        .filter((b) => b.scopeId != null && scopeContributingRoleIds.has(b.roleId))
        .map((b) => b.scopeId as ScopeId),
    ),
  ].sort();
}

return {
  surface, entityId, actions, fields,
  rowScope: merged.rowScope,
  ...(scopeIds !== undefined ? { scopeIds } : {}),
};
```

---

## Execution — subtasks

Run **in order**. Check off each subtask before moving on.

### 1 — Per-role grant loop (preserve merge inputs)

**File:** [`src/policy-service.ts`](../../src/policy-service.ts)

- [x] **1a.** Replace the single batch `grantProvider.grantsFor(principalRoleIds(principal), surface)` with a loop: for each `roleId` in `principalRoleIds(principal)`, call `grantsFor([roleId], surface)` and record `{ roleId, grant }` pairs.
- [x] **1b.** Push grant `fields` / `rowScope` into `rolePolicies` exactly as today (one push per grant returned).
- [x] **1c.** Leave system synthesis blocks **unchanged** — they always contribute `rowScope: "all"` and never enter `scopeContributingRoleIds`.
- [x] **1d.** Do **not** change `RoleGrantProvider` or `MemoryRoleGrantProvider`.

**Stop check:** Existing tests in `policy-service.test.ts` still pass; `fields`, `actions`, and `rowScope` unchanged (no `scopeIds` yet).

### 2 — `scopeContributingRoleIds`

**File:** [`src/policy-service.ts`](../../src/policy-service.ts)

- [x] **2a.** From the `{ roleId, grant }` pairs in subtask 1, build `Set<RoleId>` where `grant.rowScope === "scope"`.
- [x] **2b.** Implement as a private helper (e.g. `scopeContributingRoleIds(contributions)`) or inline before merge — **do not export** unless a test needs it.

### 3 — `resolveScopeIds` helper

**File:** [`src/policy-service.ts`](../../src/policy-service.ts)

- [x] **3a.** Private helper: `(principal, scopeContributingRoleIds) => ScopeId[]`.
- [x] **3b.** Filter `principal.bindings`: `scopeId != null` **and** `scopeContributingRoleIds.has(roleId)`.
- [x] **3c.** Dedupe via `Set`, return **sorted** `ScopeId[]` (lexicographic).
- [x] **3d.** Called only when `merged.rowScope === "scope"`; empty result → `[]`.

### 4 — Attach `scopeIds` to manifest

**File:** [`src/policy-service.ts`](../../src/policy-service.ts)

- [x] **4a.** After merge, if `merged.rowScope === "scope"`, set `scopeIds` via subtask 3; else **omit** the property (no `scopeIds: undefined`).
- [x] **4b.** Import `ScopeId` from `@latch/contracts` if needed.
- [x] **4c.** Confirm `mergeRowScope`, `unionGrants`, `denyWins`, and synthesis paths are untouched.

### 5 — Test fixtures

**File:** [`src/policy-service.test.ts`](../../src/policy-service.test.ts)

Use stable ids (copy into tests):

| Symbol | Value | Role |
|--------|-------|------|
| `ROLE_SCOPE` | `"role_scope_mgr"` | `rowScope: "scope"` on test surface |
| `ROLE_OWN` | `"role_own"` | `rowScope: "own"` |
| `ROLE_ALL` | `"role_all"` | `rowScope: "all"` |
| `SCOPE_S1` | `"scope-s1"` | binding scope id |
| `SCOPE_S2` | `"scope-s2"` | second binding scope id |

- [x] **5a.** Add surface `scoped_widget` (`kind: "business"`, one field `widget_name`) to a dedicated scoped fixture registry **or** extend `alpha` — prefer a small dedicated registry to avoid disturbing existing cases.
- [x] **5b.** Grant provider: `ROLE_SCOPE` → `rowScope: "scope"`; add `ROLE_OWN` / `ROLE_ALL` as needed for matrix rows.
- [x] **5c.** Build principals with inline `{ id, bindings: RoleBinding[] }` objects. **Do not** add `principalWithBindings` to `@latch/contracts` in this task.

### 6 — Matrix tests (`describe("scopeIds resolve")`)

**File:** [`src/policy-service.test.ts`](../../src/policy-service.test.ts)

Assert omitted `scopeIds` with `expect(manifest.scopeIds).toBeUndefined()`.

| # | Scenario | Expected `rowScope` | Expected `scopeIds` |
|---|----------|---------------------|---------------------|
| 6a | Single binding `{ ROLE_SCOPE, SCOPE_S1 }` | `"scope"` | `["scope-s1"]` |
| 6b | Two bindings same role: `s1` + `s2` | `"scope"` | `["scope-s1", "scope-s2"]` |
| 6c | `ROLE_SCOPE` + `ROLE_ALL` on same surface | `"all"` | **omitted** |
| 6d | `ROLE_SCOPE` + `ROLE_OWN` | `"scope"` | union from `ROLE_SCOPE` bindings only |
| 6e | `ROLE_SCOPE` grant, binding `{ ROLE_SCOPE, scopeId: null }` | `"scope"` | `[]` |
| 6f | `system_data` on business surface (existing pattern) | `"all"` | **omitted** |
| 6g | `system_iam` on IAM surface (existing pattern) | `"all"` | **omitted** |
| 6h | Two `scope`-rung roles (`ROLE_SCOPE` + `ROLE_SCOPE_B`), bindings at `s1` / `s2` | `"scope"` | `["scope-s1", "scope-s2"]` |
| 6i | `system_data` **and** `ROLE_SCOPE` on same business surface | `"all"` | **omitted** (regression vs spike patch) |
| 6j | Binding at `SCOPE_S1` for a role whose grant is `own` only (not scope-contributing) | `"own"` | **omitted** |

- [x] **6.** Implement rows **6a–6j**.

### 7 — Package regression

- [x] **7a.** `npm run test -w @latch/policy` — all green.
- [x] **7b.** No edits to [`src/grant-provider.ts`](../../src/grant-provider.ts) or [`src/merge.ts`](../../src/merge.ts).

### 8 — Remove spike workaround

**File:** [`apps/spike_policy/lib/iam-user/resolve-all-manifests.ts`](../../../../apps/spike_policy/lib/iam-user/resolve-all-manifests.ts)

The spike currently re-computes `scopeIds` after `resolve` and can attach them when merged `rowScope` is `"all"`. After subtasks 1–4, that patch is wrong and redundant.

- [x] **8a.** Delete `scopeIdsForSurface` and the `preloadRoleGrantBindings` call used only for scope patching.
- [x] **8b.** `resolveAllManifests` → loop surfaces, assign `policy.resolve(principal, { surface })` directly.
- [x] **8c.** Update [`apps/spike_policy/README.md`](../../../../apps/spike_policy/README.md) one-liner if it still says manifests are "enriched" post-resolve.
- [x] **8d.** Run spike-relevant tests (at minimum `npm run test -w @latch/policy`; optionally `apps/spike_policy` tests if wired in root `npm test`).

---

## Files (expected touch set)

| File | Change |
|------|--------|
| [`src/policy-service.ts`](../../src/policy-service.ts) | Per-role grant loop; `scopeIds` union; manifest return |
| [`src/policy-service.test.ts`](../../src/policy-service.test.ts) | Scoped fixtures + matrix 6a–6j |
| [`apps/spike_policy/lib/iam-user/resolve-all-manifests.ts`](../../../../apps/spike_policy/lib/iam-user/resolve-all-manifests.ts) | Remove post-resolve `scopeIds` patch |
| [`src/grant-provider.ts`](../../src/grant-provider.ts) | **No change** |
| [`src/merge.ts`](../../src/merge.ts) | **No change** |
| [`src/manifest-cache.test.ts`](../../src/manifest-cache.test.ts) | **No change in 05b** — deferred to [05c](./05c-policy-closeout.md) |

## Verify (stop gate)

- [x] Subtasks 1–8 complete
- [x] `resolve` sets `scopeIds` when merged `rowScope === "scope"`
- [x] `scopeIds` omitted when `rowScope` is `own` or `all` (including 6i)
- [x] Empty binding union → `scopeIds: []`
- [x] `mergeRowScope` behavior unchanged; pre-existing policy tests green
- [x] `npm run test -w @latch/policy` passes
- [x] Spike `resolveAllManifests` no longer patches `scopeIds`
- [x] Update this file **Status** line + phase [02](../../../docs/phases/08-scoped-access/tasks/02-resolve-scope-ids.md) per [45-phase-tasks](../../../../.cursor/rules/45-phase-tasks.mdc) on completion

## Out of scope

- DAL row filter — [dal 01](../../../dal/docs/tasks/01-scoped-row-filter.md) / Phase 08 task 03
- CRM scoped proof — Phase 08 task 04
- `preloadRoleGrantBindings` / DB provider changes (already passes `rowScope: "scope"`)
- `manifest-cache.test.ts` scopeIds regression — [05c](./05c-policy-closeout.md)
- Per-scope differential field grants
- Native Postgres RLS

## Reference

- Parent: [05-scope-and-delegation](./05-scope-and-delegation.md) Phase B
- [Phase 08 decisions](../../../docs/phases/08-scoped-access/decisions.md) — empty `scopeIds`
- [`access-control.md`](../access-control.md#row-level-rules) — rung table
- [`discussion 09`](../../../docs/discussions/09-role-delegation-and-scope.md) — bounded scope primitive
- Spike reference (to remove): [`resolve-all-manifests.ts`](../../../../apps/spike_policy/lib/iam-user/resolve-all-manifests.ts)
