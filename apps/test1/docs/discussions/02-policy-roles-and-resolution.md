# Discussion B — `@latch/policy`: roles shape and how policy works

> **Status:** Open (2026-06-04). Clarifies how policy relates to `latch_user_roles` and test1’s phased YAML → DB path.

## Question

Is `@latch/policy` designed to be agnostic of the **actual roles shape** in the database? How does policy work end-to-end?

**Short answer:** Yes. Policy only sees `Principal.roles: string[]`. It does not read `latch_user_roles`, role metadata tables, or auth sessions. The **app** loads role ids from DB (or stub env) and passes them in.

## Data flow

```mermaid
flowchart LR
  subgraph app [App — test1 / CRM]
    GP[getPrincipal]
    LUR[(latch_user_roles)]
    GP --> LUR
  end

  subgraph policy [@latch/policy]
    PS[PolicyService.resolve]
    REG[PolicyRegistry\nYAML / future DB loader]
    id1[principal.roles string array]
    PS --> REG
    id1 --> PS
  end

  subgraph downstream [@latch/dal + UI]
    M[Manifest]
    DAL[DAL / FieldControl]
  end

  GP --> id1
  PS --> M
  M --> DAL
```

1. **`getPrincipal()`** — `{ id, roles: ["iam_master", "data_master"] }`  
2. **`PolicyService.resolve(principal, { surface: "contact" })`** — merge grants for those role ids  
3. **`Manifest`** — effective field actions + row scope for one Surface  
4. **DAL** — enforces manifest on reads/writes; UI renders from manifest  

Policy **never** asks “what roles does this user have?” That is always **app + DB** (or `LATCH_STUB_*` in tests).

## What “roles shape” means to policy

| Layer | Shape | Policy cares? |
|-------|--------|----------------|
| `latch_user_roles` rows | `(user_id, role_id)` | **No** |
| `latch_roles` (test1 task 20) | `(id, display_name, kind)` | **No** (metadata for IAM UI) |
| `latch_role_grants` (task 21) | grants per role/surface/field | **Indirectly** — task 22 builds registry from DB |
| `Principal.roles` | `string[]` | **Yes** — only this |

Each string must **match a key** in the surface’s policy registry:

```ts
surfaceDef.roles[roleId]  // → { fields, rowScope, surfaceActions }
```

Unknown role ids are **skipped** (no error → no grants from that role).

## What policy registry contains (today)

Built from app metadata (CRM: codegen + `*.policies.yaml`; test1 task 10: same pattern):

```ts
interface SurfacePolicyDefinition {
  surface: SurfaceId;
  fieldIds: readonly FieldId[];
  roles: Record<RoleId, RolePolicyBinding>;  // keyed by role id string
  kind?: "business" | "iam";
}
```

Example mental model for surface `contact`:

| Role id | In YAML? | Effect |
|---------|----------|--------|
| `iam_master` | Maybe on IAM surfaces only | IAM grants |
| `data_master` | Often omitted on business surfaces | **Synthesized** by policy engine wildcard on `kind: business` |
| `custom_role` | Yes (task 10+) | Explicit field grants |

Built-in **`data_master`** is special-cased inside `@latch/policy` — not loaded from YAML per surface.

## Multi-role merge

v1: **`union_grants`** + **`denyWins: true`**.

If `principal.roles = ["role_a", "role_b"]`, policy collects bindings for both, merges field actions, merges row scope (`all` wins over `own`).

## test1 phased path

| Phase | Role ids from | Grants from |
|-------|---------------|-------------|
| Tasks 10–12 | `latch_user_roles` | Repo YAML (`*.policies.yaml`) |
| Tasks 20–21 | `latch_user_roles` + `latch_roles` table | Still YAML or partial DBpolicy |
| Task 22 | Same | **`latch_role_grants`** → runtime registry loader |

**Policy API unchanged:** still `resolve(principal, scope)` with `principal.roles: string[]`. Only **where registry is built** changes.

## Agnostic vs opinionated

| Agnostic (by design) | Opinionated (locked) |
|----------------------|----------------------|
| Auth provider | `union_grants` merge |
| DB schema for assignments | `denyWins: true` |
| Role metadata tables | Built-in `data_master` wildcard on business surfaces |
| How `roles[]` is populated | Server-only resolve → manifest |

## Open questions

1. When task 22 loads grants from DB, do we still keep **YAML defaults** for built-ins or fully DB-driven?
2. Should unknown role ids in `Principal.roles` **log/warn** (debug) vs silent skip?
3. test1 **`latch_roles.kind: system | custom`** — does policy need to know `kind`, or only IAM surfaces?
4. Document **`RoleId` = opaque string** in foundations so DB RBAC doesn’t imply policy understands role rows?

## Recommendation (draft — not locked)

- Treat **`Principal.roles` as the only policy input** for role identity; document in [AUTH.md](../AUTH.md) and platform glossary.  
- Keep YAML-first built-ins for tasks 10–12; task 22 extends **registry construction**, not `PolicyService.resolve` signature.  
- Add regression test: throwaway role id in DB with no YAML binding → empty grants (proves agnosticism).

## Related

- [`packages/policy/src/policy-service.ts`](../../../../packages/policy/src/policy-service.ts)  
- [`docs/reference/permissions-and-ui-sync.md`](../../../../docs/reference/permissions-and-ui-sync.md)  
- Phase 03 built-ins: [`docs/phases/03-identity-iam/decisions.md`](../../../../docs/phases/03-identity-iam/decisions.md)  
- test1 task 22: [../tasks/22-policy-db-loader.md](../tasks/22-policy-db-loader.md)
