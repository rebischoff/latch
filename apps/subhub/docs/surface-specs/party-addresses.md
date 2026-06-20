# Cross-cutting — `addresses` on `{role}_detail`

> **Wave:** 2 · **Status:** target spec (2026-06-19) · **Catalog:** [`surfaces.md`](../surfaces.md#wave-2--party-addresses) · **DBML:** `address`, `party_address` · **Decisions:** [postal spine](../decisions/site.md#decision-postal-address--normalized-spine-and-party-vs-site-roles-2026-06-19), [shared address PATCH](../decisions/site.md#decision-shared-address-row--copy-on-write-on-patch-2026-06-19), [verification deferred](../decisions/site.md#decision-address-verification--deferred-2026-06-15) · **Pattern:** [`child-collections.md`](../child-collections.md)

**Consumers:** `customer_detail`, `vendor_detail`, `manufacturer_detail`, `property_owner_detail` — **not** `employee_detail`, **not** `site_detail` (dispatch postal = `site.physical_address_id` in wave 2b — [`site-geography.md`](./site-geography.md)).

**Related lens specs:** [`customer.md`](./customer.md) · [`vendor.md`](./vendor.md) · [`manufacturer.md`](./manufacturer.md) · [`property-owner.md`](./property-owner.md)

---

## Locked product answers (2026-06-19)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Schema | **Normalized spine** — `address` postal payload + `party_address` junction (`purpose`); do **not** merge tables |
| 2 | Lenses | **Four type lenses** — customer, vendor, manufacturer, property_owner; **person and org** layouts both get `addresses` |
| 3 | Excluded | **`employee_detail`** — no postal collection in v1; **`site_detail`** — billing on party, dispatch on site (wave 2b) |
| 4 | Patch model | **Replace-array** on parent PATCH — same as `phones` / `emails` |
| 5 | Shared row edits | **Copy-on-write** when postal fields change and `address` row has other referrers |
| 6 | Orphan GC | After replace, **delete** `address` rows with zero `party_address` and zero `site.physical_address_id` refs |
| 7 | Purpose cardinality | **Multiple rows per purpose allowed** — PK is `(party_id, address_id, purpose)`; no DAL “one billing only” rule |
| 8 | v1 entry | **Manual** lines + optional `lat`/`lng`; no verification / type-ahead |
| 9 | Create | **Optional** on POST — same as phones/emails |
| 10 | UI order | **`profile` → `phones` → `emails` → `addresses`** — then org hub sections on hub lenses |

---

## A — Identity

| Key | Value |
|-----|-------|
| `surface_id` | *(field addendum — no standalone Surface)* |
| Field id | `addresses` |
| Parent Surfaces | `customer_detail`, `vendor_detail`, `manufacturer_detail`, `property_owner_detail` |
| Routes | Unchanged — `/customers/[id]`, `/vendors/[id]`, `/manufacturers/[id]`, `/property-owners/[id]` |
| Anchor table | `party` (parent Surface anchor) |
| Child tables (DAL) | `party_address`, `address` |
| Shipped vs target | **New** — wave 2 after party hub + site wave 1 |

Each parent Surface YAML gains one logical Field:

```yaml
- id: addresses
  columns: []   # DAL maps party_address + address
```

---

## B — Fields

### `addresses` collection (all four lenses)

| Sub-field | Writable | Storage | Notes |
|-----------|----------|---------|-------|
| `id` | read-only in DTO | `address.id` | Stable RHF key; omitted on new rows in PATCH |
| `purpose` | read + write | `party_address.purpose` | `billing` \| `remit_to` \| `hq` \| `mailing` \| `other` |
| `label` | read + write | `address.label` | Suite/floor hint on postal row — not in-building spot |
| `line1` | read + write | `address.line1` | Required non-empty on write |
| `line2` | read + write | `address.line2` | Default `''` |
| `city` | read + write | `address.city` | |
| `state` | read + write | `address.state` | |
| `postal_code` | read + write | `address.postal_code` | |
| `country` | read + write | `address.country` | Default `US` |
| `lat` | read + write | `address.lat` | Nullable — optional manual pin |
| `lng` | read + write | `address.lng` | Nullable |

**List sort (GET projection):** fixed purpose order `hq`, `billing`, `remit_to`, `mailing`, `other`; then `line1`, `city`.

**Forbidden Field:** omit `addresses` key from DTO — not `[]`.

### Collection element DTO (minimum)

```json
{
  "id": "<address.id>",
  "purpose": "hq",
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
```

### Per-lens inclusion

| Surface | Person layout | Org layout |
|---------|---------------|------------|
| `customer_detail` | `addresses` after `emails` | same, before hub Fields |
| `vendor_detail` | same | same |
| `manufacturer_detail` | same | same (base lens only otherwise) |
| `property_owner_detail` | same | same, before hub Fields |
| `employee_detail` | **omit** | — |

---

## C — Policy

| Parent Surface | Field | Action | Granted when | Re-auth |
|----------------|-------|--------|--------------|---------|
| `{role}_detail` | `addresses` | `read` | grant on Field | Each GET |
| `{role}_detail` | `addresses` | `write` | grant on Field | Each PATCH including `addresses` array |

No separate `delete` on collection rows — removal is PATCH with a shorter array (replace-array).

**403 vs 404:** platform default on parent detail.

---

## D — DAL read

On each parent **`get(ctx, partyId)`** (when `addresses` readable):

1. Join `party_address` → `address` where `party_address.party_id = partyId`.
2. Project element DTO per **B**; sort per purpose order.
3. Omit Field when no `read` grant.

**Shared helper:** `loadPartyAddresses(partyId)` — used by all four lens repositories (same SQL as interim `loadPartyPhones` pattern).

---

## E — DAL write

### Parent operations

| Operation | `addresses` in body | Semantics |
|-----------|---------------------|-----------|
| `create` | optional array | Insert `address` + `party_address` per element after anchor insert |
| `patch` | optional array | **Replace-array** for this party only — see algorithm below |

Unknown keys in array elements → **400** (strict Zod). Unknown top-level PATCH keys → **400**.

### Replace-array algorithm (`replacePartyAddresses`)

Run in the **same transaction** as anchor patch (or create).

**Referrer check** — `address` row is *shared* when:

```sql
-- other party links
EXISTS (SELECT 1 FROM party_address pa
        WHERE pa.address_id = $id AND pa.party_id <> $partyId)
OR
-- site dispatch FK (wave 2b+)
EXISTS (SELECT 1 FROM site s WHERE s.physical_address_id = $id)
```

**Per payload element:**

| Case | Action |
|------|--------|
| New row (no `id`) | `INSERT address` → `INSERT party_address` |
| Existing `id`, postal fields **unchanged** | Update `party_address.purpose` if changed (delete+insert junction if PK would change); update `address.label` / `lat` / `lng` in place |
| Existing `id`, postal fields **changed**, row **not shared** | `UPDATE address` in place |
| Existing `id`, postal fields **changed**, row **shared** | **Copy-on-write:** `INSERT` new `address` with new postal values → repoint **this party’s** `party_address` row to new `address_id` (delete old junction if purpose+old id pair dropped) |

**Purpose change** on same `address_id`: delete `(party_id, address_id, old_purpose)` junction; insert `(party_id, address_id, new_purpose)` — reject if new PK already exists.

**Removals:** delete `party_address` rows for `party_id` whose `(address_id, purpose)` pairs are absent from payload.

**Orphan GC (same transaction, after removals):** `DELETE FROM address a WHERE NOT EXISTS (SELECT 1 FROM party_address pa WHERE pa.address_id = a.id) AND NOT EXISTS (SELECT 1 FROM site s WHERE s.physical_address_id = a.id)`.

**Audit:** include `addresses` snapshot in mutation audit when mode requires.

### Repository layout

- `loadPartyAddresses(partyId)`
- `replacePartyAddresses(partyId, rows[])` — shared module; called from each lens `patch` / `create`

Hand-written descriptor + Zod until collection Field codegen ships ([`child-collections.md`](../child-collections.md)).

---

## F — Domain rules

- **Billing vs dispatch** — corporate mail / AP / AR on **`party_address`**; “drive here” on **`site.physical_address_id`** ([postal spine](../decisions/site.md#decision-postal-address--normalized-spine-and-party-vs-site-roles-2026-06-19)). Site UI may **suggest** copy from customer `hq` once — never auto-sync.
- **Copy-on-write** — prevents editing one party’s form from changing another party’s or a site’s shared street row ([decision](../decisions/site.md#decision-shared-address-row--copy-on-write-on-patch-2026-06-19)).
- **In-building spots** — `site_section` / `site_location` only; do not use `addresses` for room/device labels.
- **Standing site contacts** — `site_contact` is not a substitute for billing address ([site contacts decision](../decisions/site.md#decision-site-contacts--site_contact_relation-catalog-2026-06-15)).
- **Multi-tag party** — each lens PATCHes only its own `party_id` anchor; `addresses` collection is shared data on the party — visible on every lens that grants `read` (same phones/emails behavior).
- **Verification** — deferred; no `verified_at` columns in v1 ([decision](../decisions/site.md#decision-address-verification--deferred-2026-06-15)).

---

## G — UI layout

### Section placement

Insert **`addresses`** block immediately after **`emails`** on all four lenses (person and org).

```text
Person customer_detail
┌──────────────────────────────┐
│ profile                      │
│ phones                       │
│ emails                       │
│ addresses          ← wave 2  │
└──────────────────────────────┘

Org customer_detail
┌──────────────────────────────┐
│ profile                      │
│ phones                       │
│ emails                       │
│ addresses          ← wave 2  │
│ parent_customer / hub …      │
└──────────────────────────────┘
```

**Manufacturer** — same stack; no hub below.

**Shared component:** extend `PartyDetailForm` / `PhoneEmailFields` pattern → `AddressFields` with `useFieldArray({ name: "addresses" })`.

### Row layout (each collection element)

| Control | Notes |
|---------|-------|
| `purpose` | `Select` — five enum values |
| `label` | optional short text |
| `line1`, `line2`, `city`, `state`, `postal_code`, `country` | required line1; country default US |
| `lat`, `lng` | collapsed **“Map pin (optional)”** — manual numeric entry only in v1 |

No address autocomplete widget in v1.

---

## H — UI chrome

No new routes or toolbar actions. Save is parent Surface **Save** (PATCH whole form including `addresses`).

### Cross-Surface (navigation only v1)

| From | To | When |
|------|-----|------|
| `site_detail` physical address picker *(wave 2b)* | parent customer `hq` | one-time **suggest** copy — [`site-geography.md`](./site-geography.md) |
| `{role}_detail` | same party on another lens | multi-tag chips unchanged |

---

## I — Collections UX

| Field | Add row | Pickers | Empty state |
|-------|---------|---------|-------------|
| `addresses` | **Add address** inline | none — manual entry | "No addresses" |

**Remove row:** delete icon removes from field array; persisted on Save (replace-array).

**Validation (client + server):** `line1` required; `purpose` required; `country` default `US`.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create party | optional `addresses` in POST | Same transaction as party + role tag |
| Edit addresses | PATCH `addresses` array | Replace-array |
| Remove last address | PATCH `addresses: []` | Junction rows removed; orphan `address` GC |
| Party delete | CASCADE | `party_address` cascades; orphan `address` GC if unreferenced |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Shared row edit** | Copy-on-write when postal changes and referrers > 1 |
| **Edit label/lat/lng only on shared row** | In-place update allowed (does not change street identity) |
| **Duplicate `(address_id, purpose)` in payload** | Reject — strict validation |
| **Two `billing` rows, different streets** | Allowed |
| **`site.physical_address_id` holds row** | Removing party link does not delete `address`; GC skips while site references |
| **Progressive setup** | N/A — no address catalog |
| **Dev seed** | Optional rows in party dev seed migration — ids not hard-coded in docs |
| **Codegen** | Hand-written collection schema + replace helper until codegen ships |
| **Employee home address** | Out of scope — use customer/vendor lens if needed for business mail |

---

## Lens spec patches (implementation checklist)

When implementing wave 2, update each lens spec **B / E / G / I** sections to reference this file:

- [`customer.md`](./customer.md) — add `addresses` to shared Fields, PATCH keys, layout, collections table
- [`vendor.md`](./vendor.md) — same
- [`manufacturer.md`](./manufacturer.md) — same
- [`property-owner.md`](./property-owner.md) — same

---

## Verify (stop gate)

- [x] Locked answers (2026-06-19) reflected in [`decisions/site.md`](../decisions/site.md)
- [x] A–K complete; per-lens catalog broken out in [`surfaces.md`](../surfaces.md)
- [ ] Implementation deferred until task 19 exit + wave 2 migration slice
