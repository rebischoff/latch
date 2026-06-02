# 04 — Database schema and seed (customers)

## Goal

Add `customers`, `sites`, and `jobs.customer_id` per the locked [`customer_detail` sketch](../decisions.md#decision-customer_detail-surface-sketch-2026-06-01); extend seed + memory store so tasks 06+ have stable ids for manual QA and tests.

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete (verify gate passed).
- Phase 01 complete ([`../../01-data-access/STATUS.md`](../../01-data-access/STATUS.md)).
- **[Phase 02b platform extraction](../../02b-platform-extraction/STATUS.md) complete** — the jobs domain now lives in `apps/crm` on the generic `@latch/dal` kernel. Customer schema lands **in `apps/crm`**, not `@latch/dal`.

> **Retargeted (2026-06-01):** originally this task put `customers`/`sites` in `packages/dal`. After Phase 02b, `@latch/*` are domain-agnostic; all consumer schema/seed/store/migrations live in `apps/crm`. File paths below reflect that.

## Files

| File | Action |
|------|--------|
| `apps/crm/db/schema.ts` | `customers`, `sites`; `jobs.customerId` FK |
| `apps/crm/migrations/` | New migration DDL (increment from relocated `001_init.sql`) |
| `apps/crm/db/seed.ts` | `SEED_CUSTOMER_*` constants; seed customers/sites; set `customer_id` on pilot jobs |
| `apps/crm/db/store.ts` | Hold customers/sites; wire jobs to `customer_id` |
| `apps/crm/src/lib/latch.ts` | Extend the `customer` Surface descriptor wiring as needed |

## Steps

1. **`customers`** — `id`, `name`, `phone`, `billing_notes` (text).
2. **`sites`** — `id`, `customer_id` → `customers.id`, `label`.
3. **`jobs.customer_id`** — NOT NULL for seeded jobs; FK → `customers.id`.
4. **Seed** — Two customers aligned with existing pilot job display names (e.g. Acme / Oak); at least one site per customer; assign each seed job to the matching customer.
5. **Store** — Mirror schema shapes in the `apps/crm` store; `seedPilotJobs` (or companion `seedPilotCustomers`) populates it for tests without Postgres.
6. Document seed customer ids in this file's **Verify** section for CRM manual paste (`/customers?id=`).

## Verify (stop gate)

- [ ] `npm run build` passes (`apps/crm` schema + seed constants compile)
- [ ] `apps/crm` store seed includes 2 customers, sites, and jobs with `customer_id`
- [ ] Migration SQL valid; documented apply command if Postgres path used
- [ ] Seed customer ids listed below for QA:
  - `SEED_CUSTOMER_*` = _(fill on complete)_
- [ ] [`../STATUS.md`](../STATUS.md) **Execute now** → `06-surface-yaml.md`

## Out of scope

- `customer_detail.surface.yaml` / policies (task **06**)
- DAL `get`/`patch`, API routes, CRM UI
