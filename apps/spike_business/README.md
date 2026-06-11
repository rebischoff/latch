# `apps/spike_business` — scoped row-filter consumer proof

Disposable harness for [Phase 08 task 04](../../packages/_docs/phases/08-scoped-access/tasks/04-crm-scoped-proof.md). Proves **business-table** `scope_id` filtering through `createSurfaceDal` + `PolicyService.resolve` → `manifest.scopeIds`.

Policy-only proof stays in [`apps/spike_policy`](../spike_policy); this app owns the **consumer half** (DDL, store adapter, DAL wiring, vitest).

## Surfaces

| Surface | Table | Purpose |
|---------|-------|---------|
| `widget_list` | `widgets` | List mode + scoped row filter |
| `widget_detail` | `widgets` | Get mode + `branch_scope` field projection |

Codegen: `npm run codegen -w @latch/spike-business`

## Dev server (port 3002)

```bash
npm run dev:business
# or: npm run dev -w @latch/spike-business
```

Opens [http://localhost:3002](http://localhost:3002). Policy console remains on port 3001 (`npm run dev`).

## Migrate

Uses the same platform spine as `spike_policy` (`001`–`010`) plus `011_widgets.sql` and fixture `900_fixture_scoped_widgets.sql`.

```bash
cp apps/spike_business/.env.local.example apps/spike_business/.env.local   # first time
node scripts/db-migrate.mjs --app=spike_business --check
node scripts/db-migrate.mjs --app=spike_business
```

## Test

```bash
npm run test -w @latch/spike-business
# or from repo root (includes apps/**/*.test.ts):
npm run test
```

Primary proof: [`lib/widget/scoped-visibility.test.ts`](./lib/widget/scoped-visibility.test.ts) — scoped list, cross-scope get (404), `own` / `all` regression.

## Fixture personas (900 migration)

| User | Role | Scope | Sees |
|------|------|-------|------|
| `branch-a-sales` | Branch sales | Branch A | Widget A only |
| `company-sales` | Company sales | — (all) | Both widgets |
| `widget-owner-a` | Widget owner | — (own) | Widget A (assignment) |
