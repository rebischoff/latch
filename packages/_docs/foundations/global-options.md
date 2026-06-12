# Global options

Platform-wide configuration defaults. Exact storage (env, `<project>_config` table, or config file) is TBD; values below are **decided defaults** unless noted.

> **v1 vs deferred:** Rows marked **(v1)** ship in v1. Rows marked **(deferred)** are designed-for but not implemented in v1 � the engine has the seam, the option is not honored yet. See [`../scope.md`](./scope.md).

## Identity & deployment

| Option | Default | v1? | Notes |
|---|---|---|---|
| `deploymentModel` | `database_per_company` | (v1, single co) | One DB per company. **v1: single company.** Multi-company routing deferred. |
| `appHosting` | `vercel` | (v1) | Next.js on Vercel. |
| `localDatabase` | `neon` | (v1) | Hosted Postgres (Neon) for local dev, preview, and prod. Optional `docker-compose.yml` for offline use. See [`development.md`](./development.md). |

## Authorization

| Option | Default | v1? | Notes |
|---|---|---|---|
| `authzModel` | `rbac` | (v1) | Role-based. |
| `multiRoleCombine` | `union_grants` | (v1, single mode) | **v1 implements `union_grants` only.** Other modes designed but deferred. See [`access-control.md`](../../policy/docs/access-control.md). |
| `denyWins` | `true` | (v1) | Explicit `deny` overrides any allow. |
| `forbiddenFieldResponse` | `403` | (v1) | Platform default. Surfaces may override — see Decision below. |
| `auditDeniedAccess` | `false` | (v1) | When `true`, denied reads/writes log to audit. Recommended `true` for sensitive Surfaces. |

### Decision: per-Surface `forbiddenFieldResponse` override (2026-06-01)

**Choice:** Global default remains **`403`**. A Surface may set **`forbiddenFieldResponse: 404`** in its structure metadata (e.g. `customer_detail.surface.yaml`) when the whole Surface should use existence-hiding for principals with no grant (not only high-sensitivity Fields). Other Surfaces keep the platform default unless explicitly overridden.

**Phase 02 usage:** `customer_detail` uses **`404`** so `field_tech` (no binding) receives the same hide semantics as cross-tech job denial (S4). Explicit requests for forbidden Fields on that Surface also return **404**, not **403**.

**Rationale:** Locks the seam documented in [`access-control.md`](../../policy/docs/access-control.md) without changing the default for `job_detail` / `job_list`. See [`../phases/02-ui-sync/decisions.md`](../phases/02-ui-sync/decisions.md).

### `multiRoleCombine` modes

| Value | v1? | Behavior |
|---|---|---|
| `union_grants` | **v1** | Effective allow = union of all role grants. |
| `intersection_grants` | Deferred | Effective allow only if every assigned role grants it. |
| `most_restrictive` | Deferred | Per Field/action, take least privilege across roles. |
| `priority` | Deferred | Highest-priority role wins on conflicts. |

## Permissions & UI

| Option | Default | v1? | Notes |
|---|---|---|---|
| `manifestDelivery` | `rsc_props` | (v1) | Prefer manifest from Server Components. |
| `navManifestScope` | `minimal` | (v1) | Nav lists only routes the user may open. |
| `manifestCacheMode` | `request` | (v1) | CRM production default. Package supports `none` / `request` / `ttl`; `session` seam-only (throws or falls back to `request`). See Decision below. |
| `stalePolicyOnWrite` | `recheck` | (v1) | Re-resolve on every mutation; writes **never** use a cached read manifest. Client `policyVersion` → **409** strict mode deferred post–Phase 06. |

### Decision: `manifestCacheMode` (2026-06-03)

**Choice:**

| Mode | v1 behavior |
|------|-------------|
| `none` | Always call `PolicyService.resolve` (tests default unless case opts in) |
| `request` | **CRM production default** — cache per HTTP/RSC request |
| `ttl` | In-process LRU/TTL; cache key includes `policyVersion`; for future high-traffic surfaces |
| `session` | **Deferred** — seam exists; not productized until session store designed |

Cache stores **resolved `Manifest` only**; DAL narrowing and `PermissionContext` are unchanged. Distributed cache (Redis) is Phase 07+; v1 ships in-memory `ManifestCacheStore` only.

**CRM env:** `LATCH_MANIFEST_CACHE_MODE` — unset → `request` (production). Vitest sets `none` so resolve-count spies stay accurate unless a suite opts into `request`. See [`apps/crm/docs/CONFIG.md`](../../../apps/crm/docs/CONFIG.md).

**Rationale:** Phase 06 performance win without weakening mutation checks. Locked in [`../phases/06-performance-safety/decisions.md`](../phases/06-performance-safety/decisions.md).

### `policyVersion` (Phase 06)

| Topic | Choice |
|-------|--------|
| Storage | Single-row `latch_policy_version` (`version BIGINT NOT NULL`, default `1`) in company DB |
| Bump | `INSERT` / `DELETE` on `latch_user_roles`; optional manual bump when repo YAML policies change |
| On `Principal` | Included from DB read at session/request start (task **04**) |
| On `Manifest` | Optional `manifest.policyVersion` echo for future UI strict mode |
| Invalidation | TTL cache: entries with old version are misses; request cache dies with request |

Cache key: `(principalId, policyVersion, surfaceId, mode, entityId?)` — `mode` is required (`list` / `detail` / `create` resolve differently on the same surface).

## Approval

| Option | Default | v1? | Notes |
|---|---|---|---|
| `approvalGranularity` | `all_or_nothing` | (v1) | One pending record per submission. |
| `approvalAfterReject` | `resubmit_new_pending` | (v1) | New pending after reject; trail links versions. |
| `approvalReviewerScope` | `internal_only` | (v1) | External reviewers (customer sign-off) deferred. |

## Audit & compliance

| Option | Default | v1? | Notes |
|---|---|---|---|
| `auditImmutable` | `true` | (v1) | No UPDATE/DELETE on audit rows. |
| `auditRetentionYears` | `3` | (v1) | Default retention before archive/purge of audit partitions. **Runtime seam:** [`@latch/audit`](../../audit/src/config.ts) — `getAuditConfig().retentionYears` (default **3** via `DEFAULT_AUDIT_RETENTION_YEARS`). CRM may re-export from env later. |
| `auditPartitionBy` | `month` | (v1) | Partition audit table by `occurred_at` month. DDL sketch: [`audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md#retention), [`apps/crm/docs/DATABASE.md`](../../../apps/crm/docs/DATABASE.md#audit-retention-v1-seam). |
| `gdprErasureMode` | `off` | Deferred | `pseudonymize` optional later; legal hold overrides. |

## List operations

| Option | Default | v1? | Notes |
|---|---|---|---|
| `listDefaultPageSize` | `50` | (v1) | Default `limit` when omitted on collection reads. |
| `listMaxPageSize` | `200` | (v1) | Hard cap on `limit` per list request. Cursor pagination deferred. |

## Bulk operations

| Option | Default | v1? | Notes |
|---|---|---|---|
| `bulkDefaultMode` | `partial` | (v1) | `partial` reports per-row results; `all_or_nothing` available per call. |
| `bulkMaxBatch` | `500` | (v1) | Hard cap on ids per bulk request. |
| `bulkAsyncThreshold` | n/a | Deferred | Async background job for batches above cap. |

## Data layer

| Option | Default | v1? | Notes |
|---|---|---|---|
| `orm` | `none (sql-first)` | (v1) | **SQL-first (2026-06-11).** No runtime ORM. Single-table stores = codegen-emitted parameterized `pg` SQL; multi-table = hand-written `repository.ts`. Schema = SQL migration files. Drizzle retired as runtime engine (optional dev-only migration sketching). See [`scope.md`](./scope.md#decision-sql-first-persistence--retire-drizzle-as-runtime-orm-2026-06-11). |
| `rlsEnabled` | `false` | Deferred | RLS post-v1. v1 uses DAL-only enforcement. |
| `dbDriver` | `pg` | (v1) | Standard `pg` — the sole runtime DB engine. Move to `@neondatabase/serverless` only if pooling problems arise. |

## Metadata

| Option | Default | v1? | Notes |
|---|---|---|---|
| `surfaceStructureSource` | `repo_yaml` | (v1) | Surface + Field definitions in repo. |
| `policyBindingsSource` | `repo_yaml` | (v1) | Role ? Surface/Field policies in repo YAML. |

## Related docs

- [`access-control.md`](../../policy/docs/access-control.md)
- [`audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md)
- [`permissions-and-ui-sync.md`](../reference/permissions-and-ui-sync.md)
- [`bulk-operations.md`](../../dal/docs/bulk-operations.md)
- [`../development.md`](./development.md)
- [`../scope.md`](./scope.md)
- [`../open-questions.md`](./open-questions.md)
