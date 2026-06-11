# Requirements

Structured from product discovery. Status: **draft** ? kept in sync with [`scope.md`](./scope.md) (in/out for v1).

## Functional

### R1 ? Next.js backend + PostgreSQL

| ID | Requirement | Status |
|----|-------------|--------|
| R1.1 | Next.js App Router hosts API and server logic | Done (scaffold) |
| R1.2 | PostgreSQL is the primary datastore | Planned (Neon — local, preview, prod) |
| R1.3 | Migrations via Drizzle; raw SQL for triggers/RLS | Resolved |

### R2 ? Business apps with data access control

| ID | Requirement | Status |
|----|-------------|--------|
| R2.1 | Every data access path goes through the authorization layer | Planned ? DAL + manifest |
| R2.2 | Policies express role-based rules; users assigned to roles; built-in platform roles | Planned |
| R2.3 | Deny-by-default for sensitive Surfaces / Fields | Planned |

### R3 ? Granular access control

| ID | Requirement | Status |
|----|-------------|--------|
| R3.1 | Permissions at Surface, table/view, row, and Field granularity | Planned |
| R3.2 | Actions: `read`, `write`, `approve`, `delete`, `restore`, `hard_delete` (hard_delete deferred) | Planned |
| R3.3 | Policies composable (role + row scope) | Planned |

### R4 ? Postgres-native security (preferred, not mandatory)

| ID | Requirement | Status |
|----|-------------|--------|
| R4.1 | Row Level Security for tenant/row isolation | **Deferred** post-v1 (see [`scope.md`](./scope.md)) |
| R4.2 | Column-level grants / views for Field masking | Deferred |
| R4.3 | App-layer enforcement is the v1 mechanism | **Resolved** |

See [`discovery/postgres-rls-and-security.md`](../discovery/postgres-rls-and-security.md).

### R5 ? Fields (logical column groups)

| ID | Requirement | Status |
|----|-------------|--------|
| R5.1 | A Field maps to one or more physical columns | Planned |
| R5.2 | Access control and forms refer to Fields, not raw column names | Planned |
| R5.3 | Fields can be renamed in metadata without breaking policy IDs | Planned |

### R6 ? Audit logging of data changes

| ID | Requirement | Status |
|----|-------------|--------|
| R6.1 | Capture actor, time, entity, before/after (or delta) | Planned |
| R6.2 | Immutable append-only audit store | Planned |
| R6.3 | Correlation with `request_id` and `approval_id` | Planned |
| R6.4 | Bulk operations produce per-row audit + optional batch summary | Planned (see [`architecture/bulk-operations.md`](../../dal/docs/bulk-operations.md)) |

### R7 — Delete and recovery

| ID | Requirement | Status |
|----|-------------|--------|
| R7.1 | Hard delete: row removed; audit `before` snapshot; `action = delete` | In progress (pilot DAL) |
| R7.2 | No `deleted_at` / soft delete | **Resolved** (2026-05-30) |
| R7.3 | Policy `delete` action gates who may remove live rows | Planned |
| R7.4 | Restore-from-audit (privileged replay) | **Deferred** (Phase 04) |

### R8 ? Accept/reject trails

| ID | Requirement | Status |
|----|-------------|--------|
| R8.1 | Configurable per Surface/Field | Planned |
| R8.2 | Pending changes held until accepted or rejected | Planned (all-or-nothing v1) |
| R8.3 | Trail records actor, decision, comment, timestamp | Planned |
| R8.4 | Reviewer scope: **internal only** in v1 (no external reviewers) | Resolved |

See [`architecture/approval-trails.md`](../../approval/docs/approval-trails.md).

### R9 ? Surfaces (working name "Module" in legacy code)

| ID | Requirement | Status |
|----|-------------|--------|
| R9.1 | Surface = one form/list screen, spans tables/views | Resolved |
| R9.2 | Surface metadata drives API shape and permission checks | Planned |
| R9.3 | Surfaces nest or reference each other where needed | Planned |

### R10 ? Permissions, DAL, and UI sync

| ID | Requirement | Status |
|----|-------------|--------|
| R10.1 | Resolve effective permissions (manifest) on the server before DAL/DB access | Planned |
| R10.2 | UI receives page-scoped manifest; nav receives only permitted routes | Planned |
| R10.3 | Unauthorized Field values are not included in API responses | Planned |
| R10.4 | UI renders Fields as editable, read-only, or omitted based on manifest | Planned |
| R10.5 | Explicit request for forbidden Field returns 403 (optional 404 via config) | Planned |
| R10.6 | Write payloads reject unknown or non-writable keys (strict) | Planned |
| R10.7 | Every mutation re-runs authorization | Planned |
| R10.8 | Surface metadata codegen produces Zod/schemas; domain rules hand-written | Planned |

See [`architecture/permissions-and-ui-sync.md`](../reference/permissions-and-ui-sync.md).

### R11 ? Bulk operations *(new)*

| ID | Requirement | Status |
|----|-------------|--------|
| R11.1 | Bulk update and bulk delete supported via DAL + REST endpoint | Planned (v1) |
| R11.2 | Per-row permission evaluation; forbidden rows reported, not silently skipped | Planned |
| R11.3 | Two modes: `partial` (default) and `all_or_nothing` (flag) | Planned |
| R11.4 | Hard cap on batch size (default 500, global option `bulkMaxBatch`) | Planned |
| R11.5 | Audit: one row per changed entity + optional batch summary | Planned |
| R11.6 | Bulk inserts and async (>cap) bulk jobs ? **deferred** | Deferred |

See [`architecture/bulk-operations.md`](../../dal/docs/bulk-operations.md).

### R12 ? API style *(new)*

| ID | Requirement | Status |
|----|-------------|--------|
| R12.1 | REST route handlers are the public/contract surface | Resolved |
| R12.2 | Server Actions allowed as ergonomic sugar for RSC forms | Resolved |
| R12.3 | Same DAL underlies both styles; no parallel enforcement paths | Resolved |
| R12.4 | tRPC / GraphQL **out of scope** v1 | Resolved |

See [`architecture/api-style.md`](../reference/api-style.md).

### R13 ? Packaging *(new)*

| ID | Requirement | Status |
|----|-------------|--------|
| R13.1 | Monorepo (`apps/*` + `packages/*`) from day one | Resolved |
| R13.2 | Import boundaries enforced via ESLint (`no-restricted-imports`) | Planned |
| R13.3 | Only `@<project>/contracts` and `@<project>/react` are client-importable | Resolved |

See [`architecture/packages.md`](../reference/packages.md).

## Non-functional (draft)

| ID | Requirement |
|----|-------------|
| NF1 | Local dev: Neon `DATABASE_URL` + `npm run dev` (no Docker required) |
| NF2 | Clear separation: identity (authn) vs authorization (authz) |
| NF3 | Testable policy layer (unit + integration against Postgres) |
| NF4 | Documentation-first for governance features |
| NF5 | Codegen drift detected in CI (`codegen --check`) |
| NF6 | Threat-model tests T1, T2, T3, T5, T6, T11, T13, T15 pass in CI before v1 |

## Out of scope (for v1)

See [`scope.md`](./scope.md) ? keep that file as the canonical list. Highlights:

- Multi-region replication
- Real-time collaborative editing
- Built-in workflow designer UI
- Multi-company database routing
- RLS
- Hard delete, restore UI
- Partial approvals, external reviewers
- The four-mode role merge (only `union_grants` in v1)
- tRPC, GraphQL
