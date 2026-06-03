# 14 — Auth provider (Auth.js / D2)

> **Status:** Complete (2026-06-02). Next: [15-crm-session-migration.md](./15-crm-session-migration.md).

## Goal

Resolve **D2**: install and wire the chosen auth provider in `apps/crm` so production authn is provider-based while local dev can use Credentials against seed users. **Proposed choice (lock in task 00): Auth.js (NextAuth v5).**

## Prerequisites

[13-api-routes.md](./13-api-routes.md) complete (IAM API can ship first; this task needs working session boundary).

> **Next.js 16 compatibility gate (planning gate).** This app pins `next@16.2.6` (see [`apps/crm/package.json`](../../../../apps/crm/package.json)); AGENTS.md warns Next 16 differs from training data. **Before installing**, read `apps/crm/node_modules/next/dist/docs/` auth guidance and confirm Auth.js v5 supports Next 16. If it does not, **halt and re-lock D2 in [`00-decisions.md`](./00-decisions.md)** (candidate fallback: custom JWT over the existing cookie boundary, which already works). Do not force an incompatible dependency.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/auth/auth.ts` | Auth.js config |
| `apps/crm/src/app/api/auth/[...nextauth]/route.ts` | Route handler |
| `apps/crm/.env.example` | `AUTH_SECRET`, provider vars |
| [`../../../foundations/development.md`](../../../foundations/development.md) | Env matrix: local / preview / production |
| [`../../../foundations/open-questions.md`](../../../foundations/open-questions.md) | Mark **D2** resolved |

## Steps

1. Confirm Next 16 compatibility (gate above) before adding the dependency.
2. **Credentials provider (dev):** validate `tech@demo.local` / `admin@demo.local` against [`auth/users.ts`](../../../../apps/crm/src/lib/auth/users.ts) + `CRM_DEV_PASSWORD` (same users as today).
3. **Session callback:** JWT/session contains `userId` matching `latch_users.id` — **not** roles.
4. Document preview/prod: OAuth/OIDC provider placeholder (env-driven); no shared dev password in production.
5. `getPrincipal()` reads provider session via official helper (task **15** completes cookie removal).
6. Keep `LATCH_STUB_*` for test processes without the provider.

## Verify (stop gate)

- [x] Next 16 compatibility confirmed (or D2 re-locked with fallback)
- [x] `npm run build` passes
- [x] Local sign-in sets session with correct `userId`
- [x] **D2** row resolved in `open-questions.md`
- [x] `development.md` documents required env vars
- [x] [`../STATUS.md`](../STATUS.md) → **15-crm-session-migration.md**

## Out of scope

Removing legacy login UI (task **15**)
IAM DAL changes
