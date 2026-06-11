# Bootstrap c — Navigation and pages

> **Status:** Proposal (2026-06-10). General plan for scaffolded temp apps.

## Goal

**Sidebar** navigation gated by manifest `read` on each business Surface, with **list** and **detail** routes per Surface. First app: one domain → `widget_list` + `widget_detail`.

---

## Layout pattern

| Piece | Implementation |
|-------|----------------|
| Shell | Ant Design `Layout` + `Sider` + `Content` |
| Nav source | `lib/nav.ts` — iterate business surfaces in `policy-registry` |
| Gate | For each surface id, `resolve(manifest)` with action `read`; omit if denied |
| Header | App title, user label, logout |
| Children | RSC pages under `app/` |

`spike_policy` uses a **top** nav — temp business apps establish the **sidebar** convention here.

---

## Routes (widgets example)

| Surface | Route | Page type |
|---------|-------|-----------|
| `widget_list` | `/widgets` | RSC list — DAL `list`, columns from manifest |
| `widget_detail` | `/widgets/[id]` | RSC detail — DAL `get` |
| `widget_detail` (create) | `/widgets/new` | RSC form shell — create flow ([e](./e-crud.md)) |
| Home | `/` | Redirect or link to first permitted Surface |

One **list + detail pair per Surface id** — do not merge list/detail into one route.

---

## List page checklist

1. `resolveContext('widget_list')`
2. DAL `list(ctx)` — row scope applied in store adapter
3. Build column set: only fields with manifest `read`
4. Row link → `/widgets/[id]` when detail `read` granted
5. “New widget” button when create/write policy allows ([e](./e-crud.md))

---

## Detail page checklist

1. `resolveContext('widget_detail')`
2. DAL `get(ctx, id)` — `NotFoundError` → `notFound()`
3. Wrap client form area in `CapabilitiesProvider` with manifest
4. Gate Delete / Save with manifest actions ([d](./d-forms.md), [e](./e-crud.md))

---

## Nav manifest (minimal scope)

v1: static list of business surfaces from registry — no separate nav YAML. Optional later: `navScope: minimal` from global options.

---

## Verify

- [ ] `widget_viewer` sidebar: Widgets entry visible; no admin-only links
- [ ] User with no business `read` → empty nav or landing message
- [ ] `/widgets` and `/widgets/[id]` both respect row scope
- [ ] Deep link to forbidden id → 404 page

---

## Related

- [b — Authorization](./b-authorization.md)
- [d — Forms](./d-forms.md)
- Phase 02 task 18 (historical CRM nav pattern)
