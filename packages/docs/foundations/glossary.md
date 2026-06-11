# Glossary

Terms used across docs and (eventually) code. Project: **Latch** ([`naming.md`](./naming.md)).

## Company (deployment)

A **company** is an organizational customer or unit that gets its **own PostgreSQL database**, created from a shared **schema template**. Data is isolated at the database boundary � not by `tenant_id` in a shared database.

> **v1 simplification:** Only one company per deployment. The abstraction for company ? `DATABASE_URL` routing exists, but is hard-coded to a single URL. Multi-company routing is deferred ([`scope.md`](./scope.md)).

We **do not** use shared-schema multi-tenancy.

## Surface

### Decision: lock the term "Surface" (2026-05-27)

**Choice:** The unit that matches one user-facing screen or flow is called a **Surface**. The legacy term **Module** (and identifiers like `module_id`) are retired; platform metadata tables use the `latch_*` prefix ([`naming.md`](./naming.md)).

**Rationale:** "Module" clashes with ESM, npm, and DDD "domain module"; "Surface" matches what it actually is (a UI surface backed by data and policy).

A **Surface** is the unit that matches **one user-facing screen or flow**: a **form**, a **list of records**, or both. It is defined in metadata and drives permissions, DAL, API, audit, and approval for that UI scope.

### What it is

| Aspect | Definition |
|---|---|
| **UX scope** | One page or form (and its list, if any) � what the user sees and edits |
| **Data scope** | **Spans** one or more **tables and/or views** joined for that screen |
| **Tables** | A physical table may appear in **multiple** Surfaces (e.g. `customers` on `customer_detail` and `job_detail`) |
| **Identity** | Stable `id` in repo YAML (e.g. `job`, `customer_detail`) |
| **Policy boundary** | Manifest resolved **per Surface** + **`mode`** (`list` / `detail` / `create`); see **List vs detail** below |

### What it is not

- A single database table (Surfaces are many-to-many with tables).
- A company or database.
- An npm package.

### Example

Surface `job` (anchor `jobs`):

- **Modes:** `list` (searchable grid + bulk), `detail` (single-record form), `create` (deferred patterns)
- **Data:** `jobs`, `customers`, `sites`, `assignments` (and more on detail)
- **Fields:** shared ids across modes where the same logical data appears (e.g. `summary`, `financial_terms`, `assignments`); mode metadata may include/exclude Fields from projection (e.g. `scope` on detail only, `customer_site` on list only)

> **Transitional (Phase 01):** Repo still uses split ids `job_list` and `job_detail` for YAML/codegen until consolidated. Treat them as **`job` + mode** for policy semantics; keep `read` / `rowScope` aligned across both until merge.

### Decision: list and detail are modes, not separate role surfaces (2026-06-01)

**Choice:** For a domain (e.g. jobs), use **one Surface id** and **`mode`** on `PolicyScope` (`list` | `detail` | `create`). **Roles are not defined separately per list vs detail.** Role bindings live in a single **base** policy for that Surface id. **Mode overlays** adjust which actions apply on a given screen (e.g. `submit` on detail only, bulk `write` on `assignments` in list mode) and which Fields appear in structure metadata — overlays **may only restrict**, never grant `read` on a Field the base policy denied.

**Rationale:** Row scope (`own` / `all`) and sensitive Field visibility (e.g. no `read` on `financial_terms` for `field_tech`) must hold for list queries, detail `get`, and bulk on the same anchor table. Split Surface ids duplicated role YAML and invited drift. List vs detail remains a real UX/API difference (projection, bulk, entity id) without a second role matrix.

**Invariants:**

| Concern | Rule |
|--------|------|
| Row scope | Set once per role in **base** policy; same filter for list, detail, bulk |
| Field `read` | Base policy; if denied, omitted on **all** modes |
| Mode overlay | Narrow actions / surfaceActions only; no widening `read` |
| Resolve | `manifest = merge(basePolicy(role, surfaceId), modeOverlay(role, surfaceId, mode))` |
| RLS (post-v1) | Row rules on anchor **table** + principal, not on `*_list` vs `*_detail` ids |
| Enforcement | Still one manifest per request; DAL + `PolicyService` only |

See [`../reference/access-control.md`](../reference/access-control.md) and [`../reference/metadata-and-codegen.md`](../reference/metadata-and-codegen.md).

## Field

A **Field** is a **logical** data element for permissions and UI, not necessarily one database column.

- One Field ? one column (e.g. `summary`)
- One Field ? multiple columns (e.g. `home_address` ? street, city, postcode)
- One Field ? a computed or joined value (e.g. `primary_contact_name`)

Policies grant `read` / `write` / `approve` on Fields on a Surface (**base** bindings, all modes). Mode overlays may restrict actions per screen. Storage mapping (which columns belong to a Field) is defined in Surface metadata, optionally per mode.

See **Decision: list and detail are modes** under [Surface](#surface).

## Entity / record / row

- **Entity:** a business object instance, often anchored by a primary key on a primary table for that Surface.
- **Row:** physical row in a table; access may be row-scoped via app filters (or RLS post-v1).

## Policy

A rule that allows or denies an **action** on a **resource** (Surface, Field, row) for a **principal** (user, role). Policies live in repo YAML and bind to **roles**. Effective access merges roles per global `multiRoleCombine` (only `union_grants` in v1); explicit deny overrides when `denyWins` is true. See [`architecture/access-control.md`](../reference/access-control.md).

## Audit event

An append-only log entry for a data change: actor, timestamp, resource, operation, and before/after or patch. Distinct from **approval trail** events (decisions).

## Delete (hard delete)

Removes the row from live tables. The DAL writes an audit entry with `action = delete` and a `before` snapshot. **No** `deleted_at` tombstone columns in v1. **Recovery** is restore-from-audit (privileged replay), not undelete — see [`scope.md`](./scope.md) and [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md).

> **Deprecated term:** "soft delete" — do not use in new docs or code.

## Approval trail (accept / reject)

Workflow where proposed changes sit in **pending** until an authorized principal **accepts** or **rejects**. Configured per Surface or Field. v1 reviewers are **internal only**.

## Principal

Who is acting: authenticated user, service account, or system job. Carried into Postgres via `SET LOCAL` session variables when relevant.

## Role

A named bundle of permissions. **Built-in roles** ship with the platform. App roles extend these. Users are assigned to one or more roles. (Optional `priority` for the future `priority` merge mode.)

## Effective access (manifest)

Server-computed structure listing which Surfaces, Fields, and actions the current principal has for a given scope (page, nav). Serialized to the UI for rendering; **not** a security token for writes.

## DAL (data access layer)

The only supported application path to business tables. Accepts `PermissionContext` and narrows queries/updates to allowed Fields and rows for the active Surface. Lives in `packages/dal`.

## PolicyService

Server-only component that evaluates roles and metadata to produce a manifest. Lives in `packages/policy`.

## PermissionContext

Request-scoped object carrying `{ principal, manifest, surface }`. Required by every DAL call.

## Bulk operation

A DAL method that processes many ids in one request with per-row permission evaluation and partial-success reporting. See [`architecture/bulk-operations.md`](../reference/bulk-operations.md).

## Discovery

Phase of comparing Postgres features (RLS, views) vs application-layer enforcement. **Deferred** post-v1.
