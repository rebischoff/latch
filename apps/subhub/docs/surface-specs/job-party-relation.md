# Catalog — `job_party_relation_table`

> **Wave:** 4 · **Status:** target spec (2026-06-23); **shipped** wave 4a ([task 22](../tasks/22-estimate-wave-4a.md) steps 3, 9) · **Consumers:** [`estimate.md`](./estimate.md) `stakeholders`, [`job.md`](./job.md) `stakeholders` (wave 5) · **Catalog:** [`surfaces.md`](../surfaces.md#job_party_relation_table) · **DBML:** `job_party_relation`; delete blockers `estimate_party`, `job_party` *(wave 5)* · **Decisions:** [party_role vs job relations](../decisions/party.md#decision-party_role-master-tags-vs-job-scoped-relations-2026-06-15), [job stakeholders](../decisions/job.md#decision-job-anchor-and-stakeholders--deferred-to-job-slice-2026-06-15), [catalog table page](../decisions/general.md#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16), [replace-array](../decisions/general.md#decision-replace-array-sync-algorithm-2026-06-22), [delete blockers](../decisions/cross-cutting.md#decision-delete-blocked-by-referential-use--structured-errors-2026-06-18)

**Related:** Parallel to [`site-contact-relation.md`](./site-contact-relation.md) — **engagement-scoped** stakeholder roles on estimates and jobs, not standing property contacts and not master `party_role` tags (GC/subcontractor live here).

---

## Locked product answers (2026-06-23)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Surface shape | **Catalog table page** — single route, editable `Table`; not list+detail |
| 2 | Fields | **`display_name`** (unique), **`sort_order`** — no `code` column; FKs use `id` |
| 3 | Write model | **Draft Save/Revert** UI; server **replace-array** sync in one transaction via `PATCH { rows }` |
| 4 | Delete | **`InUseError`** when `estimate_party` or `job_party` references row (DB `RESTRICT` on both) |
| 5 | Empty catalog | DDL empty at migrate; **progressive setup** suggests seven defaults; **this page** always ships for ongoing edit |
| 6 | Suggested rows | Customer, Property owner, Bill to, Sold to, General contractor, Subcontractor, Subcontract through |
| 7 | Picker consumers | `estimate_detail` / `job_detail` `stakeholders` relation dropdown; sorted `sort_order` → `display_name` |
| 8 | Route split | Page **`/party-relations`**; API under estimates namespace **`/api/estimates/party-relations`** |
| 9 | Nav | **Sales** group — label **Party relations**; reachable via stakeholder empty-catalog CTA before nav entry ships |

---

## A — Identity

| Key | Value |
|-----|-------|
| `surface_id` | `job_party_relation_table` |
| Pair | *(none — catalog table Surface)* |
| Route | `/party-relations` — `party-relations/page.tsx` |
| API | `GET` / `PATCH /api/estimates/party-relations` `{ rows }` · per-row `GET` / `PATCH` / `DELETE /api/estimates/party-relations/[id]` · optional `POST` for scripts/setup |
| Nav group | Sales |
| Nav label | Party relations |
| Anchor table | `job_party_relation` |
| All tables (DAL) | `job_party_relation`; delete pre-check joins `estimate_party` (shipped), `job_party` *(add wave 5)* |
| Shipped vs target | **Shipped** wave 4a — `JobPartyRelationCatalog`, DAL in `lib/estimates/` |

---

## B — Fields

### Table columns (single-page projection)

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `display_name` | scalar | read + write | `job_party_relation.display_name` | Unique; admin-editable label shown in stakeholder pickers |
| `sort_order` | scalar | read + write | `job_party_relation.sort_order` | Default `0`; lower first in pickers; set from array index on replace Save |

**List sort (table + picker):** `sort_order` asc, `display_name` asc, `id` asc.

**Read-only in DTO:** `id` (stable FK target for `estimate_party.relation_id` / `job_party.relation_id`).

### Row DTO (minimum)

```json
{
  "id": "<uuid>",
  "display_name": "General contractor",
  "sort_order": 50
}
```

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `job_party_relation_table` | `read` | grant on Surface | Each GET (table + picker label fetch) |
| `job_party_relation_table` | `write` | grant on Surface + Field | Each replace PATCH (upsert / reorder); footer add |
| `job_party_relation_table` | `delete` | grant on Surface | Staged row removal + omitted ids on replace PATCH |

**Picker on `estimate_detail` / `job_detail`:** principal needs **`read`** on `job_party_relation_table` to populate relation dropdown labels. Adding a stakeholder row requires parent Surface `write`, not catalog `write`.

**403 vs 404:** platform default.

---

## D — DAL read

- **`listAll(ctx)`** / **`list(ctx)`** — all rows; sort `sort_order`, `display_name`, `id`; manifest-project `id`, `display_name`, `sort_order`.
- **`get(ctx, id)`** — optional for per-row PATCH round-trip; same projection.
- **Picker endpoint** — same list contract (no pagination — expect small catalogs).

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `replace` | `rows[]` — `{ id?`, `display_name }` per element | **Replace-array sync** in one transaction — [replace-array decision](../decisions/general.md#decision-replace-array-sync-algorithm-2026-06-22) |
| `create` *(optional)* | field-keyed `display_name`, optional `sort_order` | Insert row; for progressive setup / scripts — not catalog page Save |
| `patch` *(optional)* | field-keyed `display_name`, `sort_order` | Single-row update — not catalog page Save |
| `delete` *(optional)* | — | Single-row delete — not catalog page Save |

**Replace-array steps:** validate strict schema → pre-check delete blockers → delete omitted ids → upsert payload rows; when `sort_order` writable, `sort_order = index + 1` (1-based) from array order.

**Delete blocker payload (minimum):**

```json
{
  "code": "in_use",
  "entity": "job_party_relation",
  "blockers": [{ "type": "estimate_party", "count": 2 }]
}
```

*(Wave 5: add `{ "type": "job_party", "count": N }` to pre-check and `InUseError` payload.)*

**Rename in use:** allowed — FKs reference `id`; pickers show updated `display_name`.

**Transactions:** each mutation single transaction; audit on success.

---

## F — Domain rules

- **Engagement-scoped roles** — how a `party` participates on a specific quote or job (customer, GC, subcontractor, bill-to, …). Distinct from **`site_contact_relation`** (standing people at a property) and from master **`party_role`** tags ([party decision](../decisions/party.md#decision-party_role-master-tags-vs-job-scoped-relations-2026-06-15)).
- **No `code` column** — display names are product copy; ids are opaque FKs.
- **DDL empty at migrate** — `021_estimate.sql` has no `INSERT`s; production rows via progressive setup and/or this admin page; local QA via optional [`022_job_party_relation_dev_seed.sql`](../../migrations/022_job_party_relation_dev_seed.sql).
- **Same catalog for estimate and job** — `estimate_party` and `job_party` both FK `relation_id` → this table; win-copy (5b) preserves relation ids when stakeholders copy estimate → job.
- **Labor subcontractor** — express as `job_party` + relation **Subcontractor** here; not a standing `vendor` catalog row ([party decision](../decisions/party.md#decision-party_role-master-tags-vs-job-scoped-relations-2026-06-15)).
- **Audit:** all mutations on registered tables.

---

## G — UI layout

Single full-width page — no master-detail sider ([routing-and-libraries.md](../routing-and-libraries.md#catalog-tables--editable-table-page)).

```text
┌─────────────────────────────────────────────────────────┐
│ SurfaceToolbar — Save | Revert                          │
├─────────────────────────────────────────────────────────┤
│ Editable Table (CatalogTableSurface + FieldArrayTable)  │
│  [≡] display_name | [Delete]                           │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│            [+ Add relation]                             │
└─────────────────────────────────────────────────────────┘
```

**Draft edit:** RHF field array; **Save** commits `PATCH { rows }` (replace-array); **Revert** resets to last load. Drag reorder when `sort_order` writable.

**Shared component:** `JobPartyRelationCatalog` — second catalog-table instance (after `site_contact_relation_table`).

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | `PATCH { rows }` — replace-array; map `InUseError` / duplicate name errors |
| 2 | Revert | Reset form to last loaded list |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `estimate_detail` `stakeholders` (empty catalog) | `/party-relations` | Add stakeholder blocked — CTA **Manage party relations** |
| `job_detail` `stakeholders` *(wave 5)* | `/party-relations` | Same empty-catalog CTA |
| `job_party_relation_table` | `/estimates` | Optional footer link — not required v1 |

---

## I — Collections UX

*(N/A — this Surface is the catalog itself, not a parent collection.)*

**Consumers (`estimate_detail` / `job_detail` `stakeholders`):** relation column = `Select` options from `list(job_party_relation_table)`; option label = `display_name`, value = `id`; block **Add stakeholder** when catalog empty.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| First app use / empty catalog | Progressive setup | Suggest seven default rows; user confirms/edits; inserts via same DAL as table page |
| Admin add | POST or table Save | Any time from `/party-relations` |
| Rename | PATCH / replace | Safe while referenced |
| Delete unused | DELETE / replace omit | Hard delete |
| Delete in use | DELETE / replace omit | `InUseError` — remove or reassign `estimate_party` / `job_party` rows first |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Duplicate `display_name`** | Unique index — validation error on POST/PATCH/replace |
| **Delete last relation while stakeholders exist** | Impossible if rows reference it — RESTRICT |
| **Delete all relations, no stakeholders** | Allowed — parent Add stakeholder stays disabled |
| **Progressive setup skipped** | Admin uses catalog table page only |
| **Dev seed** | Optional `022_*` — idempotent on `display_name`; Postgres-assigned ids — no doc hard-coding |
| **Property contact vs job role** | “Property owner” on `site_contact` ≠ “Property owner” on `estimate_party` — different catalogs |
| **`job_party` delete check** | Ship with wave 5 job DAL — DB FK already RESTRICT |
| **Nav entry** | Add to `SURFACE_NAV_CATALOG` under Sales when polishing nav — page + API already live |
| **Codegen** | `job_party_relation_table.surface.yaml` + generated glue; hand-extended DAL for replace-array |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-23) reflected in spec + shipped code
- [x] A–K complete; mirrors [`site-contact-relation.md`](./site-contact-relation.md) pattern for engagement catalog
- [x] Wave 4a implementation — [task 22](../tasks/22-estimate-wave-4a.md) steps 3, 9 ✅ (2026-06-23)
