# Discussion A — Identity: two user stores?

> **Status:** Open (2026-06-04). Task 05 implemented **Option A** (email bridge) as a scaffold; this doc captures alternatives before task 10.

## Problem

test1 today has **two representations of the same person**:

| Store | Owner | Purpose |
|-------|-------|---------|
| Better Auth `user` | Auth library | Credentials, sessions — “did login succeed?” |
| `latch_users` | App migrations | Stable Latch id (`seed-admin`), display name, `login_email` |

`@latch/*` only consumes:

```ts
Principal { id: string; roles: string[] }
```

The app must build `Principal` on every request. Task 05 bridges auth → Latch via **`login_email`**, not a shared primary key.

**Symptoms of the split:**

- Better Auth user id (e.g. UUID) ≠ `latch_users.id` (`seed-admin`)
- Extra lookup in `resolveLatchUserId`
- Easy to drift if seed email and dev login email diverge
- Mental overhead: “same user, two ids”

## Platform context

Phase 03 locked **authn (app) vs authz (Latch DB)** — see [decisions.md](../decisions.md) and [AUTH.md](../AUTH.md). That split is intentional; the open question is **how tight the identity seam should be**, not whether roles live in Better Auth.

CRM (Auth.js) uses the same model: session carries user id; roles from `latch_user_roles`. test1 adds Better Auth + email bridge because the memory adapter assigns its own ids.

## Options

### Option A — Split + email bridge (current test1 v1)

- Auth lib: credentials + session  
- `latch_users`: canonical `Principal.id` + `login_email`  
- `getPrincipal()`: session email → `latch_users.id` → roles  

| Pros | Cons |
|------|------|
| Auth library stays swappable | Two stores; bridge logic in app |
| No Better Auth sync plugin in 05 | Lookup every request |
| Works with memory auth adapter | OAuth `sub` ≠ Latch id unless mapped |

**Files today:** `resolve-latch-user.ts`, `login_email` column, `001_init.sql` seed.

### Option B — Single id: auth user id = `latch_users.id`

Create Better Auth user with **custom id** `seed-admin` (or create `latch_users` first, pass id into sign-up).

| Pros | Cons |
|------|------|
| Session user id = `Principal.id` | Depends on auth adapter supporting custom ids |
| Drop email bridge | OAuth IdP may own the id (`sub`) |

### Option C — `latch_users` is source of truth

Seed/migrate users first. Auth stores only “verify password for this `login_email`”. Session payload carries **`latch_users.id`** directly (custom session callback / adapter).

| Pros | Cons |
|------|------|
| Clearest Latch model | More custom auth integration |
| One id in audit, policy, DAL | Better Auth Postgres adapter may need extension |

### Option D — One physical table

Better Auth Postgres adapter + schema where auth `user.id` equals `latch_users.id` (or merged table).

| Pros | Cons |
|------|------|
| One row per person | Couples migrations to one auth library |
| | Harder to keep `@latch/*` auth-agnostic story |

### Option E — External IdP owns identity (production)

OIDC `sub` → `latch_users.id` (or mapping table). Local dev uses A/Bind B for password login.

| Pros | Cons |
|------|------|
| Production-realistic | Dev/prod identity paths differ unless designed |

## Platform design fork

Should Latch define an explicit seam in `@latch/contracts` or docs?

```ts
// Illustrative — not implemented
type IdentityResolver = (session: unknown) => Promise<{ latchUserId: string }>;
```

Today each app implements `getPrincipal()` + ad hoc `resolveLatchUserId`. A documented resolver interface would make the two-store problem **visible** instead of hidden in test1.

## Questions to resolve

1. Is **email bridge (A)** acceptable through task 10, or do we require **single id (B/C)** before DAL?
2. Should **`Principal.id` always equal `latch_users.id`** in docs/invariants (recommended: yes)?
3. When Better Auth moves to Postgres, do we **sync** auth users from `latch_users` seed or **merge tables (D)**?
4. Do we add a formal **`IdentityResolver`** (or equivalent) to platform docs?

## Recommendation (draft — not locked)

- **Short term:** Keep A for task 05–10; document that `latch_users.id` is canonical.  
- **Before task 20 (IAM surfaces):** Move to **B or C** so session id = `Principal.id` without email lookup.  
- **Platform:** Document identity seam in foundations (even if not a new package API yet).

## Related

- [AUTH.md](../AUTH.md) · [DATABASE.md](../DATABASE.md) · [decisions.md](../decisions.md)  
- CRM reference: [`apps/crm/docs/AUTH.md`](../../../crm/docs/AUTH.md)  
- Phase 03: [`docs/phases/03-identity-iam/decisions.md`](../../../../docs/phases/03-identity-iam/decisions.md)
