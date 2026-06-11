# Open questions

Decisions still needed. Defaults: [`architecture/global-options.md`](./global-options.md). Scope in/out: [`scope.md`](./scope.md). Local vs Vercel: [`development.md`](./development.md).

## Active (block work)

_None — D2 resolved 2026-06-02 (Phase 03 task **00**)._

## Active (don't block v1, but should resolve before related code)

### Identity & users
- [ ] Break-glass audit (deferred behavior, but design now — not Phase 04 DoD)

### Authorization model
- [ ] Deny policy YAML syntax

### Surface / Field metadata
- [ ] Versioning of Field definitions when columns rename
- [ ] Primary / anchor entity when a Surface spans many tables

### Bulk operations
- [ ] `forbidden_row` vs `not_found` distinction in default response
- [ ] Whether to log denied bulk attempts in audit by default — **deferred** (threat **T17**; design note only in Phase 04; not Phase 04 DoD — see [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md))

### Approval
- [ ] Expiry / auto-reject for stale pending? (submitter edit resolved 2026-06-02: withdraw + resubmit only — [`../phases/05-verification/decisions.md`](../phases/05-verification/decisions.md))

### Data layer
- [ ] Neon driver: standard `pg` vs `@neondatabase/serverless` for production

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
| 2026-06-02 | **D2** Auth provider (v1) | **Auth.js (NextAuth v5)** in `apps/crm`; Credentials for local/preview; production OAuth/OIDC TBD per deployment; session = user id only | [`../phases/03-identity-iam/decisions.md`](../phases/03-identity-iam/decisions.md), [`../reference/access-control.md`](../reference/access-control.md) |
| 2026-06-02 | Identity storage (v1) | `latch_user_roles` in company DB (`apps/crm`); composite PK; `role_id` strings match policy keys; no `roles` table | [`../phases/03-identity-iam/decisions.md`](../phases/03-identity-iam/decisions.md) |
| 2026-06-06 | Runtime role catalog DDL | `latch_roles` + `latch_role_surfaces` (`row_scope` per role×surface) + sparse `latch_role_grants`; FK: assignments RESTRICT, grants/bindings CASCADE; built-ins `data_master`/`iam_master` only | [`../reference/access-control.md`](../reference/access-control.md), [`../../packages/policy/docs/tasks/00-decisions-needed.md`](../../packages/policy/docs/tasks/00-decisions-needed.md) |
| 2026-06-06 | Row scope (v1) | `own` \| `all` on `latch_role_surfaces`; richer scopes deferred | [`../reference/access-control.md`](../reference/access-control.md) |
| 2026-06-02 | Built-in role catalog (v1) | `field_tech`, `office_admin`, `iam_master`, `data_master` | [`../phases/03-identity-iam/decisions.md`](../phases/03-identity-iam/decisions.md), [`../reference/access-control.md`](../reference/access-control.md) |
| 2026-06-02 | Data master auto-access | Policy engine wildcard on business Surfaces; IAM surfaces excluded | [`../phases/03-identity-iam/decisions.md`](../phases/03-identity-iam/decisions.md), [`../reference/access-control.md`](../reference/access-control.md) |
| 2026-06-02 | Cascade on hard delete (v1 pilot) | Postgres `ON DELETE CASCADE` for structural children; DAL deletes anchor only | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md), [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md) |
| 2026-06-02 | Delete audit snapshot / recoverability | Surface-scoped: full `before` + embedded children where `restore` granted; else anchor-only or metadata-only | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md) |
| 2026-06-02 | Restore-from-audit operator | `@latch/audit` API + CRM CLI; `restore` Surface action; 409 on live row; no CRM admin UI in Phase 04 | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md), [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md) |
| 2026-06-02 | T6 audit immutability | Trigger + app role `INSERT` only on `latch_audit` | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md), [`../foundations/threat-model.md`](../foundations/threat-model.md) |
| 2026-06-02 | Business-table audit triggers | Deferred; DAL `writeAudit` is v1 path | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md) |
| 2026-06-02 | Audit retention / partitioning (v1) | Config seam (`auditRetentionYears` default 3); partition DDL documented; no automated drop in Phase 04 CI | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md), [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md) |
| 2026-06-02 | Audit actions Phase 04 vs 05 | Phase 04: `delete`, `restore`, `bulk_summary` + existing paths; Phase 05: `approve`, `reject` on accept/reject | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md) |
| 2026-06-02 | Verification gating (v1) | Hybrid: YAML `requires_verification` + runtime `submit` ∧ ¬`write`; Field-level only | [`../phases/05-verification/decisions.md`](../phases/05-verification/decisions.md) |
| 2026-06-02 | Pending storage | `latch_pending_changes`; withdraw + reject; one open `submitted` per entity | [`../phases/05-verification/decisions.md`](../phases/05-verification/decisions.md) |
| 2026-06-02 | Submitter edit pending | **No** — withdraw or resubmit after reject | [`../phases/05-verification/decisions.md`](../phases/05-verification/decisions.md) |
| 2026-06-02 | Denied access audit (T17) | **Not Phase 04 DoD** — design note only; denied bulk audit remains open above | [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md), [`../foundations/threat-model.md`](../foundations/threat-model.md) |
| 2026-06-03 | App role not superuser (T5) | `SELECT current_user` = `latch_app` in DB-gated threat test; CRM/CI connect as `latch_app`; convention `LATCH_APP_DATABASE_URL` + `it.runIf` | [`../phases/06-performance-safety/decisions.md`](../phases/06-performance-safety/decisions.md), task **10** |
