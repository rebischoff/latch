# 00 — Lock Phase 03 Identity & IAM decisions

> **Status:** Complete (2026-06-02). Next: [04-db-schema.md](./04-db-schema.md).

## Goal

Record the built-in role catalog, **Data master** auto-access mechanism, identity storage, auth provider (D2), IAM admin proof boundary, and `user_roles_detail` Surface sketch so tasks 04–21 do not re-debate them. **Docs only — do not add application code.**

## Prerequisites

- Phase 02 complete ([`../../02-ui-sync/STATUS.md`](../../02-ui-sync/STATUS.md)).
- Skim the [phase README](../README.md) and [`../decisions.md`](../decisions.md).

## Files (docs only — do not add application code)

| File | Action |
|------|--------|
| [`../decisions.md`](../decisions.md) | Open items → **Decided** table + Decision blocks (catalog, data_master, storage, D2, IAM admin boundary, Surface sketch) |
| [`../../../foundations/open-questions.md`](../../../foundations/open-questions.md) | Resolve **D2** row; move identity rows to **Resolved** when locked |
| [`../../../reference/access-control.md`](../../../../policy/docs/access-control.md) | Add Decision: built-in role catalog + `data_master` wildcard |
| [`../../../../apps/crm/docs/AUTH.md`](../../../../../apps/crm/docs/AUTH.md) | Align v1 boundary: provider session + DB roles; **no** CRM IAM admin UI |
| [`../STATUS.md`](../STATUS.md) | After verify: **Execute now** → `04-db-schema.md` |

## Decisions to lock (copy into [`../decisions.md`](../decisions.md))

1. **Built-in role catalog (v1)**

   | Role id | Kind | Purpose |
   |---------|------|---------|
   | `field_tech` | App | Pilot job row-scope `own`; no `customer_detail` |
   | `office_admin` | App | Pilot business admin |
   | `iam_master` | Built-in | Manage users + role assignments on IAM Surfaces; read audit (configurable) |
   | `data_master` | Built-in | Read/write all **business** Surfaces/Fields (not IAM metadata) |

   Pilot seeds: `seed-field-tech` → `field_tech`; `seed-office-admin` → `office_admin`. Optional third seed user for `iam_master` QA (document id in task **04** verify).

2. **Data master auto-access** — **Policy engine wildcard** (not per-Surface YAML edits, not codegen auto-bind).

   - `@latch/policy` treats `data_master` as a built-in role with `surfaces: "*"` / `fields: "*"` for **registered business** Surface ids (everything in the app policy registry except IAM Surface ids listed in decisions).
   - Adding a new business Surface to the registry + policies for app roles is enough; `data_master` gains access without editing `data_master` YAML.
   - **Regression test (task 21):** register a throwaway Surface in tests only → `data_master` manifest includes `read`/`write` on all Fields.

3. **Identity storage** — **`latch_user_roles` in the company DB** (`apps/crm`).

   - Composite PK `(user_id, role_id)`; `user_id` → `latch_users.id`; `role_id` is a stable string matching policy role keys.
   - No `roles` table in v1 (catalog is built-in + app YAML). IdP group → role mapping is **deferred** (sketch one paragraph in decisions only).

4. **D2 auth provider** — **Auth.js (NextAuth v5)** for CRM.

   - Production: provider TBD per deployment (OAuth/OIDC); local/preview may use **Credentials** adapter against seed users + dev secret (same users as today).
   - Session exposes **user id only**; roles always loaded from DB on each `getPrincipal()` (aligns with T3 re-resolve on mutations).

5. **IAM admin proof boundary** — **DAL + HTTP API + tests only**; **no** CRM pages for user/role CRUD.

   - [`apps/crm/docs/AUTH.md`](../../../../../apps/crm/docs/AUTH.md) updated to match README DoD (“IAM admin Surface”) without implying a React admin console.
   - Operators use API (curl) or future tooling; CRM login/logout only.

6. **`user_roles_detail` Surface sketch** (threat **T8**)

   - `anchorTable`: `latch_users`
   - `tables`: `latch_users`, `latch_user_roles`
   - Fields:
     - `profile` → `latch_users.id`, `latch_users.display_name` (`read` for `iam_master`)
     - `role_assignments` → logical list of `role_id` from `latch_user_roles` (`read`/`write` for `iam_master` only)
   - Default: **no** binding for `field_tech`, `office_admin`, `data_master` on this Surface (assignment is not self-service).

7. **Package layout** — **No `@latch/iam` package** in Phase 03.

   - Code under `apps/crm/src/lib/iam/` + `apps/crm/db/`; extract to `@latch/iam` only if a second app needs it (Phase 07).

8. **Stub fallback (unchanged)** — `LATCH_STUB_USER` + `LATCH_STUB_ROLE` for automated tests when no session; may optionally load extra roles from DB when stub user exists in seed.

9. **Multi-role** — `union_grants` + `denyWins: true` from `Principal.roles[]` loaded from `latch_user_roles` (multiple rows per user).

## Verify (stop gate)

- [x] No unchecked items in [`../decisions.md`](../decisions.md) **Open / to lock** section
- [x] Decision blocks exist for catalog, data_master mechanism, storage, D2, IAM admin boundary, and `user_roles_detail` sketch
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `04-db-schema.md`
- [x] No new files under `packages/*` or `apps/crm/src` from this task (docs-only)

## Out of scope

- Migrations, `getPrincipal` changes, policy engine code (tasks **04**+)
- IdP group sync implementation
- Break-glass enhanced audit behavior (design note only)
- `@latch/iam` package extraction
