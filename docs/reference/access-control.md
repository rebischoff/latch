# Access control

How Latch thinks about **granular** data access. Combines **Surface** (working name: Module), **Field**, mandatory **DAL**, optional Postgres RLS, and **UI-aligned manifests**. See [permissions-and-ui-sync.md](./permissions-and-ui-sync.md) and [glossary.md](../glossary.md).

## Resource hierarchy

```
Company (deployment ù own Postgres database)
 ??? Surface (one form / list screen ù spans tables & views)
      ??? Table / view (physical; may appear in many Surfaces)
      ??? Row (entity instance)
      ??? Field (logical, on that Surface)
```

We **do not** use shared-schema multi-tenancy. Each company has its own database; Surfaces never imply cross-company data.

### Decision: database per company (2026-05-27)

**Choice:** Each **company** gets a dedicated PostgreSQL database, provisioned from the same migration template. The application connects to one database per request (or host).

**Out of scope:** Many companies in one database with `tenant_id` row isolation.

**Implications:**

- Company ? `DATABASE_URL` routing (TBD)
- User/role tables inside each company DB (or control plane ù TBD)
- RLS for row/owner rules **within** a company DB
- Hosted Postgres on Vercel (e.g. Neon) ù see [development.md](../development.md)

Actions (draft): `read`, `write`, `delete`, `restore`, `approve`, `hard_delete`.

## Decision: RBAC with built-in roles (2026-05)

**Choice:**

- Platform ships **built-in roles** (exact catalog TBD).
- **Users are assigned to one or more roles** (Latch tables; IdP sync later).
- Surface/Field policies per role in **repo YAML/JSON**.

### Decision: multiple roles ù `multiRoleCombine` (2026-05-27, revised)

**Choice (v1):** When a user has multiple roles, effective permissions are merged using global option **`multiRoleCombine`**. **v1 implements `union_grants` only.** The other three modes are designed as pluggable strategies but not built or tested in v1 ([`scope.md`](../scope.md)).

| Mode | Status | Semantics |
|---|---|---|
| `union_grants` | **v1 default and only mode** | Union of allows ù if **any** role grants an action on a Field/Surface, user has it. |
| `intersection_grants` | Deferred | User has an action only if **every** assigned role grants it. |
| `most_restrictive` | Deferred | Per Field/action, take **least privilege** across roles. |
| `priority` | Deferred | Each role has `priority`; for conflicts, highest-priority role wins. |

**`denyWins` (global, default `true`):** Explicit `deny` in policy overrides allows from any role.

**v1 deliverable:** `PolicyService` unit tests for `union_grants` ù `denyWins` matrix. Engine ships with a `RoleMergeStrategy` seam so other modes can be added without refactor.

See [global-options.md](./global-options.md).

## Surface as policy boundary

Most UI and API entry points are **Surface-scoped** (one form or list page):

- Open `contract_detail` ? manifest + DAL for that Surfaceùs tables, views, and Fields
- Same table `contracts` may appear in `contract_list` with a different Field set and policies
- Cross-Surface access is explicit (e.g. link to `party_detail` by id)

## Field-level permissions

Policies attach to **Field IDs** on a Surface, not raw column names:

```yaml
# Illustrative ù see metadata-and-codegen.md
surface: contract_detail
fields:
  - id: financial_terms
    columns: [contracts.payment_terms, contracts.liability_cap]
```

### Decision: omit vs read-only vs deny (2026-05)

| Manifest | API / DAL | UI |
|----------|-----------|-----|
| No `read` | Field omitted from query and response | Control not rendered |
| `read`, no `write` | Value included | Read-only control |
| Client requests Field without `read` | **403** at gate | N/A |

Optional global setting: **404** instead of **403** for sensitive Fields.

## Row-level rules

Common patterns within a company database:

- Owner: `created_by = current_user`
- Assignment: join to `assignments` table
- Hierarchy: manager sees subtree

**Proposal:** row rules in metadata; compile to RLS where useful; DAL applies `WHERE` clauses.

## DAL (application layer)

**Decision (2026-05):** All application access goes through the **DAL** with `PermissionContext` (manifest + principal + active Surface).

The DAL:

- Loads only tables/views declared for the active Surface
- Projects columns from allowed Fields only
- Applies row filters from manifest / metadata
- Rejects writes to non-writable Fields

## Postgres integration (safety net)

See [postgres-rls-and-security.md](../discovery/postgres-rls-and-security.md).

**Hybrid:** DAL + manifest for Field-level and UI sync; RLS for row rules where discovery confirms value.

## Bulk operations

Bulk update/delete is part of v1. The per-row evaluation model is documented in [`bulk-operations.md`](./bulk-operations.md). Key invariant: bulk paths use the same `PolicyService` + `PermissionContext` as single-record paths ó *no parallel enforcement*.

## Open points

Deny policy YAML syntax, built-in role catalog, break-glass audit, per-Surface override of `multiRoleCombine`. Multi-company DB routing is deferred ([`../scope.md`](../scope.md)).
