# 08 — IAM UI

> **Status:** Complete (2026-06-13). Next: [09-dev-roles-seed.md](./09-dev-roles-seed.md).

## Goal

Master-detail pages for users and roles at explicit routes.

## Prerequisites

[07-iam-dal-api.md](./07-iam-dal-api.md) complete.

## Files

| File | Action |
|------|--------|
| `app/(private)/iam/users/layout.tsx` | **Create** — list sider + `{children}` |
| `app/(private)/iam/users/page.tsx` | **Create** — empty state |
| `app/(private)/iam/users/[id]/page.tsx` | **Create** — user detail + role assignments |
| `app/(private)/iam/roles/layout.tsx` | **Create** |
| `app/(private)/iam/roles/page.tsx` | **Create** |
| `app/(private)/iam/roles/[id]/page.tsx` | **Create** — grant editor |
| `components/form/*` | RHF + antd wrappers (start set) |
| `components/shell/SurfaceToolbar.tsx` | **Create** — reusable per-page toolbar (priority + overflow) |
| `lib/hooks/use-surface-*.ts` | React Query hooks |

## Steps

1. **Nested layout pattern** — not parallel routes ([routing-and-libraries.md](../routing-and-libraries.md)).
2. List pane: `Table` + row link to `/iam/users/[id]`.
3. Detail: server `resolveContext` → `CapabilitiesProvider` → form with `<Can>` / `<FieldControl>`.
4. Role detail: grant matrix UI writing via `PATCH` API.
5. **`SurfaceToolbar`:** horizontal `Flex` / `Space` + manifest-gated `Button`s — **not** horizontal `Menu`. Pattern A: `priority: 'primary'` actions visible in bar; `priority: 'secondary'` in **More** (`⋯`) `Dropdown` when compact. First consumer on user/role detail pages (New, Save, Delete as granted).

## Verify (stop gate)

- [x] Admin can list users, click row, edit role assignments
- [x] Admin can edit role grants on role detail
- [x] Forbidden fields omitted from DTO and UI
- [x] Read-only fields render as text, not disabled inputs
- [x] [`../../STATUS.md`](../../STATUS.md) → [09-dev-roles-seed.md](./09-dev-roles-seed.md)

## Out of scope

- Business contacts UI
