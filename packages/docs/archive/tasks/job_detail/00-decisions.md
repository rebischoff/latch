# 00 — Lock Step 3 decisions

## Goal

Record pilot defaults for D3–D5 and document the D2 **stub-principal** strategy so later tasks do not block on auth vendor choice.

## Prerequisites

None. This is the first executable task.

## Files (docs only — do not add application code)

| File | Action |
|------|--------|
| [`../../open-questions.md`](../../../foundations/open-questions.md) | Move D3–D5 to Resolved; note D2 stub in Active |
| [`../../architecture/access-control.md`](../../../reference/access-control.md) | Add Decision: Step 3 pilot Surface |
| [`../../architecture/access-control.md`](../../../reference/access-control.md) | Confirm Decision: `union_grants` v1 |
| [`15-stub-principal.md`](./15-stub-principal.md) | Add **Strategy** section (env vars, seed user ids) |
| [`../../../STATUS.md`](../../../../STATUS.md) | After verify: point **Execute now** at `02-contracts.md` |

## Steps

1. **D3** — Confirm pilot Surface id is `job_detail` (see [`../../use-cases.md`](../../../foundations/use-cases.md) S1/S3/S4).
2. **D4** — Confirm v1 implements **`union_grants` only** with global **`denyWins: true`** ([`../../architecture/access-control.md`](../../../reference/access-control.md)).
3. **D5** — Confirm **RLS deferred**; v1 enforcement is DAL-only ([`../../scope.md`](../../../foundations/scope.md)).
4. **D2 (stub)** — In task 15, document (do not implement yet):
   - `LATCH_STUB_USER` / `LATCH_STUB_ROLE` env vars
   - Seed roles: `field_tech`, `office_admin`
   - Real IdP choice remains open in `open-questions.md`
5. Add dated **Decision** block in `access-control.md` for pilot Surface (2026-05-28).
6. Update `open-questions.md` Resolved table with D3, D4, D5 rows.
7. Update [`STATUS.md`](../../../../STATUS.md) → next task: **02-contracts.md**.

## Verify (stop gate)

- [x] D3, D4, D5 appear in `open-questions.md` Resolved table with links
- [x] Decision block for `job_detail` pilot exists in `access-control.md`
- [x] Task 15 documents stub strategy (no `getPrincipal.ts` required yet)
- [x] `STATUS.md` **Execute now** → `02-contracts.md`
- [x] No new files under `packages/*` or `apps/web/src` from this task

## Out of scope

- Implementing `getPrincipal` (task **15**)
- Choosing Clerk / NextAuth / custom JWT
