# Access control

How Latch thinks about **granular** data access. Combines **Surface** (working name: Module), **Field**, mandatory **DAL**, optional Postgres RLS, and **UI-aligned manifests**. See [permissions-and-ui-sync.md](./permissions-and-ui-sync.md) and [glossary.md](../foundations/glossary.md).

## Resource hierarchy

```
Company (deployment ? own Postgres database)
 ??? Surface (one form / list screen ? spans tables & views)
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
- User/role tables inside each company DB (or control plane ? TBD)
- RLS for row/owner rules **within** a company DB
- Hosted Postgres on Vercel (e.g. Neon) ? see [development.md](../foundations/development.md)

Actions (draft): `read`, `write`, `delete`, `restore`, `approve`, `hard_delete`.

## Decision: RBAC with built-in roles (2026-05)

**Choice:**

- Platform ships **built-in roles** (exact catalog TBD).
- **Users are assigned to one or more roles** (Latch tables; IdP sync later).
- Surface/Field policies per role in **repo YAML/JSON**.

### Decision: multiple roles ? `multiRoleCombine` (2026-05-27, revised)

**Choice (v1):** When a user has multiple roles, effective permissions are merged using global option **`multiRoleCombine`**. **v1 implements `union_grants` only.** The other three modes are designed as pluggable strategies but not built or tested in v1 ([`scope.md`](../foundations/scope.md)).

| Mode | Status | Semantics |
|---|---|---|
| `union_grants` | **v1 default and only mode** | Union of allows ? if **any** role grants an action on a Field/Surface, user has it. |
| `intersection_grants` | Deferred | User has an action only if **every** assigned role grants it. |
| `most_restrictive` | Deferred | Per Field/action, take **least privilege** across roles. |
| `priority` | Deferred | Each role has `priority`; for conflicts, highest-priority role wins. |

**`denyWins` (global, default `true`):** Explicit `deny` in policy overrides allows from any role.

**v1 deliverable:** `PolicyService` unit tests for `union_grants` ? `denyWins` matrix. Engine ships with a `RoleMergeStrategy` seam so other modes can be added without refactor.

See [global-options.md](../foundations/global-options.md).

### Decision: Step 3 pilot Surface (2026-05-28)

**Choice:** The v1 pilot Surface id is **`job_detail`**. It covers use cases **S1**, **S3**, and **S4** in [`use-cases.md`](../foundations/use-cases.md) (field tech read, PM approval, cross-tech denial).

**Rationale:** One multi-table Surface exercises Field-level permissions (financials hidden from field tech), row-level rules (own jobs), approval (change orders), audit, and hard delete without building the full trades-CRM surface set.

**Locked with this decision (task 00):**

- **D4:** v1 implements **`union_grants` only** with global **`denyWins: true`** (see **Decision: multiple roles ? `multiRoleCombine`** above).
- **D5:** **RLS deferred**; v1 enforcement is DAL-only ([`scope.md`](../foundations/scope.md)).

## Surface as policy boundary

Most UI and API entry points are **Surface-scoped** (one domain screen family: list, detail, or create on the same anchor entity):

- `PolicyService.resolve(principal, { surface: "job", mode: "list" | "detail", entityId? })` ? one manifest per request
- Same anchor table (e.g. `jobs`) powers list, detail, and bulk; **row scope and Field `read` come from base role policy on that Surface id**, not from separate `*_list` / `*_detail` role files
- Cross-Surface access is explicit (e.g. link from `job` detail to `customer_detail` by id)

### Decision: list and detail are modes on one Surface (2026-06-01)

**Choice:** Use **one Surface id per domain** (e.g. `job`) with **`mode`**: `list`, `detail`, or `create`. **Roles bind once** in base policy (`job.policies.yaml` target shape). **Mode overlays** (optional YAML section or generated equivalent) restrict actions or surfaceActions for a screen; they **must not** grant `read` on a Field denied in base policy.

**Rationale:** Users have roles, not “list roles” vs “detail roles.” If `financial_terms` is not readable for `field_tech`, list and detail must both omit it; detail may still allow `submit` via overlay. Row filters (`rowScope: own`) apply to `GET /jobs` and `GET /jobs/:id` alike. Future RLS on `jobs` keys off the same row semantics, not Surface id suffixes.

**Transitional (Phase 01):** Implementation still uses `job_list` and `job_detail` as separate registry keys and policy files. Semantics follow this decision; consolidation (single id + `PolicyScope.mode` in `PolicyService`) is follow-up work. Until then, **keep base grants aligned** across both files (especially `rowScope` and Field `read`).

**Resolve (target):**

```text
base   = role grants for surface "job"     # rowScope, Field read/write/deny
overlay = mode grants for surface "job"   # list: read-only summary; detail: submit on financial_terms; etc.
manifest.fields = union_grants(base, overlay) with denyWins; overlay cannot add read denied in base
```

`PolicyScope.mode` exists in `@latch/contracts`; wire in `packages/policy` when merging split ids.

See [`../foundations/glossary.md`](../foundations/glossary.md).

## Field-level permissions

Policies attach to **Field IDs** on a Surface, not raw column names:

```yaml
# Illustrative ? see metadata-and-codegen.md
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

Bulk update/delete is part of v1. The per-row evaluation model is documented in [`bulk-operations.md`](./bulk-operations.md). Key invariant: bulk paths use the same `PolicyService` + `PermissionContext` as single-record paths ? *no parallel enforcement*.

## Open points

Deny policy YAML syntax, built-in role catalog, break-glass audit, per-Surface override of `multiRoleCombine`. Multi-company DB routing is deferred ([`../scope.md`](../foundations/scope.md)).
