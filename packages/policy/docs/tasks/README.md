# Runtime roles — task plan

> **Quarterback for app-managed roles.** Source of intent: the "[roles are runtime data](../../../../docs/discussions/02-identity-and-permissions.md)" decision (2026-06-06) and the v1 scope change in [`scope.md`](../../../../docs/foundations/scope.md). These tasks move role **definitions** (catalog + grants) from build-time codegen/YAML to **runtime DB data** that app users CRUD through a permission-gated IAM Surface.
> **Updated:** 2026-06-09. **Recently completed:** 05 Phase A — scope/delegation seam (contracts + migration 010 + `loadPrincipalFromDb`, 2026-06-09). **Do next:** 05 Phase B — scoped RLS in resolve + DAL.

---

## Right now — do this next

**→ [05 — Phase B: scoped RLS](./05-scope-and-delegation.md#phase-b--scoped-rls-resolve--dal)** — `PolicyService.resolve` sets `manifest.scopeIds`; DAL filters `WHERE scope_id IN (...)`.

---

## Goal

Today the policy registry's role→Field **grants** are static (codegen-emitted from `*.policies.yaml`, consumed as `SurfacePolicyDefinition.roles`). The "roles are runtime data" decision splits this:

- **Vocabulary (codegen, build time):** which Surfaces/Fields/actions *exist*. Emitted from `*.surface.yaml` → `${surface}SurfacePolicyDef` in `generated/*.schema.generated.ts`. See [codegen task 04](../../../codegen/docs/tasks/04-policy-registry-gen.md).
- **Grants (runtime, DB data):** which role gets which Field/action + `rowScope`. Moves to `latch_roles` + `latch_role_grants`, CRUD'd by app users, audited.

The two system classes (`system_data`, `system_iam`) stay template-seeded and synthesized in `PolicyService`; not app-deletable ([P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)).

---

## Execution sequence

Run tasks **in order**. Letter suffixes (`01b`, `02b`) are follow-ups that complete or extend the numbered task above them.

| Step | Task | Deliverable | State |
|------|------|-------------|-------|
| — | [00 — Decisions needed](./00-decisions-needed.md) | Parking lot (P1–P10); consult when a fork blocks work | ongoing |
| 1 | [01 — Role tables + built-in seeds](./01-role-tables.md) | Three platform tables + pre-P11 prototype in `apps/spike_policy` | **complete** (2026-06-08) |
| 2 | [01b — P11 catalog realignment](./01b-p11-catalog-realignment.md) | UUID + `role_class` in spike DDL, seeds, `@latch/policy` | **complete** (2026-06-08) |
| 3 | [02 — `RoleGrantProvider` seam](./02-role-grant-provider.md) | Interface + `MemoryRoleGrantProvider`; sync `resolve` | **complete** (2026-06-06) |
| 4 | [02b — DB-backed provider wiring](./02b-db-role-grant-provider.md) | Request-scoped preload from Postgres into provider snapshot | **complete** (2026-06-08) |
| 5 | [03 — Role-editor IAM Surface](./03-role-editor-surface.md) | CRUD roles + grants; vocabulary validation; audited | **complete** (2026-06-08) |
| 6 | [04 — P10 test harness](./04-p10-test-harness.md) | Lock P10; DAL T8 + spike co-located tests | **complete** (2026-06-08) |
| 7 | [05 — Scope primitive + delegation](./05-scope-and-delegation.md) | `latch_scopes` + `scope_id` seam; `row_scope: scope` RLS; scoped delegation | **Phase A complete** (2026-06-09); Phase B/C next |

**Parallel (already done):** [codegen task 04](../../../codegen/docs/tasks/04-policy-registry-gen.md) — vocabulary-only registry + seam types.

**Follow-on:** [Policy console UI](../../../../apps/spike_policy/docs/tasks/README.md) in `apps/spike_policy`.

### Dependency graph

```
codegen 04 (vocabulary + seam types) ─────────────┐
                                                   │
00 (P1–P4, P11 locked; P5–P10 proposals)          │
         │                                         │
         ▼                                         │
    01 (pre-P11 DDL + seeds) ── complete           │
         │                                         │
         ▼                                         │
    01b (P11 realignment) ── complete               │
         │                                         │
         ├──────────────────┐                      │
         ▼                  ▼                      │
    02 (provider seam) ── complete                 │
         │                  │                      │
         ▼                  │                      │
    02b (DB preload) ── complete                      │
         │                                         │
         ▼                                         │
    03 (role editor Surface) ◄── DO NEXT ──────────┘
         (also needs codegen vocabulary catalog for write-time validation)
```

- **01b** blocks **02b** and **03** — DB provider and editor assume P11 catalog shape and UUID `Principal.roles`.
- **02** (seam) is already done; **02b** is the runtime read path only.
- **03** needs **01b** + **02b** + IAM Surface pattern (`user_roles_detail`); fine-tune forks P6–P9 at task start.

---

## Evaluation vehicle

[`apps/spike_policy`](../../../../apps/spike_policy) is the disposable harness — the policy sibling of `apps/spike_codegen`. It holds the platform migration spine (`001`–`008`), spike-only fixtures (`900_fixture_pilot_roles.sql`), and IAM/threat tests (`apps/spike_policy/**/*.test.ts`). Pure policy unit tests stay in `packages/policy/src/*.test.ts`.

> **Schema:** spike migrations match P11 ([01b](./01b-p11-catalog-realignment.md) complete 2026-06-08).

---

## Decisions already locked (see the discussion)

- **(1)** Template seeds only `system_data` + `system_iam` catalog rows (UUID + `role_class`; [P11](./00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)); `app` catalog otherwise starts empty ([P3](./00-decisions-needed.md)). Pilot personas may be seeded in `apps/spike_policy` for harness/tests only.
- **(2)** Grant granularity: sparse rows per role × surface × field × action (+ optional `mode`); default deny — no full-matrix seed on role create ([P2a](./00-decisions-needed.md)).
- **(3)** `row_scope` (`own` \| `all`) lives on `latch_role_surfaces` per (role, surface). A third rung **`scope`** + bounded scope primitive is now **decided** (2026-06-09, [discussion 09](../../../../docs/discussions/09-role-delegation-and-scope.md#decision-bounded-scope-primitive--scoped-delegation-2026-06-09)) — seam + phased build in [task 05](./05-scope-and-delegation.md). ABAC/ReBAC + per-scope differential grants stay deferred ([P1](./00-decisions-needed.md)).
- **(4)** FK semantics: `latch_user_roles.role_id` → `latch_roles.id` **RESTRICT**; grants/bindings **CASCADE** on role delete ([P2](./00-decisions-needed.md)).
- **(5)** Surface schema/glue stay codegen (vocabulary). "Mode overlays" (per-screen restriction) are grants too → runtime.
- **(6)** The "can't grant an undefined Field" guarantee moves from build-time `--check` to **write-time** validation in the role editor, sourced from the codegen catalog.

## Open / to fine-tune later

- Grant storage shape (rows vs JSON blob per role×surface) — starting with rows.
- Whether mode overlays are editable in v1 or deferred.
- `multiRoleCombine` is still `union_grants` only; no change here.
- **Scope + delegation** ([task 05](./05-scope-and-delegation.md)): seam (contracts + DDL) is near-term; Phase B/C (scoped RLS + delegation) is a dedicated phase. Per-scope differential field grants deferred.

## Related

- [`docs/discussions/02-identity-and-permissions.md`](../../../../docs/discussions/02-identity-and-permissions.md) — the decision
- [`docs/discussions/09-role-delegation-and-scope.md`](../../../../docs/discussions/09-role-delegation-and-scope.md) — scope primitive + delegation decision (task 05)
- [`docs/foundations/scope.md`](../../../../docs/foundations/scope.md) — v1 scope change
- [`docs/reference/access-control.md`](../../../../docs/reference/access-control.md) · [`codegen-scope.md`](../../../../docs/reference/codegen-scope.md)
- [`packages/codegen/docs/tasks/04-policy-registry-gen.md`](../../../codegen/docs/tasks/04-policy-registry-gen.md) — vocabulary-only emit + seam type
- `@latch/policy`: [`policy-service.ts`](../../src/policy-service.ts), [`registry.ts`](../../src/registry.ts)
