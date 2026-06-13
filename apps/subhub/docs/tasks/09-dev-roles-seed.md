# 09 — Dev roles seed

## Goal

Migration `013_dev_roles.sql` seeding SubHub app roles, grants, and test users.

## Prerequisites

[08-iam-ui.md](./08-iam-ui.md) complete (or in parallel once IAM surfaces exist in codegen).

## Files

| File | Action |
|------|--------|
| `migrations/013_dev_roles.sql` | **Create** |
| `docs/architecture.md` | Confirm role names match seed |

## Steps

1. Insert app roles: `admin`, `sales`, `project_manager`, `technician`, `accounting`, `readonly`.
2. Insert `latch_role_surfaces` + sparse `latch_role_grants` for IAM surfaces (admin full IAM).
3. Seed Better Auth users linked to `latch_users`; assign roles via `latch_user_roles`.
4. Document credentials in comment block at top of migration (dev only).
5. Run `npm run db:migrate -w @latch/subhub`.

## Verify (stop gate)

- [ ] `psql` shows grants: `SELECT surface_id, field_id, action FROM latch_role_grants LIMIT 10`
- [ ] Login as admin sees IAM nav; readonly user does not
- [ ] [`../../STATUS.md`](../../STATUS.md) → [10-party-migration.md](./10-party-migration.md)
- [ ] Slice 0 exit: admin IAM CRUD works end-to-end

## Out of scope

- Business table seeds (task **10**)
