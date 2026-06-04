# CRM — platform config (env)

Latch global options for the CRM app are read at bootstrap from environment variables. Canonical defaults: [`docs/foundations/global-options.md`](../../../docs/foundations/global-options.md).

## Per-app environment files

Each runnable app in the monorepo owns its **own** env files under `apps/<app>/`. They are **not** shared at the repo root.

| File | Committed? | Purpose |
|------|------------|---------|
| `apps/crm/.env.example` | Yes | Template; copy to `.env.local` |
| `apps/crm/.env.local` | **No** (gitignored) | Local secrets and `DATABASE_URL` for this app only |

**Why separate files matter**

- **Different databases** — CRM and test1 use separate Neon projects/branches; each app’s `DATABASE_URL` must not overwrite the other’s.
- **Different auth** — CRM uses Auth.js (`AUTH_SECRET`, `CRM_DEV_PASSWORD`); test1 uses Better Auth (`BETTER_AUTH_*`) on port **3003**. Mixing vars in one root `.env` causes wrong-app logins or migrate scripts targeting the wrong DB.
- **Tooling paths** — `scripts/db-migrate.mjs` reads `apps/crm/.env.local` by design; test1 will get `db:migrate:test1` reading `apps/test1/.env.local` (task **05**).
- **Deploy** — Vercel (or similar) sets env per project; one app per deployment matches one env namespace.

Next.js loads `.env*` from the **app directory** when you run `npm -w apps/crm run dev` (or `dev:test1` for test1). No implementation is required in CRM when adding test1; keep CRM vars in `apps/crm/` only.

test1 env matrix: [`../../test1/docs/CONFIG.md`](../../test1/docs/CONFIG.md).

## Manifest cache (`manifestCacheMode`)

| Env | Global option | Default (CRM prod) | Vitest default |
|-----|---------------|----------------------|----------------|
| `LATCH_MANIFEST_CACHE_MODE` | `manifestCacheMode` | `request` | `none` (see root `vitest.config.ts`) |

**Modes**

| Value | When to use |
|-------|-------------|
| `request` | **Production / dev** — one cached manifest per HTTP/RSC request (see `resolveContext` in `src/lib/latch.ts`). |
| `none` | Debugging policy, or tests that count `PolicyService.resolve` calls. |
| `ttl` | In-process TTL cache (requires `ttlMs` in code if wired later; not set via env in v1). |
| `session` | **Unsupported** — constructor throws; use `request`. |

**Examples**

```bash
# Dev: disable cache to compare resolve output
LATCH_MANIFEST_CACHE_MODE=none npm run dev --workspace=apps/crm

# Explicit production default (optional; omit env for same behavior)
LATCH_MANIFEST_CACHE_MODE=request
```

Reads are cached; **mutations always bypass** the read cache (`resolveContextFresh` / `bypassCache`, global `stalePolicyOnWrite: recheck`).

Implementation: `getManifestCacheMode()` in `src/lib/latch-config.ts`; parsing/validation in `@latch/policy` (`parseManifestCacheMode`).

## Expected cache hit rate (`request` mode)

This is a **narrative** for operators, not a load test. With production default `request`, each HTTP/RSC request gets one in-memory `Map` (see `manifest-request-scope.ts`).

| Pattern | Inner `PolicyService.resolve` calls |
|---------|-------------------------------------|
| First `resolveContext` for a given `(principal, policyVersion, surface, mode, entityId?)` | 1 (miss) |
| Second+ `resolveContext` with the **same** cache key in the same request | 0 additional (hit) |
| Another Surface or `entityId` in the same request | 1 per distinct key (miss) |
| `resolveContextFresh` / mutation | Always 1 (bypasses read cache) |

Typical CRM pages: **one manifest per Surface per request** unless a route or server action calls `resolveContext` twice for the same scope (e.g. list loader + action) — then the second call should be a hit. Duplicate reads of `job_list` or the same `job_detail` entity in one request should show **~50%** resolve reduction (2 reads → 1 inner call); pages that only resolve once see no savings but pay negligible Map overhead.

**Benchmark / regression:** `npm run test -- -t "Phase 06"` — `@latch/policy` + CRM spy tests (call count only; no CI timing threshold). Optional local timing: `LATCH_MANIFEST_CACHE_BENCHMARK_LOG=1 npm run test -- -t "Phase 06"`.
