# Party lens — `manufacturer_list` · `manufacturer_detail`

> **Wave:** 0→1 · **Status:** target spec (2026-06-18) — **shipped:** `manufacturer_list` only · **Contrast:** minimal base lens — no org hub, no related lists — [`vendor.md`](./vendor.md), [`customer.md`](./customer.md) · **Catalog:** [`surfaces.md`](../surfaces.md#manufacturer_list--manufacturer_detail) · **DBML:** `party`, `party_person`, `party_organization`, `manufacturer_part` *(delete blocker only)* · **Decisions:** [manufacturer hub](../decisions/party.md#decision-manufacturer-hub--base-lens-only-2026-06-18), [party profile](../decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)

**Related:** MPN catalog uses `manufacturer_part.manufacturer_party_id` — edited on **`part_detail`** (wave 3), not on this Surface. **Retire:** interim `contact_detail` / `/contacts` when type lenses ship.

---

## Locked product answers (2026-06-18)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Hub depth | **Base lens only** — `profile`, `phones`, `emails`; no tree, contacts, or related lists |
| 2 | Sub-manufacturers | **None** — no `parent_party_id`; DAL rejects org hierarchy on this lens |
| 3 | Related catalog data | **None on UI** — no `related_parts`, POs, or cross-Surface aggregates on `manufacturer_detail` |
| 4 | Org fields | **`party` + `party_organization`** profile scalars only (`legal_name`, `dba_name`) |
| 5 | Person manufacturers | **Allowed** — same base Fields as org (no org-only blocks) |
| 6 | List search | **`display_name`**, **`legal_name`** (org `party.legal_name`) |
| 7 | Parts / MPNs | **`part_list` / `part_detail`** (wave 3) — manufacturer is a picker anchor, not a parts hub |

---

## A — Identity

### `manufacturer_list`

| Key | Value |
|-----|-------|
| `surface_id` | `manufacturer_list` |
| Pair | list pane for `manufacturer_detail` |
| Route | `/manufacturers` — `manufacturers/layout.tsx` |
| API | `GET /api/manufacturers` |
| Nav group | Contacts |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'manufacturer'` |
| All tables (DAL) | `party`, `party_role` |
| Shipped vs target | **Shipped** list; align descriptor with kind extensions at lens wave |

### `manufacturer_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `manufacturer_detail` |
| Pair | detail pane for `manufacturer_list` |
| Route | `/manufacturers/[id]` — `id` = `party.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/manufacturers/[id]` |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'manufacturer'` on read/write; create auto-inserts tag |
| All tables (DAL) | `party`, `party_person` \| `party_organization`, `party_phone`, `party_email`, `party_role` |
| Shipped vs target | **New** — replaces interim `contact_detail` for manufacturers |

---

## B — Fields

### `manufacturer_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `party.id`, `party.display_name`, `party.kind` | |

**List search:** `display_name`, `legal_name` (org).

### `manufacturer_detail` — person and organization

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | **Person:** `party_person.first_name`, `last_name`. **Org:** `party.legal_name`, `party_organization.dba_name`, `party.kind` | `display_name` DAL-maintained — not primary edit |
| `phones` | collection | read + write | `party_phone` | replace-array PATCH |
| `emails` | collection | read + write | `party_email` | `is_login_email` when linked person |

**Omit on this lens:** `parent_*`, `subsidiaries`, `contacts`, `subsidiary_tree`, `related_*`, `parts`.

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `manufacturer_list` | `read` | grant on list | Each GET list |
| `manufacturer_detail` | `read` | grant on detail | Each GET |
| `manufacturer_detail` | `write` | grant on detail + Field | Each PATCH |
| `manufacturer_detail` | `delete` | grant on detail | Each DELETE |
| `manufacturer_detail` | `add_role` / `remove_role` | grant (optional) | Each action |

**403 vs 404:** follow platform default unless Surface overrides (no 404-hide required for manufacturer lens).

---

## D — DAL read

### `manufacturer_list`

- **`list(ctx, { limit, offset, q? })`** — join `party` + `party_role` filter `manufacturer`; sort `display_name`.
- **Search:** `q` matches `party.display_name` or `party.legal_name` (case-insensitive contains).

### `manufacturer_detail`

- **`get(ctx, id)`** — verify `manufacturer` tag; project granted Fields only.
- **No** joins to `manufacturer_part`, `party_contact`, or other downstream tables for hub aggregates.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile`, optional `phones`, `emails` | Insert `party`, extension row, `party_role.manufacturer`; org **`parent_party_id` must stay null** |
| `patch` | manifest-narrowed `profile`, `phones`, `emails` | replace-array collections |
| `delete` | — | Hard delete; blocked when `manufacturer_part.manufacturer_party_id` references party — structured `ConflictError` |

**Transactions:** each mutation single transaction; audit on success.

---

## F — Domain rules

- **`party.kind` immutable** after create ([party profile decision](../decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)).
- **No org hierarchy:** DAL rejects `party_organization.parent_party_id` on create/patch for manufacturer orgs; no `add_subsidiary` / `attach_subsidiary` actions on this Surface.
- **No org contacts:** omit `party_contact` reads/writes on this lens (contacts are customer/vendor hub scope).
- **Lens chips:** multi-tag parties show read-only **Also: Vendor** (etc.) links — unchanged.
- **Delete blocker:** `manufacturer_part` FK **`RESTRICT`** — list blocking MPNs in `ConflictError` payload ([cross-cutting](../decisions/cross-cutting.md)).
- **Audit:** all mutations on registered tables.

---

## G — UI layout

### List + detail

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): list in `manufacturers/layout.tsx`, detail in `[id]/page.tsx`.

### Person and organization `manufacturer_detail`

Single column — no tree, no related panels:

```text
┌─────────────────────────────────────────┐
│ SurfaceToolbar — New | Save | Delete …  │
├─────────────────────────────────────────┤
│ profile → phones → emails               │
└─────────────────────────────────────────┘
```

**Create:** kind = person or organization at POST; org form is profile scalars only (no parent picker).

**Shared component:** `PartyDetailForm` parameterized by `surfaceId` — manufacturer branch omits hub sections.

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `manufacturer_detail` |
| 2 | New (list) | POST create |
| 3 | Delete | confirm modal → DELETE |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `manufacturer_detail` | `/vendors/[id]` (etc.) | Multi-tag **Also:** chip |
| `part_detail` | `/manufacturers/[id]` | manufacturer ref on part header (downstream spec #14) |

No `related_parts` list or inline MPN table on `manufacturer_detail`.

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `phones` | inline row | — | "No phone numbers" |
| `emails` | inline row | — | "No email addresses" |

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create org | POST | `parent_party_id` always null |
| Create person | POST | auto `manufacturer` tag |
| Delete manufacturer | DELETE | blocked when `manufacturer_part` rows exist — structured blockers |
| Remove manufacturer tag | `remove_role` | does not delete `party` row |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Delete with MPNs** | `ConflictError` listing `mpn` / count — reassign or delete parts on `part_detail` first |
| **`parent_party_id` in PATCH** | Reject — not in writable manifest; DAL guard if sent |
| **Org without `party_organization` row** | DAL ensures extension row on org create |
| **Shipped gap** | `contact_detail` YAML uses interim `display_name` profile — lens wave aligns to kind-specific profile |
| **Codegen L1/L2** | Hand-written descriptor + repository for collections until codegen ships |
| **Wave 3 parts** | `part_list` filter by manufacturer; no parts Field added to this Surface |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-18) reflected in decisions + catalog
- [x] A–K complete; minimal lens — no hub Fields, no related UI
- [ ] Implementation deferred until task 19 exit + party lens migration
