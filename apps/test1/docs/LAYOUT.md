# test1 — layout and look (docs only)

Ant Design only. No Tailwind. Reference: [`apps/crm/docs/LAYOUT.md`](../../crm/docs/LAYOUT.md).

## Overall look

**Goal:** Boring, clear, internal-tool — same bar as CRM proof harness.

| Element | Choice |
|---------|--------|
| Density | `size="middle"` default |
| Color | Ant Design default primary |
| Icons | `@ant-design/icons` |
| Dark mode | Out of scope |
| Branding | Header title "test1 (Latch learn)" — no logo asset |

## Chrome structure

```
Layout (vertical)
├── Header (~48px)
│   ├── Title
│   └── Dropdown: user label · Log out
├── Layout (horizontal)
│   ├── Sider (~200px)
│   │   └── Menu: manifest-filtered routes (see nav below)
│   └── Content (padding 16px)
│       └── Entity split view
```

### Decision: post-login redirect (2026-06-03)

**Choice:** Successful sign-in redirects to **`/`** (app home under `(app)/`).

**Rationale:** Entity routes (`/contacts`, etc.) do not exist until task 12. Home is the protected shell landing; switch to `/contacts` when that Surface ships.

## Nav (root layout)

Nav lives in **`app/(app)/layout.tsx`** — not middleware.

1. `requireSession()` → authenticated shell only.
2. `getPrincipal()` → user id (roles from DB inside `getPrincipal`).
3. `resolveNavItems(principal)` → filter static route catalog through `PolicyService.resolve`.

Pattern (CRM reference): [`apps/crm/src/lib/nav.ts`](../../crm/src/lib/nav.ts), [`apps/crm/src/app/(app)/layout.tsx`](../../crm/src/app/(app)/layout.tsx).

**Catalog (planned):**

| href | label | surfaceId | nav resolve mode |
|------|-------|-----------|------------------|
| `/contacts` | Contacts | `contact` | `list` |
| `/projects` | Projects | `project` | `list` |
| `/tasks` | Tasks | `task` | `list` |
| `/iam/users` | Users | `user` | `list` |
| `/iam/roles` | Roles | `role` | `list` |

`navManifestScope: minimal` — omit routes when manifest lacks surface `read`.

Nav DTO: `{ href, label, key }` only — no Surface ids in HTML.

## Side-by-side list + detail

Single route per entity; **`?id=`** for selected row (shareable dev links).

| Pane | Width | Content |
|------|-------|---------|
| List | ~40% | Ant `Table` from DAL `list` with `mode: list` |
| Detail | ~60% | `CapabilitiesProvider` + Field groups; empty until selection |

**Selection:** `searchParams.id` in RSC page; row click updates URL.

**Detail pane:**

- `Card` per Field group
- `<FieldControl>` → read-only `Descriptions` or RHF when `write`
- Save / Delete via Server Actions → `resolveContextFresh` → DAL

## IAM routes

Same split pattern under `/iam/users` and `/iam/roles`. Only principals with `read` on `user` / `role` Surfaces see nav entries (typically `iam_master`).

## Responsive

Desktop ≥ 1024px primary. Below: stack list above detail — minimal.

## Component reuse (inline first)

Extract `EntitySplitView` / `ManifestTable` only after second Surface (task 12).

## Out of scope

Dashboards, global search, mobile polish, skeleton loaders beyond Ant `Skeleton`.
