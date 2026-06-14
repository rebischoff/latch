# 09 — First-run setup (master user)

> **Status:** Complete (2026-06-13). Next: [10-party-migration.md](./10-party-migration.md).

## Goal

`/setup` wizard when `latch_users` is empty: validate install token, create the first master user (`login_name` + password), assign `system_data` + `system_iam`. **No SQL user seed.** Platform migration `013_latch_identity_guards.sql` ships DB guards; this task ships the app flow.

> Platform: [P4b amendment — first-run setup](../../../packages/policy/docs/tasks/00-decisions-needed.md#amendment-first-run-setup--db-identity-guards-2026-06-13) · [scaffold runbook](../../../packages/codegen/docs/scaffold-runbook.md#first-run-setup)

## Prerequisites

[08-iam-ui.md](./08-iam-ui.md) complete.

## Files

| File | Action |
|------|--------|
| `migrations/013_latch_identity_guards.sql` | **Platform** (template + subhub) — `login_name`, `setup_complete`, DB triggers, remove `bootstrap-admin` |
| `app/(public)/setup/page.tsx` | **Create** — setup form (token + login_name + password) |
| `app/api/setup/route.ts` | **Create** — validate token, create user + role assignments, mark `setup_complete` |
| `lib/setup.ts` | **Create** — `needsSetup()`, `completeSetup()` |
| `lib/require-auth.ts` | **Edit** — redirect to `/setup` when `needsSetup()` |
| `components/shell/LoginForm.tsx` | **Edit** — accept username or email identifier |
| `lib/auth-utils.ts` | **Edit** — `setupHref`, gate helpers |
| `modules/iam/user_*.surface.yaml` | **Edit** — expose `login_name` Field |
| `docs/decisions.md` | Decision block — setup + identity model |
| `docs/architecture.md` | Replace dev SQL seed section |

## Steps

### Platform (already in template `013`)

1. `latch_users.login_name TEXT UNIQUE` — primary login identifier at setup; `login_email` nullable until linked from `party` (task 10+).
2. `latch_app_config.setup_complete BOOLEAN DEFAULT false`.
3. **DB triggers:** `latch_roles.role_class` immutable; `system_data` / `system_iam` rows not deletable; cannot remove last `system_data` or `system_iam` assignment (`latch_user_roles` DELETE).
4. Migration `007` is a **no-op** — zero users after platform migrate.
5. `resolveLatchUserId` bridges session identifier → `login_name OR login_email`.

### App setup flow

1. **`needsSetup()`:** `NOT EXISTS (SELECT 1 FROM latch_users)` **and** `setup_complete = false`.
2. **`/setup` (public):** form fields — **setup token** (`LATCH_SETUP_KEY` env), **login_name**, **password** (confirm).
3. **POST `/api/setup`:** assert `needsSetup()`; constant-time compare token; in one transaction:
   - `INSERT latch_users (gen_random_uuid(), login_name)`
   - `INSERT latch_user_roles` for both system roles via `role_class` lookup
   - `UPDATE latch_app_config SET setup_complete = true`
   - Better Auth `signUp` with `login_name` as credential identifier (password hash durable — see decisions)
4. **Gates:** `requireAuth` redirects to `/setup` when `needsSetup()`; `/setup` redirects to `/login` when setup already complete.
5. **Login:** single identifier field — resolves `login_name` or `login_email` via `resolveLatchUserId`.
6. **DAL:** `assertNotLastSystemRoleHolder` before assignment replace (mirrors DB trigger).

### Do not

- Seed users in SQL migrations.
- Seed app roles, `latch_role_surfaces`, or `latch_role_grants`.
- Rely on `LATCH_BOOTSTRAP_ADMIN_EMAIL` for SubHub (operator recovery = re-run setup with DB reset or controlled migration).

## Verify (stop gate)

- [x] After migrate (no users): visit `/` → redirect to `/setup`
- [x] Valid token + login_name + password creates user with both `system_data` and `system_iam`
- [x] `psql`: `SELECT login_name, r.role_class FROM latch_users u JOIN latch_user_roles ur ON ur.user_id = u.id JOIN latch_roles r ON r.id = ur.role_id;`
- [x] Revoking last `system_iam` or `system_data` assignment fails (UI 403 + DB trigger)
- [x] Deleting `system_data` / `system_iam` catalog row fails in `psql`
- [x] Master sees IAM nav; IAM CRUD works end-to-end
- [x] [`../../STATUS.md`](../../STATUS.md) → [10-party-migration.md](./10-party-migration.md)

## Out of scope

- Linking `login_email` from `party_email` (task 10+)
- App roles (`admin`, `sales`, …)
- `LATCH_STUB_USER` dev stub (optional local shortcut only)
