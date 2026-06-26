# 27 — Create route retrofit (`/new` + DB-assigned id)

> **Status:** Pending (2026-06-25). **Next:** [Step 1 — Shared plumbing](#shared-plumbing) (task 26 stop gate complete).
>
> **Decision:** [Surface create route — `/new` + DB-assigned id](../decisions/general.md#decision-surface-create-route--new--db-assigned-id-2026-06-25)

## Goal

Migrate shipped list+detail Surfaces from **`/[id]?create=1`** + **client `crypto.randomUUID()`** to canonical **`<surface>/new`** with **DB-assigned** primary keys on POST.

## Surfaces to migrate

| Surface | Current | Target |
|---------|---------|--------|
| Parts | `/parts/[uuid]?create=1` | `/parts/new` |
| Manufacturers | `/manufacturers/[uuid]?create=1` | `/manufacturers/new` |
| Sites | `/sites/[uuid]?create=1` | `/sites/new` |
| Jobs | `/jobs/[uuid]?create=1` | `/jobs/new` |
| Estimates | `/estimates/[uuid]?create=1` | `/estimates/new` |

## Shared plumbing

| Area | Change |
|------|--------|
| `lib/nav-routes.ts` | `.new` route per surface |
| `lib/picker-return-context.ts` | `buildPickerCreateUrl` → `<target>/new` (no `createId`; drop `create=1` where route implies create) |
| `prefetchSurfaceCreate` | `entityId: "new"` sentinel |
| API POST handlers | Stop accepting client `id` as PK (or ignore) |
| Picker return tests | Update URLs in `picker-return-context.test.ts` |

## Out of scope

- IAM roles — ships on new convention in [task 26](./26-iam-role-crud.md)
- Inline child row temp ids — unchanged (vendor pricing, estimate lines, etc.)

## Verify (stop gate)

- [ ] Each surface: list **New** → `/…/new` → Save → `/…/[db-id]`
- [ ] Part → add manufacturer picker → `/manufacturers/new` → return with `selectedId` from POST response
- [ ] No remaining list toolbar uses `crypto.randomUUID()` for create navigation
- [ ] `npm run test` — picker-return tests green
