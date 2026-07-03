# Categories-only scope model

> **Status:** **Locked** (2026-06-30). **Task:** [37a](../tasks/37a-category-scope-decision-dbml-migration.md) · **Migration:** [`033-category-scope-plan.md`](../migrations/033-category-scope-plan.md) · **Supersedes:** catalog `system` + site `site_system` + estimate `estimate_system` / 4c′ `estimate_area` snapshot model.

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
| C4 | **Site structure** | **`site_scope`** (root category instance, renamable) + **`site_zone`** tree; **General** = zones with `site_scope_id` null |
| C5 | **Estimate scope** | Read-only site tree + checkboxes (initially unchecked); check zone → auto-check parent scope |
| C6 | **Estimate General bucket** | Synthetic ROM bucket always available; item picker = **full catalog** |
| C7 | **Scoped bucket lines** | Item picker = **TreeSelect** on active bucket’s **root category subtree** only |
| C8 | **Duplicate tree nodes** | Same `item_id` may appear under multiple category paths; picker path is UX-only |
| C9 | **Specs** | **`spec_def`** namespace per root; participation via **`category_spec_def`** (include) + **`category_spec_exclude`** (opt-out) with **inheritance** — [decision](../decisions/catalog.md#decision-category-spec-participation--inherit-include-exclude-2026-07-02); bucket holds values (`estimate_scope_spec`, `estimate_zone_spec`) |
| C20 | **Scope spec panel** | Union of **effective participation** across all category nodes in checked scope’s root subtree |
| C10 | **Part filter** | When bucket value is **non-blank**, participating defs **must** match ([matching rules](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02)). `filter_mode = prefer` scoring **deferred**. |
| C18 | **`spec_def` value types** | `enum` \| `boolean` \| `text` \| **`number`**; canonical `unit` on number defs; enum multi-value = multiple `manufacturer_part_spec` rows |
| C19 | **Bucket cardinality** | Scope / zone / line: **one value per `spec_def_id`**; blank = no filter; zone overrides scope; line overrides zone (37f) |
| C11 | **Lines** | **`item_id`** primary; **`part_id`** optional when known or uniquely resolved |
| C12 | **Zero / many part matches** | 0 → item default cost + **alert**; many → generic description, cost = **default part** (org flag: max vendor) |
| C13 | **Costing** | Per line: **`unit_material`**, **`unit_labor`**, **`unit_incidental`**, **`unit_price`** snapshotted; labor/incidental **not** separate lines |
| C14 | **Commercial types** | Org tables: **`labor_context_type`**, **`labor_rate_type`**, **`incidental_rate_type`**, **`markup_type`** — **dollar rates** (markup may be % on cost); selected on **scope bucket**; **no zone override** |
| C15 | **Wire quoting** | Wire items quotable under **site General** or under a **root scope bucket** (e.g. Fire Alarm) |
| C16 | **Migration** | **Big-bang** `033` — no backward compatibility with `system` / `site_system` / `estimate_system` |
| C17 | **UI labels** | Site tab **Scopes & zones**; estimate tab **Scope** |

---

## Spec resolution

```text
bucket values (estimate_scope_spec / estimate_zone_spec / estimate_line_spec)
  resolve: line → zone → scope (blank = no filter on that dimension)
  participation: effective(category) for item's linked categories — inherit + include − exclude
  → filter manufacturer_part via manufacturer_part_spec (see matching rules)
  → optional part_id pin; description generic when ambiguous
```

**Participation:** [catalog decision — inherit / include / exclude (2026-07-02)](../decisions/catalog.md#decision-category-spec-participation--inherit-include-exclude-2026-07-02). **Matching rules:** [spec_def value types (2026-07-02)](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02).

---

## Costing rollup (v1 target — engine in task 37f+)

```text
material $  ← resolved part / item default
labor $      ← item/category hours × labor_rate_type ($/hr) for active labor_context_type on scope bucket
incidental $ ← incidental_rate_type ($/unit or flat)
sell         ← (material + labor + incidental) × markup_type; manual unit_price override OK
```

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
| **[37d2](../tasks/37d2-category-spec-inheritance.md)** | Spec participation inherit + exclude; migration **036**; scope panel subtree union |
| **37f** | Line items — TreeSelect, optional part pin, costing snapshots |
| **37g** | Commercial type catalog + bucket labor context |
| **37h** | Win/job FK renames (`site_zone_id` on job_line) |

---

## Related

- [02-estimates.md](./02-estimates.md) — amend banner pointing here
- [06-catalog-trade-system.md](./06-catalog-trade-system.md) — superseded for scope
- [01-site-as-built.md](./01-site-as-built.md) — amend site_scope / site_zone terms
- [10-site-geography-ui-decisions.md](./10-site-geography-ui-decisions.md) — SG* amend in 37c
