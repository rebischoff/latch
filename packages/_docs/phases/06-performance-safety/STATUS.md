# STATUS — Phase 06 Performance & safety

> Phase-local quarterback. Global pointer: [`STATUS.md`](../../../../STATUS.md).
> Updated: 2026-06-03.

- **Home packages:** `@latch/policy`, `@latch/dal`, `@latch/audit`
- **State:** **complete** (2026-06-03)

## Right now — do this next

Phase closed. [Phase 08 Scoped access](../08-scoped-access/STATUS.md) complete (2026-06-10). Pull [Phase 07 Scale-out](../07-scale-out/STATUS.md) when a driver appears (**deferred**).

## Blockers

- None.

## Recently completed

- **2026-06-03** — **21-phase-dod** — README DoD signed off; `npm run test` / `build` / `codegen:check` green; discovery + Phase 07 README confirmed RLS/audit-trigger/PG job-store rows; root STATUS repointed to Phase 07 (deferred).
- **2026-06-03** — **20-e2e-performance-safety** — `tests/performance-safety.e2e.test.ts` (request-scoped cache hit count, field_tech revoke + fresh PATCH denied, office_admin revoke + delete 403, policyVersion bump); `bumpPolicyVersionForPrincipal` in CRM test-utils.
- **2026-06-03** — **11-threat-t12-session** — `withPermissionDb` in `@latch/audit`; audit/pending/IAM PG paths bind `app.principal_id` + constant `app.company_id`; T12 alternating-actor test in `tests/threat.test.ts`; unit test in `permission-db.test.ts`.
- **2026-06-03** — **09-benchmark-cache** — `manifest cache benchmark (Phase 06 DoD)` in `@latch/policy`; CRM `latch.test.ts` regression; hit-rate narrative + benchmark command in `apps/crm/docs/CONFIG.md`; README DoD link.
- **2026-06-03** — **08-cache-correctness-t3** — T3 read-cache scenarios in `tests/threat.test.ts`; TTL/`deleteByVersion` tests in `@latch/policy`; `revokeRoleForUser` test-utils helper; mutation source guard `mutation-manifest-resolve.test.ts`; threat-model T3 documents cache + recheck.
- **2026-06-03** — **07-global-options** — `LATCH_MANIFEST_CACHE_MODE` + `getManifestCacheMode()`; `parseManifestCacheMode` in `@latch/policy`; Vitest default `none`; operator doc [`apps/crm/docs/CONFIG.md`](../../../../../apps/crm/docs/CONFIG.md).
- **2026-06-03** — **06-request-cache-wiring** — CRM `resolveContext` uses `CachingPolicyService` (`request` mode) with React `cache()` + per-request `Map`; `resolveContextFresh` / `bypassCache` on mutations; `latch.test.ts` hit/miss spy.
- **2026-06-03** — **05-manifest-cache-seam** — `CachingPolicyService` / `createCachingPolicyService` in `@latch/policy`; `ManifestCacheStore`, TTL + Map adapters; cache key includes `policyVersion` + `mode`; unit tests (hit/miss, version bump, `bypassCache`).
- **2026-06-03** — **04-policy-version** — `latch_policy_version` migration + `latch_app` grants; `bumpPolicyVersion` on IAM role patch; `Principal.policyVersion` in `getPrincipal`; DB-gated tests.
- **2026-06-03** — **00-decisions** — manifest cache modes, `policyVersion`/invalidation, RLS→Phase 07, T3/T5/T12 scope, Phase 07 boundary (docs only).
- **2026-06-03** — RLS deferred to Phase 07; phase trimmed to cache + T5/T12 (chain `00`,`04`–`09`,`10`,`11`,`20`,`21`).
- **2026-06-03** — Phase 06 task outline + executability review.
