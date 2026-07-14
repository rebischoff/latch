# Sites — `site_list` · `site_detail`

> **Wave:** 1 + **2b scopes & zones** · **Status:** target spec (2026-06-19); **scopes UI** task [37c](../tasks/37c-site-scopes-zones.md) (2026-07-01) · **Contrast:** anchor entity (not party lens) — portfolio FKs + standing contacts; **scopes & zones** on Scopes & zones tab — [`customer.md`](./customer.md), [`property-owner.md`](./property-owner.md) · **Catalog:** [`surfaces.md`](../surfaces.md#site_list--site_detail) · **DBML:** `site`, `site_contact`, `site_contact_relation`, `site_scope`, `site_zone` · **Decisions:** [site scopes & zones](../decisions/site.md#decision-site-scopes--zones--category-root-instances-2026-06-30), [portfolio FKs](../decisions/site.md#decision-portfolio-fks-on-site_detail--writable-scalars-2026-06-19) · **Planning:** [`11-categories-scope-model.md`](../planning/11-categories-scope-model.md)

**Related:** Hub create via **`add_site`** on [`customer_detail`](./customer.md) and [`property_owner_detail`](./property-owner.md). Relation catalog: [`site-contact-relation.md`](./site-contact-relation.md) ✅. Legacy [`site-geography.md`](./site-geography.md) (`sections`/`locations`) **superseded** by this spec § `scopes` / `general_zones`.

---

## Locked product answers (2026-06-19)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Portfolio FKs on `site_detail` | **Option A** — both **`customer_party`** and **`property_owner_party`** writable optional scalars; tag-filtered pickers; nullable on standalone create; PATCH may set or clear either independently |
| 2 | Create entry points | **Both** — POST from `site_list` (name only, FKs null) **and** hub **`add_site`** (sets one FK per hub rules) |
| 3 | Delete | **Option A+** — hard delete when allowed; **`ConflictError`** when `estimate`, `job`, or **child site** (`parent_site_id`) references this site; `site_contact` / geography cascade (no blocker) |
| 4 | `contacts` UX | **Option A** — any-party picker + quick-create person (no auto role tags); relation required; no `title` on row; block add when catalog empty |
| 5 | List | **Option A** — column **`name` only**; search **`name`** contains; sort **`name` asc**; pagination `limit`/`offset`; no portfolio columns or hub filter in wave 1 |
| 6 | Layout | **Option A** — single column with **Portfolio** / **Standing contacts** section headings; master-detail shell; `SiteDetailForm`; create via list → detail route |
| 7 | Custom actions | **Option A** — `read` / `write` / `delete` only on `site_*`; no `add_site` / `link_*` / `add_contact` actions; hub `add_site` uses hub `write`; Field grants deferred |
| 8 | Cross-nav | **Option A** — portfolio hub links only (`/customers`, `/property-owners`) when FK + target `read`; plain text when FK set but no grant; contact rows display name only (no party lens links) in wave 1 |
| 9 | Orphans / edges | **Option A + A1** — orphans valid (no list badge); partial link OK; duplicate `site.name` allowed; party delete → FK null; hub attach-existing deferred |

---

## A — Identity

### `site_list`

| Key | Value |
|-----|-------|
| `surface_id` | `site_list` |
| Pair | list pane for `site_detail` |
| Route | `/sites` — `sites/layout.tsx` |
| API | `GET /api/sites` |
| Nav group | Sites |
| Anchor table | `site` |
| All tables (DAL) | `site` |
| Shipped vs target | **New** |

### `site_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `site_detail` |
| Pair | detail pane for `site_list` |
| Route | `/sites/[id]` — `id` = `site.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/sites/[id]` |
| Anchor table | `site` |
| All tables (DAL) | `site`, `site_contact`, `site_contact_relation` (join for relation labels); read joins `party` for portfolio display names; **`site_scope`, `site_zone`** (task 37c) |
| Shipped vs target | **Wave 1 shipped** — profile, portfolio, contacts; **scopes & zones** task [37c](../tasks/37c-site-scopes-zones.md) |

---

## B — Fields

### `site_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `site.id`, `site.name` | |

**List search:** `name` (case-insensitive contains).

**Default sort:** `name` asc (fixed; no column sort UI in wave 1).

**Pagination:** `limit` / `offset` on `GET /api/sites` (same pattern as party lists).

**No** portfolio columns, filters, or hub `?customer_party_id=` query param in wave 1.

### `site_detail`

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | `site.name` | |
| `customer_party` | scalar | read + write | `site.customer_party_id` → `party.display_name` | Picker: `party_role.customer` + `party.kind = organization` |
| `property_owner_party` | scalar | read + write | `site.property_owner_party_id` → `party.display_name` | Picker: `party_role.property_owner` (org or person) |
| `contacts` | collection | read + write | `site_contact` + relation label | `party_id`, `relation_id`, `sort_order` |
| `scopes` | collection | read + write | `site_scope` + nested `site_zone` | Root `category` (`root_category_id`); nested `zones[]` per scope — see below |
| `general_zones` | collection | read + write | `site_zone` (`site_scope_id` null) | General bucket; nested `zones[]` tree |

**Omit in wave 1:** `parent_site`, `physical_address`, `notes`, `attachments`.

**Omit task 34:** `assets` / `site_asset` editor (job phase).

### Scalar — portfolio projection (read DTO)

```json
{
  "customer_party_id": "<uuid | null>",
  "customer_display_name": "Tower West LLC",
  "property_owner_party_id": "<uuid | null>",
  "property_owner_display_name": "Tower REIT"
}
```

Writable PATCH keys: `customer_party_id`, `property_owner_party_id` (manifest Field ids `customer_party`, `property_owner_party`).

### Collection — `contacts` element

```json
{
  "id": "<site_contact.id>",
  "party_id": "<party.id>",
  "display_name": "Pat Superintendent",
  "kind": "person",
  "relation_id": "<uuid>",
  "relation_label": "Site superintendent",
  "sort_order": 0
}
```

Unique DB constraint: `(site_id, party_id, relation_id)`.

### Collection — `scopes` element (read DTO)

```json
{
  "id": "<uuid>",
  "root_category_id": "<catalog root category>",
  "root_category_name": "Fire Alarm",
  "name": "Fire Alarm — Building A",
  "sort_order": 1,
  "status": "active",
  "can_delete": true,
  "zones": [
    {
      "id": "<uuid>",
      "name": "Floor 1",
      "sort_order": 1,
      "status": "active",
      "can_delete": true,
      "zones": []
    }
  ]
}
```

Multiple rows per `root_category_id` allowed — disambiguate by `name` ([decision](../decisions/site.md#decision-site-scopes--zones--category-root-instances-2026-06-30)).

### Collection — `scopes` element (writable PATCH)

```json
{
  "id": "<uuid optional>",
  "root_category_id": "<catalog root>",
  "name": "Fire Alarm — Building A",
  "sort_order": 1,
  "zones": [
    {
      "id": "<uuid optional>",
      "name": "Floor 1",
      "sort_order": 1,
      "zones": []
    }
  ]
}
```

New rows from `site_detail` persist `status = active`. `root_category_name` read-only on GET.

### Collection — `general_zones` element

Same nested shape as `scopes[].zones[]` but persisted with `site_scope_id` null (General bucket). Writable PATCH: replace-array sibling to `scopes`.

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `site_list` | `read` | grant on list | Each GET list |
| `site_detail` | `read` | grant on detail | Each GET |
| `site_detail` | `write` | grant on detail + Field | Each PATCH / POST |
| `site_detail` | `delete` | grant on detail | Each DELETE |

**No custom actions** on `site_detail` — hub **`add_site`** remains on `customer_detail` / `property_owner_detail` only. Quick-create contact is **client UX** → PATCH `contacts` (or included in POST), not a separate server action.

**Hub `add_site`:** granted by `write` on the hub Surface; does **not** require `site_detail` `write`. Navigating to the new site after create requires `site_detail` `read` if the link is shown.

**List create:** `GET /api/sites` → `site_list` `read`; `POST` create → `site_detail` `write`.

**Field grants:** wave 1 — single `write` covers `profile`, portfolio scalars, `contacts`, **`scopes`**, **`general_zones`**. Per-Field split deferred.

**403 vs 404:** platform default.

---

## D — DAL read

### `site_list`

- **`list(ctx, { limit, offset, q? })`** — `site` anchor; sort `name` asc.
- **Search:** `q` matches `site.name` (case-insensitive contains).

### `site_detail`

- **`get(ctx, id)`** — project granted Fields only.
- **`customer_party` / `property_owner_party`** — join `party` for `display_name`; omit Field when no `read` grant.
- **`contacts`** — join `site_contact` + `site_contact_relation.display_name` as `relation_label`; join `party` for `display_name`, `kind`.
- **`scopes`** — all `site_scope` for site ordered by `sort_order`; join catalog `category.name` as `root_category_name`; nest `site_zone` rows per `site_scope_id` by `parent_zone_id`.
- **`general_zones`** — root `site_zone` where `site_scope_id` IS NULL; nested children by `parent_zone_id`.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`name`), optional `customer_party`, `property_owner_party`, optional `contacts` | Insert `site`; validate portfolio FKs against tag filters; both FKs may be null |
| `patch` | manifest-narrowed `profile`, `customer_party`, `property_owner_party`, `contacts`, **`scopes`**, **`general_zones`** | Portfolio scalars accept id or `null`; collections replace-array |
| `delete` | — | Hard delete when allowed; pre-check / map `23503` → `ConflictError` |

**Portfolio validation:**

| Field | Accept | Reject |
|-------|--------|--------|
| `customer_party_id` | `party` with `customer` tag and `kind = organization` | wrong tag, person customer, unknown id |
| `property_owner_party_id` | `party` with `property_owner` tag | wrong tag, unknown id |

**Delete blockers (minimum `ConflictError` blockers):**

| `type` | When |
|--------|------|
| `estimate` | `estimate.site_id` references site |
| `job` | `job.site_id` references site |
| `child_site` | any `site.parent_site_id` references this site |

`site_contact` cascade on site delete (DDL). **`site_scope` / `site_zone`:** replace-array on PATCH; omit unreferenced rows (hard delete); **409** when referenced by `estimate_line`, `job_line`, or `site_asset` ([task 37c](../tasks/37c-site-scopes-zones.md)). **App pre-check** required for `child_site` — DB `ON DELETE SET NULL` would silently unparent children; product rule is **block** until children are deleted or reparented (`parent_site` UI deferred).

**Transactions:** each mutation single transaction; audit on success.

---

## F — Domain rules

- **Sites are logical places** — no postal address columns; addresses live on `party_address` (wave 2); in-building scope on **`site_scope` / `site_zone`** ([`01-site-as-built.md`](../planning/01-site-as-built.md)).
- **Portfolio FKs** — distinct purposes; may both be set when payer (`customer`) ≠ legal owner (`property_owner`). Hub create sets **one** FK; operator may set the other here.
- **Hub trees** — `customer_detail` `portfolio_tree` keys off `site.customer_party_id`; `property_owner_detail` `related_sites` keys off `site.property_owner_party_id`. Null FK → site omitted from that hub until linked.
- **Standing contacts ≠ portfolio** — `site_contact` is who is **at** the property; not ownership. Do not auto-set `party_role` from contact rows.
- **Three “property owner” layers** (document on site detail help copy) — master tag (`property_owner_party_id`), `site_contact` relation label, `job_party` per engagement — [property-owner spec](./property-owner.md) § Domain rules.
- **Party delete** — `ON DELETE SET NULL` on both portfolio FKs; sites survive as orphans until reassigned.
- **Customer delete** — blocked when `site.customer_party_id` references customer party (app `ConflictError` per [customer spec](./customer.md)).
- **Audit:** all mutations on registered tables.

---

## G — UI layout

### List + detail

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): list in `sites/layout.tsx`, detail in `[id]/page.tsx`.

```text
┌─────────────────────────────────────────┐
│ SurfaceToolbar — New | Save | Revert | Delete … │
├─────────────────────────────────────────┤
│ [ General ] [ Scopes & zones ]          │
├─ General tab ───────────────────────────┤
│ profile (name)                          │
│ ── Portfolio ──                         │
│ customer_party · property_owner_party   │
│ ── Standing contacts ──                 │
│ contacts                                │
├─ Scopes & zones tab (task 37c) ────────┤
│ hint + [ Add scope ▾ ] [ Add zone ]     │
│ SiteScopesZonesTree (antd Tree)         │
│  General · scopes · nested zones        │
└─────────────────────────────────────────┘
```

**Create (list):** **New** → POST with `name` required; **Scopes & zones tab** on edit after site row exists.

**Tabs:** **General** (wave 1 fields) · **Scopes & zones** (`scopes` + `general_zones` tree). URL `?tab=scopes-zones` selects Scopes & zones; default (omit `tab`) is General. Tab omitted on create / when scopes are not readable — invalid `?tab=` falls back and cleans the URL. Same-surface list navigation preserves `tab` via `buildDetailHref`. One RHF form; Save sends full PATCH.

**Shared components:** `SiteDetailForm`; `SiteScopesZonesTree` ([task 37c](../tasks/37c-site-scopes-zones.md)).

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `site_detail` |
| 2 | Revert | reset form (all tabs) |
| 3 | New (list) | POST create |
| 4 | Delete | confirm modal → DELETE |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `site_detail` | `/customers/[id]` | `customer_party_id` set + `customer_detail` `read` |
| `site_detail` | `/property-owners/[id]` | `property_owner_party_id` set + `property_owner_detail` `read` |
| `site_detail` | *(plain text)* | FK set but target hub `read` denied — show `display_name`, no `<Link>` |
| `site_detail` | `contacts` row party | **No lens link** wave 1 — `display_name` only |
| `customer_detail` | `/sites/[id]` | `portfolio_tree` site node / `related_engagements` |
| `property_owner_detail` | `/sites/[id]` | `related_sites` row |

Hub lists omit site rows when principal lacks `site_detail` `read` ([customer](./customer.md), [property-owner](./property-owner.md)). No drawer/modal foreign Surfaces.

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `contacts` | **Add contact** | Any `party`; relation from `site_contact_relation_table` | "No standing contacts" |
| `scopes` / `general_zones` | **Add scope ▾** / **Add zone** on Scopes & zones tab | Root `category` dropdown; else add **zone** child | General parent only until user adds scopes |

**Scopes & zones UX (task 37c):** Ant Design `Tree` + `titleRender`; synthetic **General** parent; sibling **DnD** only; cascade delete; inline **`name`** on zone rows only. See [`11-categories-scope-model.md`](../planning/11-categories-scope-model.md).

**Contacts** (unchanged):

**Quick-create person:** minimal modal on same Surface (name + optional phone) — creates `party` + `party_person` + `site_contact` row; does **not** auto-tag `customer` / `property_owner`.

**Row shape:** no `title` column on `site_contact` (unlike `party_contact`) — `relation_label` + party `display_name` suffice.

**Same party, multiple relations:** allowed — distinct `relation_id` per row (unique on `(site_id, party_id, relation_id)`).

**Save model:** `contacts`, `scopes`, and `general_zones` replace-array on **Save** with profile/portfolio — not per-row server round-trip.

**Suggested relation names** (progressive setup / dev seed): Property owner, Property manager, Site superintendent, Other — **not** Bill to / billing roles ([site decision](../decisions/site.md#decision-site-contacts--site_contact_relation-catalog-2026-06-15)).

**Empty relation catalog:** disable **Add contact**; show CTA → progressive setup or `/contact-relations` ([cross-cutting](../decisions/cross-cutting.md#decision-progressive-setup--master-catalogs-2026-06-16)). Local QA: [`020_site_contact_relation_dev_seed.sql`](../../migrations/020_site_contact_relation_dev_seed.sql).

**Duplicate row:** unique `(site_id, party_id, relation_id)` — inline validation error before save.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create from list | POST | `name` required; FKs optional |
| Create from customer hub | `add_site` action | Sets `customer_party_id` only |
| Create from property-owner hub | `add_site` action | Sets `property_owner_party_id` only |
| Link / unlink portfolio | PATCH scalar `null` or id | Independent per FK |
| Delete site | DELETE | blocked when estimates, jobs, or **child sites** reference site |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Orphan site (both FKs null)** | Valid; in `site_list`; omitted from hub trees until linked — **no** list badge in wave 1 |
| **Partial link** | Valid; appears in hub matching set FK only |
| **Party delete** | Portfolio FKs `SET NULL`; site survives as orphan — repair on `site_detail` |
| **Duplicate `site.name`** | Allowed — no global unique constraint |
| **Hub attach existing site** | Deferred v1 — repair via `site_detail` pickers or create new from hub |
| **Dual FK** | Show both labels; editing one does not clear the other |
| **Subsidiary as portfolio owner** | Picker may select subsidiary org directly (same as hub tree node) |
| **Person property owner** | Allowed on `property_owner_party` picker; `customer_party` remains org-only |
| **Delete site with engagements** | `ConflictError` with estimate/job blockers — link to engagement when those Surfaces exist |
| **Delete site with child sites** | `ConflictError` `{ type: 'child_site', count }` — reparent or delete children first; list child `name` + link in payload when practical |
| **`site_contact_relation` in use** | Catalog delete `RESTRICT` — [`site-contact-relation.md`](./site-contact-relation.md) |
| **Codegen L1/L2** | Hand-written descriptor + repository for `contacts`, **`scopes`**, **`general_zones`** until codegen ships |
| **Scopes optional** | Valid site with empty `scopes` and `general_zones` |
| **Referenced zone delete** | UI disable trash; PATCH omit → `ConflictError` `referenced` |
| **Duplicate root category** | Multiple `site_scope` same `root_category_id` OK; duplicate `name` allowed v1 |
| **`site_asset`** | Not edited on `site_detail` v1 — job / complete slice |

---

## Verify (stop gate)

- [x] Locked answers forks 1–9 (2026-06-19) reflected in decisions + catalog
- [x] A–K complete
- [x] [`site-contact-relation.md`](./site-contact-relation.md) catalog spec (#11)
- [x] Implementation — [task 20](../tasks/20-ui-discovery.md) steps 1–2 (migration + sites UI) ✅ (2026-06-22)
- [x] **Task 37c** — `scopes` + `general_zones` DAL + Scopes & zones tab ([`37c-site-scopes-zones.md`](../tasks/37c-site-scopes-zones.md)) ✅ (2026-07-01)
