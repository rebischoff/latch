# 05 — Nav manifest

> **Status:** Complete (2026-06-13). Next: [06-iam-surfaces.md](./06-iam-surfaces.md).

## Goal

Sidebar merges **three nav sources**:

1. **Public routes** — always visible (currently Home at `/`). Not manifest-gated.
2. **Session chrome** — authenticated-only items that are not Surfaces (currently Settings at `/settings`). Not manifest-gated; extend the static list as needed.
3. **Surface catalog** — IAM and future business list Surfaces. Include a link only when `resolveContext` grants surface `read` or any field `read`.

Hide entire groups (e.g. IAM) when no Surface in that group is visible.

**App chrome vs Surfaces:** Public and session items are **not** Latch Surfaces — no `surfaceId`, no manifest grant. IAM, Contacts, and other catalog groups **are** Surfaces — filtered by `resolveContext`. Do not put Home or Settings inside Surface groups.

**Sidebar shape** (`Menu mode="inline"`):

```text
Home                         ← public (always)
Settings                     ← session (authenticated)
── divider (optional) ──
IAM                          ← type: 'group' (manifest)
  Users, Roles
Contacts                     ← type: 'group' (manifest)
  Contacts, …
```

App header chrome (title, settings dropdown) stays as implemented in task 03/04; this task delivers **sidebar nav data + `SideNav` only**. Page toolbars (`SurfaceToolbar`) are task **08** onward — see [decisions.md](../decisions.md).

## Prerequisites

[04-auth-entry.md](./04-auth-entry.md) complete.

## Files

| File | Action |
|------|--------|
| `lib/nav.ts` | **Create** — static items (public + session) and Surface catalog (`surfaceId`, label, href, group, icon) |
| `lib/nav-server.ts` | **Create** — filter Surface catalog by resolved manifests; merge with static items |
| `components/shell/SideNav.tsx` | **Create** — render grouped menu with `next/link` labels |
| `components/shell/ShellNav.tsx` | **Replace** — superseded by `SideNav`; remove placeholder `router.push` nav |
| `app/layout.tsx` | Pass server-resolved nav items into shell |

## Steps

1. **Static nav** (no `resolveContext`):

   | kind | href | label | when |
   |------|------|-------|------|
   | public | `/` | Home | always |
   | session | `/settings` | Settings | authenticated |

   Add future public or session entries here — not in the Surface catalog.

2. **Surface catalog** (explicit hrefs — **not** dynamic `[surface]` pages):

   | surfaceId | href | group |
   |-----------|------|-------|
   | `user_list` | `/iam/users` | IAM |
   | `role_list` | `/iam/roles` | IAM |
   | `contact_list` | `/contacts` | Contacts |
   | … | … | … |

3. For each Surface catalog entry, `resolveContext({ surfaceId, mode: 'list' })` (or `detail` for IAM) — include link only if manifest grants surface `read` or any field `read`.
4. `nav-server.ts`: `getNavItems(principal?)` returns a serializable tree: flat chrome items + grouped Surface entries (`type: 'group'` with `children`). Omit empty groups entirely.
5. Hide entire IAM group when no IAM surface visible.
6. **`SideNav`:** `Menu mode="inline"`, `theme="light"`. Chrome items as top-level entries; Surface entries under `type: 'group'` labels. Optional `type: 'divider'` between chrome and first manifest group when authenticated. Render each link label with [`next/link`](https://nextjs.org/docs/app/api-reference/components/link) (`prefetch` default **on** in production). Drive `selectedKeys` from `usePathname()` (longest-prefix match for nested routes); **do not** use `onClick` + `router.push` for sidebar links (that skips App Router route prefetch). Use `prefetch={false}` only for rarely used or heavy routes if measured need arises.
7. Root layout: server calls `getNavItems(principal)` and passes serializable nav props to client `SideNav`.
8. Log **L4** in [latch-feedback.md](../latch-feedback.md) if nav metadata duplication hurts.

## Verify (stop gate)

- [x] Logged-out user sees Home only (no IAM, no Settings)
- [x] Logged-in admin sees Home + Settings + IAM + placeholder business entries when granted
- [x] User without IAM grants sees no IAM group
- [x] Home and Settings are top-level sidebar items (not inside Surface groups)
- [x] Surface links render under `type: 'group'` labels (IAM, Contacts, …)
- [x] Nav hrefs are explicit paths per [decisions.md](../decisions.md)
- [x] Sidebar links use `next/link` (route prefetch enabled); no `router.push`-only sidebar nav
- [x] [`../../STATUS.md`](../../STATUS.md) → [06-iam-surfaces.md](./06-iam-surfaces.md)

## Out of scope

- IAM page implementation
- `SurfaceToolbar` / per-page action bars (task **08**)
- App header global search (stub OK later; not required for this task)
- `nav:` block in Surface YAML (Latch L4)
- React Query `prefetchQuery` on nav hover (data prefetch — add only if nav feels slow)

## Reference

- [decisions.md](../decisions.md) — nav sources, sidebar grouping, shell chrome layers
- [routing-and-libraries.md](../routing-and-libraries.md) — sidebar navigation pattern
