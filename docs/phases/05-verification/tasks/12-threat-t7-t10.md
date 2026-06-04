# 12 — Threat tests T7 + T10

> **Status:** Complete (2026-06-03). Next: [20-e2e-verification.md](./20-e2e-verification.md).

## Goal

Add CI coverage for **T7** (pending tampering / terminal immutability) and **T10** (approval bypass). Extend **T3** to reject/withdraw re-resolve paths.

## Prerequisites

- [08-accept-reject-withdraw.md](./08-accept-reject-withdraw.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | T7, T10 cases |
| [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) | Mark controls tested when green |

## Steps

1. **T7:** After accept, attempt second resolve / withdraw → 409 or NotFound.
2. **T10:** Bypass path writing `contract_amount` without accept → forbidden.
3. **T3:** Re-resolve without `approve` → reject/accept 403 (mirror existing accept test).

> **CI:** Keep T7/T10 **DAL-only / memory store** (no Postgres dependency) so they run in the default `npm run test` without `DATABASE_URL` and don't make CI flaky — matches the DAL-only T7 decision. These are **additions** to the suite (T7/T10 are not in the v1 CI-minimum list T1/T2/T3/T5/T6/T11/T13/T15), so confirm they pass unconditionally.

## Verify (stop gate)

- [x] `npm run test` — threat suite green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `20-e2e-verification.md`

## Out of scope

Postgres trigger T7 (DAL-only per decisions).
