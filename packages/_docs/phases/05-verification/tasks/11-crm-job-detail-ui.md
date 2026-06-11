# 11 — CRM `job_detail` verification UI

> **Status:** Complete (2026-06-03). Next: [`12-threat-t7-t10.md`](./12-threat-t7-t10.md).

## Goal

**Minimal job detail UX (option B):** field_tech can **submit** `financial_terms` changes; office_admin sees **Accept / Reject** for open pending on that job. Implement **role-split visibility (D)** in projection/DTO.

## Prerequisites

- [10-api-routes.md](./10-api-routes.md) complete (or Server Actions calling DAL directly).

## Files

| File | Action |
|------|--------|
| `apps/crm/src/components/jobs/JobDetailPane.tsx` | `submit` in `buildPatch`; pending display; reviewer actions |
| `apps/crm/src/app/actions/job-detail.ts` | `acceptPending`, `rejectPending`, `withdrawPending` actions |
| `apps/crm/src/lib/jobs/project.ts` | Pending overlay for submitter/reviewer only |

## Steps

1. Fix `buildPatch`: include `financial_terms` when `submit` granted (not only `write`).
2. Show proposed amount to submitter; show accept/reject strip to reviewer (`approve`).
3. Do not leak pending to principals without `submit`/`approve` on Field.

## Verify (stop gate)

- [x] Manual QA: login as field_tech → propose amount → live unchanged
- [x] Login as office_admin → accept → live updated
- [x] Reject path updates UI state
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `12-threat-t7-t10.md`

## Out of scope

`/pending` inbox. `job_list` bulk UI (API/tests sufficient).
