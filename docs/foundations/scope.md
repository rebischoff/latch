# Scope � v1 in / out

The single most important document for keeping v1 shippable solo. **If a feature is not listed under "In v1" below, it is out.** Add to "Deferred" if interesting; refuse it otherwise.

## Decision: tightened solo v1 scope (2026-05-27)

**Choice:** Ship the smallest cohesive set of capabilities that exercises every architectural concept end-to-end on three Surfaces. Cut anything that does not directly serve that goal.

**Rationale:** Solo dev + 6 month horizon. The risk is not "missing features" � it is "abstractions that fall apart under the first real Surface." Better to prove the design with three Surfaces than to half-build six.

### Decision: hard delete only — no soft delete (2026-05-30)

**Choice:** Live data uses **hard delete** only. `DELETE` removes the row (with cascade per Surface); every delete writes an append-only audit row with a full `before` snapshot. **Recovery** replays from audit (privileged restore tool), not `deleted_at` / undelete columns. There is **no** soft delete, `deleted_at`, or row-level "archive" flag in v1.

**Rationale:** Avoids filtering `deleted_at IS NULL` across joins and related tables; audit is the system of record for "what was deleted." One delete vocabulary (`delete` action) for policy, DAL, and audit.

**Canonical detail:** [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md) · Phase 04 restore tooling: [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md).

### Decision: sole consumer app — `apps/crm` (2026-06-01)

**Choice:** **`apps/crm`** is the only runnable consumer app and proof harness for v1. The former **`apps/web`** pilot was retired in Phase 02b (codegen, migrations, build, and tests repointed; doc/code sweep in [`../phases/02b-platform-extraction/tasks/05-retire-web.md`](../phases/02b-platform-extraction/tasks/05-retire-web.md)).

**Rationale:** The jobs pilot incorrectly lived in both `packages/*` and `apps/web`. Platform extraction genericizes `@latch/*` and consolidates domain metadata, DDL, schema, seed, and wiring under one app. See [`../phases/02b-platform-extraction/decisions.md`](../phases/02b-platform-extraction/decisions.md).

### Decision: app-defined roles are runtime data, not codegen (2026-06-06)

**Choice:** Role **definitions** — the role catalog and each role's Field/action grants + `rowScope` — become **runtime DB data**, created/updated/deleted by app users through a permission-gated IAM Surface (sibling of `user_roles_detail`), audited like any other mutation. New platform tables `latch_roles` (catalog) and `latch_role_grants` (one row per role × surface × field × action, optional `mode`) join `latch_users` / `latch_user_roles`. Codegen still owns the **vocabulary** (which Surfaces/Fields/actions *exist*) and emits it as the allowed-options catalog the role editor validates against; it **no longer emits role→Field grants**. The two system catalog rows (`role_class` `system_data`, `system_iam`) stay template-seeded and synthesized in `PolicyService`; not app-deletable ([P11](../../packages/policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)). This moves "DB-backed role catalog" from deferred into v1 and reverses the grant-generation half of Decision H (see [`../discussions/02-identity-and-permissions.md`](../discussions/02-identity-and-permissions.md), [`../discussions/01-codegen.md`](../discussions/01-codegen.md)).

**Rationale:** Assignments were already runtime (`latch_user_roles`), so leaving definitions at build time forced a dev redeploy for every permission tweak. Splitting **vocabulary (dev/codegen, build time) from grants (DB, runtime data)** preserves the safety property — a runtime grant can never reference a Field the Surface doesn't define, because the role editor and the resolver both read the codegen-emitted Field/action catalog — while letting business admins own the policy. Grant-row granularity and mode-overlay editing are accepted to be fine-tuned in a later discussion.

### Decision: bounded scope primitive — seam in, full build phased (2026-06-09)

**Choice:** Adopt a **bounded "scope" primitive** (named branch/site/crew boundary) for row scoping and scoped role delegation — *namespaced RBAC*, **not** ABAC/ReBAC. The **contract + DDL seam lands as additive v1 work** (`latch_scopes`, nullable `latch_user_roles.scope_id`, `row_scope: scope`, `Principal` scoped bindings, `Manifest.scopeIds`, `latch_role_delegations`); the **full scoped-RLS + delegation implementation is a dedicated phase**, not the current v1 slice. Canonical model: [`../discussions/09-role-delegation-and-scope.md`](../discussions/09-role-delegation-and-scope.md#decision-bounded-scope-primitive--scoped-delegation-2026-06-09); seam detail: [`../reference/access-control.md`](../reference/access-control.md#decision-bounded-scope-primitive--row_scope-scope--scoped-delegation-2026-06-09).

**Rationale:** Service/construction SMBs with multiple branches and prominent field work need scope as a convenience + isolation primitive on day one. A bounded named-scope dimension is additive and keeps field/action grants role-level — distinct from the ABAC/ReBAC explicitly ruled out below. Locking the seam now avoids a later migration of `Principal`/manifest/assignment contracts.

**Stays out (see Deferred):** per-scope *differential field grants*, scope-hierarchy traversal beyond one `parent_id`, ABAC/ReBAC/OPA-style DSL, and org-chart (region/manager-edge) templating.

---

## In v1

### Deployment & infrastructure
- Single company. One Postgres URL. (Abstraction for company ? URL routing exists, but routing is hard-coded to one URL.)
- Vercel + **Neon** (local dev, preview, prod). Docker Compose optional only — not required.
- One environment matrix: `local`, `preview`, `production`.

### Surfaces (three)
- `job_detail` � the pilot. Multi-table, Field-level perms, row-level (own jobs), approval, audit, hard delete.
- `job_list`
- `customer_detail`

> **Policy model (2026-06-01):** `job_list` and `job_detail` are one logical Surface **`job`** with modes `list` | `detail`; roles bind once, not per suffix. Split ids remain in repo/code until merge ([`glossary.md`](./glossary.md)).

### Access control
- RBAC. **Two system roles** (`system_data`, `system_iam`) template-seeded + synthesized; **`app` roles are runtime DB data** (`latch_roles` + `latch_role_grants`), CRUD'd by app users via a permission-gated IAM Surface.
- Field/action **vocabulary** per Surface is codegen-emitted; the role editor validates grants against it (build-time `--check` guards the catalog; write-time validation guards each grant).
- **`union_grants` only** for role merge. `denyWins = true`.
- Field-level `read` / `write`.
- Row-level via owner / assignment patterns expressed in metadata, evaluated in DAL.

### Data layer
- **DAL-only enforcement.** RLS deferred.
- Drizzle migrations.
- Per-request DB client (so multi-company is a future config swap, not a refactor).

### Manifest / UI sync
- Manifest delivered via RSC props.
- `CapabilitiesProvider` + `<Can>` + `<FieldControl>` in `@latch/react`.
- Nav manifest with `minimal` scope.

### Validation
- Zod schemas generated from Surface YAML; runtime-narrowed by manifest.
- Writable schemas `.strict()`.

### API style
- REST route handler factory for reads, lists, exports, bulk ops.
- Server Action helper for RSC form mutations.
- No tRPC, no GraphQL.

### Mutations & lifecycle
- Single-record insert/update.
- **Bulk update / delete** with per-row permission re-evaluation, partial-success reporting. See [`bulk-operations.md`](../reference/bulk-operations.md).
- **Hard delete** — row removed from live tables; audit `before` snapshot; no `deleted_at` columns.
- Audit on registered tables (app `writeAudit` in v1; DB triggers hardened in Phase 04).

### Approval
- All-or-nothing pending changes (single record).
- Internal reviewers only (same company, role-gated).
- Bulk operations: optional approval gate at the *batch* level (TBD in `bulk-operations.md`).

### Codegen
- CLI: `<project> codegen` and `<project> codegen --check` (CI gate).
- Emits: Field IDs, base Zod, column maps. (No RLS stubs in v1.)

### Tests
- Policy engine matrix (single mode + denyWins).
- DAL contract tests (forbidden field omission, strict write rejection).
- One end-to-end test through `job_detail`.

### Threat model
- Documented ([`threat-model.md`](./threat-model.md)).
- Tests for T1, T2, T3, T11, T13 at minimum.

### Sample app
- Trades CRM in **`apps/crm`** — sole consumer; uses only `@latch/*` packages.
- Login (auth provider TBD), job list, job detail, customer detail.
- Two seed users in two roles (e.g. `field_tech`, `office_admin`).

---

## Out of v1 (deferred)

These are good ideas, just not now. Listed so we can say "no" with grace.

### Architecture / infra
- Multi-company DB routing and Neon-branch provisioning.
- RLS policies (generated or hand-written).
- `@neondatabase/serverless` adoption (use standard pg driver until proven needed).
- Long-lived non-Vercel hosting target.

### Access control
- Role-merge modes: `intersection_grants`, `most_restrictive`, `priority`. (Engine designed to allow adding them; not implemented or tested.)
- Per-Surface override of `multiRoleCombine`.
- ABAC, ReBAC, OPA-style DSL.
- **Per-scope differential field grants** (same role granting different Fields in different scopes). The bounded scope primitive narrows *rows* only; field/action grants stay role-level ([scope decision 2026-06-09](#decision-bounded-scope-primitive--seam-in-full-build-phased-2026-06-09)).
- **Org-chart templating** (sites/regions/manager-subtree tables). Scope stays a flat primitive (`latch_scopes` + optional one-level `parent_id`).
- Break-glass roles with enhanced audit.

### Data lifecycle
- **Restore-from-audit** privileged tool and operator UI (replay `before` snapshot; not row undelete).
- Legal hold workflow.
- GDPR erasure / pseudonymization.
- Separate `hard_delete` elevation vs normal `delete` (v1 uses a single `delete` action).

### Approval
- Partial / per-Field accept.
- Multiple reviewers, parallel approvals, SLAs.
- External reviewers (customer sign-off, etc.).
- Auto-approval rules.

### API / DX
- tRPC.
- GraphQL.
- OpenAPI generation.
- Admin UI as a product (the trades-CRM sample serves as the admin UI for v1).

### Distribution
- Public npm publication of `@latch/*` packages.
- Plugin / extension system.
- Second runnable consumer app beyond **`apps/crm`** (the retired `apps/web` pilot is not revived).

---

## How to use this doc

- When you're tempted to build something, **find it in one of the lists**. If it's missing, add it explicitly to one or the other before starting.
- "Deferred" is not a roadmap � it's a holding pen. Items move to a real roadmap only after v1 ships.
- Scope changes go through a dated **Decision** block on this page.

## Related

- [`STATUS.md`](../../STATUS.md)
- [`roadmap.md`](../roadmap.md)
- [`open-questions.md`](./open-questions.md)
