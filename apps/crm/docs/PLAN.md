# Trades CRM — plan (docs only)

> **Do not implement until scheduled.** This app exists to **prove `@latch/*` works**, not to ship a CRM product.

## 1. Purpose — proof harness only

`apps/crm` is the **integration demo** for the monorepo. Success = you can click through as two roles and see manifest, DAL, and UI sync behave correctly.

**Build only what proves a package:**

| Package | What CRM must demonstrate |
|---------|---------------------------|
| `@latch/contracts` | Manifest + DTO types flow server → client |
| `@latch/policy` | Nav + per-Surface `PolicyService.resolve` |
| `@latch/dal` | `list`, `get`, `patch`, `delete` (hard delete + audit) |
| `@latch/react` | `CapabilitiesProvider`, `<Can>`, `<FieldControl>` |
| `@latch/codegen` | Surface YAML → Zod used on submit |
| `@latch/audit` | Delete produces queryable audit row (read-only debug panel optional) |
| `@latch/approval` | **Defer** until Phase 05 — not required for CRM v0 |

**Do not add** anything that does not map to a row above (reports, settings pages, notifications, scheduling, themes, i18n, etc.).

## 2. Simplicity — anti–scope-creep

| Allowed | Not allowed |
|---------|-------------|
| 3 Surfaces: `job_list` + `job_detail`, `customer_detail` | Extra entities, admin consoles, analytics |
| Stub auth + role switcher | Full IAM UI (Phase 03) |
| One delete confirm modal | Restore-from-audit UI (Phase 04) |
| Plain Ant Design defaults + light token tweaks | Custom design system, Tailwind, CSS modules sprawl |
| Copy from `apps/web` patterns where they exist | Re-architecting Latch to fit the UI |

**Rule of thumb:** If removing a screen does not reduce confidence that a package works, **do not build it**.

## 3. Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router |
| UI | **Ant Design** (Layout, Menu, Table, Modal, Descriptions, Splitter or two-column grid) |
| Forms | **React Hook Form only** (no antd `Form`) + manifest-narrowed Zod on writes |
| Permissions UI | `@latch/react` |
| Data | `@latch/policy` + `@latch/dal` on server only |
| Styling | **Ant Design only** — `ConfigProvider` theme tokens if needed. **No Tailwind.** |

`apps/web` may keep Tailwind for the thin pilot; `apps/crm` does not depend on or configure Tailwind.

## 4. Layout — list and detail side by side

Per **entity route** (e.g. Jobs), use a **single page** with two panes — not separate list page → navigate → detail page.

```
┌─────────────────────────────────────────────────────────────┐
│ Header: logo · nav · user menu (logout)                     │
├──────────┬──────────────────────────────────────────────────┤
│ Sider    │  Jobs                                            │
│ · Jobs   │  ┌──────────────────┬─────────────────────────┐  │
│ · Cust.  │  │ List (job_list)  │ Detail (job_detail)     │  │
│          │  │ Table, filters   │ Form sections per Field │  │
│          │  │ row selection    │ empty until row picked  │  │
│          │  └──────────────────┴─────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

- **Left:** `job_list` Surface — DAL `list`, columns from manifest.
- **Right:** `job_detail` for selected id — DAL `get` + patch; hidden Fields omitted.
- **Customers:** same pattern (`customer_list` when it exists, or list stub + `customer_detail`).

Details: [`LAYOUT.md`](./LAYOUT.md).

## 5. Database

See [`DATABASE.md`](./DATABASE.md). Summary: same Postgres + migrations as platform; CRM uses DAL only; memory store acceptable until Postgres DAL lands.

## 6. Auth

See [`AUTH.md`](./AUTH.md). Summary: v0 cookie session with seed users; login/logout pages; no OAuth until Phase 03.

## 7. Developing CRM vs packages

Package work is planned in [`docs/phases/`](../../../docs/phases/). CRM work **follows** package capabilities — see [`docs/reference/crm-and-phases.md`](../../../docs/reference/crm-and-phases.md).

**CRM does not have its own phase folder.** It is a consumer with a short task checklist: [`TASKS.md`](./TASKS.md). Timing of each slice follows the rule in [`crm-and-phases.md`](../../../docs/reference/crm-and-phases.md).

## Build order (minimal)

| Step | Proves | Depends on |
|------|--------|------------|
| A | Shell: AntD layout, nav manifest, auth | Phase 00 policy |
| B | Jobs split view: list + detail read | Phase 01 `list`, projection |
| C | Jobs write + delete | Phase 00/01 DAL write/delete |
| D | Customers split view | Phase 02 second Surface |
| E | Bulk on job list (if trivial UI) | Phase 01 bulk |

Skip E if bulk UI would take more than a few hours — API proof in tests is enough.

## Definition of done (CRM proof harness)

- [ ] Login / logout works (stub users).
- [ ] Nav shows only allowed routes per role.
- [ ] Jobs: side-by-side list + detail; tech vs admin manifests differ (financials).
- [ ] Patch saves via Server Action; forbidden fields not in form.
- [ ] Delete removes row; optional: show last audit entry for id.
- [ ] Customers: same split pattern for second Surface.
- [ ] **No Tailwind** in `apps/crm` dependencies or config.
- [ ] Zero `db.*` imports outside `@latch/dal`.

## References

- [`LAYOUT.md`](./LAYOUT.md) · [`DATABASE.md`](./DATABASE.md) · [`AUTH.md`](./AUTH.md) · [`CONFIG.md`](./CONFIG.md) · [`CODEGEN.md`](./CODEGEN.md)
- [`../../../docs/reference/crm-and-phases.md`](../../../docs/reference/crm-and-phases.md)
- [`../../../docs/foundations/scope.md`](../../../docs/foundations/scope.md)
- Second consumer (learning): [`../../test1/docs/STATUS.md`](../../test1/docs/STATUS.md)
