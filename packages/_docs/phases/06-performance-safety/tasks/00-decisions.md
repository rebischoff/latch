# 00 — Lock Phase 06 Performance & safety decisions

> **Status:** Complete (2026-06-03). Next: [`04-policy-version.md`](./04-policy-version.md).

## Goal

Record manifest cache modes, `policyVersion` + invalidation, cache storage seam, the **RLS-deferred-to-Phase-07** decision, threat-test scope (T3/T5/T12), and Phase 07 boundary so tasks **04–21** do not re-debate them. **Docs only — do not add application code.**

## Prerequisites

- Phase 05 complete ([`../../05-verification/STATUS.md`](../../05-verification/STATUS.md)).
- Skim the [phase README](../README.md), [`../decisions.md`](../decisions.md), [`../../../discovery/postgres-rls-and-security.md`](../../../discovery/postgres-rls-and-security.md), and [`../../../foundations/global-options.md`](../../../foundations/global-options.md).

## Files (docs only — do not add application code)

| File | Action |
|------|--------|
| [`../decisions.md`](../decisions.md) | Open items → **Decided** table + Decision blocks |
| [`../../../foundations/global-options.md`](../../../foundations/global-options.md) | Add `manifestCacheMode` row + `policyVersion` notes |
| [`../../../reference/permissions-and-ui-sync.md`](../../../reference/permissions-and-ui-sync.md) | Cache + invalidation; optional `policyVersion` on manifest |
| [`../../../discovery/postgres-rls-and-security.md`](../../../discovery/postgres-rls-and-security.md) | Status line: spike/adoption **retargeted to Phase 07** (no Phase 06 spikes) |
| [`../../07-scale-out/README.md`](../../07-scale-out/README.md) | Add RLS spikes/adoption + audit triggers + Postgres job-store rows |
| [`../../../foundations/open-questions.md`](../../../foundations/open-questions.md) | `current_user` / superuser row → resolved by task **10** (T5) |
| [`../STATUS.md`](../STATUS.md) | After verify: **Execute now** → `04-policy-version.md` |

## Decisions to lock (copy into [`../decisions.md`](../decisions.md))

### 1. Manifest cache modes (v1)

| Mode | v1 behavior |
|------|-------------|
| `none` | Always call `PolicyService.resolve` (tests default unless case opts in) |
| `request` | **CRM production default** — cache per HTTP/RSC request (AsyncLocalStorage or explicit request bag) |
| `ttl` | In-process LRU/TTL map; key includes `policyVersion`; for future high-traffic surfaces |
| `session` | **Deferred** — seam exists; throws or falls back to `request` until session store designed |

**Invariant:** Cache stores **resolved `Manifest` only**. DAL narrowing, strict writes, and forbidden-field omission are unchanged. Cache never skips `PermissionContext`.

**Writes:** Always **bypass read cache** and call `resolve` fresh (`stalePolicyOnWrite: recheck` — already global). No cached manifest on `patch` / `delete` / `acceptPending` / bulk.

**Security tier:** v1 single tier — CRM uses `request`. Document how a future `securityTier` env maps mode (no multi-tier impl in Phase 06).

### 2. Cache key and invalidation

**Cache key:** `(principalId, policyVersion, surfaceId, mode, entityId?)` — `PolicyScope` carries `mode` (`list` / `detail` / `create`), so it **must** be in the key (a detail and create scope on the same surface resolve differently). `entityId` only when scope is entity-scoped (detail); list/create omit it.

**`policyVersion`:**

| Topic | Choice |
|-------|--------|
| Storage | Single-row table `latch_policy_version` (`version BIGINT NOT NULL`, default `1`) in company DB |
| Bump events | `INSERT` / `DELETE` on `latch_user_roles`; optional manual bump script when repo YAML policies change (document `npm run policy:bump` or migration note) |
| On principal | Include `policyVersion` on `Principal` (from DB read at session/request start) |
| On manifest | Optional `manifest.policyVersion` echo for UI strict mode later |
| Invalidation | Any bump invalidates all entries with old version in TTL cache; request cache dies with request |

**Distributed cache:** **Out of Phase 06** — define `ManifestCacheStore` interface (`get` / `set` / `deleteByVersion`); ship **in-memory** impl only.

### 3. Strict write `policyVersion` → 409

**Deferred past Phase 06.** v1 stays **403** on denied write after re-resolve. Document hook in `permissions-and-ui-sync.md` only.

### 4. Global options

Add to [`global-options.md`](../../../foundations/global-options.md):

| Option | Default | v1? |
|--------|---------|-----|
| `manifestCacheMode` | `request` | (v1) CRM; package supports `none` / `request` / `ttl` |
| `stalePolicyOnWrite` | `recheck` | (v1) unchanged |

### 5. Package seams

| Package | Seam |
|---------|------|
| `@latch/policy` | `CachingPolicyService` or `createManifestCache(policy, config)` wrapping `PolicyService.resolve` |
| `@latch/contracts` | `policyVersion?: number` on `Manifest` and `Principal` if not already present |
| `apps/crm` | Request-scoped cache in latch bootstrap ([`latch.ts`](../../../../../apps/crm/src/lib/latch.ts)); IAM assign/revoke bumps version |

### 6. RLS — deferred to Phase 07 (decision 2026-06-03)

**Choice:** **No RLS spikes or adoption in Phase 06.** RLS (spikes A/C/D, pilot adoption, business-table audit triggers) is **deferred to Phase 07**, where the Postgres job-store and multi-company work make it meaningful.

**Rationale (record in [`../decisions.md`](../decisions.md)):**

1. **Already-locked scope.** v1 is **DAL-only; RLS deferred** (2026-05-27, [`scope.md`](../../../foundations/scope.md), [`open-questions.md`](../../../foundations/open-questions.md)). Phase 06's README only ever scoped RLS as a *spike*, not adoption — pulling it out re-honors the locked decision.
2. **In-memory job store.** The pilot reads `jobs` / `assignments` from [`MemoryJobStore`](../../../../../apps/crm/src/lib/pilot-store.ts), not Postgres. RLS on those tables would protect data the app never `SELECT`s — testing it only proves Postgres works, not that the app is protected.
3. **Strongest case is multi-company (T9), which is Phase 07.** Single-company v1 row-ownership is expressed through the assignments join, so policy design is best done against the real PG query patterns that arrive with the Postgres store.

**What this means downstream:**

- `rlsEnabled` stays `false`; no RLS migrations in Phase 06.
- The discovery **Findings** table stays empty; its status line is retargeted to **Phase 07** (task **21**).
- The `SET LOCAL` actor-binding plumbing (§7) **is still landed now** so Phase 07 RLS can build on it.
- Phase 07 README must carry: RLS spikes A/C/D, pilot adoption, business-table audit triggers, and the Postgres job-store dependency.

**Never (any phase, v1 line):** per-Field RLS, generated per-role policies, column GRANT explosion (Spike B confirmed-defer reasoning stands).

### 7. DB session vars (**T12**)

**Choice:** Every **Postgres-backed** DAL transaction (or `withDb` helper) begins with:

```sql
SET LOCAL app.principal_id = '<id>';
SET LOCAL app.company_id = '<id>';  -- v1 constant single-company
```

**Reality check (scopes T12 + RLS):** The pilot **job store is in-memory** ([`MemoryJobStore`](../../../../../apps/crm/src/lib/pilot-store.ts)); only **audit**, **pending** (`latch_pending_changes`), and **IAM** (`latch_user_roles`) paths hit Postgres today. So:

- `SET LOCAL` + the **T12** alternating-actor test target the **real Postgres paths** (audit writer / pending store / IAM), not the memory-backed jobs path.
- RLS spikes (tasks **10–12**) prototype the **mechanism** against migrated tables (the `jobs` table exists), but production RLS gating of the app's *reads* is limited until a Postgres job store exists (Phase 07). The adopt decision (task **13**) must state this.

Middleware/test asserts vars do not carry across requests (rapid alternation test in task **17**).

### 8. App DB role (**T5**)

**Existing state:** `latch_app` (non-superuser, `NOINHERIT`) **already created in migration [`005_latch_app_role.sql`](../../../../../apps/crm/migrations/005_latch_app_role.sql)** (Phase 04), with CRUD grants on `latch_users`, `jobs`, `assignments`, `customers`, `sites`, `latch_user_roles` and `INSERT`-only on `latch_audit`. Migration [`006`](../../../../../apps/crm/migrations/006_latch_pending_changes.sql) already grants `SELECT/INSERT/UPDATE` on `latch_pending_changes`.

**Phase 06 choice:** **No new role.** Phase 06 (a) **extends grants** for tables added this phase (`latch_policy_version`, task **04**), (b) ensures CRM/CI actually connect **as** `latch_app` (not the Neon owner), and (c) adds the **T5** `current_user` assertion. **No `BYPASSRLS`.**

**Test convention (reuse existing):** DB-gated tests use **`LATCH_APP_DATABASE_URL`** (or `DATABASE_URL` containing `latch_app`) + `it.runIf(...)` + `pg` `Pool`, mirroring the T6 test in [`tests/threat.test.ts`](../../../../../tests/threat.test.ts). Do not invent a new harness.

### 9. Business-table audit triggers — deferred to Phase 07

| Topic | Choice |
|-------|--------|
| Phase 04 deferral | Unchanged — DAL `writeAudit` remains the v1 path |
| Phase 06 | **Not in scope** — paired with RLS Spike C, deferred to Phase 07 |
| Rationale | Triggers protect the direct-SQL bypass path, which is the same defense-in-depth story as RLS; do it once, with RLS, against the PG-backed store |

`latch_audit` immutability (T6) already shipped in Phase 04 and is unaffected.

### 10. Threat tests in scope

| Id | Phase 06 deliverable |
|----|----------------------|
| **T3** | Extend: cached read + revoked role → next **write** 403 after fresh resolve |
| **T5** | `current_user` = `latch_app`, non-superuser (integration when DB present) — **v1 CI minimum** |
| **T12** | Alternating actors on PG paths (audit/pending/IAM) → `actor_id` correct |
| **T9** | **Phase 07** (multi-company) — not in Phase 06 |

**Benchmark (not a threat id):** unit/micro test or script proving second `resolve` in same request hits cache (spy/mock counter).

### 11. Phase 07 boundary

| Item | Where |
|------|--------|
| **RLS spikes (A/C/D) + pilot adoption** | **Phase 07** (needs PG job store) |
| **Business-table audit triggers** | **Phase 07** (paired with RLS) |
| **Postgres-backed job store** (replaces `MemoryJobStore`) | **Phase 07** — prerequisite for meaningful RLS |
| Cross-company isolation (**T9**) | Phase 07 |
| Multi-company routing, Neon branches | Phase 07 |
| Redis / shared manifest cache | Phase 07+ |
| `session` cache mode productization | Post–06 |
| `policyVersion` client 409 strict mode | Post–06 |
| Per-Field RLS / Spike B views | Out of scope permanently for v1 |

### 12. CRM proof mapping

| Deliverable | CRM |
|-------------|-----|
| Cache | Transparent on existing job/customer reads — no new UI |
| `policyVersion` bump | IAM assign/revoke paths ([`apps/crm/src/lib/iam/`](../../../../../apps/crm/src/lib/iam)) |
| T5 / T12 | `latch_app` connection + `SET LOCAL` on audit/pending/IAM PG paths |
| RLS | None in Phase 06 — deferred to Phase 07 |
| E2E | Revoke role mid-session → write fails (task **20**) |

## Verify (stop gate)

- [x] No unchecked items in [`../decisions.md`](../decisions.md) **Open / to lock** section
- [x] Decision blocks in `decisions.md` match §1–§12 above
- [x] [`global-options.md`](../../../foundations/global-options.md) lists `manifestCacheMode`
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `04-policy-version.md`
- [x] No new files under `packages/*` or `apps/crm/src` from this task (docs-only)

## Out of scope

Migrations, cache impl, RLS DDL, triggers, and tests (tasks **04**+). Multi-company (Phase 07).
