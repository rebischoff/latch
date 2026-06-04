# test1 — STATUS

> **Quarterback for test1 only.** Root [`STATUS.md`](../../../STATUS.md) is unchanged.
> Updated: 2026-06-03

---

## Right now — do this next

**→ [tasks/05-neon-migrations-skeleton.md](./tasks/05-neon-migrations-skeleton.md)** — Neon migrations, `latch_users` / roles tables, `getPrincipal()` loads roles from DB. Parent **04** complete.

---

## Blocked

Nothing — **05** needs a test1 Neon branch and `DATABASE_URL` in `.env.local`.

---

## Recently completed

- **2026-06-03** — **04e** — Login/logout: RHF form + `signInAction` / `signOutAction`, dev user auto-create, post-login redirect to `/`; parent **04** complete.
- **2026-06-03** — **04d** — Session guards: `requireSession()` redirects to `/login`; `(app)/layout` uses `getPrincipal()` + real session label; placeholder auth modules removed.
- **2026-06-03** — **04c** — Principal seam: `provider-session.ts` (Better Auth → `{ userId, label }`), `getPrincipal()` with stub `roles: []` + `LATCH_STUB_*`, Vitest coverage.
- **2026-06-03** — **04b** — Better Auth server: `auth.ts` (email/password, memory adapter), `api/auth/[...all]/route.ts`, CONFIG env docs; `better-auth` pinned `1.6.14`.
- **2026-06-03** — **04a** — Latch auth boundary read/plan: authn (Better Auth) vs authz (Latch); session = id + label; `Principal` only from `@latch/contracts` in task 04.
- **2026-06-03** — **02+03** — Monorepo entry (`@latch/test1`, port **3003**, Turbopack), AntD shell, `.env.example`, empty nav, login placeholder.
- **2026-06-03** — Planning forks — codegen phased, per-app env, 02+03 combined, Turbopack default; CRM docs [`CODEGEN.md`](../../crm/docs/CODEGEN.md) + CONFIG env section.
- **2026-06-03** — Planning scaffold — docs, task chain, placeholder dirs (no application code).

---

## At a glance

| | |
|---|---|
| **Plan** | [PLAN.md](./PLAN.md) |
| **Decisions** | [decisions.md](./decisions.md) |
| **Env** | [CONFIG.md](./CONFIG.md) — `apps/test1/.env.example` committed |
| **Auth** | Better Auth → [AUTH.md](./AUTH.md) (task **04**) |
| **Reference app** | [`apps/crm`](../../crm/) (Auth.js, YAML policies) |
| **Codegen** | [`../../crm/docs/CODEGEN.md`](../../crm/docs/CODEGEN.md) |

---

## Task bands

| Band | Tasks | State |
|------|-------|-------|
| Scaffold | 02–03 | **Complete** |
| Scaffold | 04 | **Complete** (04a–04e) |
| Scaffold | 05 | **Next** — Neon + migrations |
| Learn Latch (YAML) | 10–12 | Planning stub |
| DB RBAC | 20–23 | Planning stub |
| Harden | 90, 99 | Planning stub |
