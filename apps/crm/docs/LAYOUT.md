# CRM — layout and look (docs only)

Ant Design only. No Tailwind.

## Overall look

**Goal:** Boring, clear, internal-tool — not marketing polish.

| Element | Choice |
|---------|--------|
| Density | `size="middle"` default; compact table optional |
| Color | Ant Design default blue primary; neutral grays for chrome |
| Typography | Ant Design system fonts only |
| Icons | `@ant-design/icons` where needed (delete, user, logout) |
| Dark mode | **Out of scope** for proof harness |
| Branding | Text title "Latch CRM (demo)" in header — no custom logo asset |

### Chrome structure

```
Layout (vertical)
├── Header (fixed height ~48px)
│   ├── Title
│   ├── Horizontal Menu OR top nav links (from nav manifest)
│   └── Dropdown: current user · Log out
├── Layout (horizontal)
│   ├── Sider (~200px, collapsible optional — default expanded)
│   │   └── Menu: Jobs, Customers (manifest-filtered)
│   └── Content (padding 16px, background #f5f5f5 via Ant token)
│       └── Entity split view (see below)
```

Use `Layout`, `Header`, `Sider`, `Content` from `antd`. Spacing via `style` props or Ant Design `theme` `token.padding` — not utility CSS frameworks.

## Side-by-side list + detail

### Jobs route (`/jobs`)

Single route, two panes. Use `Row` + `Col` (e.g. 10/14 split) or `Flex` with `flex: 1` — **not** a third-party split-pane library unless required.

| Pane | Width | Content |
|------|-------|---------|
| List | ~40% | `Table` from `job_list` DTO; `rowKey="id"`; `onRow` click selects id |
| Detail | ~60% | `job_detail` form sections; placeholder when no selection |

**Selection state:** Client state `selectedJobId` (URL optional: `?id=` for shareable dev links — nice-to-have, not required).

**List pane behavior:**

- Loading: `Table` `loading`
- Empty: Ant `Empty`
- Row scope: table rows already filtered by DAL — do not client-filter by role
- Bulk: if implemented, checkbox column + one toolbar button — no multi-step wizards

**Detail pane behavior:**

- Wrap in `CapabilitiesProvider manifest={manifest}`
- Sections: `Card` per Field group (`summary`, `scope`, `financial_terms`, `assignments`)
- Each section: `FieldControl` → read-only `Descriptions` or RHF `Form` when `write`
- Actions footer: Save (if writable), Delete (if `Can action="delete"`)

### Customers route (`/customers`)

Same split pattern. Cross-link from job detail to customer only inside `<Can>` / when customer id present in DTO.

### Responsive

Proof harness targets **desktop width ≥ 1024px**. Below that, stack list above detail (single column) — minimal, no mobile-first investment.

## Component reuse

| Component | Location (future) |
|-----------|-------------------|
| `EntitySplitView` | Generic list + detail shell |
| `SurfaceDetailForm` | Maps manifest fields to Cards + RHF |
| `ManifestTable` | Columns derived from list DTO keys ∩ manifest |

Keep count low — **inline first**, extract only on second Surface.

## What we are not designing

- Dashboards, charts, calendars
- Global search command palette
- Custom side nav icons per tenant
- Animated transitions, skeleton loaders beyond Ant `Skeleton`
