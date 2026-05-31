# Scope � v1 in / out

The single most important document for keeping v1 shippable solo. **If a feature is not listed under "In v1" below, it is out.** Add to "Deferred" if interesting; refuse it otherwise.

## Decision: tightened solo v1 scope (2026-05-27)

**Choice:** Ship the smallest cohesive set of capabilities that exercises every architectural concept end-to-end on three Surfaces. Cut anything that does not directly serve that goal.

**Rationale:** Solo dev + 6 month horizon. The risk is not "missing features" � it is "abstractions that fall apart under the first real Surface." Better to prove the design with three Surfaces than to half-build six.

### Decision: hard delete only — no soft delete (2026-05-30)

**Choice:** Live data uses **hard delete** only. `DELETE` removes the row (with cascade per Surface); every delete writes an append-only audit row with a full `before` snapshot. **Recovery** replays from audit (privileged restore tool), not `deleted_at` / undelete columns. There is **no** soft delete, `deleted_at`, or row-level "archive" flag in v1.

**Rationale:** Avoids filtering `deleted_at IS NULL` across joins and related tables; audit is the system of record for "what was deleted." One delete vocabulary (`delete` action) for policy, DAL, and audit.

**Canonical detail:** [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md) · Phase 04 restore tooling: [`../phases/04-audit-lifecycle/decisions.md`](../phases/04-audit-lifecycle/decisions.md).

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

### Access control
- RBAC with **built-in roles** seeded in code.
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
- Trades CRM (codename) � uses only `@latch/*` packages.
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
- Second runnable app beyond `apps/web` / `apps/crm` (CRM scaffold is **docs-only** until implementation — see [`../../apps/crm/README.md`](../../apps/crm/README.md)).

---

## How to use this doc

- When you're tempted to build something, **find it in one of the lists**. If it's missing, add it explicitly to one or the other before starting.
- "Deferred" is not a roadmap � it's a holding pen. Items move to a real roadmap only after v1 ships.
- Scope changes go through a dated **Decision** block on this page.

## Related

- [`STATUS.md`](../../STATUS.md)
- [`roadmap.md`](../roadmap.md)
- [`open-questions.md`](./open-questions.md)
