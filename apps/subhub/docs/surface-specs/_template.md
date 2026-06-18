# `<surface_id>` — implement spec

> **Wave:** · **Status:** pending · **Catalog:** [`surfaces.md`](../surfaces.md#…) · **DBML:** [`current.dbml`](../schema/current.dbml)

Copy this file per Surface. Delete sections marked *(optional)* if N/A. Target: every **A–K** row at implement tier ([checklist](../surface-planning-depth.md#2-surface-planning-depth-checklist)).

---

## A — Identity

| Key | Value |
|-----|-------|
| `surface_id` | |
| Pair | `*_list` · `*_detail` or `*_table` |
| Route(s) | |
| Nav group | |
| Anchor table | |
| All tables (DAL) | |
| Shipped / new / retire | |

---

## B — Fields

### List columns

| Column | Source | Sort/filter |
|--------|--------|-------------|
| | | |

### Detail Fields

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|----------------------|-------|
| | | | | |

### Collection element shape

*(Per collection Field — row DTO columns, required keys, defaults)*

---

## C — Policy

| Action | Granted when | Re-auth |
|--------|--------------|---------|
| `read` | | |
| `write` | | |
| `delete` | | |
| *(custom)* | | |

**Field visibility:** which roles see which Fields/tabs; 403 vs 404 for sensitive Fields.

---

## D — DAL read

- **`get(ctx, id)`** — joins, lens filters, omitted Fields when no grant
- **List query** — columns, default sort, search
- **DTO shape** — link to Zod readable schema intent

---

## E — DAL write

| Operation | Body keys | Collection semantics | Transaction scope |
|-----------|-----------|----------------------|-------------------|
| `create` | | | |
| `patch` | | replace-array per [`child-collections.md`](../child-collections.md) | |
| `delete` | | | |

**Validation:** strict writable schema; reject unknown keys.

---

## F — Domain rules

- Invariants (cite [`decisions/`](../decisions/README.md) blocks)
- Cross-Surface flows (create job from estimate, etc.)
- Audit: which mutations write `latch_audit`

---

## G — UI layout

- Page structure (master-detail / catalog table / tabs)
- Section order; conditional sections (e.g. SOV when `billing_model = progress_sov`)
- Shared components (`PartyDetailForm`, grouped line editor, …)

---

## H — UI chrome

| Priority | Toolbar action | Handler |
|----------|----------------|---------|
| 1 | | |
| 2 | | |

**Linked Surfaces** (hrefs from this screen):

---

## I — Collections UX

| Field | Add row | Pickers | Empty state |
|-------|---------|---------|-------------|
| | | | |

---

## J — Lifecycle

| Status / event | Transition | Server action | Blocks |
|----------------|------------|---------------|--------|
| | | | |

**Create flow:** route vs modal; required Fields at create.

---

## K — Edge cases

- Progressive setup triggers
- Dev seed dependencies
- Migration / backfill notes
- Explicit deferrals with decision links

---

## Verify (stop gate)

- [ ] A–K filled; no TBD without decision link
- [ ] DBML tables accounted for (Surface or [not-a-Surface](../surfaces.md#not-a-surface))
- [ ] Cross-links added to [`00-scan.md`](./00-scan.md) progress table
