# SubHub schema view (DBML)

Collaborative **design draft** for the database. During slice planning, `current.dbml` leads; SQL migrations catch up at implementation gates (task **18+**). After ship, [`migrations/`](../../migrations/) are canonical and this file is refreshed to match.

| File | Purpose |
|------|---------|
| [`current.dbml`](./current.dbml) | Working schema — iterate here first |
| [`current.dbdiagram`](./current.dbdiagram) | Optional canvas export from dbdiagram (layout only; do not hand-edit for schema) |

## Shared diagram

**[dbdiagram.io — latch (SubHub)](https://dbdiagram.io/d/latch-6a3215ad5c789b8acb9d5278)** — visual review; layout auto-saves on dbdiagram when you pan or drag tables.

## Coverage (2026-06-16)

| Slice | Tables in `current.dbml` | Shipped SQL |
|-------|--------------------------|-------------|
| Platform | `latch_*` | `001`–`015` |
| 1 Party | `party`, phones/emails, roles, `employee` + draft kind extensions, `note` | `016`–`017` (interim shape) |
| 2 Sites | `location`, `site`, `party_location`, `site_contact_*` | pending task **18** |
| 3 Catalog | `manufacturer_part`, `vendor_part_price`, `item_*` | pending |
| 4 Estimates | `job_party_relation`, `estimate`, `estimate_party`, `estimate_line` | pending |
| 5 Jobs | `job`, `job_party`, `job_location`, `job_line`, `change_order_*` | pending |
| 6 Financial | `invoice_*`, `purchase_order`, `po_line`, `schedule_of_value`, `sov_line` | pending |

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
│ Exit: migration task(s) + Surfaces/Fields + refresh dbml    │
│ from shipped SQL                                            │
└─────────────────────────────────────────────────────────────┘
```

### Roles

| Step | Who | What |
|------|-----|------|
| **1** | You + agent | Edit [`current.dbml`](./current.dbml) — tables, columns, refs, `Note` blocks. `@` the file in chat. |
| **2** | Agent | Lock choices in [`decisions.md`](../decisions.md), align [`architecture.md`](../architecture.md) and task files. **No `migrations/*.sql` yet.** |
| **3** | You *(or agent if you’re logged in on dbdiagram)* | Replace DBML in the [shared diagram](https://dbdiagram.io/d/latch-6a3215ad5c789b8acb9d5278): **File → Import from → DBML**, or paste full file into the left editor. |
| **4** | You | Drag tables, zoom, group visually. dbdiagram persists layout; repo `current.dbml` stays schema-only. |
| **Exit** | Agent (implementation slice) | Numbered SQL under `migrations/`, Surfaces/DAL, then hand-refresh `current.dbml` from shipped DDL. |

### What not to churn

- **Do not rename** `TableGroup` blocks: `latch_platform`, `cross_cutting`, `party`, `site`, `catalog`, `estimate`, `job`, `financial`.
- **Do not change** `[color: …]` on groups.
- **Do not edit** [`current.dbdiagram`](./current.dbdiagram) for schema updates — canvas positions only; re-import `current.dbml` on dbdiagram instead.
- **Allowed edits in `current.dbml`:** table/column/index/ref/`Note` content.

## Tips

- **Table groups** color-code sections on dbdiagram.
- **Notes** on tables carry CHECK constraints, deferred slice context, and **column plans not yet in DDL** (e.g. `employee` HR fields, draft `party_user`) — not every detail is in column types.
- **Cross-cutting** tables (`note`, future `attachment`) live in `cross_cutting`, not under `party`.
- **Draft tables** (`party_user`, kind extensions) appear in `current.dbml` with `DRAFT` / `INTERIM` notes; migrations catch up at the identity or party-extension implementation gate.
- For AI: `@apps/subhub/docs/schema/current.dbml` plus active task and relevant [`decisions.md`](../decisions.md) blocks.

## Related docs

- [architecture.md](../architecture.md) — entity flow (cross-slice relationships)
- [tasks/17-schema-design-pass.md](../tasks/17-schema-design-pass.md) — schema pass (complete 2026-06-16)
- [tasks/18-site-migration.md](../tasks/18-site-migration.md) — first SQL batch after schema pass
