# 04b — Better Auth server wiring

> **Status:** Complete (2026-06-03). Parent: [04-better-auth.md](./04-better-auth.md). **Before:** [04a-latch-auth-boundary.md](./04a-latch-auth-boundary.md). **Next:** [04c-principal-seam.md](./04c-principal-seam.md).

## Goal

Install and configure Better Auth on the server: config module + catch-all API route + documented env vars. **No login UI, no `getPrincipal`, no layout guard** in this task.

## Prerequisites

- **04a** verify gate passed.
- `apps/test1/.env.example` → copy to `.env.local` when running locally.

## Latch touchpoint

**None in code** — this subtask is auth-library-only. Do not import `@latch/dal` or put `roles` in session custom fields.

## Files

| File | Action |
|------|--------|
| `apps/test1/src/lib/auth/auth.ts` | **Create** — `emailAndPassword: enabled`; **no** org/role plugins |
| `apps/test1/src/app/api/auth/[...all]/route.ts` | **Create** — handler per [Better Auth Next.js docs](https://better-auth.com/docs) |
| `apps/test1/package.json` | **Edit** — ensure `better-auth` version pinned (if not already from **02**) |
| [../CONFIG.md](../CONFIG.md) | **Edit** — document `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TEST1_DEV_PASSWORD` |

## Steps

1. Install Better Auth per official guide; match Next 16 App Router pattern.
2. Enable **email/password only** for v1 dev login.
3. **Do not** enable organization, admin, or role plugins (see [04a](./04a-latch-auth-boundary.md)).
4. Set `baseURL` / secret from env; port **3003** for local `BETTER_AUTH_URL`.
5. Smoke-test: auth API route responds (e.g. health/session endpoint per docs) — manual or curl, not full login UI.

## Temporary users (until task 05 seed)

Document one of:

- Hardcoded dev user in Better Auth config for local only, **or**
- Note that login E2E waits for **05** seed — acceptable if **04e** verify uses same temporary user

## Verify (stop gate)

- [x] `auth.ts` exists; no Latch role/org plugins
- [x] `api/auth/[...all]/route.ts` registered; dev server starts without auth route errors
- [x] [../CONFIG.md](../CONFIG.md) lists Better Auth env vars (distinct from CRM `AUTH_SECRET`)
- [x] No `getPrincipal` or `requireSession` required yet for this gate

## Out of scope

- `getPrincipal`, session reader ( **04c** )
- Protected layout ( **04d** )
- Login page ( **04e** )
- `latch_users` / Neon ( **05** )
