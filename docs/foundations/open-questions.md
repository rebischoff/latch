# Open questions

Decisions still needed. Defaults: [`architecture/global-options.md`](./global-options.md). Scope in/out: [`scope.md`](./scope.md). Local vs Vercel: [`development.md`](./development.md).

## Active (block work)

These are tracked in [`STATUS.md`](../../STATUS.md) "Active decisions":

- [ ] **D2** Auth provider for v1: NextAuth / Clerk / custom JWT / corporate SSO? ? **Step 3 uses a stub principal** (env vars; task [`15-stub-principal.md`](../archive/tasks/job_detail/15-stub-principal.md)); real IdP choice remains open.

## Active (don't block v1, but should resolve before related code)

### Identity & users
- [ ] Where do users/roles live  platform tables vs external IdP groups?
- [ ] Built-in role catalog (exact list, default permissions per role)
- [ ] Break-glass audit (deferred behavior, but design now)

### Authorization model
- [ ] Deny policy YAML syntax

### Surface / Field metadata
- [ ] Versioning of Field definitions when columns rename
- [ ] Primary / anchor entity when a Surface spans many tables

### Bulk operations
- [ ] `forbidden_row` vs `not_found` distinction in default response
- [ ] Whether to log denied bulk attempts in audit by default

### Approval
- [ ] Can submitter edit pending before decision?
- [ ] Expiry / auto-reject for stale pending?

### Data layer
- [ ] Neon driver: standard `pg` vs `@neondatabase/serverless` for production
- [ ] How to enforce "app role is not superuser" at runtime (`SELECT current_user` assertion in middleware?)

### Operations
- [ ] Legal hold workflow (deferred, but document interaction with retention)
- [ ] When to enable `gdprErasureMode` (deferred behavior)

### Monorepo
- [ ] When to extract `packages/*` to a separate publishable **repo** (post-v1) — note: in-repo **genericization** is no longer deferred (resolved 2026-06-01, below).

## Resolved (chronological)

| Date | Topic | Decision | Doc |
|---|---|---|---|
| 2026-05-27 | Hosting | Vercel + hosted Postgres (Neon) for preview/prod | [`development.md`](./development.md) |
| 2026-05-30 | Local Postgres | Neon for local dev too; Docker optional | [`development.md`](./development.md) |
| 2026-05-27 | Multi-tenant | **Not used**  no shared-schema `tenant_id` model | [`glossary.md`](./glossary.md) |
| 2026-05-27 | Company isolation | Database-per-company from template (v1: single company) | [`architecture/global-options.md`](./global-options.md) |
| 2026-05-27 | Authz | RBAC; multiple roles per user | [`architecture/access-control.md`](../reference/access-control.md) |
| 2026-05-27 | Surface definition | One form/list page; spans tables/views | [`glossary.md`](./glossary.md) |
| 2026-05-27 | Policy metadata | Repo YAML/JSON | [`architecture/metadata-and-codegen.md`](../reference/metadata-and-codegen.md) |
| 2026-05-27 | Manifest delivery | RSC props when possible | [`architecture/permissions-and-ui-sync.md`](../reference/permissions-and-ui-sync.md) |
| 2026-05-27 | Approval v1 | All-or-nothing pending; internal reviewers only | [`architecture/approval-trails.md`](../reference/approval-trails.md) |
| 2026-05-27 | ORM | Drizzle | [`architecture/global-options.md`](./global-options.md) |
| 2026-05-27 | Audit | Immutable default; 3-year retention | [`architecture/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md) |
| 2026-05-27 | Multi-role merge (v1) | **Single mode `union_grants`** with `denyWins`; other modes deferred | [`architecture/access-control.md`](../reference/access-control.md), [`scope.md`](./scope.md) |
| 2026-05-27 | Surface vs Module | Lock **Surface** as the term; rename in Phase-0 naming pass | [`glossary.md`](./glossary.md), [`naming.md`](./naming.md) |
| 2026-05-27 | Final project name | **Latch** (replaces codename Modula) | [`naming.md`](./naming.md) |
| 2026-05-27 | API style | REST handlers (public surface) + Server Actions (internal sugar); no tRPC / GraphQL v1 | [`architecture/api-style.md`](../reference/api-style.md) |
| 2026-05-27 | Bulk operations | Per-row eval; `partial` default + `all_or_nothing` flag | [`architecture/bulk-operations.md`](../reference/bulk-operations.md) |
| 2026-05-30 | Delete model | **Hard delete only**; no soft delete / `deleted_at`; audit `delete`; recovery = restore-from-audit (Phase 04) | [`scope.md`](./scope.md), [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md) |
| 2026-05-27 | RLS | **Deferred** post-v1; v1 enforcement is DAL-only | [`scope.md`](./scope.md), [`discovery/postgres-rls-and-security.md`](../discovery/postgres-rls-and-security.md) |
| 2026-05-27 | Monorepo | `apps/*` + `packages/*` from day one (npm workspaces) | [`architecture/packages.md`](../reference/packages.md) |
| 2026-05-27 | Approval reviewer scope | Internal only in v1; external (customer sign-off) deferred | [`architecture/approval-trails.md`](../reference/approval-trails.md) |
| 2026-05-28 | **D3** Pilot Surface | **`job_detail`** ? S1/S3/S4 in Step 3 | [`use-cases.md`](./use-cases.md), [`architecture/access-control.md`](../reference/access-control.md) |
| 2026-05-28 | **D4** Role merge (v1 confirm) | **`union_grants` only**; global **`denyWins: true`** | [`architecture/access-control.md`](../reference/access-control.md), [`scope.md`](./scope.md) |
| 2026-05-28 | **D5** RLS (v1 confirm) | **Deferred** post-v1; enforcement is **DAL-only** | [`scope.md`](./scope.md), [`discovery/postgres-rls-and-security.md`](../discovery/postgres-rls-and-security.md) |
| 2026-06-01 | List vs detail (`job_list` / `job_detail`) | **One Surface id per domain** (e.g. `job`) with **`mode`**: `list` \| `detail` \| `create`. Roles bind to **base** policy on that id; **mode overlays** restrict only (never widen `read`). Row scope once per role on the Surface. `job_list` / `job_detail` are **transitional** split ids until merge. | [`glossary.md`](./glossary.md), [`../reference/access-control.md`](../reference/access-control.md) |
| 2026-06-01 | Sensitive Field / Surface 403 vs 404 | Platform default **`403`**; per-Surface override **`404`** allowed. Phase 02: **`customer_detail`** uses **`404`** (no grant for `field_tech`). Jobs keep default. | [`global-options.md`](./global-options.md), [`../phases/02-ui-sync/decisions.md`](../phases/02-ui-sync/decisions.md) |
| 2026-06-01 | Package genericization timing | **Pull forward now (in-repo).** `@latch/*` carry no consumer domain (table/Zod/Surface/UI); `apps/crm` is the sole consumer; `apps/web` retired. Separate publishable repo remains post-v1. | [`../phases/02b-platform-extraction/decisions.md`](../phases/02b-platform-extraction/decisions.md) |
