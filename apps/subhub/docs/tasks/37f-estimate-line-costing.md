# 37f — Estimate line costing: zone parents, item TreeSelect, part filter

> **Status:** Stub (2026-07-02). **Prerequisites:** [37d2](./37d2-category-spec-inheritance.md) (spec participation + scope panel union); [37e](./37e-estimate-scope-tab.md) ✅.
>
> **Decisions:** [spec_def value types](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02) · [category participation](../decisions/catalog.md#decision-category-spec-participation--inherit-include-exclude-2026-07-02) · **Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md)

## Goal

*(Task body TBD — expand when 37d2 is complete.)*

Ship estimate **Line Items** finish: zone tree parents, item TreeSelect, `manufacturer_part_spec` part resolution, `unit_material` / `unit_labor` / `unit_incidental` snapshots, optional `part_id` pin.

**Exit:** Line add flow smoke on dev DB; part filter uses effective participation + bucket matching rules; `codegen:check`.

## Deliverables (outline)

| Area | Deliverable |
|------|-------------|
| DDL | `spec_def` number columns; `manufacturer_part_spec` value_number; estimate line costing columns in DAL |
| Catalog | Thin item read API; `manufacturer_part_spec` on `part_detail` |
| Estimate UI | Zone line parents; item TreeSelect; PN override picker |
| DAL | Part-matching resolver; costing engine v1 |

## Verify (stop gate)

- [ ] Task steps written
- [ ] Implementation complete
- [ ] STATUS updated
