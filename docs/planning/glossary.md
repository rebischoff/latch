# Glossary

Terms used across docs and (eventually) code. Project: **Latch** ([`naming.md`](./naming.md)).

## Company (deployment)

A **company** is an organizational customer or unit that gets its **own PostgreSQL database**, created from a shared **schema template**. Data is isolated at the database boundary ù not by `tenant_id` in a shared database.

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
| **UX scope** | One page or form (and its list, if any) ù what the user sees and edits |
| **Data scope** | **Spans** one or more **tables and/or views** joined for that screen |
| **Tables** | A physical table may appear in **multiple** Surfaces (e.g. `customers` on `customer_detail` and `job_detail`) |
| **Identity** | Stable `id` in repo YAML (e.g. `job_detail`, `job_list`) |
| **Policy boundary** | Manifest and policies are resolved **per Surface** (and per record when in detail mode) |

### What it is not

- A single database table (Surfaces are many-to-many with tables).
- A company or database.
- An npm package.

### Example

Surface `job_detail`:

- UI: one detail form
- Data: `jobs`, `customers`, `sites`, `job_lines`, `assignments`, `attachments`
- Fields: `summary`, `scope`, `financials`, `assignments`, `attachments`

Surface `job_list`:

- UI: searchable list
- Data: mainly `jobs` (+ joins for display columns)
- Same table `jobs` as `job_detail`, different Field set and Surface id.

### List vs detail

One Surface can declare **modes** (list / detail / create) or split into two ids. Convention TBD in metadata schema. **Invariant:** permissions and manifests are scoped to the Surface (and mode) the user opened.

See [`architecture/metadata-and-codegen.md`](./architecture/metadata-and-codegen.md).

## Field

A **Field** is a **logical** data element for permissions and UI, not necessarily one database column.

- One Field ? one column (e.g. `summary`)
- One Field ? multiple columns (e.g. `home_address` ? street, city, postcode)
- One Field ? a computed or joined value (e.g. `primary_contact_name`)

Policies grant `read` / `write` / `approve` on Fields within a Surface. Storage mapping is defined in Surface metadata.

## Entity / record / row

- **Entity:** a business object instance, often anchored by a primary key on a primary table for that Surface.
- **Row:** physical row in a table; access may be row-scoped via app filters (or RLS post-v1).

## Policy

A rule that allows or denies an **action** on a **resource** (Surface, Field, row) for a **principal** (user, role). Policies live in repo YAML and bind to **roles**. Effective access merges roles per global `multiRoleCombine` (only `union_grants` in v1); explicit deny overrides when `denyWins` is true. See [`architecture/access-control.md`](./architecture/access-control.md).

## Audit event

An append-only log entry for a data change: actor, timestamp, resource, operation, and before/after or patch. Distinct from **approval trail** events (decisions).

## Soft delete

Record marked deleted (`deleted_at`, `deleted_by`) but retained in storage. Default queries exclude it. (Restore action and hard delete are deferred ù [`scope.md`](./scope.md).)

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

A DAL method that processes many ids in one request with per-row permission evaluation and partial-success reporting. See [`architecture/bulk-operations.md`](./architecture/bulk-operations.md).

## Discovery

Phase of comparing Postgres features (RLS, views) vs application-layer enforcement. **Deferred** post-v1.
