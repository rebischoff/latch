# STATUS — Phase 03 Identity & IAM

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../../STATUS.md).
> Updated: 2026-06-02.

- **Home packages:** `@latch/policy` (+ `apps/crm` IAM module; no `@latch/iam` in v1)
- **State:** **complete (2026-06-02)** — all DoD met; root STATUS repointed to Phase 04.

## Right now — do this next

Phase 03 is complete. Continue in the next active phase: **[Phase 04 — Audit & lifecycle](../04-audit-lifecycle/STATUS.md)** (see root [`STATUS.md`](../../../../STATUS.md)).

## Blockers

None.

## Recently completed

- **21-threat-t8-phase-dod** (2026-06-02) — T8 at the IAM route: `field_tech` PATCH `/api/iam/users/[id]` to self-assign `iam_master` → 404 hide, `latch_user_roles` unchanged; `iam_master` positive assign + GET reflects change (`tests/threat.test.ts`). `data_master` throwaway-Surface regression in `policy-service.test.ts`. Phase 03 DoD met; root STATUS → Phase 04.
- **20-e2e-identity** (2026-06-02) — `tests/identity.e2e.test.ts`: DB-backed roles → manifests for `job_detail` + `customer_detail`; dual-role union; T3 role-change simulation; `principalFromStore` / `resolveManifestFromStore` in test-utils.
- **15-crm-session-migration** (2026-06-02) — Removed `latch_session` cookie helpers; login/logout via Auth.js only; `getPrincipal` + session payload tests; `AUTH.md` updated (curl via credentials callback).
- **14-auth-provider** (2026-06-02) — Auth.js v5 (`next-auth@beta`); `/api/auth/[...nextauth]`; Credentials + optional GitHub OAuth; `getPrincipal()` via `auth()`; `AUTH_SECRET` + env matrix in `development.md`.
- **13-api-routes** (2026-06-02) — `GET`/`PATCH` `/api/iam/users/[id]`; `iam-handler` error mapper; `requireSession()`; `iam@demo.local` dev login; curl examples in `AUTH.md`.
- **12-dal-contract-tests** (2026-06-02) — `iam.test.ts` (T1/T2/T8, manifest key parity, multi-role union); `load-roles.test.ts` + `policy.test.ts` dual-role cases; memory store only.
- **10-dal-patch** (2026-06-02) — `patchUserRoles` with strict `role_assignments` replace, catalog validation, self-patch `ForbiddenError`, audit before/after role lists; `schemas.ts` + `apply-patch.ts`.
- **09-dal-get** (2026-06-02) — `getUserRoles` on `user_roles_detail`; manifest projection (`profile`, `role_assignments` as `role_id[]`); default deny → `NotFoundError`; `getIamDal` + `resolveContext` wired in `latch.ts`.
- **08-codegen-policy-builtins** (2026-06-02) — `user_roles_detail` generated schema; IAM surface in policy registry (`kind: iam`); `data_master` wildcard in `PolicyService.resolve`; package + CRM policy tests.
- **07-policies-yaml** (2026-06-02) — `user_roles_detail.policies.yaml` (`iam_master` only, `forbiddenFieldResponse: 404`); `user-roles-detail.ts`; `userRolesDetailSurfacePolicyDef` prepared in registry; policy tests for default deny.
- **06-surface-yaml** (2026-06-02) — `apps/crm/modules/iam/user_roles_detail.surface.yaml` (`profile`, `role_assignments`); IAM surface tagged for `data_master` exclusion (task 08).
- **05-principal-db-roles** (2026-06-02) — `loadRolesForUser`, session `{ userId, label }` only, `getPrincipal()` DB-backed roles; stub env unchanged for CI.
- **04-db-schema** (2026-06-02) — `latch_user_roles` Drizzle table, migration `004`, memory-store role helpers, `seedPilotJobs` role assignments, `DATABASE.md`.
- **01-task-index** (2026-06-02) — execution order, dependency diagram, reuse table, STATUS discipline; verify gate passed.
- **00-decisions** (2026-06-02) — locked role catalog, `data_master` wildcard, `latch_user_roles` storage, Auth.js (D2), IAM API-only boundary, `user_roles_detail` sketch in [`decisions.md`](./decisions.md).

## Task index

[`tasks/01-task-index.md`](./tasks/01-task-index.md)
