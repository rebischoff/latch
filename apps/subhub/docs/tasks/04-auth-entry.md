# 04 — Auth entry

> **Status:** Complete (2026-06-12). Next: [05-nav-manifest.md](./05-nav-manifest.md).

## Goal

Single `/login` page (inline form inside shell). Shell is always visible (root layout). Voluntary login from public pages and auth gating on `(private)` routes both route to `/login` with a `callbackUrl`. Login/logout updates nav items and user menu.

## Prerequisites

[03-app-shell-layout.md](./03-app-shell-layout.md) complete. Better Auth wired (`app/api/auth/[...all]/route.ts`, `.env.local`).

## Architecture (locked)

Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts` — a **network boundary** for rewrites and fast redirects, not an application auth firewall. SubHub does **not** add `proxy.ts` / `middleware.ts` for session gating.

| Layer | Responsibility |
|-------|----------------|
| Root `layout.tsx` | `readBetterAuthSession` → `authenticated` for nav chrome |
| `(public)/login` | Sign-in page (not behind private gate) |
| `(private)/*/page.tsx` | `requireAuth('/explicit/path')` — authoritative gate + `callbackUrl` |
| DAL / `resolveContext` | Authorization (403/404) — separate from authentication |
| `UserMenu` (client) | Voluntary login link with `usePathname()` → `callbackUrl` |

**Why not gate in `(private)/layout.tsx` with `callbackUrl`?** Server layouts cannot read the current URL ([Next.js `usePathname` docs](https://nextjs.org/docs/app/api-reference/functions/use-pathname)). SubHub uses **explicit routes** — each protected page passes its own href to `requireAuth`. See [decisions.md](../decisions.md) and [routing-and-libraries.md](../routing-and-libraries.md#auth-gating).

## Files

| File | Action |
|------|--------|
| `app/(public)/login/page.tsx` | **Create** — inline login inside shell |
| `lib/auth-client.ts` | **Create** — Better Auth React client |
| `lib/auth-session.ts` | **Create** — `getServerSession`, `isAuthenticated` via `readBetterAuthSession` |
| `lib/auth-utils.ts` | **Create** — `sanitizeCallbackUrl`, `loginHref` |
| `lib/require-auth.ts` | **Create** — `requireAuth(callbackPath)` → redirect or continue |
| `components/shell/LoginForm.tsx` | **Create** — sign-in form (RHF + Better Auth client) |
| `components/shell/UserMenu.tsx` | **Create** — login link / logout / session display |
| `app/layout.tsx` | Pass `authenticated` into `RootShell` from `isAuthenticated()` |
| `app/(private)/layout.tsx` | **Keep** passthrough (or thin wrapper only — no pathname redirect) |
| `app/(private)/settings/page.tsx` | **Update** — `await requireAuth('/settings')` at top |

**Do not create:** `middleware.ts`, `proxy.ts`.

## Steps

1. Use Better Auth client APIs for email/password sign-in.
2. **Voluntary login:** `UserMenu` **Login** links to `/login?callbackUrl=<current-path>` via `usePathname()` + `useSearchParams()` (URL-encode; same-origin paths only). After success, `router.push(callbackUrl)` + `router.refresh()`. On failure, stay on `/login` with inline errors.
3. **Auth gate:** each `(private)` page calls `requireAuth('/explicit/path')` as its first server action. Redirects to `/login?callbackUrl=<path>`. Dynamic routes pass the resolved href (e.g. `` `/contacts/${id}` ``).
4. **No `callbackUrl`:** default post-login destination `/`.
5. **Authorization is separate:** manifest/policy on the destination route handles 403/404 — not the login flow.
6. Root layout reads `isAuthenticated()` for `RootShell` nav. `requireAuth` uses the same session reader — not `getPrincipal` (roles are irrelevant to the login gate).
7. **No proxy:** do not inject pathname via `proxy.ts` / `middleware.ts` headers. If optimistic CDN redirects are needed later, document a separate decision.

## Verify (stop gate)

- [x] `curl` auth session endpoint returns 200/401 (not 500)
- [x] Unauthenticated visit to `(private)` route redirects to `/login?callbackUrl=…` (via `requireAuth` on that page)
- [x] Login from a public page (`callbackUrl=/`) returns to that page on success
- [x] Login from auth gate returns to intended private route on success
- [x] Failed sign-in stays on `/login` (does not redirect away)
- [x] No `middleware.ts` or `proxy.ts` in `apps/subhub`
- [x] [`../../STATUS.md`](../../STATUS.md) → [05-nav-manifest.md](./05-nav-manifest.md)

## Out of scope

- IAM pages, business routes (beyond `/settings` placeholder gate)
- Manifest-filtered Surface nav (task 05); this task wires session only (`authenticated` flag for static item visibility)
- `proxy.ts` optimistic cookie redirects

## Reference

- [decisions.md](../decisions.md) — auth gating, no proxy, login route group
- [routing-and-libraries.md](../routing-and-libraries.md#auth-gating) — Next.js 16 patterns
