# STATUS — Phase 05 Verification

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-03.

- **Home package:** `@latch/approval`
- **State:** **complete** (2026-06-03)

## Right now — do this next

Phase closed. Next active phase: [Phase 06 Performance & safety](../06-performance-safety/STATUS.md).

## Blockers

- None.

## Recently completed

- **2026-06-03:** Task **21** — Phase DoD: README checklist signed off; `npm run test` / `build` / `codegen:check` green; root STATUS repointed to Phase 06; build fixes (`RhfTextArea` props, `seedBulkJobs` `description`).
- **2026-06-03:** Task **20** — `tests/verification.e2e.test.ts`: tech submit → accept (live + `approve` audit); reject on second job (live unchanged + `reject` audit); bulk two-row pending with shared `batch_id`; test-utils `pendingStore`, `seedBulkJobs`, `resolveFieldTechJobListCtx`.
- **2026-06-03:** Task **12** — Threat **T7** (post-accept accept/reject/withdraw → NotFound), **T10** (submit-only → pending; no store → 403); extended **T3** for reject/withdraw re-resolve in `tests/threat.test.ts`.
- **2026-06-03:** Task **10** — `/api/pending` (per-entity list) + accept/reject/withdraw routes; `job_detail` lookup-before-resolve; integration tests in `tests/pending-api.test.ts`.
- **2026-06-03:** Task **09** — `bulkUpdate` threads `pendingStore`; verification Fields → per-row pending + shared `batch_id`; `field_tech` `submit` on `job_list` `financial_terms`; open-pending row → `forbidden_row` skip.
- **2026-06-03:** Task **08** — `rejectPending` / `withdrawPending` on Surface DAL; accept ordering (resolve → live → audit); withdraw skips audit; reject always audits.
- **2026-06-03:** Task **07** — `createPostgresPendingStore()` in `@latch/approval`; async `PendingStore`; CRM `latch.ts` selects Postgres when `DATABASE_URL` set; optional restart smoke test.
- **2026-06-03:** Task **06** — Generic `verificationFieldIds` routing in `createSurfaceDal`; T10 guard; pilot `pendingWrite` removed; duplicate submit → `ConflictError`.
- **2026-06-03:** Task **05** — `requires_verification` on `financial_terms`; codegen emits `JobDetailVerificationFieldIds`; documented in [`metadata-and-codegen.md`](../../reference/metadata-and-codegen.md).
- **2026-06-03:** Task **04** — `006_latch_pending_changes.sql` (partial unique on open `submitted`, status CHECK, `supersedes_id` FK, `latch_app` SELECT/INSERT/UPDATE); `DATABASE.md` § `latch_pending_changes`.
- **2026-06-03:** Readiness review — patched tasks **05** (codegen type/emit), **08** (ordering, not atomicity, vs `MemoryJobStore`), **09** (bulk `pendingStore` threading + `job_list` `submit` policy blocker), **10** (pending id → surface/entity context-resolution flow), **12** (T7/T10 DAL-only CI); README sub-goals/scope reworded.
- **2026-06-02:** Task **01** — Phase task index (execution order 04 → 21).
- **2026-06-02:** Task **00** — Locked UX, hybrid gating, schema, bulk DoD, T7/T10 scope, Phase 06 boundary; updated [`decisions.md`](./decisions.md) + [`approval-trails.md`](../../reference/approval-trails.md).

## Baseline (pre–task 04)

Minimal all-or-nothing approval on `financial_terms` exists in memory (`@latch/approval` + `acceptPending`); not metadata-driven or persisted.
