# Catalog — `part_list` · `part_detail`

> **Wave:** 3 · **Status:** target spec (2026-06-19) · **Implementation:** [`24-part-wave-3a.md`](../tasks/24-part-wave-3a.md) wave 3a — **complete** (2026-06-24) · **Catalog:** [`surfaces.md`](../surfaces.md#part_list--part_detail) · **DBML:** `manufacturer_part`, `vendor_part` · **Decisions:** [catalog parts](../decisions/catalog.md#decision-part_detail--mpn-catalog-and-vendor-pricing-2026-06-19), [catalog simplified](../decisions/catalog.md#decision-catalog--simplified-parts-items-categories-2026-06-16), [list+detail create](../decisions/general.md#decision-listdetail-surface-create--toolbar-and-picker-add-new-2026-06-19), [delete blockers](../decisions/cross-cutting.md#decision-delete-blocked-by-referential-use--structured-errors-2026-06-18), [cross-Surface nav](../decisions/general.md#decision-cross-surface-related-records--navigation-only-v1-2026-06-18)

**Related:** [`manufacturer.md`](./manufacturer.md) — manufacturer is a picker anchor only; no parts hub. [`vendor.md`](./vendor.md) — primary `vendor_part` edit on this Surface. [`item.md`](./item.md) *(spec #15)* — `part_links` reverse nav. **Deferred:** `specs`, part requirements, `cut_sheet_url` / submittals — estimate/job slice (#20–21).

---

## Locked product answers (2026-06-19)

| # | Topic | Choice |
|---|--------|--------|
| 1 | `profile` scope | **MPN header only** — `manufacturer_party_id`, `mpn`, `description`, `unit`, `purchase_unit`, `units_per_purchase`. **Defer** `specs`, requirements graph, `cut_sheet_url` |
| 2 | `vendor_pricing` row | `vendor_party_id`, `vendor_pn`, `vendor_description`, `unit_price`, `is_preferred`. **No** `currency` on row (org/vendor-level if ever needed). **No** price history / effective date |
| 3 | `is_preferred` | **At most one** `true` per part — DAL clears siblings on PATCH |
| 4 | List filter | **None** v1 — org-wide list; no `?manufacturer=` deep link or sidebar filter |
| 5 | List columns | `mpn`, `description`, `manufacturer` label — **no** price / preferred-vendor columns |
| 6 | List search / sort | Search **`mpn`**, **`description`**; sort **manufacturer `display_name`**, then **`mpn`** |
| 7 | Create | [Cross-cutting](../decisions/general.md#decision-listdetail-surface-create--toolbar-and-picker-add-new-2026-06-19) — **New** on list toolbar; **Add new** in pickers when `create` granted. POST requires manufacturer + MPN + description; `vendor_pricing` optional |
| 8 | Delete | `ConflictError` with counts + sample labels + deep links; allow when only `vendor_part` children; **PATCH** identity unless `RESTRICT` blockers |
| 9 | Policy | **`profile`** and **`vendor_pricing`** separate manifest Fields — no sensitive-field tier |
| 10 | Related lists | **None** on `part_detail` — no “used on items” aggregate; nav via links on header + pricing rows only |

---

## A — Identity

### `part_list`

| Key | Value |
|-----|-------|
| `surface_id` | `part_list` |
| Pair | list pane for `part_detail` |
| Route | `/parts` — `parts/layout.tsx` |
| API | `GET /api/parts` |
| Nav group | Catalog |
| Anchor table | `manufacturer_part` |
| All tables (DAL) | `manufacturer_part`, join `party` for manufacturer label |
| Shipped vs target | **New** |

### `part_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `part_detail` |
| Pair | detail pane for `part_list` |
| Route | `/parts/[id]` — `id` = `manufacturer_part.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/parts/[id]` |
| Anchor table | `manufacturer_part` |
| All tables (DAL) | `manufacturer_part`, `vendor_part`, join `party` for manufacturer + vendor labels |
| Shipped vs target | **New** |

---

## B — Fields

### `part_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `manufacturer_part.id`, `mpn`, `description`, `manufacturer_party_id`, manufacturer `display_name` | No `unit_price` on list |

**List search:** `mpn`, `description` (case-insensitive contains).

**List sort (default):** manufacturer `party.display_name` asc, `mpn` asc.

**No list filter** by manufacturer in v1.

### `part_detail`

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | `manufacturer_party_id`, `mpn`, `description`, `unit`, `purchase_unit`, `units_per_purchase` | Manufacturer ref + denormalized label in read DTO |
| `vendor_pricing` | collection | read + write | `vendor_part` | replace-array PATCH; see element shape |

**Omit on this Surface:** `specs`, `cut_sheet_url`, related item/job aggregates, price history.

**DDL-only (not Surface Fields v1):** `manufacturer_part.specs`, `cut_sheet_url`; `vendor_part.currency` (default `USD`, not exposed).

### Collection — `vendor_pricing` element

```json
{
  "id": "<vendor_part.id>",
  "vendor_party_id": "<party.id>",
  "vendor_display_name": "SupplyCo",
  "vendor_pn": "ABC-123",
  "vendor_description": "18/2 shielded pair",
  "unit_price": "1.24",
  "is_preferred": true
}
```

**UOM context (read-only hint on detail):** show `profile.unit` / `purchase_unit` / `units_per_purchase` near pricing grid — price is per `purchase_unit` when set, else per `unit` ([catalog decision](../decisions/catalog.md#decision-catalog--simplified-parts-items-categories-2026-06-16)).

**Uniqueness:** `(vendor_party_id, vendor_pn)` per org; `(manufacturer_party_id, mpn)` on anchor.

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `part_list` | `read` | grant on list | Each GET list |
| `part_list` | `create` | grant on list | Each POST (create flow) |
| `part_detail` | `read` | grant on detail | Each GET |
| `part_detail` | `write` | grant on detail + Field | Each PATCH |
| `part_detail` | `delete` | grant on detail | Each DELETE |

**Field grants:** `profile` and `vendor_pricing` are **independent** — separate `read` / `write` on manifest. No sensitive-field classification; when `read` is missing on a Field, DAL **omits** it from the DTO (standard manifest behavior).

**Role matrix:** IAM grant authoring only — spec does not hard-code job titles. Typical shape: catalog admins get both Fields; read-only roles may get `profile` without `vendor_pricing` write.

---

## D — DAL read

### `part_list`

- **`list(ctx, { limit, offset, q? })`** — join `manufacturer_part` → `party` on `manufacturer_party_id` for label.
- **Search:** `q` matches `mpn` or `description`.
- **Sort:** manufacturer `display_name`, `mpn`.
- **Omit** `vendor_pricing` / prices on list projection.

### `part_detail`

- **`get(ctx, id)`** — load anchor + `vendor_part` rows when `vendor_pricing` readable; join vendor `party.display_name`.
- **Manufacturer label** on `profile` when readable.
- **No** aggregates to `item_part_link`, `job_line_part`, etc.

---

## E — DAL write

| Operation | Body keys | Collection semantics | Transaction |
|-----------|-----------|----------------------|-------------|
| `create` | `profile` (required keys), optional `vendor_pricing` | replace-array if pricing sent | single txn + audit |
| `patch` | manifest-narrowed `profile`, `vendor_pricing` | replace-array for `vendor_pricing` per [`child-collections.md`](../child-collections.md) | single txn + audit |
| `delete` | — | cascade `vendor_part` | single txn + audit |

**Create (`profile` required keys):** `manufacturer_party_id`, `mpn`, `description`.

**Manufacturer picker rule:** `manufacturer_party_id` must reference a party with `party_role.role = 'manufacturer'` — reject otherwise.

**Duplicate MPN:** unique `(manufacturer_party_id, mpn)` → validation error / 409 — “MPN already exists for this manufacturer.”

**`is_preferred`:** when a row is patched/upserted with `is_preferred: true`, set `is_preferred = false` on all other `vendor_part` rows for the same `manufacturer_part_id` in the same transaction.

**`vendor_pricing` on create:** optional — empty collection allowed.

**PATCH `manufacturer_party_id` / `mpn`:** allowed when no `RESTRICT` dependents (see § F); re-check uniqueness on change.

**Strict writable schemas:** `.strict()` on POST/PATCH bodies; reject unknown keys.

---

## F — Domain rules

- **UOM on part only** — `vendor_part` has no UOM column; lines snapshot UOM from part at pick time ([catalog](../decisions/catalog.md)).
- **Preferred vendor** — default buy path for costing / PO suggest when `item.default_vendor_part_id` unset → preferred `vendor_part` row ([item spec](./item.md) downstream).
- **Delete `manufacturer` party** — blocked while parts reference party (`RESTRICT` on `manufacturer_part.manufacturer_party_id`) — [`manufacturer.md`](./manufacturer.md).
- **Delete part — `RESTRICT` blockers** → `ConflictError` (`code: in_use`, `entity: part`):

| Blocker `type` | Table | Sample label in payload |
|----------------|-------|-------------------------|
| `item_part_link` | `item_part_link` | item `name` / `sku` |
| `job_line_part` | `job_line_part` | job number / title via `job_line` → `job` |
| `material_receipt_line` | `material_receipt_line` | receipt id / job ref |
| `job_material_movement` | `job_material_movement` | movement id / job ref |

- **Delete part — non-blocking:** `vendor_part` **cascade**; `estimate_line` / `job_line` / `purchase_order_line` / `item.default_part_id` **SET NULL**.
- **Audit:** mutations on `manufacturer_part`, `vendor_part`.

---

## G — UI layout

### List + detail

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): list in `parts/layout.tsx`, detail in `[id]/page.tsx`.

```text
┌─────────────────────────────────────────┐
│ SurfaceToolbar — New part | Save | Delete … │
├──────────────────┬──────────────────────┤
│ part_list        │  profile (MPN header) │
│ mpn / desc / mfr │  vendor_pricing grid  │
└──────────────────┴──────────────────────┘
```

**Create:** toolbar **New part** on list layout → empty detail pane → POST on first Save ([create decision](../decisions/general.md#decision-listdetail-surface-create--toolbar-and-picker-add-new-2026-06-19)).

**Section order:** `profile` → `vendor_pricing` (when granted).

**UOM helper:** when `purchase_unit` differs from `unit`, show conversion hint (`units_per_purchase`) above pricing grid.

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `part_detail` |
| 2 | New part (list) | navigate create → POST |
| 3 | Delete | confirm modal → DELETE |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `part_detail` | `/manufacturers/[id]` | `manufacturer_party_id` set + `manufacturer_detail` `read` |
| `part_detail` | `/vendors/[id]` | pricing row vendor + `vendor_detail` `read` |
| `item_detail` | `/parts/[id]` | `part_links` row — spec #15 |
| `manufacturer_detail` | `/parts` | optional nav only — **no** filtered list v1 |

**No** `related_items` / `related_jobs` panels on `part_detail`.

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `vendor_pricing` | **Add vendor price** | **Vendor** — vendor-tagged `party` only; [`LinkedSelectInput`](../../components/form/LinkedSelectInput.tsx) inline layout (`[ Select ] [ open icon ]`) when `vendor_detail` `read`; read-only row: label + icon (not inline link text); **Add new vendor** deferred | "No vendor pricing" |

### `profile` pickers

| Control | Picker | Add new | Open |
|---------|--------|---------|------|
| Manufacturer | manufacturer-tagged parties | **`… Add manufacturer`** last dropdown option when `manufacturer_detail` `write` + `profile` writable → `/manufacturers` create ([return context](../decisions/general.md#decision-picker-return-context--url-protocol-2026-06-24), [linked picker](../decisions/general.md#decision-linked-picker-control-linkedselectinput--2026-06-24), [task 25 step 11](../tasks/25-manufacturer-detail.md#step-11--linked-picker-control-linkedselectinput)) | Icon after select when `manufacturer_detail` `read`; dirty confirm before navigate ([decision](../decisions/general.md#decision-picker-navigate-away--dirty-form-confirm-v1-2026-06-24)) |

**Preferred column:** single-select behavior — checking **Preferred** clears other rows (matches DAL).

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create part | POST | manufacturer + MPN + description required; pricing optional |
| Update pricing | PATCH `vendor_pricing` | replace-array; preferred exclusivity |
| Delete part | DELETE | block on `RESTRICT` deps; else cascade vendor rows |
| Identity PATCH | PATCH `profile` | allowed unless `RESTRICT` deps; uniqueness on MPN |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **`specs` / requirements / cut sheets** | Deferred — estimate/job + submittal workflow (#20–21, attachments #28) |
| **`currency`** | Not a Field; v1 assumes org currency; per-vendor currency deferred |
| **Manufacturer filter on list** | Deferred — org-wide catalog only |
| **Duplicate vendor PN** | Unique per vendor — validation on collection upsert |
| **Delete with only vendor pricing** | Allow — confirm modal |
| **Codegen L1/L2** | Hand-written descriptor + repository for `vendor_pricing` until collection codegen |
| **`vendor_pricing` on `vendor_detail`** | Deferred optional read-only rollup — primary edit here ([`vendor.md`](./vendor.md)) |
| **Picker return context** | [`25-manufacturer-detail.md`](../tasks/25-manufacturer-detail.md) + [return-context decision](../decisions/general.md#decision-picker-return-context--url-protocol-2026-06-24) — part → manufacturer first; other foreign pickers reuse protocol |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-19) reflected in decisions + catalog
- [x] A–K complete; DBML tables covered
- [x] Cross-links in [`00-scan.md`](./00-scan.md) progress table
- [x] Implementation task — [`24-part-wave-3a.md`](../tasks/24-part-wave-3a.md)
- [x] DDL migration `024` — `manufacturer_part` + `vendor_part`
- [x] YAML + `codegen:check` for `part_list` / `part_detail`
- [x] DAL read/write + API routes
- [x] Production UI — profile + vendor pricing grid at `/parts`
- [x] Manufacturer delete blocker (`manufacturer_part` InUseError)
- [ ] `estimate_line` / `job_line` FK ALTERs (wave **3e** / **4d′**)
- [ ] List manufacturer filter, related panels, picker return context (deferred)
