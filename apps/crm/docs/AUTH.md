# CRM — auth plan

Auth establishes **who** is calling the app; **what** they may do is always resolved from DB-backed roles + policy (Phase 03).

## Auth.js (session migration complete — task 15)

| Piece | Location |
|-------|----------|
| Config | `apps/crm/src/lib/auth/auth.ts` |
| Route | `/api/auth/[...nextauth]` |
| Login | `app/login/actions.ts` → `signIn("credentials", …)` |
| Logout | `app/actions/auth.ts` → `signOut()` |
| Principal | `getPrincipal()` — Auth.js `userId` + `loadRolesForUser()` |
| Session gate | `requireSession()` in `(app)/layout.tsx` and mutations |

**No hand-rolled `latch_session` cookie.** The provider JWT/session carries **user id and label only** — never `roles[]`.

### Users (seed)

| Login | `Principal.id` | DB role(s) in `latch_user_roles` |
|-------|----------------|-------------------------------------|
| `tech@demo.local` | `seed-field-tech` | `field_tech` |
| `admin@demo.local` | `seed-office-admin` | `office_admin` |
| `iam@demo.local` | `seed-iam-admin` | `iam_master` |

Password (dev/preview only): `CRM_DEV_PASSWORD` in `.env.local` (default `demo`). **Never** set this in Vercel production.

### Login / logout

1. `GET /login` — React Hook Form; Server Action calls Auth.js Credentials.
2. Redirect to `/jobs` on success.
3. Header **Log out** → `signOut()` → `/login`.

### Session resolution

`getPrincipal()` in `apps/crm/src/lib/auth/`:

- Auth.js session present → `Principal.id` from JWT; `Principal.roles` from `latch_user_roles` on **every** request.
- No session → `requireSession()` redirects to `/login`.
- `LATCH_STUB_USER` + `LATCH_STUB_ROLE` when no session (automated tests / CI only; env role is not merged with DB).

Multi-role: `union_grants` + `denyWins: true` across assigned role ids.

### Provider matrix

| Environment | Authn |
|-------------|--------|
| Local dev | Credentials (seed users + `CRM_DEV_PASSWORD`) |
| Preview | Credentials allowed when `CRM_ENABLE_DEV_CREDENTIALS=true`; optional Vercel password protection |
| Production | OAuth/OIDC (env: `AUTH_GITHUB_*` or deployment IdP) — **no** `CRM_DEV_PASSWORD` |

Credentials provider is disabled in production unless `CRM_ENABLE_DEV_CREDENTIALS=true` (do not enable in prod).

## Session boundary (layouts, not middleware)

Next.js 16: use layouts and route handlers, not `middleware.ts`, for auth guarantees.

| Route | Guard |
|-------|--------|
| `(app)/*` | `(app)/layout.tsx` → `requireSession()` → else `redirect('/login')` |
| `/login` | `login/layout.tsx` → redirect to `/jobs` if session exists |
| `/api/health` | Public |
| Server Actions / API (mutations) | `requireSession()` before DAL |
| `/api/iam/*` | `requireSession()` + `iam_master` manifest |

## IAM API (`user_roles_detail`)

Base URL (dev): `http://localhost:3002`. Sign in at `/login` (e.g. `iam@demo.local` / `demo`), then use the browser session cookie (`authjs.session-token`) in curl, or complete the Auth.js credentials callback:

```bash
BASE=http://localhost:3002
JAR=$(mktemp)

# CSRF + credentials sign-in (dev)
CSRF=$(curl -sS -c "$JAR" "$BASE/api/auth/csrf" | jq -r .csrfToken)
curl -sS -c "$JAR" -b "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode 'username=iam@demo.local' \
  --data-urlencode 'password=demo' \
  --data-urlencode 'callbackUrl=/jobs' -o /dev/null -w '%{http_code}\n'

# GET another user's roles (iam_master)
curl -sS -b "$JAR" "$BASE/api/iam/users/seed-field-tech" | jq .

# GET as field_tech → 404 (existence hide): sign in as tech@demo.local in a second jar
```

Unauthenticated requests hit `requireSession()` and redirect to `/login` (no JSON body).

## What CRM ships in v1

| In v1 | Out of v1 |
|-------|-----------|
| Login / logout (Auth.js) | CRM pages for user/role CRUD |
| `getPrincipal()` + `requireSession()` | IdP group → role sync |
| Policy-driven nav | Production OAuth credentials (per deployment) |

IAM administration is **API-only** (`/api/iam/*`); no React console. See [`docs/phases/03-identity-iam/decisions.md`](../../../docs/phases/03-identity-iam/decisions.md).

## Related

- [`../../../docs/phases/03-identity-iam/README.md`](../../../docs/phases/03-identity-iam/README.md)
- [`../../../docs/foundations/development.md`](../../../docs/foundations/development.md)
