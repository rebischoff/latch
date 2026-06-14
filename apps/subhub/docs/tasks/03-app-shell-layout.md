# 03 — App shell layout

> **Status:** Complete (2026-06-12). Next: [04-auth-entry.md](./04-auth-entry.md).

## Goal

`(public)` and `(private)` route groups; desktop shell (left nav, header, content) on **root** layout. Nav items vary by session (task 04/05).

## Prerequisites

[02-ui-dependencies.md](./02-ui-dependencies.md) complete.

## Files

| File | Action |
|------|--------|
| `app/(public)/page.tsx` | **Create** — public home (move from `app/page.tsx`) |
| `app/layout.tsx` | Mount `RootShell` (`Providers` + `AppShell`) |
| `app/(private)/layout.tsx` | **Create** — passthrough; per-page `requireAuth` in task 04 |
| `components/shell/AppShell.tsx` | **Create** — Ant `Layout` Sider + Header + Content |
| `components/shell/RootShell.tsx` | **Create** — client `Providers` + `AppShell` |
| `components/shell/ShellNav.tsx` | **Create** — session-aware nav placeholder (replaced by `SideNav` in task 05) |
| `app/globals.css` | Minimal; antd v6 CSS variables + token fallbacks |
| `app/(private)/settings/page.tsx` | **Create** — placeholder route for verify gate |

## Steps

1. Move current home to `(public)/page.tsx`; keep marketing copy minimal.
2. Root `layout.tsx`: `RootShell` wraps all routes; mount React Query provider there.
3. `AppShell`: fixed left sider (~240px), header with app title + user menu placeholder; `ConfigProvider` + `App`; customize via `theme.useToken()` (antd v6 CSS variables on by default).
4. Desktop-only: no mobile collapse requirement beyond Ant default.

**Follow-on (documented, later tasks):** task **05** replaces `ShellNav` with manifest-aware `SideNav`; app header gains settings dropdown extensions; per-route **`SurfaceToolbar`** lands in task **08** — see [decisions.md](../decisions.md) and [routing-and-libraries.md](../routing-and-libraries.md).

## Verify (stop gate)

- [x] `/` and `/settings` both render inside root shell
- [x] `ShellNav` shows fewer items when logged out (session wiring in task 04)
- [x] [`../../STATUS.md`](../../STATUS.md) → [04-auth-entry.md](./04-auth-entry.md)

## Out of scope

- Auth, nav items, business pages

## Reference

- [architecture.md](../architecture.md) — directory shape
- [decisions.md](../decisions.md) — desktop-only
