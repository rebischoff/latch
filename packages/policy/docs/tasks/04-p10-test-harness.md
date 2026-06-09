# 04 — P10 test harness (post-`apps/crm` deletion)

> **Status:** Complete (2026-06-08). Next: [Policy console UI](../../../../apps/spike_policy/docs/tasks/README.md). **Decision:** [P10](./00-decisions-needed.md#p10--test-harness-after-appscrm-deletion).

## Goal

**Lock P10** and restore a runnable threat/e2e harness for IAM + policy assertions after `apps/crm` was removed — without blocking on the full business-app template ([discussion 07](../../../../docs/discussions/07-template-scaffold.md)).

## Locked choice (P10 — 2026-06-08)

| Layer | Choice |
|-------|--------|
| **Fixture** | `apps/spike_policy` — platform migrations, `spikePolicyRegistry`, `spike_codegen` vocabulary |
| **Package unit tests** | Keep pure `PolicyService` / validate-grant tests in `packages/policy/src/*.test.ts` |
| **Integration / threat** | **Option A** — `apps/spike_policy/**/*.test.ts` only; root `tests/` deferred to discussion 07 |
| **HTTP T8** | DAL-level in P10; HTTP when spike UI shell lands |
| **Template** | Full parity harness graduates with discussion 07 — out of scope |

## Delivered

- `user_roles_detail` surface vocabulary + `userRolesDetailSurfacePolicyDef` in spike registry
- `lib/iam-user/` — assignment DAL (P4a/P4b validation), memory fixture, [`threat-t8.test.ts`](../../../../apps/spike_policy/lib/iam-user/threat-t8.test.ts)
- Root [`tests/`](../../../../tests/) documented as orphaned (CRM-coupled); not in `npm test`

## Verify (stop gate)

- [x] P10 decision locked in parking lot + dated Decision block
- [x] `npm test` runs the threat/IAM assertions (no `@latch/crm` imports in active harness)
- [x] T8 positive + deny paths covered (DAL)
- [x] CI (`npm run test`) includes the harness without manual flags
- [x] [`packages/policy/docs/tasks/README.md`](./README.md) repoints to UI spike

## Reference

- [P10 parking lot](./00-decisions-needed.md#p10--test-harness-after-appscrm-deletion)
- Phase 03 T8: [`docs/phases/03-identity-iam/tasks/21-threat-t8-phase-dod.md`](../../../../docs/phases/03-identity-iam/tasks/21-threat-t8-phase-dod.md)
- Spike fixture: [`apps/spike_policy/README.md`](../../../../apps/spike_policy/README.md)
- UI follow-on: [`apps/spike_policy/docs/tasks/README.md`](../../../../apps/spike_policy/docs/tasks/README.md)
