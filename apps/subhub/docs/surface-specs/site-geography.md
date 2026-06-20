# Cross-cutting — geography on `site_detail`

> **Wave:** 2b · **Status:** target spec (2026-06-19) · **Parent:** [`site.md`](./site.md) · **Catalog:** [`surfaces.md`](../surfaces.md#site_list--site_detail) · **DBML:** `site`, `site_section`, `site_location`, `address` · **Decisions:** [geography timing](../decisions/site.md#decision-site-geography-on-site_detail--timing-2026-06-17), [section vs location](../decisions/site.md#decision-section-vs-location--granularity-2026-06-19), [lifecycle](../decisions/site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17), [slim rows + audit](../decisions/site.md#decision-site-geography--slim-rows-and-latch_audit-2026-06-17), [postal spine](../decisions/site.md#decision-postal-address--normalized-spine-and-party-vs-site-roles-2026-06-19), [site nesting](../decisions/site.md#decision-site-nesting--when-site-vs-site_location-vs-job-2026-06-19) · **Pattern:** [`child-collections.md`](../child-collections.md) · **Postal PATCH:** [`party-addresses.md`](./party-addresses.md)

**Consumers:** `site_detail` only — adds **`parent_site`**, **`physical_address`**, **`sections`**, **`locations`**. Estimate/job surfaces create `proposed` rows and publish on job complete (specs #20–21); they do **not** duplicate geography editors.

**Prerequisite:** wave 1 [`site.md`](./site.md) shipped; wave 2 [`party-addresses.md`](./party-addresses.md) optional but recommended before **`physical_address`** suggest-from-`hq`.

---

## Locked product answers (2026-06-19)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Scope | **Four Fields** on `site_detail` — `parent_site`, `physical_address`, `sections`, `locations`; no standalone Surface |
| 2 | Patch model | **Replace-array** for `sections` and `locations`; scalar PATCH for `parent_site` and `physical_address` — same Save transaction as wave 1 Fields |
| 3 | Default status (`site_detail` create) | New rows from this Surface default **`active`** — `proposed` reserved for estimate/job surfaces |
| 4 | `physical_address` | **Scalar postal group** → `address` row + `site.physical_address_id`; not a collection; copy-on-write when shared ([`party-addresses.md`](./party-addresses.md) algorithm) |
| 5 | Dispatch suggest | **One-time** client **Suggest from customer HQ** when `customer_party_id` set and site has no physical address — never auto-sync |
| 6 | Section structure | **Flat** `sections` list — no nested sections; campus→building uses **`parent_site`** |
| 7 | Location ↔ section | Optional `site_section_id` on each location; section removed → locations in payload keep row but **`site_section_id` cleared** |
| 8 | Line FK safety | **Never hard-delete** `site_location` referenced by any `estimate_line`, `job_line`, `job_line_part`, `job_work_item`, or `requested_order_line` |
| 9 | Remove referenced location | **Reject** omit-from-array unless row status is `removed`, `relocated`, or `cancelled` |
| 10 | Relocate | Set status **`relocated`** + **`replaced_by_site_location_id`** → target on **same site**; do not relabel in place when referenced by **completed** job lines |
| 11 | UI layout | **Below `contacts`:** `parent_site` → `physical_address` → `sections` → `locations` (location rows include section dropdown) |
| 12 | `parent_site` picker | Nullable; exclude **self** and **descendants** (cycle prevention) |
| 13 | Publish on job complete | **Out of scope here** — `job_detail` DAL promotes `proposed` → `active` and applies relocations; does not rewrite closed job line FKs ([lifecycle decision](../decisions/site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17)) |

---

## A — Identity

| Key | Value |
|-----|-------|
| `surface_id` | *(field addendum — extends `site_detail`)* |
| Field ids | `parent_site`, `physical_address`, `sections`, `locations` |
| Parent Surface | `site_detail` |
| Route | Unchanged — `/sites/[id]` |
| Anchor table | `site` |
| Child tables (DAL) | `site_section`, `site_location`, `address` (via `site.physical_address_id`) |
| Shipped vs target | **New** — wave 2b after wave 1 `site_detail` |

`site_detail` YAML gains four logical Fields (wave 2b). `site_list` unchanged — **no** `parent_site` column in wave 2b ([slice 2 UI scope](../decisions/site.md#decision-slice-2-ui-scope--planning-gate-2026-06-16)).

---

## B — Fields

### Scalar — `parent_site`

| Sub-field | Writable | Storage | Notes |
|-----------|----------|---------|-------|
| `parent_site_id` | read + write | `site.parent_site_id` | Nullable FK → `site.id` |
| `parent_display_name` | read-only | join `site.name` | For link to parent `/sites/[id]` when granted |

**Picker filter:** any `site` except current id and any site that would create a cycle (descendants of current site).

### Scalar — `physical_address`

| Sub-field | Writable | Storage | Notes |
|-----------|----------|---------|-------|
| `id` | read-only | `address.id` via `site.physical_address_id` | Omitted when null |
| `label` | read + write | `address.label` | Optional suite/floor on postal row |
| `line1` | read + write | `address.line1` | Required when any postal field sent |
| `line2` | read + write | `address.line2` | Default `''` |
| `city` | read + write | `address.city` | |
| `state` | read + write | `address.state` | |
| `postal_code` | read + write | `address.postal_code` | |
| `country` | read + write | `address.country` | Default `US` |
| `lat` | read + write | `address.lat` | Nullable |
| `lng` | read + write | `address.lng` | Nullable |

**Clear:** PATCH `physical_address: null` → `site.physical_address_id = null`; orphan GC on `address` when unreferenced.

**Not billing** — corporate mail stays on `party_address` ([postal spine](../decisions/site.md#decision-postal-address--normalized-spine-and-party-vs-site-roles-2026-06-19)).

### Collection — `sections`

| Sub-field | Writable | Storage | Notes |
|-----------|----------|---------|-------|
| `id` | read-only | `site_section.id` | Stable RHF key |
| `title` | read + write | `site_section.title` | Required non-empty |
| `sort_order` | read + write | `site_section.sort_order` | Default `0` |
| `status` | read + write | `site_section.status` | `proposed` \| `active` \| `removed` \| `cancelled` — default **`active`** on add from this Surface |

**List sort (read):** `sort_order` asc, then `title`.

### Collection — `locations`

| Sub-field | Writable | Storage | Notes |
|-----------|----------|---------|-------|
| `id` | read-only | `site_location.id` | |
| `label` | read + write | `site_location.label` | Required non-empty — work spot text |
| `site_section_id` | read + write | `site_location.site_section_id` | Nullable — must match id in `sections` payload or null |
| `sort_order` | read + write | `site_location.sort_order` | Default `0` |
| `status` | read + write | `site_location.status` | `proposed` \| `active` \| `relocated` \| `removed` \| `cancelled` — default **`active`** on add from this Surface |
| `replaced_by_site_location_id` | read + write | `site_location.replaced_by_site_location_id` | Required when `status = relocated`; must reference **active** location on **same site** |

**List sort (read):** `sort_order` asc, then `label`. UI may group visually by section title (read-only rollup).

### Collection element DTOs

```json
{
  "sections": [
    { "id": "<uuid>", "title": "Floor 3", "sort_order": 0, "status": "active" }
  ],
  "locations": [
    {
      "id": "<uuid>",
      "label": "Rm 345 Cam 1",
      "site_section_id": "<uuid | null>",
      "sort_order": 0,
      "status": "active",
      "replaced_by_site_location_id": null
    }
  ]
}
```

```json
{
  "parent_site_id": "<uuid | null>",
  "parent_display_name": "200 Market Campus",
  "physical_address": {
    "id": "<uuid>",
    "label": "",
    "line1": "200 Market St",
    "line2": "",
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94105",
    "country": "US",
    "lat": null,
    "lng": null
  }
}
```

---

## C — Policy

| Parent Surface | Field | Action | Granted when | Re-auth |
|----------------|-------|--------|--------------|---------|
| `site_detail` | `parent_site` | `read` / `write` | grant on Field | Each GET / PATCH |
| `site_detail` | `physical_address` | `read` / `write` | grant on Field | Each GET / PATCH |
| `site_detail` | `sections` | `read` / `write` | grant on Field | Each GET / PATCH |
| `site_detail` | `locations` | `read` / `write` | grant on Field | Each GET / PATCH |

No custom actions (`relocate`, `publish`, …) — status transitions are Field writes on Save.

**Field grants:** wave 2b — single `site_detail` `write` covers geography Fields (same as wave 1 portfolio/contacts split deferred).

**403 vs 404:** platform default.

---

## D — DAL read

On **`get(ctx, siteId)`** (when readable):

1. **`parent_site`** — self-join `site` for parent `name` when `parent_site_id` set.
2. **`physical_address`** — join `address` on `site.physical_address_id`; omit key when null or no grant.
3. **`sections`** — `site_section` where `site_id = siteId`; sort per **B**.
4. **`locations`** — `site_location` where `site_id = siteId`; include `replaced_by_site_location_id`; sort per **B**.

**Helpers:** `loadSiteSections(siteId)`, `loadSiteLocations(siteId)`, `loadSitePhysicalAddress(siteId)` — shared with estimate/job grouped editors (read-only registry).

---

## E — DAL write

### Parent `patch` / `create` keys

| Key | Semantics |
|-----|-----------|
| `parent_site` | `{ parent_site_id: uuid \| null }` — validate acyclic |
| `physical_address` | postal object \| `null` — upsert/clear per algorithm below |
| `sections` | replace-array |
| `locations` | replace-array — after `sections` in same transaction |

Unknown keys → **400** (strict). Process order in one transaction: **scalars → `sections` → `locations` → orphan GC**.

### `parent_site` validation

| Rule | Action |
|------|--------|
| `parent_site_id = null` | Clear FK |
| Target exists | OK |
| Target = self | **Reject** |
| Target is descendant of self | **Reject** (`cycle`) |
| Parent deleted elsewhere | **Reject** on PATCH |

Site delete still **blocks** when child sites exist ([`site.md`](./site.md) § E).

### `physical_address` upsert

Reuse **postal identity** + **copy-on-write** rules from [`party-addresses.md`](./party-addresses.md) § E — referrer set includes `party_address` and other sites’ `physical_address_id`.

| Case | Action |
|------|--------|
| `null` | Clear `site.physical_address_id`; GC `address` if zero referrers |
| New postal payload, no existing id | `INSERT address` → set FK |
| Existing id, postal unchanged | In-place update `label` / `lat` / `lng` |
| Existing id, postal changed, not shared | In-place `UPDATE address` |
| Existing id, postal changed, shared | Copy-on-write → new `address.id` → repoint this site only |

### `replaceSiteSections(siteId, rows[])`

| Case | Action |
|------|--------|
| New row (no `id`) | `INSERT` with `status` default **`active`** if omitted |
| Existing `id` | `UPDATE` title, `sort_order`, `status` |
| Omitted from payload | **Hard DELETE** if no `site_location` still references *(locations should have been cleared or moved in same PATCH)*; if DB still has locations with this `site_section_id` after location replace, **`SET NULL`** on those locations (already handled by location pass) |

Sections are **not** line-referenced — hard delete on omit is allowed.

### `replaceSiteLocations(siteId, rows[])`

**Referenced** = row id appears on any `estimate_line`, `job_line`, `job_line_part`, `job_work_item`, or `requested_order_line`.

| Case | Action |
|------|--------|
| New row | `INSERT`; default `status` **`active`** if omitted |
| Existing, in payload | `UPDATE` allowed fields; enforce relocate invariants |
| Omitted, **not referenced** | **Hard DELETE** |
| Omitted, **referenced** | **Reject** — `ConflictError` (`referenced_location`) unless last PATCH set status to `removed` / `relocated` / `cancelled` *(row must remain in payload with terminal status)* |

**Label change:** reject when referenced by **`job_line`** on **`job.status = complete`** (closed sold scope).

**`status = relocated`:** require `replaced_by_site_location_id` → target exists, same `site_id`, target `status = active`, target ≠ self.

**`site_section_id`:** must be null or match a section id in the **same PATCH** `sections` array (or existing section for this site if `sections` omitted from PATCH — when only `locations` patched, validate against DB).

### Audit

All mutations on `site`, `site_section`, `site_location`, `address` produce `latch_audit` rows — provenance for introduce/remove/relocate ([slim rows decision](../decisions/site.md#decision-site-geography--slim-rows-and-latch_audit-2026-06-17)).

---

## F — Domain rules

- **Sections organize; locations pin work** — estimate/job lines FK **`site_location_id` only** ([section vs location](../decisions/site.md#decision-section-vs-location--granularity-2026-06-19)).
- **As-built registry** — `site_section` / `site_location` persist across jobs; historic line FKs stay frozen ([lifecycle](../decisions/site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17)).
- **`proposed` on quotes** — estimate/job DAL may insert `proposed` rows on the quote site; **`job.complete`** publishes survivors to `active` — not done on `site_detail` Save.
- **Campus vs suite** — new **building** → child **`site`** (`parent_site`); suite/room/device → **`site_location`** ([nesting](../decisions/site.md#decision-site-nesting--when-site-vs-site_location-vs-job-2026-06-19)).
- **Billing vs dispatch** — `party_address` vs `physical_address` ([postal spine](../decisions/site.md#decision-postal-address--normalized-spine-and-party-vs-site-roles-2026-06-19)).
- **Commercial buckets** — `estimate_section` / `quote_sections` are **not** `site_section` ([estimate decision](../decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17)).
- **Field execution status** — `job_work_item` only; not on `site_location`.

---

## G — UI layout

Extend [`site.md`](./site.md) § G — insert **Geography** block **after Standing contacts**:

```text
┌─────────────────────────────────────────┐
│ profile (name)                          │
│ ── Portfolio ──                         │
│ customer_party · property_owner_party   │
│ ── Standing contacts ──                 │
│ contacts                                │
│ ── Geography ──                         │  ← wave 2b
│ parent_site (picker + link)             │
│ physical_address (postal form)          │
│ sections (field array)                  │
│ locations (field array + section select)│
└─────────────────────────────────────────┘
```

**`physical_address`:** single inline form (not field array). **Suggest from customer HQ** button when `customer_party_id` set, `physical_address` empty, and customer `hq` exists — copies postal fields into form only; Save persists.

**`locations`:** each row — `label`, optional **Section** `Select` (ids from `sections` field array), `status`, when `relocated` show **Replaced by** location picker (active locations on site, excluding self).

**Grouping:** optional read-only subsection headers by section title — no nested `useFieldArray` required.

**Shared component:** extend `SiteDetailForm` — `SiteGeographyFields` with four FieldControls.

---

## H — UI chrome

No new routes or toolbar actions. Save remains parent **PATCH** `site_detail` (all granted Fields).

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `site_detail` `parent_site` | `/sites/[parent_id]` | parent set + `site_detail` `read` |
| `site_detail` | customer `hq` source | suggest button only — no link required |
| Estimate/job grouped editor | `site_detail` | read-only registry + create `proposed` — specs #20–21 |

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `sections` | **Add section** | none | "No sections — add optional zones (floor, wing) or attach locations without sections" |
| `locations` | **Add location** | **Section** optional dropdown from current form `sections` | "No work locations" |

**Remove section:** delete from field array; Save clears `site_section_id` on locations that pointed at it.

**Remove location:** delete icon; blocked client-side when server marked `referenced` (optional read flag) — operator must set `removed` / `relocated` / `cancelled` and keep row until Save.

**Relocate:** set status `relocated`, pick target location — old row stays in list (tombstone); target receives new work going forward.

**Sort:** `sort_order` numeric on each row; drag reorder optional v1 (manual integer OK).

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Site admin adds section/location | `active` default | As-built setup on `site_detail` |
| Estimate adds place on quote site | `proposed` | estimate DAL — spec #20 |
| Job complete | `proposed` → `active`; apply `relocated` / `removed` | job DAL — spec #21 |
| Admin marks location `removed` | tombstone | Row stays if line-referenced |
| Admin relocates | old `relocated` + `replaced_by_*` | New installs use target id |
| Clear physical address | PATCH `null` | GC shared `address` when safe |
| Site delete | cascade sections/locations | engagements still block site delete |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Shared `address` row** | Copy-on-write on postal edit ([`party-addresses.md`](./party-addresses.md)) |
| **Many sites, one street** | Allowed — same `address.id` on multiple `physical_address_id` |
| **Location without section** | Valid — whole-suite label only |
| **Section without locations** | Valid — zone placeholder |
| **`replaced_by` points at relocated row** | Reject — target must be `active` |
| **Circular relocate chain** | Reject in DAL validation |
| **Duplicate `site.name` under same parent** | Allowed ([`site.md`](./site.md)) |
| **Child site geography** | Each `site` has own section/location registry — no inheritance from parent |
| **Grouped estimate editor** | Reads registry via `get`; may POST `proposed` via estimate PATCH — not `site_detail` |
| **Codegen** | Hand-written collection schemas + replace helpers until codegen ships |
| **DDL** | `physical_address_id` column ships in wave 2b migration (after task 19) |

---

## `site.md` patch checklist (implementation)

When implementing wave 2b, update [`site.md`](./site.md):

- **B** — remove geography from "Omit in wave 1"; link here
- **E** — add PATCH keys and replace helpers
- **G** — geography section order
- **I** — collections table rows for `sections` / `locations`

---

## Verify (stop gate)

- [x] Locked answers (2026-06-19) reflected in [`decisions/site.md`](../decisions/site.md)
- [x] A–K complete; catalog wave 2b Fields in [`surfaces.md`](../surfaces.md)
- [ ] Implementation deferred until task 19 exit + wave 2b migration slice
