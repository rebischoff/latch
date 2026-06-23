# Catalog — `site_contact_relation_table`

> **Wave:** 1 · **Status:** target spec (2026-06-19) · **Consumer:** [`site.md`](./site.md) `contacts` relation picker · **Catalog:** [`surfaces.md`](../surfaces.md#site_contact_relation_table) · **DBML:** `site_contact_relation`, `site_contact` *(delete blocker)* · **Decisions:** [site contacts catalog](../decisions/site.md#decision-site-contacts--site_contact_relation-catalog-2026-06-15), [catalog table page](../decisions/general.md#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16), [progressive setup](../decisions/cross-cutting.md#decision-progressive-setup--master-catalogs-2026-06-16), [delete blockers](../decisions/cross-cutting.md#decision-delete-blocked-by-referential-use--structured-errors-2026-06-18)

**Related:** Distinct from **`party_contact_relation_table`** *(spec TBD)* — org roster on customer/vendor hubs. **`job_party_relation_table`** — per-engagement roles (wave 4).

---

## Locked product answers (2026-06-19)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Surface shape | **Catalog table page** — single route, editable `Table`; not list+detail |
| 2 | Fields | **`display_name`** (unique), **`sort_order`** — no `code` column; FKs use `id` |
| 3 | Write model | **Draft Save/Revert** UI; server **replace-array** sync in one transaction via `PATCH { rows }` on collection route |
| 4 | Delete | **`ConflictError`** when any `site_contact.relation_id` references row (DB `RESTRICT`) |
| 5 | Empty catalog | DDL empty at migrate; **progressive setup** suggests four defaults; **this page** always ships for ongoing edit |
| 6 | Suggested rows | Property owner, Property manager, Site superintendent, Other — **not** Bill to / billing roles |
| 7 | Picker consumers | `site_detail` `contacts` relation dropdown (wave 1); sorted by `sort_order`, then `display_name` |

---

## A — Identity

| Key | Value |
|-----|-------|
| `surface_id` | `site_contact_relation_table` |
| Pair | *(none — catalog table Surface)* |
| Route | `/contact-relations` — `contact-relations/page.tsx` (flat page path; nav group **Sites**) |
| API | `GET` / `PATCH /api/sites/contact-relations` `{ rows }` · optional per-row `POST` / `PATCH` / `DELETE` for scripts/setup |
| Nav group | Sites |
| Nav label | Contact relations |
| Anchor table | `site_contact_relation` |
| All tables (DAL) | `site_contact_relation`; delete pre-check join `site_contact` |
| Shipped vs target | **New** |

---

## B — Fields

### Table columns (single-page projection)

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `display_name` | scalar | read + write | `site_contact_relation.display_name` | Unique; admin-editable label shown in pickers |
| `sort_order` | scalar | read + write | `site_contact_relation.sort_order` | Default `0`; lower first in pickers |

**List sort (table + picker):** `sort_order` asc, `display_name` asc.

**Read-only in DTO:** `id` (stable FK target for `site_contact.relation_id`).

### Row DTO (minimum)

```json
{
  "id": "<uuid>",
  "display_name": "Property manager",
  "sort_order": 20
}
```

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `site_contact_relation_table` | `read` | grant on Surface | Each GET (table + picker label fetch) |
| `site_contact_relation_table` | `write` | grant on Surface + Field | Each replace PATCH (upsert / reorder); footer add |
| `site_contact_relation_table` | `delete` | grant on Surface | Staged row removal + omitted ids on replace PATCH |

**Picker on `site_detail`:** principal needs **`read`** on `site_contact_relation_table` to populate relation dropdown labels. Adding a `site_contact` row requires `site_detail` `write`, not catalog `write`.

**403 vs 404:** platform default.

---

## D — DAL read

- **`list(ctx)`** — all rows; sort `sort_order`, `display_name`; project `id`, `display_name`, `sort_order`.
- **`get(ctx, id)`** — optional for PATCH round-trip; same projection.
- **Picker endpoint** — same `list` contract (no pagination in wave 1 — expect small catalogs).

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `replace` | `rows[]` — `{ id?`, `display_name }` per element | **Replace-array sync** in one transaction — see [replace-array decision](../decisions/general.md#decision-replace-array-sync-algorithm-2026-06-22) |
| `create` *(optional)* | `display_name`, optional `sort_order` | Insert row; for progressive setup / scripts — not catalog page Save |
| `patch` *(optional)* | `display_name`, `sort_order` | Single-row update — not catalog page Save |
| `delete` *(optional)* | — | Single-row delete — not catalog page Save |

**Replace-array steps:** validate → pre-check delete blockers → delete omitted ids → upsert payload rows; `sort_order = index + 1` (1-based) from array order.

**Delete blocker payload (minimum):**

```json
{
  "code": "in_use",
  "entity": "site_contact_relation",
  "blockers": [{ "type": "site_contact", "count": 3 }]
}
```

**Rename in use:** allowed — `site_contact.relation_id` FK is by `id`; picker shows updated `display_name`.

**Transactions:** each mutation single transaction; audit on success.

---

## F — Domain rules

- **Standing roles at property only** — not billing (`bill_to`), not `job_party` engagement roles ([site decision](../decisions/site.md#decision-site-contacts--site_contact_relation-catalog-2026-06-15)).
- **No `code` column** — display names are product copy; ids are opaque FKs.
- **DDL empty at migrate** — `019_site.sql` has no `INSERT`s; production rows via progressive setup and/or this admin page; local QA via [`020_site_contact_relation_dev_seed.sql`](../../migrations/020_site_contact_relation_dev_seed.sql).
- **Distinct from master `party_role`** — relation label “Property owner” on `site_contact` does **not** set `party_role.property_owner`.
- **Audit:** all mutations on registered tables.

---

## G — UI layout

Single full-width page — no master-detail sider ([routing-and-libraries.md](../routing-and-libraries.md#catalog-tables--editable-table-page)).

```text
┌─────────────────────────────────────────────────────────┐
│ SurfaceToolbar — Save | Revert                          │
├─────────────────────────────────────────────────────────┤
│ Editable Table (FieldArrayTable + optional drag sort)   │
│  [≡] display_name | [Delete]                           │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│            [+ Add row]                                  │
└─────────────────────────────────────────────────────────┘
```

**Draft edit:** RHF field array; **Save** commits `PATCH { rows }` (replace-array); **Revert** resets to last load. Drag reorder when `sort_order` writable; no manual sort column.

**Shared component:** `CatalogTableSurface` + `FieldArrayTable` — first instance is this Surface.

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | `PATCH { rows }` — replace-array; map `ConflictError` / duplicate name errors |
| 2 | Revert | Reset form to last loaded list |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `site_detail` (empty catalog CTA) | `/contact-relations` | Add contact blocked — progressive setup or admin path |
| `site_contact_relation_table` | `/sites` | Optional footer link — not required v1 |

---

## I — Collections UX

*(N/A — this Surface is the catalog itself, not a parent collection.)*

**Consumer (`site_detail` `contacts`):** relation column = `Select` options from `list(site_contact_relation_table)`; option label = `display_name`, value = `id`.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| First app use / empty catalog | Progressive setup | Suggest four default rows; user confirms/edits; inserts via same DAL as table page |
| Admin add | POST | Any time from `/contact-relations` |
| Rename | PATCH | Safe while referenced |
| Delete unused | DELETE | Hard delete |
| Delete in use | DELETE | `ConflictError` — remove or reassign `site_contact` rows first |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Duplicate `display_name`** | Unique index — validation error on POST/PATCH |
| **Delete last relation while contacts exist** | Impossible if contacts reference it — RESTRICT |
| **Delete all relations, no contacts** | Allowed — `site_detail` Add contact stays disabled |
| **Progressive setup skipped** | Admin uses catalog table page only |
| **Dev seed** | Idempotent on `display_name`; Postgres-assigned ids — no doc hard-coding |
| **Billing role requested** | Product copy: use customer / `job_party` bill_to — do not add “Bill to” suggestion |
| **Codegen** | Hand-written descriptor + repository for catalog table until codegen ships |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-19) reflected in decisions + catalog
- [x] A–K complete; first catalog-table Surface template for wave 1
- [x] Implementation — [task 20](../tasks/20-ui-discovery.md) step 2.2 ✅; step 2.9 UI ✅ (2026-06-22)
