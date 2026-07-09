# Catalog — trade, system, specs

> **Status:** Planning (2026-06-27). **C2 locked.** Amends [`decisions/catalog.md`](../decisions/catalog.md).

### Decision: system specs and part compatibility (C2 locked 2026-06-27)

**Choice:**

| Piece | Rule |
|-------|------|
| **`manufacturer_party_id`** | FK → `party` (manufacturer role). Catalog/PO only — **not** estimate spec knobs. Pickers filter manufacturer-tagged parties. |
| **`system`** | Catalog table: `id`, `name` (Fire alarm, Access control, …) |
| **`site_system`** | Instance on site: `site_id` + `system_id` + … |
| **`system_spec_def`** | UUID PK — one spec dimension per catalog `system` |
| **`system_spec_option`** | Enum values; FK → `system_spec_def` |
| **`manufacturer_part_spec`** | Part compatibility: FK `system_spec_def_id` + `system_spec_option_id` (multi-row per def allowed) |
| **`manufacturer_part.specs`** | Freeform text column — human notes; **never** used for filtering |

**No `manufacturer` spec knob** — use technical defs (`slc_protocol`, `reader_type`, …).

---

## Trade vs system (C1)

| Concept | Table | Used for |
|---------|-------|----------|
| **Trade** | `trade` | Who performs work (job scope, labor costing) |
| **System** | **`system`** | What building system; spec defs; `site_system.system_id` |
| **Manufacturer** | `party` via **`manufacturer_party_id`** | MPN identity, `vendor_part` pricing |

---

## `system` (catalog)

| Column | Notes |
|--------|--------|
| `id` | PK (UUID) |
| `name` | Fire alarm, Access control, CCTV, … |
| `default_phase_template_id` | Fallback when `item` has no template (J5) |
| `sort_order` | |

Not to be confused with **`site_system`** (installed instance on a property).

---

## `system_spec_def`

| Column | Notes |
|--------|--------|
| `id` | **PK (UUID)** — referenced as `system_spec_def_id` / `spec_id` |
| `system_id` | FK → `system` |
| `code` | Optional stable slug (`slc_protocol`) for import — not PK |
| `display_name` | “SLC protocol” |
| `value_type` | `enum` \| `boolean` \| `text` |
| `sort_order` | |

## `system_spec_option`

| Column | Notes |
|--------|--------|
| `id` | PK |
| `system_spec_def_id` | FK |
| `code` | Optional slug (`fire_lite_litespeed`) |
| `display_name` | “Fire-Lite LiteSpeed” |
| `sort_order` | |

Estimate and part rows **FK to option id** for enums — not loose string values.

---

## `manufacturer_part_spec`

| Column | Notes |
|--------|--------|
| `manufacturer_part_id` | |
| `system_spec_def_id` | FK |
| `system_spec_option_id` | Enum match (multiple rows = multi-value) |
| `value_text` / `value_boolean` | Non-enum defs |

**Unique:** `(manufacturer_part_id, system_spec_def_id, system_spec_option_id)` where applicable.

---

## `vendor_part` (unchanged intent)

Links **vendor** ↔ **manufacturer_part**: `vendor_pn`, `unit_price`, `vendor_description`, `lead_time_days`, `is_preferred`.

---

## Suggestion algorithm (v1)

1. Resolve specs: `estimate_line_spec` → `estimate_area_spec` → `estimate_system_spec` (within same `estimate_system_id`).
2. Each `required` `system_spec_def`: part must have matching `manufacturer_part_spec` row.
3. Each `prefer` def: rank matches first.
4. User confirms pick → `material_status = verified`.

---

## Phase templates (J5 locked)

| Table | Role |
|-------|------|
| `phase_template` | Named step set |
| `phase_template_step` | Install, program, test, … + default weights |
| `system.default_phase_template_id` | Fallback per catalog **`system`** |
| `item.phase_template_id` | Override when set |
| **`scope_phase`** | Instance on `job_line` — seeded on win / line create |

**Resolution:** item template → else system default → else org fallback.

---

## Related

- [02-estimates.md](./02-estimates.md) — `estimate_system` tabs
- [01-site-as-built.md](./01-site-as-built.md) — `site_system.system_id`
