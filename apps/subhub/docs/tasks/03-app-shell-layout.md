# 03 — App shell layout

## Goal

`(public)` and `(app)` route groups with desktop shell: left nav, header, content area.

## Prerequisites

[02-ui-dependencies.md](./02-ui-dependencies.md) complete.

## Files

| File | Action |
|------|--------|
| `app/(public)/page.tsx` | **Create** — public home (move from `app/page.tsx`) |
| `app/(app)/layout.tsx` | **Create** — shell + `Providers` |
| `components/shell/AppShell.tsx` | **Create** — Ant `Layout` Sider + Header + Content |
| `app/globals.css` | Minimal shell spacing |

## Steps

1. Move current home to `(public)/page.tsx`; keep marketing copy minimal.
2. `(app)/layout.tsx`: render `AppShell` wrapping `{children}`; mount React Query provider.
3. `AppShell`: fixed left sider (~240px), header with app title + user menu placeholder.
4. Desktop-only: no mobile collapse requirement beyond Ant default.

## Verify (stop gate)

- [ ] `/` renders without shell
- [ ] Placeholder route under `(app)/` (e.g. `/settings`) renders inside shell
- [ ] [`../../STATUS.md`](../../STATUS.md) → [04-auth-entry.md](./04-auth-entry.md)

## Out of scope

- Auth, nav items, business pages

## Reference

- [architecture.md](../architecture.md) — directory shape
- [decisions.md](../decisions.md) — desktop-only
