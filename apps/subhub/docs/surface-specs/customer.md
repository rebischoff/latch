# Party hub — `customer_list` · `customer_detail`

> **Wave:** 0→1 · **Status:** target spec (2026-06-18) — **shipped:** `customer_list` only · **Vendor contrast:** [`vendor.md`](./vendor.md) — subsidiaries + POs; no sites · **Catalog:** [`surfaces.md`](../surfaces.md#customer_list--customer_detail) · **DBML:** `party`, `party_organization`, `party_contact`, `site` · **Decisions:** [subsidiaries](../decisions/party.md#decision-org-subsidiaries--separate-tagged-parties-model-a-2026-06-18), [org contacts](../decisions/party.md#decision-org-contacts--party_contact-junction-2026-06-18), [customer hub](../decisions/party.md#decision-customer-hub--portal-tree-and-related-lists-2026-06-18), [site ownership](../decisions/site.md#decision-sitecustomer_party_id--explicit-portfolio-link-2026-06-18), [cross-Surface nav](../decisions/general.md#decision-cross-surface-related-records--navigation-only-v1-2026-06-18)

**Related:** [`vendor.md`](./vendor.md) — vendor org hub (no sites; `related_purchase_orders`). **Retire:** interim `contact_detail` / `/contacts` when type lenses ship.

---

## Locked product answers (2026-06-18)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Subsidiaries | **Model A** — each subsidiary is its own `party` + `customer` tag |
| 2 | Site ↔ customer | **`site.customer_party_id`** — explicit portfolio FK ([pros/cons](../decisions/site.md#decision-sitecustomer_party_id--explicit-portfolio-link-2026-06-18)) |
| 3 | Tree UI | **Combined** org subsidiaries + sites under owning party |
| 4.1 | Jobs / estimates | Tree drill-down → per-site lists; create subsidiary/site from hub; job flow **sub-customer (optional) → site → engagement** |
| 4.2 | Invoices | **`related_invoices`** read-only on org hub |
| 5 | Org contacts | **`contacts`** collection + **`add_contact`** quick-create person |
| 6 | Parent on create | **`parent_customer`** optional scalar on org create (separate field) |
| 7 | Vendor hub | **Differs** — see [`vendor.md`](./vendor.md) (subsidiaries + POs; no sites) |
| 8 | Cross-Surface UX | **Navigation only** v1 — no drawer/modal foreign Surfaces |

---

## A — Identity

### `customer_list`

| Key | Value |
|-----|-------|
| `surface_id` | `customer_list` |
| Pair | list pane for `customer_detail` |
| Route | `/customers` — `customers/layout.tsx` |
| API | `GET /api/customers` |
| Nav group | Contacts |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'customer'` |
| All tables (DAL) | `party`, `party_role` |
| Shipped vs target | **Shipped** list; align descriptor with kind extensions at hub wave |

### `customer_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `customer_detail` |
| Pair | detail pane for `customer_list` |
| Route | `/customers/[id]` — `id` = `party.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/customers/[id]` |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'customer'` on read/write; create auto-inserts tag |
| All tables (DAL) | `party`, `party_person` \| `party_organization`, `party_phone`, `party_email`, `party_contact`, `party_role`; read joins `site`, `job`, `job_party`, `invoice` for hub aggregates |
| Shipped vs target | **New** — replaces interim `contact_detail` for customers |

---

## B — Fields

### `customer_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `party.id`, `party.display_name`, `party.kind` | |

### `customer_detail` — shared (person + org)

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | **Person:** `party_person.first_name`, `last_name`. **Org:** `party.legal_name`, `party_organization.dba_name`, `party.kind` | `display_name` DAL-maintained — not primary edit |
| `phones` | collection | read + write | `party_phone` | replace-array PATCH |
| `emails` | collection | read + write | `party_email` | `is_login_email` when linked person |

### `customer_detail` — organization only

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `parent_customer` | scalar | write on create; read after | `party_organization.parent_party_id` → parent `party.display_name` | Optional; top-level null |
| `subsidiaries` | collection | read | child org parties via `party_organization.parent_party_id` | `id`, `display_name`; link to `/customers/[id]` |
| `contacts` | collection | read + write | `party_contact` + person chrome | `contact_party_id`, `relation_id`, `title`, person `display_name` |
| `portfolio_tree` | logical (read) | read | subsidiaries + `site` where `site.customer_party_id` in subtree | Drives combined Ant `Tree` — not PATCHable as blob |
| `related_engagements` | logical (read) | read | `estimate`, `job` filtered by site in subtree | Per selected tree node: estimates + jobs + service (`job_kind`) |
| `related_invoices` | logical (read) | read | `invoice` via `job_party` (customer) → `job` | Omit invoice rows without `invoice_detail` `read` |

**Person customers:** omit `parent_customer`, `subsidiaries`, `contacts`, `portfolio_tree`, `related_*` hub Fields.

### Collection — `contacts` element

```json
{
  "id": "<party_contact.id>",
  "contact_party_id": "<person party.id>",
  "display_name": "Jane AP",
  "relation_id": "<uuid>",
  "relation_label": "Accounts payable",
  "title": "AP Manager",
  "sort_order": 0
}
```

### Collection — `subsidiaries` element

```json
{
  "id": "<child party.id>",
  "display_name": "Acme West Region"
}
```

### `related_invoices` row (minimum)

```json
{
  "id": "<invoice.id>",
  "invoice_number": "INV-1042",
  "job_id": "<uuid>",
  "job_title": "Tower lobby upgrade",
  "status": "sent",
  "net_due": 12500.0
}
```

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `customer_list` | `read` | grant on list | Each GET list |
| `customer_detail` | `read` | grant on detail | Each GET |
| `customer_detail` | `write` | grant on detail + Field | Each PATCH |
| `customer_detail` | `delete` | grant on detail | Each DELETE |
| `customer_detail` | `add_role` / `remove_role` | grant (optional) | Each action |
| `customer_detail` | `add_subsidiary` | `write` + org lens | Creates child org + `customer` tag + `parent_party_id` |
| `customer_detail` | `attach_subsidiary` | `write` + org lens | Sets `parent_party_id` on existing customer org |
| `customer_detail` | `add_contact` | `write` + org lens | Quick-create person + `party_contact` row |
| `customer_detail` | `add_site` | `write` + org lens | Creates `site` with `customer_party_id` = selected org node |

**Related list omission:** `related_invoices` / `related_engagements` rows omitted when principal lacks `read` on target Surface (default deny). Links render only when target `read` granted (`<Can>`).

**403 vs 404:** follow platform default unless Surface overrides (no 404-hide required for customer lens).

---

## D — DAL read

### `customer_list`

- **`list(ctx, { limit, offset })`** — join `party` + `party_role` filter `customer`; sort `display_name`.
- **Search:** `q` matches `party.display_name` or `party.legal_name` (case-insensitive contains).

### `customer_detail`

- **`get(ctx, id)`** — verify `customer` tag; project granted Fields only.
- **Org hub reads:**
  - **`portfolio_tree`** — recursive `party_organization.parent_party_id` from anchor + sites with `customer_party_id` matching any node in subtree; nest sites under owning party id (not under `site.parent_site_id` unless product later adds sub-site nesting in tree).
  - **`related_engagements`** — for selected `site_id` (or whole subtree when root selected): `estimate` + `job` where `site_id` matches; include `job_kind`, `status`, `title`.
  - **`related_invoices`** — parties in subtree (or anchor) as `job_party` with relation `customer` → jobs → `invoice`; project summary columns only.
- **Person `get`** — profile + phones + emails only.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (+ `parent_customer` if org), optional `phones`, `emails` | Insert `party`, extension row, `party_role.customer`; org may set `parent_party_id` |
| `patch` | manifest-narrowed `profile`, `phones`, `emails`, `contacts` | `contacts` replace-array; **no** patch to `portfolio_tree` / `related_*` |
| `delete` | — | Hard delete; RESTRICT from `job_party` / `site.customer_party_id` → structured `ConflictError` ([cross-cutting](../decisions/cross-cutting.md)) |

### Actions

| Action | Behavior |
|--------|----------|
| `add_subsidiary` | New org `party` + `party_organization` + `customer` tag + `parent_party_id` = anchor (or selected node) |
| `attach_subsidiary` | PATCH `party_organization.parent_party_id` on existing customer org; reject cycles |
| `add_contact` | Create person `party` + `party_person` (+ optional phone/email) + `party_contact` |
| `add_site` | Insert `site` with `name`, `customer_party_id` = org node id |

**Transactions:** each action single transaction; audit on success.

---

## F — Domain rules

- **`party.kind` immutable** after create ([party profile decision](../decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)).
- **Subsidiaries:** org-only; each subsidiary **must** retain `customer` tag (Model A).
- **`site.customer_party_id`:** set on `add_site`; may point at subsidiary org.
- **Job create (downstream):** estimate/job UI picks optional sub-customer then site; default customer `job_party` from `site.customer_party_id` when single customer relation on job.
- **Lens chips:** multi-tag parties show read-only **Also: Vendor** links — unchanged.
- **Audit:** all mutations on registered tables.

---

## G — UI layout

### List + detail (unchanged shell)

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): list in `customers/layout.tsx`, detail in `[id]/page.tsx`.

### Person `customer_detail`

Single column: `profile` → `phones` → `emails`. No tree.

### Organization `customer_detail`

```text
┌─────────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New subsidiary | New site | Save | Delete …  │
├──────────────────┬──────────────────────────────────────────┤
│ portfolio_tree   │  Section by selection:                   │
│ (combined)       │  • Org node → profile + subsidiaries +   │
│                  │    contacts collections                  │
│                  │  • Site node → site summary +            │
│                  │    related_engagements + link to site_detail│
│                  │  • Root → related_invoices (org-wide)      │
└──────────────────┴──────────────────────────────────────────┘
```

**Create customer (org):** kind = organization; optional **`parent_customer`** picker (existing customer orgs). **Create person:** no parent field.

**Shared component:** `PartyDetailForm` parameterized by `surfaceId` + `kind` conditionals.

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `customer_detail` |
| 2 | New (list) | POST create |
| 3 | New subsidiary | `add_subsidiary` (org detail, tree context) |
| 4 | New site | `add_site` (org detail, tree context) |
| 5 | Delete | confirm modal → DELETE |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `customer_detail` | `/customers/[childId]` | Subsidiary row / tree org node |
| `customer_detail` | `/sites/[id]` | Site tree node / engagement list |
| `customer_detail` | `/jobs/[id]`, `/estimates/[id]` | `related_engagements` row |
| `customer_detail` | `/invoices/[id]` | `related_invoices` row |
| `job_detail` | `/customers/[id]` | `customer_ref` Field (existing contract) |

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `phones` | inline row | — | "No phone numbers" |
| `emails` | inline row | — | "No email addresses" |
| `contacts` | **Add contact** (picker + quick create) | existing person parties; relation from `party_contact_relation_table` | "No contacts" |
| `subsidiaries` | **Add subsidiary** / **Attach existing** | customer orgs for attach | "No subsidiaries" |

**Quick create contact:** minimal modal or inline form on same Surface (name + optional phone) — not navigation to a new page.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create org | POST | `parent_customer` optional |
| Create person | POST | auto `customer` tag |
| Delete customer | DELETE | blocked when jobs/sites reference party — structured blockers |
| Remove subsidiary link | PATCH `parent_party_id` null | does not delete child party |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Cycle in org tree** | DAL reject on `attach_subsidiary` / `parent_customer` patch |
| **Site without `customer_party_id`** | Omitted from hub tree until linked (admin can set from `site_detail` later) |
| **`party_contact_relation` empty** | Progressive setup + [`party_contact_relation_table`](./party-contact-relation.md) *(spec TBD)* |
| **Shipped gap** | `contact_detail` YAML uses interim `display_name` profile — hub wave aligns to kind-specific profile |
| **Codegen L1/L2** | Hand-written descriptor + repository for collections until codegen ships |
| **Vendor hub** | Spec in [`vendor.md`](./vendor.md) — diverges (no sites / engagements / invoices) |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-18) reflected in decisions + DBML draft
- [x] A–K reviewed; [`vendor.md`](./vendor.md) split complete (2026-06-18)
- [ ] `party_contact_relation_table` catalog spec added or folded into party-contact-relation spec
- [ ] Implementation deferred until task 19 exit + party hub migration
