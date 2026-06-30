# Site and as-built

> **Status:** Planning (2026-06-27). Amends [`decisions/site.md`](../decisions/site.md) section/location model.

### Decision: estimate does not write site geography — reconcile at win (2026-06-29)

**Amends** “estimate may create `proposed` rows inline” below.

**Choice:** While quoting, estimate **reads** `site_system` / `site_area` / `site_asset` only. Quote geography is **`estimate_area`** only ([02-estimates.md](./02-estimates.md)) — no quote-level assets. **`site_asset`** is site registry only. **Win → job** reconciles quote areas → `site_area` (`proposed` where needed). **`job.complete`** publishes `proposed` → `active` and may create **`site_asset`** from installed scope (A2).

---

### Decision: site as-built — system, area tree, asset (2026-06-27)

**Choice:**

| Entity | Table | Role |
|--------|-------|------|
| **Site** | `site` | Building / property anchor; portfolio FKs; optional `physical_address_id` |
| **Site system** | `site_system` | Optional instance: `site_id` + **`system_id`** (catalog) + name/status |
| **Site area** | `site_area` | Nested organizational nodes **per system** (or default bucket) |
| **Site asset** | `site_asset` | Installed **serviceable device** — leaf only |

**Supersedes** cross-trade `site_section` / `site_location` — rename/map to `site_area` / `site_asset` under per-system trees ([09-migration-notes.md](./09-migration-notes.md)).

---

## Hierarchy

```
Site
  └── Site System (optional)
        └── Site Area (tree — parent_area_id)
              └── Site Asset (leaf device)
```

### Site system optional (locked S2)

- `site_system` is **not required**.
- Areas and assets may attach to a **default no-system** bucket (`site_system_id` null) for simple sites or legacy data.
- When present, each system has its **own** area tree — FA Floor 1 ≠ CCTV Floor 1 (separate rows).

### Site area — tree (locked S3)

| Field | Notes |
|-------|-------|
| `site_id` | Required |
| `site_system_id` | Nullable — null = default bucket |
| `parent_area_id` | Nullable — nesting within same system/bucket |
| `area_type` | **Free text v1** (locked S4) — e.g. `floor`, `door_group`, `corridor`, `riser` |
| `name`, `code`, `sort_order`, `status` | `proposed` \| `active` \| `removed` \| `cancelled` |

**Option B pattern:** Access control uses `door_group` child areas (Door 101) with assets underneath (reader, strike, REX, contact). FA/CCTV usually shallower (floor area → device assets).

### Site asset — not a tree (locked S5)

| Field | Notes |
|-------|-------|
| `site_system_id`, `site_area_id` | Placement |
| `parent_asset_id` | **No v1** — assets do not nest |
| `asset_type`, `tag_label` | Device kind + field label |
| `part_id` | Optional link to `manufacturer_part` |
| `manufacturer`, `model`, `serial_number` | Service context |
| `status` | `planned` \| `installed` \| `active` \| `removed` \| `replaced` |
| `serviceable`, `installed_by_job_id` | Service + provenance |

**Asset = exact device.** Camera includes typical mount as install detail, not a separate asset. Door = **area** (`door_group`); reader/strike/REX/contact = **assets**.

## Lifecycle

| Status | Meaning |
|--------|---------|
| `proposed` | Introduced on estimate or open job — not official as-built |
| `active` | Current site record |
| `removed` / `replaced` | Tombstone; history via `latch_audit` |

**Rules:**

- **Estimate (amended 2026-06-29):** does **not** write `site_area` / `site_asset` while quoting — reads active site geography only. Quote uses **`estimate_area`** only (4c′ DDL); see [02-estimates.md](./02-estimates.md). **Win → job** reconciles quote areas → `site_area`. **`site_asset`** is created on the site at install / **`job.complete`**, not on the estimate.
- **Open job** may still create **`proposed`** site rows inline when scope requires (service, CO, field).
- Field **progress** does not update site master.
- **`job.complete` (v1)** promotes `proposed` → `active` and applies scope-driven asset/area updates — no `job_as_built_change` table ([A2 locked](./07-open-decisions.md#a2--as-built-review--locked-2026-06-27)).

## Site = source of truth

Future estimates, service tickets, and inspections **read** active areas/assets. Closed jobs keep frozen FKs to rows as they were.

## No system topology v1

Loops, NAC circuits, sprinkler zones on **as-built drawings** (attachments). Structured v1 data stops at area + asset. Topology tables deferred to v2 if reporting pain is real.

## Documents

- Site-owned **documents** (plans, panel backup) attach to site/job — structured data is not replaced by PDFs alone.

## Related

- Estimates referencing areas: [02-estimates.md](./02-estimates.md)
- As-built vs CO: [03-jobs-progress.md](./03-jobs-progress.md)
