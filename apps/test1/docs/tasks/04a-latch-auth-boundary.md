# 04a — Latch auth boundary (read / plan)

> **Status:** Complete (2026-06-03). Next: [04b-better-auth-server.md](./04b-better-auth-server.md).
>
> **No implementation in this task** — read, sketch, agree. Parent: [04-better-auth.md](./04-better-auth.md).

## Goal

Before wiring Better Auth, have a **single clear picture** of what test1 uses from Latch today, what Better Auth owns, and what waits for later tasks — so authn and authz never merge.

## Prerequisites

- [03-app-shell-scaffold.md](./03-app-shell-scaffold.md) complete.
- Skim [../PLAN.md](../PLAN.md) §1 (packages table) and [../AUTH.md](../AUTH.md).
- CRM reference (same seam, different library): [`apps/crm/src/lib/auth/`](../../../crm/src/lib/auth/).

## Current scaffold (task 03)

| Piece | Location | Behavior today |
|-------|----------|----------------|
| Placeholder session | `src/lib/auth/placeholder-session.ts` | Fixed `{ userId, label }` for shell header |
| Placeholder principal | `src/lib/auth/placeholder-principal.ts` | `{ id: "dev-guest", roles: [] }` |
| App layout | `src/app/(app)/layout.tsx` | Uses placeholders; **no** real gate |
| Login | `src/app/login/page.tsx` | `LoginPlaceholder` only |
| Latch wiring | `src/lib/latch.ts` | `resolveContext` throws "not wired" |
| Nav | `src/lib/nav.ts` | Imports `Principal` from `@latch/contracts`; empty catalog |

Task **04** replaces placeholders with Better Auth + `getPrincipal()`; it does **not** wire `resolveContext` or DAL (task **10+**).

## Two layers: authentication vs authorization

| Layer | Question | Owner in test1 | Stored where |
|-------|----------|----------------|--------------|
| **Authentication (authn)** | Who is logged in? | **Better Auth** | HTTP session / cookies |
| **Authorization (authz)** | What may they do? | **Latch** | `latch_user_roles`, grants, `PolicyService` → manifest |

**Locked decision:** Better Auth org/role/admin plugins are **out of scope** for Latch permissions. They would duplicate `PolicyService` and DB grants.

## Request flow (target after 04e)

```
Browser
  → Better Auth session cookie
  → readProviderSession()     [app — maps BA session → { userId, label }]
  → getPrincipal()            [app — { id, roles[], policyVersion? }]
       ├─ roles: [] in 04c   (stub until task 05 DB)
       └─ roles: loadRolesForUser(id) after 05
  → (later) resolveContext()  [app — principal + PolicyService → manifest]
  → (later) dal.*(ctx, …)     [@latch/dal — PermissionContext required]
  → (later) <Can> / FieldControl [@latch/react — manifest on client]
```

Auth libraries stop at **user id (+ label for UI)**. Everything below `getPrincipal()` is Latch.

## What each `@latch/*` package does here

### `@latch/contracts` — **used in task 04**

| Type | Used in 04? | Role |
|------|-------------|------|
| `Principal` | **Yes** | Return type of `getPrincipal()`; passed to `resolveNavItems` in layout |
| `Manifest` | No | Produced by `PolicyService.resolve` (task 10 YAML, task 22 DB) |
| `PermissionContext` | No | `{ principal, manifest, surface }` for every DAL call |
| `PolicyScope` | No | Input to policy resolve (Surface + mode + entityId) |

`Principal` shape (platform):

- `id` — stable user id (matches seed / `latch_users`, not email)
- `roles` — `RoleId[]` from **DB**, never from Better Auth session
- `policyVersion?` — from `latch_policy_version` when DB wired (CRM today; test1 task **05** / **90**)

### `@latch/policy` — **not in task 04**

`PolicyService.resolve(principal, scope) → manifest` runs **server only**. Needs role data on `principal` and Surface YAML or DB grants. test1 learns this on task **10** (YAML) and **22** (DB loader).

### `@latch/dal` — **not in task 04**

Every method requires `PermissionContext`. No route handler or Server Action may call `db.*` directly ([invariants](../../../../.cursor/rules/10-invariants.mdc)). test1’s `resolveContext` in `latch.ts` will assemble ctx once surfaces exist.

### `@latch/react` — **not in task 04**

UI renders from manifest; not a security boundary. Wired with first Surface page (task **10**).

### `@latch/codegen`, `@latch/audit`, `@latch/approval` — **not in task 04**

Appear with Surfaces, mutations, and verification tasks later.

## App-owned seam (mirror CRM)

| File | CRM (Auth.js) | test1 (Better Auth) | Responsibility |
|------|---------------|---------------------|----------------|
| Provider config | `auth.ts` | `auth.ts` | Library config; email/password only |
| HTTP handler | `[...nextauth]/route` | `api/auth/[...all]/route` | Library routes |
| Session reader | `provider-session.ts` | `provider-session.ts` | **Map** library session → `{ userId, label }` — no roles |
| Principal | `getPrincipal.ts` | `getPrincipal.ts` | Session or `LATCH_STUB_*` → `Principal` |
| Gate | `requireSession` / layout | same | Redirect unauthenticated users |
| Login UI | login page + actions | same | Calls library sign-in; no DAL on client |

CRM `getPrincipal` today also calls `loadRolesForUser` and `getPolicyVersion` when `DATABASE_URL` is set. test1 **04c** returns `roles: []`; task **05** adds DB load.

## Session payload rules (non-negotiable)

| Field | In Better Auth session? | In `Principal`? | Source of truth |
|-------|-------------------------|-----------------|-----------------|
| User id | Yes | `Principal.id` | Auth provider + `latch_users` alignment (task 05) |
| Display label | Yes (UI only) | — | Auth provider |
| `roles[]` | **Never** | Yes | `latch_user_roles` / stubs |
| `policyVersion` | **Never** | Optional | `latch_policy_version` |

## Test / CI stub (same as CRM)

When no session:

- `LATCH_STUB_USER` + `LATCH_STUB_ROLE` → deterministic `Principal` for Vitest
- Env role is **not** merged with DB seed rows

Automated unit tests should use stubs, not Better Auth HTTP, unless explicitly e2e.

## What task 04 deliberately does **not** do

| Deferred | Task | Why wait |
|----------|------|----------|
| Load roles from Postgres | **05** | Needs migrations + seed |
| `resolveContext` / manifest | **10+** | Needs Surface YAML + policy registry |
| DAL reads/writes | **10+** | Needs `PermissionContext` |
| DB-backed policy loader | **22** | Needs grant tables **21** |
| OAuth | — | CONFIG matrix only in **04b** |

## Checklist — read before 04b

Use this while reading CRM auth files side by side with [../AUTH.md](../AUTH.md):

1. [x] I can explain why `@latch/dal` is not imported in login or layout code.
2. [x] I can point to CRM `getPrincipal` and list what test1 copies vs defers to **05**.
3. [x] I know which placeholder files **04d/04e** will delete.
4. [x] I will not enable Better Auth role/org plugins for permissions.
5. [x] I understand `Principal` is the only `@latch/contracts` type required for **04**.

## Verify (stop gate)

- [x] Read [../AUTH.md](../AUTH.md) and CRM [`getPrincipal.ts`](../../../crm/src/lib/auth/getPrincipal.ts) + [`provider-session.ts`](../../../crm/src/lib/auth/provider-session.ts)
- [x] Confirmed: session = user id + label; roles only via `getPrincipal()` → DB (later) or stub
- [x] Confirmed: no `@latch/policy` or `@latch/dal` in task **04** file list
- [x] Ready to implement **04b** (Better Auth server only)

## Out of scope

- Installing packages or creating `auth.ts` ( **04b** )
- Any code changes
