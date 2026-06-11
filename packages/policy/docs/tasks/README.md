# Runtime roles — task plan

> **Quarterback for app-managed roles.** Source of intent: the "[roles are runtime data](../../../docs/discussions/02-identity-and-permissions.md)" decision (2026-06-06) and the v1 scope change in [`scope.md`](../../../docs/foundations/scope.md). These tasks move role **definitions** (catalog + grants) from build-time codegen/YAML to **runtime DB data** that app users CRUD through a permission-gated IAM Surface.
> **Updated:** 2026-06-10. **Runtime roles chain:** **complete** (task 05 closed). **Platform snapshot:** [`docs/reference/platform-status.md`](../../../docs/reference/platform-status.md).

---

## Right now — do this next

**None** — runtime roles task chain is complete. Scoped RLS orchestration continues in [Phase 08 task 21 — DoD](../../../docs/phases/08-scoped-access/tasks/21-phase-dod.md). Deferred policy work: P7 mode overlays ([00-decisions-needed](./00-decisions-needed.md)), Phase 07 merge modes / native RLS.

---

## Goal

Today the policy registry's role→Field **grants** are static (codegen-emitted from `*.policies.yaml`, consumed as `SurfacePolicyDefinition.roles`). The "roles are runtime data" decision splits this:

- **Vocabulary (codegen, build time):** which Surfaces/Fields/actions *exist*. Emitted from `*.surface.yaml` → `${surface}SurfacePolicyDef` in `generated/*.schema.generated.ts`. See [codegen task 04](../../../codegen/docs/tasks/04-policy-registry-gen.md).
- **Grants (runtime, DB data):** which role gets which Field/action + `rowScope`. Moves to `latch_roles` + `latch_role_grants`, CRUD'd by app users, audited.

The two system classes (`system_data`, `system_iam`) stay template-seeded and synthesized in `PolicyService`; not app-deletable ([P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)).

---

## Execution sequence

Run tasks **in order**. Letter suffixes (`01b`, `02b`, `05b`) are follow-ups that complete or extend the numbered task above them.

| Step | Task | Deliverable | State |
|------|------|-------------|-------|
| — | [00 — Decisions needed](./00-decisions-needed.md) | Parking lot (P1–P10); consult when a fork blocks work | P1–P11 locked; P7 deferred |
| 1 | [01 — Role tables + built-in seeds](./01-role-tables.md) | Three platform tables + pre-P11 prototype in `apps/spike_policy` | **complete** (2026-06-08) |
| 2 | [01b — P11 catalog realignment](./01b-p11-catalog-realignment.md) | UUID + `role_class` in spike DDL, seeds, `@latch/policy` | **complete** (2026-06-08) |
| 3 | [02 — `RoleGrantProvider` seam](./02-role-grant-provider.md) | Interface + `MemoryRoleGrantProvider`; sync `resolve` | **complete** (2026-06-06) |
| 4 | [02b — DB-backed provider wiring](./02b-db-role-grant-provider.md) | Request-scoped preload from Postgres into provider snapshot | **complete** (2026-06-08) |
| 5 | [03 — Role-editor IAM Surface](./03-role-editor-surface.md) | CRUD roles + grants; vocabulary validation; audited | **complete** (2026-06-08) |
| 6 | [04 — P10 test harness](./04-p10-test-harness.md) | Lock P10; DAL T8 + spike co-located tests | **complete** (2026-06-08) |
| 7 | [05 — Scope primitive + delegation](./05-scope-and-delegation.md) | Seam + scoped RLS + delegation | **complete** (2026-06-10) |
| 7b | [05b — resolve `scopeIds`](./05b-scoped-rls-resolve.md) | `PolicyService.resolve` populates `manifest.scopeIds` | **complete** (2026-06-10) |
| 7c | [05c — policy closeout](./05c-policy-closeout.md) | Regression + mark task 05 complete | **complete** (2026-06-10) |

**Parallel (already done):** [codegen task 04](../../../codegen/docs/tasks/04-policy-registry-gen.md) — vocabulary-only registry + seam types.

**Follow-on:** [Policy console UI](../../../../apps/spike_policy/docs/tasks/README.md) in `apps/spike_policy` — **complete** (tasks 01–08).

### Dependency graph

```
codegen 04 (vocabulary) ✓
         │
00 (P1–P11 locked) ✓
         │
    01 → 01b → 02 → 02b → 03 → 04 ✓
         │
         ▼
    05 Phase A (seam) ✓ ──► 05 Phase C (delegation, spike) ✓
         │
         ▼
    05b (resolve scopeIds) ✓
         │
         ▼
    dal 01 (scope filter) ✓ → spike_business proof ✓ → 05c (closeout) ✓
```

---

## Evaluation vehicle

[`apps/spike_policy`](../../../../apps/spike_policy) is the disposable harness — the policy sibling of `apps/spike_codegen`. It holds the platform migration spine (`001`–`010`), spike-only fixtures, and IAM/threat tests (`apps/spike_policy/**/*.test.ts`). Pure policy unit tests stay in `packages/policy/src/*.test.ts`.

Scoped **row filtering** consumer proof graduates to `apps/spike_business` (Phase 08 task 04) — `spike_policy` has vocabulary-only surfaces, no business tables. See [two-harness decision](../../../docs/phases/08-scoped-access/decisions.md#decision-two-harness-proof-model--repoint-task-04-2026-06-10).

---

## Decisions already locked (see the discussion)

- **(1)** Template seeds only `system_data` + `system_iam` catalog rows (UUID + `role_class`; [P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)); `app` catalog otherwise starts empty ([P3](./00-decisions-needed.md)).
- **(2)** Grant granularity: sparse rows per role × surface × field × action (+ optional `mode`); default deny — no full-matrix seed on role create ([P2a](./00-decisions-needed.md)).
- **(3)** `row_scope` on `latch_role_surfaces` per (role, surface). Third rung **`scope`** + bounded scope primitive ([discussion 09](../../../docs/discussions/09-role-delegation-and-scope.md)); Phase B in [05b](./05b-scoped-rls-resolve.md).
- **(4)** FK semantics: `latch_user_roles.role_id` → `latch_roles.id` **RESTRICT**; grants/bindings **CASCADE** on role delete ([P2](./00-decisions-needed.md)).
- **(5)** Surface schema/glue stay codegen (vocabulary). "Mode overlays" (per-screen restriction) are grants too → runtime.
- **(6)** The "can't grant an undefined Field" guarantee moves from build-time `--check` to **write-time** validation in the role editor, sourced from the codegen catalog.

## Open / deferred (not blocking 05b)

| Item | Where |
|------|-------|
| P7 mode overlays | [00-decisions-needed](./00-decisions-needed.md) |
| `multiRoleCombine` beyond `union_grants` | Phase 07 |
| Native Postgres RLS | Phase 07 |
| Per-scope differential field grants | [`scope.md`](../../../docs/foundations/scope.md) |

## Related

- [`docs/discussions/02-identity-and-permissions.md`](../../../docs/discussions/02-identity-and-permissions.md) — the decision
- [`docs/discussions/09-role-delegation-and-scope.md`](../../../docs/discussions/09-role-delegation-and-scope.md) — scope primitive + delegation decision (task 05)
- [`docs/reference/platform-status.md`](../../../docs/reference/platform-status.md) — where all packages stand
- [`docs/foundations/scope.md`](../../../docs/foundations/scope.md) — v1 scope change
- [`docs/reference/access-control.md`](../access-control.md) · [`codegen-scope.md`](../../../codegen/docs/reference/codegen-scope.md)
- [`packages/codegen/docs/tasks/04-policy-registry-gen.md`](../../../codegen/docs/tasks/04-policy-registry-gen.md) — vocabulary-only emit + seam type
- `@latch/policy`: [`policy-service.ts`](../../src/policy-service.ts), [`registry.ts`](../../src/registry.ts)
