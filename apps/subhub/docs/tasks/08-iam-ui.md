# 08 — IAM UI

## Goal

Master-detail pages for users and roles at explicit routes.

## Prerequisites

[07-iam-dal-api.md](./07-iam-dal-api.md) complete.

## Files

| File | Action |
|------|--------|
| `app/(app)/iam/users/layout.tsx` | **Create** — list sider + `{children}` |
| `app/(app)/iam/users/page.tsx` | **Create** — empty state |
| `app/(app)/iam/users/[id]/page.tsx` | **Create** — user detail + role assignments |
| `app/(app)/iam/roles/layout.tsx` | **Create** |
| `app/(app)/iam/roles/page.tsx` | **Create** |
| `app/(app)/iam/roles/[id]/page.tsx` | **Create** — grant editor |
| `components/form/*` | RHF + antd wrappers (start set) |
| `lib/hooks/use-surface-*.ts` | React Query hooks |

## Steps

1. **Nested layout pattern** — not parallel routes ([routing-and-libraries.md](../routing-and-libraries.md)).
2. List pane: `Table` + row link to `/iam/users/[id]`.
3. Detail: server `resolveContext` → `CapabilitiesProvider` → form with `<Can>` / `<FieldControl>`.
4. Role detail: grant matrix UI writing via `PATCH` API.
5. Toolbar: actions from manifest (`write`, etc.).

## Verify (stop gate)

- [ ] Admin can list users, click row, edit role assignments
- [ ] Admin can edit role grants on role detail
- [ ] Forbidden fields omitted from DTO and UI
- [ ] Read-only fields render as text, not disabled inputs
- [ ] [`../../STATUS.md`](../../STATUS.md) → [09-dev-roles-seed.md](./09-dev-roles-seed.md)

## Out of scope

- Business contacts UI
