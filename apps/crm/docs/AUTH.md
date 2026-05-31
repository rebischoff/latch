# CRM — auth plan

Auth exists in CRM only to **switch principals** and prove manifests change. Full IAM is Phase 03.

## v0 — stub login (proof harness)

### Users (seed)

Reuse `@latch/dal` seed ids — no new user table for CRM-only auth.

| Login (email or username) | Maps to `Principal.id` | Role(s) |
|---------------------------|------------------------|---------|
| `tech@demo.local` | `seed-field-tech` | `field_tech` |
| `admin@demo.local` | `seed-office-admin` | `office_admin` |

Password: single shared dev secret in `.env.local` (e.g. `CRM_DEV_PASSWORD=demo`) — **not** for production.

### Login flow

1. `GET /login` — React Hook Form + Ant Design `Input` (no antd `Form`): username, password.
2. Server Action validates against env map → sets **httpOnly cookie** `latch_session` (JSON: `{ userId, roles, label }`).
3. Redirect to `/jobs`.

### Logout flow

1. Header **Log out** → Server Action clears cookie → redirect `/login`.

### Session resolution

`getPrincipal()` in `apps/crm/src/lib/auth/`:

- Cookie present → build `Principal` from cookie.
- No cookie → `requireSession()` in `(app)/layout` redirects to `/login` (authoritative guard).
- Env-only `LATCH_STUB_USER` + `LATCH_STUB_ROLE` when no cookie (automated tests only).

### Nav (policy-driven)

`resolveNavItems()` in `apps/crm/src/lib/nav.ts` maps CRM routes to Surface ids and includes a link only when `PolicyService.resolve` grants surface-level `read` (`navManifestScope: minimal`). Surfaces not registered in policy are omitted (no DOM leak).

### What this proves

| Package / concern | Proof |
|-------------------|-------|
| `@latch/policy` | Different login → different nav + manifest |
| Session boundary | Unauthenticated requests never hit DAL |

### What this does not prove

- OAuth, SAML, magic links
- Password hashing at rest (dev plaintext compare is fine)
- Refresh tokens, CSRF hardening beyond Next defaults (note in Phase 03)

## v1 — real auth (Phase 03)

When Phase 03 lands, CRM **replaces** stub cookie with the chosen provider (Clerk, Auth.js, etc.):

- `getPrincipal()` reads provider session → loads roles from DB.
- Login/logout pages become provider UI or redirects.
- CRM login Form removed.

CRM should not implement IAM admin (roles/users CRUD) — deferred.

## Session boundary (Step A — layouts, not middleware)

Next.js 16 deprecates `middleware.ts` for auth; use layouts and route handlers.

| Route | Guard |
|-------|--------|
| `(app)/*` | `(app)/layout.tsx` → `requireSession()` → else `redirect('/login')` |
| `/login` | `login/layout.tsx` → redirect to `/jobs` if session exists |
| `/api/health` | Public |
| Server Actions / API (mutations) | Call `requireSession()` before DAL |

Optional later: `proxy.ts` for optimistic cookie→redirect UX only — still keep `requireSession()` in layouts.

## Security notes for dev

- Never ship `CRM_DEV_PASSWORD` to Vercel production.
- Preview deployments may use Vercel password protection + stub auth.

## Related

- [`../../../docs/phases/03-identity-iam/README.md`](../../../docs/phases/03-identity-iam/README.md)
- [`../../../docs/foundations/development.md`](../../../docs/foundations/development.md) (current stub env vars on `apps/web`)
