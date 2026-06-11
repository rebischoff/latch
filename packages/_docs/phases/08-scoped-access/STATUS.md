# STATUS — Phase 08 Scoped access

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../../STATUS.md).
> Updated: 2026-06-10 (phase closed).

- **Home packages:** `@latch/contracts`, `@latch/policy`, `@latch/dal`, `apps/spike_business` (task 04)
- **State:** **complete** (2026-06-10) — scoped RLS + delegation; policy task 05 closed

## Right now — do this next

Phase closed. No scheduled active phase. Pull [Phase 07 Scale-out](../07-scale-out/STATUS.md) when a driver appears (second company, second app, or external package consumer).

## Blockers

None.

## Recently completed

- **2026-06-10** — Task **21** — Phase DoD: `npm run test` + `codegen:check` green; README DoD + platform-status updated; root STATUS repointed (Phase 07 deferred).
- **2026-06-10** — Task **05** — Platform regression: `loadPrincipalFromDb` strips system-class scopes; manifest cache `scopeIds` regression; policy task 05 + 05c closed.
- **2026-06-10** — Task **04** — `apps/spike_business` harness: `widgets.scope_id` migration + seed; store adapter + `scoped-visibility.test.ts` (scope / own / all).
- **2026-06-10** — Task **03** / dal **01** — DAL kernel + `StoreAdapter` honor `rowScope === "scope"` via `manifest.scopeIds` on list/get/bulk.
- **2026-06-10** — Task **02** / policy **05b** — `PolicyService.resolve` sets `manifest.scopeIds` from scoped bindings; spike workaround removed.
- **2026-06-09** — Policy task 05 **Phase A** (contracts + DDL seam + `getPrincipal` bindings).
- **2026-06-09** — Policy task 05 **Phase C** — scoped delegation proven in `apps/spike_policy` task 08.
- **2026-06-10** — Phase 08 folder + task chain + package task splits (`05b`, `05c`, dal `01`).

## Package pointers

| Package | Task doc | State |
|---------|----------|-------|
| `@latch/policy` | [`05b-scoped-rls-resolve`](../../../policy/docs/tasks/05b-scoped-rls-resolve.md) | complete |
| `@latch/dal` | [`01-scoped-row-filter`](../../../dal/docs/tasks/01-scoped-row-filter.md) | complete |
| `@latch/policy` closeout | [`05c-policy-closeout`](../../../policy/docs/tasks/05c-policy-closeout.md) | complete |
