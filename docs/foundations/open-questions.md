# Open questions

Decisions still needed. Defaults: [`architecture/global-options.md`](./architecture/global-options.md). Scope in/out: [`scope.md`](./scope.md). Local vs Vercel: [`development.md`](./development.md).

## Active (block work)

These are tracked in [`STATUS.md`](../../STATUS.md) "Active decisions needed":

- [ ] **D2** Auth provider for v1: NextAuth / Clerk / custom JWT / corporate SSO?
- [ ] **D3** Confirm pilot Surface = `job_detail`
- [ ] **D4** Confirm single role-merge mode `union_grants` for v1
- [ ] **D5** Confirm RLS deferred to post-v1

## Active (don't block v1, but should resolve before related code)

### Identity & users
- [ ] Where do users/roles live ù platform tables vs external IdP groups?
- [ ] Built-in role catalog (exact list, default permissions per role)
- [ ] Break-glass audit (deferred behavior, but design now)

### Authorization model
- [ ] Deny policy YAML syntax
- [ ] Sensitive Field: 403 default vs optional 404 per Surface (which Surfaces get 404?)

### Surface / Field metadata
- [ ] Versioning of Field definitions when columns rename
- [ ] One Surface id with `modes: [list, detail]` vs separate ids
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
- [ ] When to extract `packages/*` to a separate publishable repo (post-v1)

## Resolved (chronological)

| Date | Topic | Decision | Doc |
|---|---|---|---|
| 2026-05-27 | Hosting | Vercel + hosted Postgres (Neon) for preview/prod; Docker local | [`development.md`](./development.md) |
| 2026-05-27 | Multi-tenant | **Not used** ù no shared-schema `tenant_id` model | [`glossary.md`](./glossary.md) |
| 2026-05-27 | Company isolation | Database-per-company from template (v1: single company) | [`architecture/global-options.md`](./architecture/global-options.md) |
| 2026-05-27 | Authz | RBAC; multiple roles per user | [`architecture/access-control.md`](./architecture/access-control.md) |
| 2026-05-27 | Surface definition | One form/list page; spans tables/views | [`glossary.md`](./glossary.md) |
| 2026-05-27 | Policy metadata | Repo YAML/JSON | [`architecture/metadata-and-codegen.md`](./architecture/metadata-and-codegen.md) |
| 2026-05-27 | Manifest delivery | RSC props when possible | [`architecture/permissions-and-ui-sync.md`](./architecture/permissions-and-ui-sync.md) |
| 2026-05-27 | Approval v1 | All-or-nothing pending; internal reviewers only | [`architecture/approval-trails.md`](./architecture/approval-trails.md) |
| 2026-05-27 | ORM | Drizzle | [`architecture/global-options.md`](./architecture/global-options.md) |
| 2026-05-27 | Audit | Immutable default; 3-year retention | [`architecture/audit-and-lifecycle.md`](./architecture/audit-and-lifecycle.md) |
| 2026-05-27 | Multi-role merge (v1) | **Single mode `union_grants`** with `denyWins`; other modes deferred | [`architecture/access-control.md`](./architecture/access-control.md), [`scope.md`](./scope.md) |
| 2026-05-27 | Surface vs Module | Lock **Surface** as the term; rename in Phase-0 naming pass | [`glossary.md`](./glossary.md), [`naming.md`](./naming.md) |
| 2026-05-27 | Final project name | **Latch** (replaces codename Modula) | [`naming.md`](./naming.md) |
| 2026-05-27 | API style | REST handlers (public surface) + Server Actions (internal sugar); no tRPC / GraphQL v1 | [`architecture/api-style.md`](./architecture/api-style.md) |
| 2026-05-27 | Bulk operations | Per-row eval; `partial` default + `all_or_nothing` flag; soft-delete only v1 | [`architecture/bulk-operations.md`](./architecture/bulk-operations.md) |
| 2026-05-27 | Hard delete | **Deferred** post-v1 | [`scope.md`](./scope.md) |
| 2026-05-27 | RLS | **Deferred** post-v1; v1 enforcement is DAL-only | [`scope.md`](./scope.md), [`discovery/postgres-rls-and-security.md`](./discovery/postgres-rls-and-security.md) |
| 2026-05-27 | Monorepo | `apps/*` + `packages/*` from day one (npm workspaces) | [`architecture/packages.md`](./architecture/packages.md) |
| 2026-05-27 | Approval reviewer scope | Internal only in v1; external (customer sign-off) deferred | [`architecture/approval-trails.md`](./architecture/approval-trails.md) |
