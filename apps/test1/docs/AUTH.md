# test1 — auth plan

Auth establishes **who** is calling the app; **what** they may do is always resolved from DB-backed roles + Latch policy (never from the auth library's role plugins).

## Auth provider: Better Auth

| | CRM | test1 |
|---|-----|-------|
| Library | Auth.js (NextAuth v5) | [Better Auth](https://better-auth.com/) |
| Docs | [`apps/crm/docs/AUTH.md`](../../crm/docs/AUTH.md) | This file |

**Latch `@latch/*` packages do not import any auth library.** The app provides [`Principal`](../../../packages/contracts/src/types.ts) via `getPrincipal()`.

### Critical separation

Better Auth offers organization, admin, and role plugins. **Do not use them for Latch authorization.**

| Concern | Owner |
|---------|--------|
| Login, session, password reset, OAuth | Better Auth |
| Role assignments, grants, manifest | Latch (`latch_user_roles`, `latch_role_grants`, `PolicyService`) |

Using both creates two sources of truth for permissions — a bug by design.

## Architecture

```
Better Auth session  →  user id (+ display label for UI)
                              ↓
                    getPrincipal()
                              ↓
              loadRolesForUser(id) from DB
                              ↓
              PolicyService.resolve(principal, scope)
                              ↓
                         Manifest → DAL / UI
```

Reference implementation (Auth.js, same seam): [`apps/crm/src/lib/auth/getPrincipal.ts`](../../crm/src/lib/auth/getPrincipal.ts).

## Task breakdown (04a–04e)

| Step | Doc | Focus |
|------|-----|--------|
| **Start here** | [tasks/04a-latch-auth-boundary.md](./tasks/04a-latch-auth-boundary.md) | What `@latch/*` uses vs Better Auth — **no code** |
| 04b | [tasks/04b-better-auth-server.md](./tasks/04b-better-auth-server.md) | Server config + API route |
| 04c | [tasks/04c-principal-seam.md](./tasks/04c-principal-seam.md) | `getPrincipal` + `Principal` |
| 04d | [tasks/04d-session-guards.md](./tasks/04d-session-guards.md) | Protected layout |
| 04e | [tasks/04e-login-logout.md](./tasks/04e-login-logout.md) | Login/logout UI |

Parent rollup: [tasks/04-better-auth.md](./tasks/04-better-auth.md).

## Planned files (task 04 — not implemented yet)

| Piece | Location |
|-------|----------|
| Better Auth config | `src/lib/auth/auth.ts` |
| Route handler | `src/app/api/auth/[...all]/route.ts` (exact path per Better Auth Next.js guide) |
| Session reader | `src/lib/auth/provider-session.ts` |
| Principal | `src/lib/auth/getPrincipal.ts` |
| Session gate | `src/lib/auth/requireSession.ts` |
| Login | `src/app/login/page.tsx` + RHF + Server Action |
| Logout | Server Action → Better Auth sign-out |
| Layout guard | `requireSession()` in `(app)/layout.tsx` |

**Session payload:** user id and display label only — **never `roles[]`.**

## Seed users (planned)

| Login | `Principal.id` | Initial role(s) |
|-------|----------------|-----------------|
| `admin@test1.local` | `seed-admin` | `iam_master`, `data_master` |
| `user@test1.local` | `seed-user` | custom role (after task 20) |
| `readonly@test1.local` | `seed-readonly` | read-only custom role |

Password: `TEST1_DEV_PASSWORD` in `.env.local` (default `demo`). Never in production.

## Stub principal (tests / CI)

When no session:

- `LATCH_STUB_USER` + `LATCH_STUB_ROLE` → deterministic `Principal` for Vitest
- Env role is **not** merged with DB seed rows (same rule as CRM)

Automated tests should not require Better Auth HTTP unless explicitly e2e.

## Environment matrix

| Environment | Authn |
|-------------|--------|
| Local dev | Better Auth email/password against seed users |
| Preview | Email/password when enabled; optional Vercel protection |
| Production | OAuth/OIDC providers per deployment — no dev password |

See [CONFIG.md](./CONFIG.md) for env vars.

## Provider matrix vs CRM

Auth.js remains **CRM-only** (Phase 03 D2). test1 choosing Better Auth does not change `@latch/*` or CRM.

## Related

- [decisions.md](./decisions.md) · [CONFIG.md](./CONFIG.md)
- Better Auth docs: https://better-auth.com/docs
