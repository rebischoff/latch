# Catalog — trade, system type, assumptions, part tags

> **Status:** Planning (2026-06-27). Extends [`decisions/catalog.md`](../decisions/catalog.md).

### Decision: trade vs system type — separate catalogs (2026-06-27)

**Choice:** **`trade`** and **`system_type`** are separate reference tables. Both are used; neither owns the site area tree.

---

## When each is used (C1)

| Concept | Table | Examples | Used on |
|---------|-------|----------|---------|
| **Trade** | `trade` | Low voltage, Electrical, Sprinkler fitter | Job primary trade; scope group `trade_id`; labor costing; fulfillment / subcontract |
| **System type** | `system_type` | Fire alarm, CCTV, Access control, Wet sprinkler | `site_system.system_type_id`; estimate `site_system_id`; assumption defs; part tags |

| Question | Answer |
|----------|--------|
| Who performs the work? | **Trade** |
| What building system is installed/serviced? | **System type** |
| Site area tree keyed by? | **`site_system`** (optional), not trade |
| One trade, many systems? | Yes — LV installs FA and CCTV |
| One system, multiple trades? | Yes — FA job with electrical subcontract lines |

---

## System assumption definitions (C2, E1)

| Table | Role |
|-------|------|
| `system_type` | Fire Alarm, Access, … |
| `system_assumption_def` | Per system type: `manufacturer`, `device_color`, … |
| `system_assumption_option` | Optional enumerated values |
| `estimate_system_assumption` | Values chosen on estimate |
| `job_system_assumption` | Snapshot on win |

---

## Part tagging for assumption narrowing (1.2, C2)

Parts and items must be **filterable** by assumption keys.

### `manufacturer_part` (extend)

| Field | Purpose |
|-------|---------|
| `manufacturer_party_id` | Already exists |
| `system_type_id` | Primary system compatibility |
| `tag_json` or junction | `addressable`, `conventional`, `color:red`, … |

### `item` (extend)

| Field | Purpose |
|-------|---------|
| `system_type_id` | Default system |
| `phase_template_id` | Seeds scope phases on add |
| `default_part_id` | Costing |

### Suggestion algorithm (v1)

1. Load estimate/job assumptions for active `site_system`.
2. Filter items/parts where tags **match** assumption values (manufacturer required match; color soft match).
3. Rank by match score; present in picker — user confirms → `material_status = verified`.

**Not v1:** Perfect auto-match; configurators; invisible BOM rollups.

---

## Phase templates (J5)

| Table | Role |
|-------|------|
| `phase_template` | Named set per `system_type` or `item` |
| `phase_template_step` | `name`, `sequence`, default `progress_weight`, `billing_weight` |

Replaces org-wide `phase` catalog for **new** scope phase seeding. Migration: map existing `phase` rows to template steps or bridge during transition.

---

## Labor

- **`labor_class`** = rate bucket (installer, programmer).
- **`phase_template_step`** = install vs program vs test for scope phases.
- Labor estimate lines may still reference a template step for costing alignment.

---

## Related

- [02-estimates.md](./02-estimates.md) — assumptions on estimate
- [03-jobs-progress.md](./03-jobs-progress.md) — scope phases from templates
- [01-site-as-built.md](./01-site-as-built.md) — `site_system.system_type_id`
