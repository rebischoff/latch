# Phase 06 — decisions

> Locked in task [`tasks/00-decisions.md`](./tasks/00-decisions.md) (2026-06-03). Implementation tasks **04+** must not re-debate these.

## Open / to lock

_None — all items locked 2026-06-03._

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | RLS (v1) | Deferred; v1 enforcement DAL-only |
| 2026-05-27 | Stale manifest on write | `recheck` — re-resolve on every mutation |
| 2026-06-03 | **Manifest cache modes** | `none` / `request` / `ttl`; CRM default `request`; `session` seam-only |
| 2026-06-03 | **Cache invalidation** | Key `(principalId, policyVersion, surfaceId, mode, entityId?)`; in-memory store only |
| 2026-06-03 | **`policyVersion` storage** | `latch_policy_version` single-row; bump on IAM role change |
| 2026-06-03 | **Strict write `policyVersion` → 409** | Deferred post–Phase 06; v1 stays 403 after re-resolve |
| 2026-06-03 | **RLS in Phase 06** | **Deferred to Phase 07** |
| 2026-06-03 | **Business-table audit triggers** | **Deferred to Phase 07** — paired with RLS |
| 2026-06-03 | **Phase 06 scope** | Manifest cache + **T5** + **T12** on existing PG paths |
| 2026-06-03 | **T9 cross-company** | Phase 07 only |

### Decision: Manifest cache modes (2026-06-03)

**Choice:** v1 supports `none`, `request`, and `ttl`. **CRM production default:** `request` (per HTTP/RSC request via AsyncLocalStorage or explicit request bag). `session` is **seam-only** — throws or falls back to `request` until a session store is designed. Tests default to `none` unless a case opts in.

**Invariant:** Cache stores **resolved `Manifest` only**. DAL narrowing, strict writes, and forbidden-field omission are unchanged. Cache never skips `PermissionContext`.

**Writes:** Always **bypass read cache** and call `resolve` fresh (`stalePolicyOnWrite: recheck`). No cached manifest on `patch` / `delete` / `acceptPending` / bulk.

**Security tier:** v1 single tier — CRM uses `request`. Document how a future `securityTier` env could map mode; no multi-tier implementation in Phase 06.

**Rationale:** Cuts redundant policy work on read-heavy paths without weakening mutation checks. See [`../../foundations/global-options.md`](../../foundations/global-options.md), [`../../reference/permissions-and-ui-sync.md`](../../reference/permissions-and-ui-sync.md).

### Decision: Cache key and invalidation (2026-06-03)

**Choice:**

- **Cache key:** `(principalId, policyVersion, surfaceId, mode, entityId?)` — `PolicyScope.mode` (`list` / `detail` / `create`) is required because the same surface resolves differently per mode. `entityId` only for entity-scoped detail scopes; list/create omit it.
- **`policyVersion`:** Single-row table `latch_policy_version` (`version BIGINT NOT NULL`, default `1`) in the company DB. Bump on `INSERT` / `DELETE` on `latch_user_roles`; optional manual bump when repo YAML policies change (`npm run policy:bump` or migration note). Include `policyVersion` on `Principal` (DB read at session/request start). Optional `manifest.policyVersion` echo for future UI strict mode. Any bump invalidates TTL entries with the old version; request cache dies with the request.
- **Distributed cache:** **Out of Phase 06** — define `ManifestCacheStore` (`get` / `set` / `deleteByVersion`); ship **in-memory** impl only (Redis = Phase 07+).

**Rationale:** Version in the key makes revocation and IAM changes observable without trusting stale manifests. Mode in the key prevents list/detail/create collisions.

### Decision: Strict write `policyVersion` → 409 (2026-06-03)

**Choice:** **Deferred past Phase 06.** v1 stays **403** on denied write after fresh re-resolve. Document the future hook (client sends `policyVersion`; server returns **409** “reload”) in [`../../reference/permissions-and-ui-sync.md`](../../reference/permissions-and-ui-sync.md) only — no implementation in Phase 06.

**Rationale:** `stalePolicyOnWrite: recheck` already closes the security gap; 409 is UX polish for a later phase.

### Decision: Global options (2026-06-03)

**Choice:** Add `manifestCacheMode` (default `request` for CRM; package supports `none` / `request` / `ttl`). Keep `stalePolicyOnWrite: recheck` unchanged.

**Rationale:** Single config surface for apps and tests. See [`../../foundations/global-options.md`](../../foundations/global-options.md).

### Decision: Package seams (2026-06-03)

**Choice:**

| Package | Seam |
|---------|------|
| `@latch/policy` | `CachingPolicyService` or `createManifestCache(policy, config)` wrapping `PolicyService.resolve` |
| `@latch/contracts` | `policyVersion?: number` on `Manifest` and `Principal` |
| `apps/crm` | Request-scoped cache in latch bootstrap ([`latch.ts`](../../../apps/crm/src/lib/latch.ts)); IAM assign/revoke bumps version |

**Rationale:** Keeps cache logic in policy package; CRM wires request scope and IAM bumps.

### Decision: RLS deferred to Phase 07 (2026-06-03)

**Choice:** Phase 06 runs **no RLS spikes and no RLS adoption**. RLS (spikes A/C/D, pilot policies, business-table audit triggers) moves to **Phase 07**.

**Rationale:**

1. **Re-honors locked scope.** v1 is already **DAL-only; RLS deferred** (2026-05-27). Phase 06's README only ever scoped RLS as a *spike*, never adoption.
2. **In-memory job store.** The pilot reads `jobs` / `assignments` from [`MemoryJobStore`](../../../apps/crm/src/lib/pilot-store.ts); RLS on those tables would protect data the app never `SELECT`s. Meaningful RLS gating of app reads waits for a Postgres job store (Phase 07).
3. **Strongest case is multi-company (T9), which is Phase 07.** Single-company row-ownership runs through the assignments join; policy design is best done against real PG query patterns.

**What this means:**

- `rlsEnabled` stays `false`; no RLS migrations in Phase 06.
- Discovery **Findings** table stays empty; status retargeted to Phase 07.
- **`SET LOCAL` actor binding (T12) still lands in Phase 06** so Phase 07 RLS can build on it.
- Phase 07 README carries: RLS spikes A/C/D, pilot adoption, business-table audit triggers, Postgres job store.

**Never (any phase, v1 line):** per-Field RLS, generated per-role policies, column GRANT explosion (Spike B confirmed-defer).

See [`../../discovery/postgres-rls-and-security.md`](../../discovery/postgres-rls-and-security.md), [`../../phases/07-scale-out/README.md`](../07-scale-out/README.md).

### Decision: DB session vars — T12 (2026-06-03)

**Choice:** Every **Postgres-backed** DAL transaction (or `withDb` helper) begins with:

```sql
SET LOCAL app.principal_id = '<id>';
SET LOCAL app.company_id = '<id>';  -- v1 constant single-company
```

**Reality check:** The pilot **job store is in-memory**; only **audit**, **pending** (`latch_pending_changes`), and **IAM** (`latch_user_roles`) hit Postgres today. T12 alternating-actor tests target those paths, not memory-backed jobs. RLS prototypes in Phase 07 may use migrated `jobs` DDL, but production RLS gating of app reads is limited until the Postgres job store exists.

Middleware/tests assert vars do not carry across requests (task **17**).

**Rationale:** Establishes the actor-binding seam now on real PG paths; avoids pretending RLS protects data the app never reads.

### Decision: App DB role — T5 (2026-06-03)

**Choice:** **No new role.** `latch_app` already exists ([`005_latch_app_role.sql`](../../../apps/crm/migrations/005_latch_app_role.sql)); [`006`](../../../apps/crm/migrations/006_latch_pending_changes.sql) grants pending table access. Phase 06 (a) **extends grants** for new tables (`latch_policy_version`, task **04**), (b) ensures CRM/CI connect **as** `latch_app` (not Neon owner), (c) adds **T5** `current_user` assertion. **No `BYPASSRLS`.**

**Test convention:** DB-gated tests use **`LATCH_APP_DATABASE_URL`** (or `DATABASE_URL` containing `latch_app`) + `it.runIf(...)` + `pg` `Pool`, mirroring T6 in [`tests/threat.test.ts`](../../../tests/threat.test.ts).

**Rationale:** Reuses Phase 04 role; Phase 06 proves runtime connection discipline, not a new migration story.

### Decision: Business-table audit triggers (2026-06-03)

**Choice:** **Not in Phase 06** — deferred to Phase 07, paired with RLS (same direct-SQL-bypass defense-in-depth story). Phase 04 deferral unchanged: DAL `writeAudit` remains the v1 path. `latch_audit` immutability (T6) is unaffected.

**Rationale:** Do triggers once, with RLS, against the PG-backed store.

### Decision: Threat tests in Phase 06 (2026-06-03)

| Id | Phase 06 deliverable |
|----|----------------------|
| **T3** | Cached read + revoked role → next **write** 403 after fresh resolve |
| **T5** | `current_user` = `latch_app`, non-superuser — **v1 CI minimum** when DB present |
| **T12** | Alternating actors on PG paths (audit/pending/IAM) → `actor_id` correct |
| **T9** | **Phase 07** (multi-company) |

**Benchmark (not a threat id):** unit/micro test or script proving second `resolve` in same request hits cache (spy/mock counter).

### Decision: Phase 07 boundary (2026-06-03)

| Item | Where |
|------|--------|
| RLS spikes (A/C/D) + pilot adoption | Phase 07 (needs PG job store) |
| Business-table audit triggers | Phase 07 (paired with RLS) |
| Postgres-backed job store (replaces `MemoryJobStore`) | Phase 07 — prerequisite for meaningful RLS |
| Cross-company isolation (T9) | Phase 07 |
| Multi-company routing, Neon branches | Phase 07 |
| Redis / shared manifest cache | Phase 07+ |
| `session` cache mode productization | Post–06 |
| `policyVersion` client 409 strict mode | Post–06 |
| Per-Field RLS / Spike B views | Out of scope permanently for v1 |

### Decision: CRM proof mapping (2026-06-03)

| Deliverable | CRM |
|-------------|-----|
| Cache | Transparent on existing job/customer reads — no new UI |
| `policyVersion` bump | IAM assign/revoke ([`apps/crm/src/lib/iam/`](../../../apps/crm/src/lib/iam/)) |
| T5 / T12 | `latch_app` connection + `SET LOCAL` on audit/pending/IAM PG paths |
| RLS | None in Phase 06 |
| E2E | Revoke role mid-session → write fails (task **20**) |
