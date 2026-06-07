# Runtime roles — task plan

> **Quarterback for app-managed roles.** Source of intent: the "[roles are runtime data](../../../../docs/discussions/02-identity-and-permissions.md)" decision (2026-06-06) and the v1 scope change in [`scope.md`](../../../../docs/foundations/scope.md). These tasks move role **definitions** (catalog + grants) from build-time codegen/YAML to **runtime DB data** that app users CRUD through a permission-gated IAM Surface.
> **Status:** In progress (2026-06-06). Provider seam complete; decisions parking lot ([00](./00-decisions-needed.md)) + `apps/spike_policy` fixture scaffolded; DB tables, DB-backed provider, and role-editor Surface remain.

---

## Goal

Today the policy registry's role→Field **grants** are static (codegen-emitted from `*.policies.yaml`, consumed as `SurfacePolicyDefinition.roles`). The "roles are runtime data" decision splits this:

- **Vocabulary (codegen, build time):** which Surfaces/Fields/actions *exist*. Emitted from `*.surface.yaml` → `${surface}SurfacePolicyDef` in `generated/*.schema.generated.ts`. See [codegen task 04](../../../codegen/docs/tasks/04-policy-registry-gen.md).
- **Grants (runtime, DB data):** which role gets which Field/action + `rowScope`. Moves to `latch_roles` + `latch_role_grants`, CRUD'd by app users, audited.

The two built-ins (`data_master`, `iam_master`) stay synthesized/seeded in code and are not app-deletable.

---

## Tasks

| # | Task | Owns | State |
|---|------|------|-------|
| 00 | [Decisions needed](./00-decisions-needed.md) | fine-tune forks (P1–P10) that gate 01/02/03 | parking lot |
| 01 | [Role tables + built-in seeds](./01-role-tables.md) | `latch_roles`, `latch_role_grants` migrations + seeds | stub |
| 02 | [`RoleGrantProvider` seam in `@latch/policy`](./02-role-grant-provider.md) | resolve grants from a provider, not the static registry | seam complete (2026-06-06); DB wiring open |
| 03 | [Role-editor IAM Surface](./03-role-editor-surface.md) | CRUD roles + grants; write-time vocabulary validation; audited | stub |

### Evaluation vehicle

`apps/spike_policy` is the disposable harness for these tasks — the policy sibling of `apps/spike_codegen`. It holds the **proposed** `latch_roles` / `latch_role_grants` shape (Drizzle schema + `migrations/001_latch_roles.sql`) reflecting the P1–P4 proposals in [task 00](./00-decisions-needed.md). It is a **fixture**: assertions live in `packages/policy/src/*.test.ts` (vitest only scans `packages/**`).

### Dependencies

```
codegen 04 (vocabulary catalog + RoleGrantProvider seam type)
        │
00 (decisions P1–P4) ── gates ──┐
        │                       │
        ├── 01 (DB tables + seeds; scaffolded in apps/spike_policy)
        │                       │
        └── 02 (provider seam: memory provider for tests, DB provider for runtime)
                    │
                    └── 03 (IAM Surface CRUD over 01, validating against the codegen catalog)
                        (gated by 00 P6–P9)
```

- **01** can land independently (DDL + seeds).
- **02** needs the catalog seam from codegen 04; ships a memory provider so `PolicyService` tests keep passing without a DB.
- **03** needs 01 (tables) + the codegen vocabulary catalog (allowed-options for write-time validation) + the existing IAM Surface pattern (`user_roles_detail`).

---

## Decisions already locked (see the discussion)

- **(1)** Only `data_master` / `iam_master` are code-defined built-ins (`is_builtin = true`, not app-deletable); pilot app roles (`field_tech`, `office_admin`) seed as deletable runtime rows ([P3](./00-decisions-needed.md)).
- **(2)** Grant granularity: sparse rows per role × surface × field × action (+ optional `mode`); default deny — no full-matrix seed on role create ([P2a](./00-decisions-needed.md)).
- **(3)** `row_scope` (`own` \| `all`) lives on `latch_role_surfaces` per (role, surface); richer scopes deferred ([P1](./00-decisions-needed.md)).
- **(4)** FK semantics: `latch_user_roles.role_id` → `latch_roles.id` **RESTRICT**; grants/bindings **CASCADE** on role delete ([P2](./00-decisions-needed.md)).
- **(5)** Surface schema/glue stay codegen (vocabulary). "Mode overlays" (per-screen restriction) are grants too → runtime.
- **(6)** The "can't grant an undefined Field" guarantee moves from build-time `--check` to **write-time** validation in the role editor, sourced from the codegen catalog.

## Open / to fine-tune later

- Grant storage shape (rows vs JSON blob per role×surface) — starting with rows.
- Whether mode overlays are editable in v1 or deferred.
- `multiRoleCombine` is still `union_grants` only; no change here.

## Related

- [`docs/discussions/02-identity-and-permissions.md`](../../../../docs/discussions/02-identity-and-permissions.md) — the decision
- [`docs/foundations/scope.md`](../../../../docs/foundations/scope.md) — v1 scope change
- [`docs/reference/access-control.md`](../../../../docs/reference/access-control.md) · [`codegen-scope.md`](../../../../docs/reference/codegen-scope.md)
- [`packages/codegen/docs/tasks/04-policy-registry-gen.md`](../../../codegen/docs/tasks/04-policy-registry-gen.md) — vocabulary-only emit + seam type
- `@latch/policy`: [`policy-service.ts`](../../src/policy-service.ts), [`registry.ts`](../../src/registry.ts)
