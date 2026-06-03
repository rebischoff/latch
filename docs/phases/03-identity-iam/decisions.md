# Phase 03 — decisions

> Lock items in task **[00-decisions.md](./tasks/00-decisions.md)** before code tasks **04+**.

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Authz model | RBAC; users assigned to one or more roles |
| 2026-05-27 | Stub (interim) | `LATCH_STUB_USER` / `LATCH_STUB_ROLE` for automated tests |
| 2026-06-02 | Task chain | [`tasks/01-task-index.md`](./tasks/01-task-index.md); no `@latch/iam` package in v1 |
| 2026-06-02 | IAM Surface id | `user_roles_detail` (threat **T8**) |
| 2026-06-02 | Built-in role catalog | `field_tech`, `office_admin`, `iam_master`, `data_master` (see below) |
| 2026-06-02 | Data master auto-access | Policy engine wildcard on business Surfaces (IAM ids excluded) |
| 2026-06-02 | Identity storage | `latch_user_roles` in company DB (`apps/crm`); no `roles` table in v1 |
| 2026-06-02 | D2 — auth provider | Auth.js (NextAuth v5) in CRM; session = user id only |
| 2026-06-02 | IAM admin boundary | DAL + `/api/iam/*` only; no CRM admin UI |
| 2026-06-02 | Package layout | `apps/crm/src/lib/iam/` + `apps/crm/db/`; no `@latch/iam` until Phase 07 |
| 2026-06-02 | Multi-role | `union_grants` + `denyWins: true` from `Principal.roles[]` via `latch_user_roles` |
| 2026-06-02 | IAM self-patch | Denied — `ForbiddenError` when `principal.id ===` target user |

### Decision: built-in role catalog (2026-06-02)

**Choice:** Four role ids in v1 — two app roles and two built-ins:

| Role id | Kind | Purpose |
|---------|------|---------|
| `field_tech` | App | Pilot job row-scope `own`; no `customer_detail` |
| `office_admin` | App | Pilot business admin |
| `iam_master` | Built-in | Manage users + role assignments on IAM Surfaces; read audit (configurable) |
| `data_master` | Built-in | Read/write all **business** Surfaces/Fields (not IAM metadata) |

Pilot seeds: `seed-field-tech` → `field_tech`; `seed-office-admin` → `office_admin`. Optional third seed user `seed-iam-admin` → `iam_master` for QA (see task **04** verify).

**Rationale:** Matches existing job/customer policies; built-ins satisfy README sub-goals without conflating pilot personas with platform administration. No `roles` table in v1 — catalog is built-in + app YAML.

### Decision: data_master auto-access (2026-06-02)

**Choice:** **Policy engine wildcard** (not per-Surface YAML edits, not codegen auto-bind).

- `@latch/policy` treats `data_master` as a built-in role with `surfaces: "*"` / `fields: "*"` for **registered business** Surface ids (everything in the app policy registry except IAM Surface ids).
- IAM Surface ids excluded at minimum: `user_roles_detail`.
- Adding a new business Surface to the registry + policies for app roles is enough; `data_master` gains access without editing `data_master` YAML.
- **Regression test (task 21):** register a throwaway Surface in tests only → `data_master` manifest includes `read`/`write` on all Fields.

**Rationale:** Proves “new Surface without editing data_master YAML”; avoids codegen coupling.

### Decision: identity storage (2026-06-02)

**Choice:** Table `latch_user_roles` in the **company DB** (`apps/crm`).

- Composite PK `(user_id, role_id)`; `user_id` → `latch_users.id`; `role_id` is a stable string matching policy role keys.
- No `roles` table in v1 (catalog is built-in + app YAML).

**Rationale:** Roles are deployment-local assignment data; policy keys stay in repo YAML. Keeps Phase 03 scope inside the CRM harness DB.

**Deferred (sketch):** IdP group → role mapping — external groups (Okta/Azure AD) sync into `latch_user_roles` in a later phase; v1 uses direct DB assignment via IAM API only.

### Decision: D2 auth provider (2026-06-02)

**Choice:** **Auth.js (NextAuth v5)** for CRM.

- Production: provider TBD per deployment (OAuth/OIDC).
- Local/preview: **Credentials** adapter against seed users + dev secret (same users as today).
- Session exposes **user id only**; roles always loaded from DB on each `getPrincipal()` (aligns with T3 re-resolve on mutations).

**Rationale:** Fits Next.js App Router; separates authentication (who) from authorization (what roles), keeping manifest resolution authoritative on every request.

### Decision: IAM admin proof boundary (2026-06-02)

**Choice:** **DAL + HTTP API + tests only**; **no** CRM pages for user/role CRUD.

- Operators use `/api/iam/*` (curl) or future tooling.
- CRM ships login/logout only.
- [`apps/crm/docs/AUTH.md`](../../../apps/crm/docs/AUTH.md) documents v1 boundary without implying a React admin console.

**Rationale:** Phase 03 proves permission-gated role assignment (T8) and built-in roles; UI polish for IAM ops is out of v1 scope.

### Decision: IAM self-patch denied (2026-06-02)

**Choice:** Principals **cannot** PATCH `user_roles_detail` for their own `user_id` (any role change). `ForbiddenError` (403).

**Rationale:** Default guard against self-escalation (e.g. adding `iam_master`); operators must use another `iam_master` principal or future break-glass tooling.

### Decision: user_roles_detail Surface sketch (2026-06-02)

**Choice:** IAM Surface for threat **T8** — role assignment is not self-service.

| Property | Value |
|----------|-------|
| Surface id | `user_roles_detail` |
| `anchorTable` | `latch_users` |
| `tables` | `latch_users`, `latch_user_roles` |

**Fields:**

| Field id | Columns / source | Grants |
|----------|------------------|--------|
| `profile` | `latch_users.id`, `latch_users.display_name` | `read` for `iam_master` |
| `role_assignments` | logical list of `role_id` from `latch_user_roles` | `read`/`write` for `iam_master` only |

**Default:** No binding for `field_tech`, `office_admin`, or `data_master` on this Surface.

**Rationale:** Centralizes IAM mutations behind manifest + DAL; prevents pilot app roles from self-elevating.

### Decision: stub fallback (unchanged) (2026-06-02)

**Choice:** `LATCH_STUB_USER` + `LATCH_STUB_ROLE` for automated tests when no session; may optionally load extra roles from DB when stub user exists in seed.

**Rationale:** Keeps CI/e2e independent of Auth.js while implementation tasks land.

### Decision: package layout (2026-06-02)

**Choice:** **No `@latch/iam` package** in Phase 03. Code under `apps/crm/src/lib/iam/` and `apps/crm/db/`. Extract to `@latch/iam` only if a second app needs it (Phase 07).

**Rationale:** YAGNI until multi-app reuse is proven.
