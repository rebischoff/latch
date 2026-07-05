# Categories-only scope model

> **Status:** **Locked** (2026-06-30); **amended** (2026-07-04) — scope required on quotes; commercial resolution ([catalog decision](../decisions/catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04)). **Task:** [37a](../tasks/37a-category-scope-decision-dbml-migration.md) · **Migration:** [`033-category-scope-plan.md`](../migrations/033-category-scope-plan.md) · **Supersedes:** catalog `system` + site `site_system` + estimate `estimate_system` / 4c′ `estimate_area` snapshot model.

---

## Summary

**Remove the catalog `system` table.** Scope roots, spec namespaces, site structure, and estimate scope all use **`category`** where **`parent_id IS NULL`**. Nested categories classify items and parts (M:N). Site **scope instances** and **zones** replace `site_system` / `site_area`. Estimates select scope via **checkboxes** on the live site tree; lines attach **`item_id`** with optional **`part_id`** pin; labor and incidentals are **internal $ rollups**, not separate line rows.

---

## Locked decisions

| ID | Topic | Choice |
|----|--------|--------|
| C1 | **Scope roots** | `category.parent_id IS NULL` — Fire Alarm, Intrusion, HVAC, … |
| C2 | **Many roots** | Multiple roots per informal trade (e.g. low voltage) OK; **`trade` table omitted from scope path v1** |
| C3 | **Items / parts** | M:N via `item_category`, `part_category`; **same category tree** |
| C4 | **Site structure** | **`site_scope`** (root category instance, renamable) + **`site_zone`** tree under that scope. **Amended (2026-07-04):** no site **General** zones — every zone belongs to a **`site_scope`**. Mobilization / lump-sum uses a named scope instance. |
| C5 | **Estimate scope** | Read-only site tree + checkboxes; check zone → auto-check parent scope. **Amended (2026-07-04):** **≥1 checked `estimate_scope` required** before Line Items. |
| C6 | ~~**Estimate General bucket**~~ | **Superseded (2026-07-04)** — no ROM / full-catalog bucket. All lines under a checked scope; item picker = root subtree only ([C7](#locked-decisions)). |
| C7 | **Scoped lines** | Item picker = **TreeSelect** on active scope’s **`root_category_id` subtree** only |
| C8 | **Duplicate tree nodes** | Same `item_id` may appear under multiple category paths; picker path is UX-only |
| C9 | **Specs** | **`spec_def`** namespace per root; participation via **`category_spec_def`** (one assign per def) + **`category_spec_exclude`** (branch cut, no re-include) — [decision](../decisions/catalog.md#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03); **admin visibility** per [owner-branch knowledge (2026-07-03)](../decisions/catalog.md#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03); bucket holds values (`estimate_scope_spec`, `estimate_zone_spec`) |
| C20 | **Scope spec panel** | Union of **effective participation** across all category nodes in checked scope’s root subtree |
| C10 | **Part filter** | When bucket value is **non-blank**, participating defs **must** match ([matching rules](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02)). `filter_mode = prefer` scoring **deferred**. |
| C18 | **`spec_def` value types** | `enum` \| `boolean` \| `text` \| **`number`**; canonical `unit` on number defs; enum multi-value = multiple `manufacturer_part_spec` rows |
| C19 | **Bucket cardinality** | Scope / zone / line: **one value per `spec_def_id`**; blank = no filter; zone overrides scope; line overrides zone (**line UI deferred** — [37f O5](../tasks/37f-estimate-line-costing.md#decision-o5--estimate_line_spec-ui-deferred)) |
| C11 | **Lines** | **`item_id`** required; **`part_id`** optional; **`part_locked`** when user confirms PN ([O2](../tasks/37f-estimate-line-costing.md#decision-o2--line-item-part-pin-2026-07-04)) |
| C12 | **Zero / many part matches** | **0** → `item.fallback_unit_cost` + alert; **many** → `max` vendor price among **filtered** parts until pin; **1** → that part ([O1](../tasks/37f-estimate-line-costing.md#decision-o1--ambiguous-part-material-cost-2026-07-04)) |
| C13 | **Costing** | Per line: **`unit_material`**, **`unit_labor`**, **`unit_incidental`**, **`unit_price_target`**, **`unit_price`** snapshotted; labor/incidental **not** separate lines |
| C14 | ~~**Commercial on scope bucket**~~ | **Superseded (2026-07-04)** by [commercial costing decision](../decisions/catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04) — org rate tables + **category defaults**; **`estimate_scope` / `estimate_zone` overrides only** (markup, complexity). |
| C15 | ~~**Wire under General**~~ | **Superseded (2026-07-04)** — wire and all items under a **checked scope** (e.g. Fire Alarm). |
| C21 | **Commercial org tables** | **`labor_rate_type`**, **`incidental_rate_type`** (% of **material** v1), **`markup_type`**, **`complexity_factor`** — list surfaces (37g). **No** sales commission table v1. |
| C22 | **Commercial category** | **`phase_template`** (phase → `labor_rate_type` + hours); default **`markup_type_id`**, **`incidental_rate_type_id`** — **inherit walk up** category tree (not spec exclude model). **No item override** v1. |
| C23 | **Complexity** | **`complexity_factor_id`** on **category** (inherit walk); **not** overridable on estimate |
| C24 | **Estimate pricing** | **`unit_price_target`** = policy sell from catalog types; **`unit_price`** = actual sell (estimator may undercut). Manager compares target vs actual margin. |
| C25 | **Rate types on quote** | Estimator **cannot** pick alternate org rate types on estimate — **category only** |
| C16 | **Migration** | **Big-bang** `033` — no backward compatibility with `system` / `site_system` / `estimate_system` |
| C17 | **UI labels** | Site tab **Scopes & zones**; estimate tab **Scope** |

---

## Spec resolution

```text
bucket values (estimate_scope_spec / estimate_zone_spec / estimate_line_spec)
  resolve: line → zone → scope (blank = no filter on that dimension)
  participation: effective(category) for item's linked categories — assign-once + branch exclude
  → filter manufacturer_part via manufacturer_part_spec (see matching rules)
  → optional part_id pin; description generic when ambiguous
```

**Participation:** [catalog decision — assign-once, branch exclude (2026-07-03)](../decisions/catalog.md#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03). **Matching rules:** [spec_def value types (2026-07-02)](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02).

---

## Costing rollup (v1 target — [commercial decision](../decisions/catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04))

```text
material $     ← resolved part / item default (vendor price)
labor $        ← Σ category phase_template hours × labor_rate_type.$/hr × complexity_factor
incidental $   ← incidental_rate_type % of material only (v1)
unit_cost      ← M + L + I
unit_price_target ← unit_cost × resolved_markup (category default; estimate_scope override)
unit_price     ← actual sell (estimator; may be < target)
```

**Complexity:** `category.walk_up(complexity_factor_id)` — not overridable on estimate (2026-07-04).

**Implementation:** material + part filter → **37f**; full commercial engine + org surfaces → **37g**; scope-required + retire ROM General → **37f** amend (see task).

Rollups: zone → scope instance → estimate. PDF may show lump sum or M/L/I columns (presentation).

---

## Supersedes

| Prior | Doc / artifact |
|-------|----------------|
| Catalog **`system`** + C2 `system_id` specs | This doc + [`08-supersedes.md`](./08-supersedes.md) |
| **`site_system`** / **`site_area`** | **`site_scope`** / **`site_zone`** |
| **`estimate_system`** + 4c′ **`estimate_area`** snapshots + Import from site | **`estimate_scope`** + live site zones |
| Estimate **Add system** catalog picker | Scope checkboxes |
| Auto-generated labor **lines** | Internal $ fields on product lines |

---

## Follow-on tasks

| Task | Deliverable |
|------|-------------|
| **37a** ✅ | Decision + DBML + migration `033` plan |
| **37b** ✅ | Apply `033` on dev DB; smoke FK integrity |
| **37c** | Site DAL/UI — `site_scope` / `site_zone`; Scopes & zones tab |
| **[37d](../tasks/37d-category-catalog-dal-surfaces.md)** | `category_list` / `category_detail` — tree list pane, DAL, `spec_def` / `category_spec_def` |
| **[37e](../tasks/37e-estimate-scope-tab.md)** | Estimate scope DAL + Scope tab (checkboxes + spec panel); migration **034** `estimate_zone` |
| **[37d2](../tasks/37d2-category-spec-inheritance.md)** | Spec participation tables + scope panel union — **complete** (algorithm superseded) |
| **[37d3](../tasks/37d3-category-spec-participation-simplify.md)** | Assign-once participation + simplified UI; migration **037** — **next** |
| **37f** | Line items — scope required; zone parents; TreeSelect; part filter; material snapshot; `unit_price_target` |
| **37g** | Org commercial tables + category commercial defaults + scope/zone overrides + full costing engine |
| **37h** | Win/job FK renames (`site_zone_id` on job_line) |

---

## Related

- [02-estimates.md](./02-estimates.md) — amend banner pointing here
- [06-catalog-trade-system.md](./06-catalog-trade-system.md) — superseded for scope
- [01-site-as-built.md](./01-site-as-built.md) — amend site_scope / site_zone terms
- [10-site-geography-ui-decisions.md](./10-site-geography-ui-decisions.md) — SG* amend in 37c
