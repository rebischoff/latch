# SubHub schema view (DBML)

Collaborative **design draft** for the database. During planning, `current.dbml` leads; SQL migrations catch up at **implementation wave** gates (wave 1: [`deferred/site-migration.md`](../tasks/deferred/site-migration.md)). After ship, [`migrations/`](../../migrations/) are canonical and this file is refreshed to match.

| File | Purpose |
|------|---------|
| [`current.dbml`](./current.dbml) | Working schema — iterate here first |
| [`current.dbdiagram`](./current.dbdiagram) | Optional canvas export from dbdiagram (layout only; do not hand-edit for schema) |

## Shared diagram

**[dbdiagram.io — latch (SubHub)](https://dbdiagram.io/d/latch-6a3215ad5c789b8acb9d5278)** — visual review; layout auto-saves on dbdiagram when you pan or drag tables.

## Coverage (2026-06-29)

Target tables per amended [`current.dbml`](./current.dbml) ([task 29](../tasks/29-backbone-dbml-pass.md)). **Shipped SQL** still reflects legacy geography (`site_section` / `site_location`, `estimate_section`) until [task 31](../tasks/31-estimate-backbone-migrations.md).

| Slice | Tables in `current.dbml` | Shipped SQL |
|-------|--------------------------|-------------|
| Platform | `latch_*` | `001`–`015`, `026` |
| 1 Party | `party`, phones/emails, roles, `employee` + kind extensions, `note` | `016`–`018`, `025` |
| 2 Sites | `address`, `site`, `site_system`, `site_area`, `site_asset`, `party_address`, `site_contact_*` | `019`–`020` *(legacy `site_section` / `site_location` — rename in task 31)* |
| 3 Catalog | `system`, `trade`, `system_spec_def`, `system_spec_option`, `manufacturer_part_spec`, `phase_template`, `phase_template_step`, `category`, `labor_class`, `phase`, `manufacturer_part`, `vendor_part`, `item`, `item_part_link` | pending |
| 4 Estimates | `job_party_relation`, `estimate`, `estimate_party`, `estimate_system`, `estimate_system_spec`, `estimate_area_spec`, `estimate_line_spec`, `estimate_line` | `021`–`022` *(legacy `estimate_section`, `site_location_id` on lines — task 31)* |
| 5 Jobs | `job`, `job_party`, `job_scope_group`, `job_line`, `job_line_part`, `scope_phase`, `progress_entry`, `progress_entry_line`, `job_system_spec`, `job_area_spec`, `job_line_spec`, `change_order_*` | `023` *(legacy `site_location_id` on `job_line` — task 31)* |
| 6a Procurement | `requested_order_*`, `purchase_order`, `purchase_order_line`, `purchase_order_line_shipment`, `material_receipt_*`, `job_material_movement` | pending |
| 6b Billing | `billable_line`, `invoice_*`, `schedule_of_value`, `sov_line`, `sov_allocation` | pending |

## Workflow (repeat until slice-ready)

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Iterate current.dbml (you + agent in chat)             │
└──────────────────────────────┬──────────────────────────────┘
                               │ agree on this round
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Agent updates repo docs (decisions, architecture,      │
│    tasks) — no migrations yet                               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Sync dbdiagram — paste or File → Import from current.dbml│
│    into the shared diagram (link above)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. You adjust layout on dbdiagram (understand the change) │
│    — visual positions save on dbdiagram, not in the repo    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼                         back to 1
                               │
                               ▼ (when ready)
┌─────────────────────────────────────────────────────────────┐
│ Exit: Surface/Field catalog + migration wave(s) + refresh   │
│ dbml from shipped SQL                                       │
└─────────────────────────────────────────────────────────────┘
```

### Roles

| Step | Who | What |
|------|-----|------|
| **1** | You + agent | Edit [`current.dbml`](./current.dbml) — tables, columns, refs, `Note` blocks. `@` the file in chat. |
| **2** | Agent | Lock choices in [`decisions.md`](../decisions/README.md), align [`architecture.md`](../architecture.md) and task files. **No `migrations/*.sql` yet.** |
| **3** | You *(or agent if you’re logged in on dbdiagram)* | Replace DBML in the [shared diagram](https://dbdiagram.io/d/latch-6a3215ad5c789b8acb9d5278): **File → Import from → DBML**, or paste full file into the left editor. |
| **4** | You | Drag tables, zoom, group visually. dbdiagram persists layout; repo `current.dbml` stays schema-only. |
| **Exit** | Agent (implementation wave) | Numbered SQL under `migrations/`, Surfaces/DAL, then hand-refresh `current.dbml` from shipped DDL. Preceded by [`surfaces.md`](../surfaces.md) catalog exit. |

### What not to churn

- **Do not rename** `TableGroup` blocks: `latch_platform`, `cross_cutting`, `party`, `site`, `catalog`, `estimate`, `job`, `procurement`, `billing`.
- **Do not change** `[color: …]` on groups.
- **Do not edit** [`current.dbdiagram`](./current.dbdiagram) for schema updates — canvas positions only; re-import `current.dbml` on dbdiagram instead.
- **Allowed edits in `current.dbml`:** table/column/index/ref/`Note` content.

## Tips

- **Table groups** color-code sections on dbdiagram.
- **Notes** on tables carry CHECK constraints, deferred slice context, and **column plans not yet in DDL** (e.g. `employee` HR fields, `party_person` login columns) — not every detail is in column types.
- **Target vs shipped:** `current.dbml` may run ahead of `migrations/` — next SQL batch is [task 20 step 1](../tasks/20-ui-discovery.md) (`018`–`020`).
- **Cross-cutting** tables (`note`, future `attachment`) live in `cross_cutting`, not under `party`.
- For AI: `@apps/subhub/docs/schema/current.dbml` plus active task and relevant [`decisions.md`](../decisions/README.md) blocks.

## Related docs

- [architecture.md](../architecture.md) — entity flow (cross-slice relationships)
- [tasks/17-schema-design-pass.md](../tasks/17-schema-design-pass.md) — schema pass (complete 2026-06-16)
- [surfaces.md](../surfaces.md) — Surface & Field catalog
- [tasks/18-surface-catalog.md](../tasks/18-surface-catalog.md) — active planning task
- [tasks/deferred/site-migration.md](../tasks/deferred/site-migration.md) — wave 1 DDL spec (deferred)
