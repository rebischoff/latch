# Party hub — `vendor_list` · `vendor_detail`

> **Wave:** 0→1 · **Status:** target spec (2026-06-18) — **shipped:** `vendor_list` only · **Customer contrast:** org hub with subsidiaries + POs; **no sites** — [`customer.md`](./customer.md) · **Catalog:** [`surfaces.md`](../surfaces.md#vendor_list--vendor_detail) · **DBML:** `party`, `party_organization`, `party_contact`, `purchase_order` · **Decisions:** [subsidiaries](../decisions/party.md#decision-org-subsidiaries--separate-tagged-parties-model-a-2026-06-18), [org contacts](../decisions/party.md#decision-org-contacts--party_contact-junction-2026-06-18), [vendor hub](../decisions/party.md#decision-vendor-hub--subsidiaries-contacts-and-pos-2026-06-18), [parent field](../decisions/party.md#decision-parent-org-field--parent_customer--parent_vendor-2026-06-18), [cross-Surface nav](../decisions/general.md#decision-cross-surface-related-records--navigation-only-v1-2026-06-18)

**Related:** [`customer.md`](./customer.md) — customer hub adds sites, engagements, invoices. **`vendor_pricing`** (`vendor_part`) adds in wave 3 on `part_detail` / optional on `vendor_detail`. **Retire:** interim `contact_detail` / `/contacts` when type lenses ship.

---

## Locked product answers (2026-06-18)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Sub-vendors | **Model A** — each branch is its own `party` + `vendor` tag |
| 2 | Sites | **None** on vendor hub — no `add_site`; vendors do not own portfolio sites |
| 3 | Tree UI | **Org-only** `subsidiary_tree` — sub-vendor org nodes; no site nodes |
| 4 | Related procurement | **`related_purchase_orders`** read-only on org hub (subtree by `vendor_party_id`) |
| 5 | Org contacts | **`contacts`** collection + **`add_contact`** quick-create person |
| 6 | Parent on create | **`parent_vendor`** optional scalar on org create ([naming decision](../decisions/party.md#decision-parent-org-field--parent_customer--parent_vendor-2026-06-18)) |
| 7 | No engagements / invoices | Omit `related_engagements`, `related_invoices` — not vendor hub scope |
| 8 | Cross-Surface UX | **Navigation only** v1 — no drawer/modal foreign Surfaces |
| 9 | List search | **`display_name`**, **`legal_name`** (org `party.legal_name`) |

---

## A — Identity

### `vendor_list`

| Key | Value |
|-----|-------|
| `surface_id` | `vendor_list` |
| Pair | list pane for `vendor_detail` |
| Route | `/vendors` — `vendors/layout.tsx` |
| API | `GET /api/vendors` |
| Nav group | Contacts |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'vendor'` |
| All tables (DAL) | `party`, `party_role` |
| Shipped vs target | **Shipped** list; align descriptor with kind extensions at hub wave |

### `vendor_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `vendor_detail` |
| Pair | detail pane for `vendor_list` |
| Route | `/vendors/[id]` — `id` = `party.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/vendors/[id]` |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'vendor'` on read/write; create auto-inserts tag |
| All tables (DAL) | `party`, `party_person` \| `party_organization`, `party_phone`, `party_email`, `party_contact`, `party_role`; read joins `purchase_order` for hub aggregates |
| Shipped vs target | **New** — replaces interim `contact_detail` for vendors |

---

## B — Fields

### `vendor_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `party.id`, `party.display_name`, `party.kind` | |

**List search:** `display_name`, `legal_name` (org).

### `vendor_detail` — shared (person + org)

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | **Person:** `party_person.first_name`, `last_name`. **Org:** `party.legal_name`, `party_organization.dba_name`, `party.kind` | `display_name` DAL-maintained — not primary edit |
| `phones` | collection | read + write | `party_phone` | replace-array PATCH |
| `emails` | collection | read + write | `party_email` | `is_login_email` when linked person |

### `vendor_detail` — organization only

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `parent_vendor` | scalar | write on create; read after | `party_organization.parent_party_id` → parent `party.display_name` | Optional; top-level null; link to `/vendors/[parentId]` when set |
| `subsidiaries` | collection | read | child org parties via `party_organization.parent_party_id` | Sub-vendors: `id`, `display_name`; link to `/vendors/[id]` |
| `contacts` | collection | read + write | `party_contact` + person chrome | `contact_party_id`, `relation_id`, `title`, person `display_name` |
| `subsidiary_tree` | logical (read) | read | recursive org nodes via `party_organization.parent_party_id` from anchor | Drives Ant `Tree` (org nodes only) — not PATCHable as blob |
| `related_purchase_orders` | logical (read) | read | `purchase_order` where `vendor_party_id` in anchor subtree | Omit rows when principal lacks `read` on `purchase_order_detail` |

**Person vendors:** omit `parent_vendor`, `subsidiaries`, `contacts`, `subsidiary_tree`, `related_purchase_orders`.

### Collection — `contacts` element

```json
{
  "id": "<party_contact.id>",
  "contact_party_id": "<person party.id>",
  "display_name": "Sam Sales",
  "relation_id": "<uuid>",
  "relation_label": "Inside sales",
  "title": "Account rep",
  "sort_order": 0
}
```

### Collection — `subsidiaries` element

```json
{
  "id": "<child party.id>",
  "display_name": "SupplyCo — Northeast"
}
```

### `related_purchase_orders` row (minimum)

```json
{
  "id": "<purchase_order.id>",
  "po_number": "PO-1042",
  "job_id": "<uuid>",
  "job_title": "Tower lobby upgrade",
  "status": "sent",
  "vendor_party_id": "<uuid>",
  "vendor_display_name": "SupplyCo — Northeast"
}
```

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `vendor_list` | `read` | grant on list | Each GET list |
| `vendor_detail` | `read` | grant on detail | Each GET |
| `vendor_detail` | `write` | grant on detail + Field | Each PATCH |
| `vendor_detail` | `delete` | grant on detail | Each DELETE |
| `vendor_detail` | `add_role` / `remove_role` | grant (optional) | Each action |
| `vendor_detail` | `add_subsidiary` | `write` + org lens | Creates child org + `vendor` tag + `parent_party_id` |
| `vendor_detail` | `attach_subsidiary` | `write` + org lens | Sets `parent_party_id` on existing vendor org |
| `vendor_detail` | `add_contact` | `write` + org lens | Quick-create person + `party_contact` row |

**Related list omission:** `related_purchase_orders` rows omitted when principal lacks `read` on `purchase_order_detail` (default deny). Links render only when target `read` granted (`<Can>`).

**403 vs 404:** follow platform default unless Surface overrides (no 404-hide required for vendor lens).

---

## D — DAL read

### `vendor_list`

- **`list(ctx, { limit, offset, q? })`** — join `party` + `party_role` filter `vendor`; sort `display_name`.
- **Search:** `q` matches `party.display_name` or `party.legal_name` (case-insensitive contains).

### `vendor_detail`

- **`get(ctx, id)`** — verify `vendor` tag; project granted Fields only.
- **Org hub reads:**
  - **`parent_vendor`** — resolve `party_organization.parent_party_id` when parent has `vendor` tag (display name + id for link).
  - **`subsidiary_tree`** — recursive `party_organization.parent_party_id` from anchor; org nodes only.
  - **`subsidiaries`** — direct children with `vendor` tag.
  - **`related_purchase_orders`** — `purchase_order` where `vendor_party_id` ∈ {anchor + descendant vendor org ids in subtree}; project summary columns only.
- **Person `get`** — profile + phones + emails only.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (+ `parent_vendor` if org), optional `phones`, `emails` | Insert `party`, extension row, `party_role.vendor`; org may set `parent_party_id` |
| `patch` | manifest-narrowed `profile`, `phones`, `emails`, `contacts` | `contacts` replace-array; **no** patch to `subsidiary_tree` / `related_purchase_orders` |
| `delete` | — | Hard delete; blocked when `purchase_order.vendor_party_id` references party or child vendor orgs exist with `parent_party_id` → structured `ConflictError` ([cross-cutting](../decisions/cross-cutting.md)) |

### Actions

| Action | Behavior |
|--------|----------|
| `add_subsidiary` | New org `party` + `party_organization` + `vendor` tag + `parent_party_id` = anchor (or selected tree node) |
| `attach_subsidiary` | PATCH `party_organization.parent_party_id` on existing vendor org; reject cycles |
| `add_contact` | Create person `party` + `party_person` (+ optional phone/email) + `party_contact` |

**Transactions:** each action single transaction; audit on success.

---

## F — Domain rules

- **`party.kind` immutable** after create ([party profile decision](../decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)).
- **Sub-vendors:** org-only; each subsidiary **must** retain `vendor` tag (Model A).
- **No sites:** vendor hub does not create or list `site` rows; `site.customer_party_id` is customer-hub only.
- **PO scope:** `related_purchase_orders` includes POs for anchor and all descendant vendor orgs in the corporate tree.
- **Lens chips:** multi-tag parties show read-only **Also: Customer** links — unchanged.
- **`vendor_part`:** FK `vendor_party_id` **cascades** on party delete in DBML — catalog pricing rows removed with vendor; does not block delete (POs and sub-vendors do).
- **Audit:** all mutations on registered tables.

---

## G — UI layout

### List + detail

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): list in `vendors/layout.tsx`, detail in `[id]/page.tsx`.

### Person `vendor_detail`

Single column: `profile` → `phones` → `emails`. No tree.

### Organization `vendor_detail`

```text
┌─────────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New subsidiary | Save | Delete …               │
├──────────────────┬──────────────────────────────────────────┤
│ subsidiary_tree  │  • parent_vendor link (when set)         │
│ (org only)       │  • Org node → profile + contacts           │
│                  │  • related_purchase_orders (subtree)       │
└──────────────────┴──────────────────────────────────────────┘
```

**Create vendor (org):** kind = organization; optional **`parent_vendor`** picker (existing vendor orgs). **Create person:** no parent field.

**Shared component:** `PartyDetailForm` parameterized by `surfaceId` + `kind` conditionals (customer vs vendor hub branches).

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `vendor_detail` |
| 2 | New (list) | POST create |
| 3 | New subsidiary | `add_subsidiary` (org detail, tree context) |
| 4 | Delete | confirm modal → DELETE |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `vendor_detail` | `/vendors/[childId]` | Subsidiary row / tree org node |
| `vendor_detail` | `/vendors/[parentId]` | `parent_vendor` link |
| `vendor_detail` | `/purchase-orders/[id]` | `related_purchase_orders` row |
| `purchase_order_detail` | `/vendors/[id]` | vendor ref on PO header (downstream spec) |

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `phones` | inline row | — | "No phone numbers" |
| `emails` | inline row | — | "No email addresses" |
| `contacts` | **Add contact** (picker + quick create) | existing person parties; relation from `party_contact_relation_table` | "No contacts" |
| `subsidiaries` | **Add subsidiary** / **Attach existing** | vendor orgs for attach | "No sub-vendors" |

**Quick create contact:** minimal modal or inline form on same Surface (name + optional phone) — not navigation to a new page.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create org | POST | `parent_vendor` optional |
| Create person | POST | auto `vendor` tag |
| Delete vendor | DELETE | blocked when POs reference party or sub-vendor orgs exist — structured blockers |
| Remove subsidiary link | PATCH `parent_party_id` null | does not delete child party |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Cycle in org tree** | DAL reject on `attach_subsidiary` / `parent_vendor` patch |
| **Parent not vendor-tagged** | `parent_party_id` may point at org without `vendor` tag only via attach flow that adds tag — otherwise reject |
| **Delete with sub-vendors** | `ConflictError` listing child org `display_name`s — detach or re-parent first |
| **Delete with open POs** | `ConflictError` listing `po_number` / id — cancel or reassign POs first (v1: block only) |
| **`party_contact_relation` empty** | Progressive setup + [`party_contact_relation_table`](./party-contact-relation.md) *(spec TBD)* |
| **Shipped gap** | `contact_detail` YAML uses interim `display_name` profile — hub wave aligns to kind-specific profile |
| **Codegen L1/L2** | Hand-written descriptor + repository for collections until codegen ships |
| **`vendor_pricing` on detail** | Deferred wave 3 — primary edit on `part_detail`; optional read-only rollup later |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-18) reflected in decisions + catalog
- [x] A–K complete; diverges from customer hub (no sites / engagements / invoices)
- [ ] `party_contact_relation_table` catalog spec added or folded into party-contact-relation spec
- [ ] Implementation deferred until task 19 exit + party hub migration
