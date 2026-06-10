# 07 — User create (set up other users)

> **Status:** Complete (2026-06-09). Next: [08 — Scoped delegation](./08-scoped-delegation.md).
>
> **Depends on** [04 — Users UI + inspector](./04-users-ui.md) (assignment path + Postgres stores). Independent of scope; closes the most visible IAM gap.

## Goal

Let a permitted actor **create a new user** through the IAM Surface — `INSERT latch_users` plus optional initial role assignments — audited, manifest-gated, and visible in the existing `/users` list. This turns the console from "edit seeded users" into "an admin sets up other users," and is the prerequisite for proving **scoped delegation** ([08](./08-scoped-delegation.md)).

Today the spike can only **patch assignments** on seeded users; adding a user requires raw SQL ([discussion 01](../discussions/01-user-console.md#how-to-add-users-today-no-ui)).

## Background / invariants

- All access goes through the **DAL** with a `PermissionContext` (invariant 2); writes are audited (invariant 6); the manifest is the only authority (invariant 1).
- Create is gated on the **same** `user_roles_detail` Surface used for assignment — `surfaceAllows(manifest, "write")` (plus field `write` on `role_assignments` when initial roles are supplied). No new IAM Surface unless a clean separation is wanted.
- Any initial assignments reuse `validateRoleAssignmentsPatch` (P4a/P4b) — exclusivity, privileged-class, last-`system_iam`, self-patch.

## Decisions to lock at task start (from discussion 01 open questions)

| # | Question | Proposed |
|---|----------|----------|
| 1.1 | User id — app-chosen string vs DB default | App-chosen string id (mirrors seed ids + auth subject mapping); validate non-empty + unique |
| 1.2 | Initial roles — required or empty | **Empty allowed** — a roleless user is valid; assignments patched separately |
| 1.3 | Auth | Out of scope — `LATCH_BOOTSTRAP_ADMIN_EMAIL` break-glass + "Act as" remain |

## Deliverables

### Server

| Concern | File | Change |
|---------|------|--------|
| Store | [`lib/iam-user/memory-user-store.ts`](../../lib/iam-user/memory-user-store.ts) | `upsertUser` already exists — reuse for create |
| PG persist | [`lib/iam-user/pg-hydrate.ts`](../../lib/iam-user/pg-hydrate.ts) | add `persistUserToPg(client, store, userId)` → `INSERT INTO latch_users (id, display_name) VALUES ($1,$2)` (reject duplicate id) |
| DAL | [`lib/iam-user/repository.ts`](../../lib/iam-user/repository.ts) | add `createUser(ctx, { id, display_name, role_assignments? })` to `UserRolesDetailDal`: assert `surfaceAllows write`; insert user; if roles → `validateRoleAssignmentsPatch` + `setUserRoles`; persist user (and roles); `bumpPolicyVersion` only when initial roles were set; audit |
| Action | [`app/actions/users.ts`](../../app/actions/users.ts) | add `createUserAction({ id, display_name, role_assignments })` mirroring `patchUserAssignmentsAction` (principal → ctx → DAL → `resolveAllManifests` → `revalidateUserPaths`) |

### UI

- `/users` — wire the existing **`+ Add`** button ([04 layout sketch](./04-users-ui.md#list-page--users)) to a create form (antd `Modal` or `/users/new`): `display_name` + optional role multi-select.
- On success → route to `/users/[id]` so the manifest inspector shows the new user's (possibly empty) effective access.
- Hide/disable **Add** when the actor lacks `write` on `user_roles_detail` (manifest-gated, not just UI).

## Verify (stop gate)

- [x] Permitted actor creates a user (no roles) → appears in `/users`; inspector shows all surfaces `(none)` (default deny)
- [x] Create with initial `field_tech` → inspector shows `field_tech` grants; `policyVersion` bumped
- [x] Duplicate id → clear `ValidationError` (no partial insert)
- [x] Non-`system_iam` / no-write actor → **Add** hidden and `createUserAction` returns 403/404 (T8 — server-enforced, not UI-only)
- [x] Initial assignment violating P4a (e.g. `system_data` + app role) → rejected, user **not** created
- [x] Create + assignments audited; users persist across `npm run dev` restart
- [x] [`README.md`](./README.md) execution sequence + [discussion 01](../discussions/01-user-console.md) status updated on completion ([`45-phase-tasks.mdc`](../../../../.cursor/rules/45-phase-tasks.mdc))

## Out of scope

- **Profile write** (editable `display_name` after create) — separate optional follow-up.
- **User delete** — `latch_user_roles` FK is RESTRICT; revoke-then-delete UX deferred.
- Production Auth.js / real login.
- Scoped delegation (a non-`system_iam` actor creating users within a scope) — [08](./08-scoped-delegation.md).

## Related

- [Discussion 01 — user console](../discussions/01-user-console.md) — gap + steps
- [Discussion 02 — privileged assignment](../discussions/02-privileged-assignment.md) — P4a/P4b reused on create
- [04 — Users UI](./04-users-ui.md) — assignment path this extends
- [08 — Scoped delegation](./08-scoped-delegation.md) — builds on user create
