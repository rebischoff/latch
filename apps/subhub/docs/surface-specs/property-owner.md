# Party hub — `property_owner_list` · `property_owner_detail`

> **Wave:** 1 · **Status:** target spec (2026-06-18) · **Contrast:** org hub with subsidiaries + contacts + **`related_sites`** — no engagements / invoices — [`customer.md`](./customer.md), [`vendor.md`](./vendor.md), [`manufacturer.md`](./manufacturer.md) · **Catalog:** [`surfaces.md`](../surfaces.md#property_owner_list--property_owner_detail) · **DBML:** `party`, `party_organization`, `party_contact`, `site` (`property_owner_party_id`) · **Decisions:** [property owner hub](../decisions/party.md#decision-property-owner-hub--subsidiaries-contacts-and-sites-2026-06-18), [site ownership](../decisions/site.md#decision-siteproperty_owner_party_id--portfolio-link-2026-06-18), [subsidiaries](../decisions/party.md#decision-org-subsidiaries--separate-tagged-parties-model-a-2026-06-18), [org contacts](../decisions/party.md#decision-org-contacts--party_contact-junction-2026-06-18), [parent field](../decisions/party.md#decision-parent-org-field--parent_customer--parent_vendor-2026-06-18), [cross-Surface nav](../decisions/general.md#decision-cross-surface-related-records--navigation-only-v1-2026-06-18)

**Related:** Portfolio **customer** tree uses `site.customer_party_id` on **`customer_detail`** — orthogonal FK; same site may set both when customer ≠ owner. **Retire:** interim `contact_detail` / `/contacts` when type lenses ship.

---

## Locked product answers (2026-06-18)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Hub depth | **Base lens** (`profile`, `phones`, `emails`) **+ org hub** — subsidiaries, contacts, `related_sites`; **no** engagements / invoices / POs |
| 2 | Site ownership | **`site.property_owner_party_id`** — explicit portfolio link for `related_sites` + `add_site` from org hub |
| 3 | Subsidiaries | **Model A** — each branch is its own `party` + `property_owner` tag |
| 4 | Org contacts | **`contacts`** collection + **`add_contact`** quick-create person |
| 5 | Related lists | **`related_sites`** read-only only (no `related_engagements` / `related_invoices`) |
| 6 | Delete blockers | **None** beyond Model A sub-owner children — no catalog FK like `manufacturer_part`; `site.property_owner_party_id` **`SET NULL`** on party delete |
| 7 | Person owners | **Allowed** — person layout: profile + phones + emails only |
| 8 | Three “property owner” layers | Document master tag vs `site_contact` vs `job_party` — tag **not** auto-set from junction rows |
| 9 | Customer overlap | Dual tag (`customer` + `property_owner`) normal — **Also:** chips; sites for **billing** stay on customer hub |
| 10 | List / search / policy | Copy **manufacturer** list columns + search; standard read/write/delete + optional `add_role` / `remove_role` |

---

## A — Identity

### `property_owner_list`

| Key | Value |
|-----|-------|
| `surface_id` | `property_owner_list` |
| Pair | list pane for `property_owner_detail` |
| Route | `/property-owners` — `property-owners/layout.tsx` |
| API | `GET /api/property-owners` |
| Nav group | Contacts |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'property_owner'` |
| All tables (DAL) | `party`, `party_role` |
| Shipped vs target | **New** — no shipped list |

### `property_owner_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `property_owner_detail` |
| Pair | detail pane for `property_owner_list` |
| Route | `/property-owners/[id]` — `id` = `party.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/property-owners/[id]` |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'property_owner'` on read/write; create auto-inserts tag |
| All tables (DAL) | `party`, `party_person` \| `party_organization`, `party_phone`, `party_email`, `party_contact`, `party_role`; read joins `site` for hub aggregates |
| Shipped vs target | **New** |

---

## B — Fields

### `property_owner_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `party.id`, `party.display_name`, `party.kind` | |

**List search:** `display_name`, `legal_name` (org).

### `property_owner_detail` — shared (person + org)

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | **Person:** `party_person.first_name`, `last_name`. **Org:** `party.legal_name`, `party_organization.dba_name`, `party.kind` | `display_name` DAL-maintained — not primary edit |
| `phones` | collection | read + write | `party_phone` | replace-array PATCH |
| `emails` | collection | read + write | `party_email` | `is_login_email` when linked person |

### `property_owner_detail` — organization only

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `parent_property_owner` | scalar | write on create; read after | `party_organization.parent_party_id` → parent `party.display_name` | Optional; link to `/property-owners/[parentId]` when set |
| `subsidiaries` | collection | read | child org parties via `party_organization.parent_party_id` | `id`, `display_name`; link to `/property-owners/[id]` |
| `contacts` | collection | read + write | `party_contact` + person chrome | `contact_party_id`, `relation_id`, `title`, person `display_name` |
| `subsidiary_tree` | logical (read) | read | recursive org nodes via `party_organization.parent_party_id` from anchor | Ant `Tree` (org nodes only) — not PATCHable as blob |
| `related_sites` | logical (read) | read | `site` where `property_owner_party_id` ∈ anchor subtree | Omit rows when principal lacks `read` on `site_detail` |

**Person property owners:** omit `parent_property_owner`, `subsidiaries`, `contacts`, `subsidiary_tree`, `related_sites`.

### Collection — `contacts` element

```json
{
  "id": "<party_contact.id>",
  "contact_party_id": "<person party.id>",
  "display_name": "Pat Manager",
  "relation_id": "<uuid>",
  "relation_label": "Property manager",
  "title": "Regional PM",
  "sort_order": 0
}
```

### Collection — `subsidiaries` element

```json
{
  "id": "<child party.id>",
  "display_name": "Tower West LLC"
}
```

### `related_sites` row (minimum)

```json
{
  "id": "<site.id>",
  "name": "200 Market Tower",
  "property_owner_party_id": "<uuid>",
  "property_owner_display_name": "Tower West LLC",
  "customer_party_id": "<uuid | null>",
  "customer_display_name": "Tower REIT"
}
```

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `property_owner_list` | `read` | grant on list | Each GET list |
| `property_owner_detail` | `read` | grant on detail | Each GET |
| `property_owner_detail` | `write` | grant on detail + Field | Each PATCH |
| `property_owner_detail` | `delete` | grant on detail | Each DELETE |
| `property_owner_detail` | `add_role` / `remove_role` | grant (optional) | Each action |
| `property_owner_detail` | `add_subsidiary` | `write` + org lens | Creates child org + `property_owner` tag + `parent_party_id` |
| `property_owner_detail` | `attach_subsidiary` | `write` + org lens | Sets `parent_party_id` on existing property-owner org |
| `property_owner_detail` | `add_contact` | `write` + org lens | Quick-create person + `party_contact` row |
| `property_owner_detail` | `add_site` | `write` + org lens | Creates `site` with `property_owner_party_id` = selected org node |

**Related list omission:** `related_sites` rows omitted when principal lacks `read` on `site_detail` (default deny). Links render only when target `read` granted (`<Can>`).

**403 vs 404:** follow platform default unless Surface overrides (no 404-hide required).

---

## D — DAL read

### `property_owner_list`

- **`list(ctx, { limit, offset, q? })`** — join `party` + `party_role` filter `property_owner`; sort `display_name`.
- **Search:** `q` matches `party.display_name` or `party.legal_name` (case-insensitive contains).

### `property_owner_detail`

- **`get(ctx, id)`** — verify `property_owner` tag; project granted Fields only.
- **Org hub reads:**
  - **`parent_property_owner`** — resolve `party_organization.parent_party_id` when parent has `property_owner` tag.
  - **`subsidiary_tree`** — recursive `party_organization.parent_party_id` from anchor; org nodes only.
  - **`subsidiaries`** — direct children with `property_owner` tag.
  - **`related_sites`** — `site` where `property_owner_party_id` ∈ {anchor + descendant property-owner org ids in subtree}; include optional `customer_party_id` label for cross-link when set.
- **Person `get`** — profile + phones + emails only.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (+ `parent_property_owner` if org), optional `phones`, `emails` | Insert `party`, extension row, `party_role.property_owner`; org may set `parent_party_id` |
| `patch` | manifest-narrowed `profile`, `phones`, `emails`, `contacts` | `contacts` replace-array; **no** patch to `subsidiary_tree` / `related_sites` |
| `delete` | — | Hard delete; blocked only when **sub-owner** child orgs exist (`parent_party_id` → this party) — structured `ConflictError` |

### Actions

| Action | Behavior |
|--------|----------|
| `add_subsidiary` | New org `party` + `party_organization` + `property_owner` tag + `parent_party_id` = anchor (or selected tree node) |
| `attach_subsidiary` | PATCH `party_organization.parent_party_id` on existing property-owner org; reject cycles |
| `add_contact` | Create person `party` + `party_person` (+ optional phone/email) + `party_contact` |
| `add_site` | Insert `site` with `name` + `property_owner_party_id` = selected org node in subtree; does **not** set `customer_party_id` |

**Transactions:** each action single transaction; audit on success.

---

## F — Domain rules

- **`party.kind` immutable** after create ([party profile decision](../decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)).
- **Sub-owners:** org-only; each subsidiary **must** retain `property_owner` tag (Model A).
- **Site ownership:** `site.property_owner_party_id` identifies legal/portfolio owner on this lens; distinct from `site.customer_party_id` (customer hub / billing portfolio).
- **Three “property owner” meanings** (do not conflate):
  | Layer | Mechanism | Auto master tag? |
  |-------|-----------|------------------|
  | Address book | `party_role.property_owner` → this Surface | Set on create here or via `add_role` |
  | Standing at site | `site_contact` + `site_contact_relation` display “Property owner” | **No** — pick existing `party` |
  | Per job | `job_party` + `job_party_relation` display “Property owner” | **No** — pick existing `party` |
- **Customer overlap:** same `party.id` may be tagged `customer` and `property_owner`; read-only **Also: Customer** chip → `/customers/[id]`; customer hub remains canonical for `customer_party_id` / engagements / invoices.
- **Lens chips:** multi-tag parties show read-only sibling lens links — not inline role editing.
- **Delete:** no catalog-table RESTRICT (contrast `manufacturer_part` / `purchase_order`); sub-owner orgs block delete; owned sites **unlink** (`property_owner_party_id` → null) rather than block.
- **Audit:** all mutations on registered tables.

---

## G — UI layout

### List + detail

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): list in `property-owners/layout.tsx`, detail in `[id]/page.tsx`.

### Person `property_owner_detail`

Single column: `profile` → `phones` → `emails`. No tree.

### Organization `property_owner_detail`

```text
┌─────────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New subsidiary | New site | Save | Delete …  │
├──────────────────┬──────────────────────────────────────────┤
│ subsidiary_tree  │  • parent_property_owner link (when set)   │
│ (org only)       │  • Org node → profile + contacts           │
│                  │  • related_sites (subtree)                 │
└──────────────────┴──────────────────────────────────────────┘
```

**Create (org):** kind = organization; optional **`parent_property_owner`** picker (existing property-owner orgs). **Create (person):** kind = person or organization at POST; no parent field on person.

**Shared component:** `PartyDetailForm` parameterized by `surfaceId` + `kind` conditionals — property-owner hub branch.

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `property_owner_detail` |
| 2 | New (list) | POST create |
| 3 | New subsidiary | `add_subsidiary` (org detail, tree context) |
| 4 | New site | `add_site` (org detail, tree context) |
| 5 | Delete | confirm modal → DELETE |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `property_owner_detail` | `/property-owners/[childId]` | Subsidiary row / tree org node |
| `property_owner_detail` | `/property-owners/[parentId]` | `parent_property_owner` link |
| `property_owner_detail` | `/sites/[id]` | `related_sites` row |
| `property_owner_detail` | `/customers/[id]` | **Also: Customer** chip / `customer_display_name` on site row |
| `site_detail` | `/property-owners/[id]` | `property_owner_party_id` ref when exposed |

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `phones` | inline row | — | "No phone numbers" |
| `emails` | inline row | — | "No email addresses" |
| `contacts` | **Add contact** (picker + quick create) | existing person parties; relation from `party_contact_relation_table` | "No contacts" |
| `subsidiaries` | **Add subsidiary** / **Attach existing** | property-owner orgs for attach | "No subsidiaries" |
| `related_sites` | **New site** (toolbar / tree context) | — | "No sites" |

**Quick create contact:** minimal modal or inline form on same Surface (name + optional phone) — not navigation to a new page.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create org | POST | `parent_property_owner` optional |
| Create person | POST | auto `property_owner` tag |
| Delete property owner | DELETE | blocked only when sub-owner child orgs exist |
| Remove subsidiary link | PATCH `parent_party_id` null | does not delete child party |
| Remove property_owner tag | `remove_role` | does not delete `party` row |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Cycle in org tree** | DAL reject on `attach_subsidiary` / `parent_property_owner` patch |
| **Site with both FKs** | `customer_party_id` and `property_owner_party_id` may differ — show both labels on `related_sites` |
| **Delete owner with sites** | Sites remain; `property_owner_party_id` nulled — operator may reassign from `site_detail` |
| **Add as property owner from customer lens** | `add_role` inserts `party_role` → navigate to `property_owner_detail` |
| **`party_contact_relation` empty** | Progressive setup + [`party_contact_relation_table`](./party-contact-relation.md) *(spec TBD)* |
| **Codegen L1/L2** | Hand-written descriptor + repository for collections until codegen ships |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-18) reflected in decisions + DBML draft
- [x] A–K complete; diverges from customer hub (no combined tree / engagements / invoices)
- [ ] `party_contact_relation_table` catalog spec added or folded into party-contact-relation spec
- [ ] Implementation deferred until task 19 exit + party hub migration
