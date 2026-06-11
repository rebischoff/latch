# Discussion 03 — IAM ownership (platform vs business app)

> **Status:** Open (2026-06-09). Spike: [`apps/spike_policy`](../..).

## Question

Will each **business app** be required to write the logic to get/create/edit/delete **users** and **roles**? Or does Latch ship that as a built-in service?

## Short answer

**The app implements IAM operations.** Latch ships **primitives + template schema + reference pattern** — not a turnkey `@latch/getUser()` or hosted user API.

There is **no `@latch/iam` package in v1** (Phase 03 decision; extract in Phase 07 if a second app needs shared code).

## What Latch provides (platform)

| Piece | Where |
|-------|--------|
| `latch_users`, `latch_user_roles`, `latch_roles`, grants tables | Template migrations (`001`–`008`) — **same shape in every company DB** |
| Permission merge + system synthesis | `@latch/policy` (`PolicyService`, `system_iam` / `system_data`) |
| Manifest types, `fieldAllows`, `surfaceAllows` | `@latch/contracts` |
| Generic DAL kernel, strict PATCH | `@latch/dal` |
| Audit transactions | `@latch/audit` |
| Field/action **vocabulary** | App codegen from `*.surface.yaml` |

Canonical split: [`docs/discussions/02-identity-and-permissions.md`](../../../../packages/docs/discussions/02-identity-and-permissions.md).

## What each business app provides

IAM is modeled as **Surfaces** — same as `job_detail` or `customer_list`:

| Surface | Responsibility |
|---------|----------------|
| `user_roles_detail` | Get user, patch assignments (create user — **not yet in spike**) |
| `role_detail` | CRUD app roles, bindings, sparse grants |

Per app you wire:

1. **Surface YAML** + codegen (`modules/iam/`)
2. **DAL** — descriptors, store adapter, `repository.ts` (spike: `lib/iam-user/`, `lib/iam/`)
3. **Business rules** — P4a/P4b, self-patch, last-admin (`validate-assignments.ts` — **app code**, not `@latch/policy`)
4. **Server actions or REST** — `getPrincipal` → `resolve` → DAL
5. **UI** (optional — CRM phase 03 was API-only; spike added UI as proof)
6. **Auth seam** — session subject → `latch_users.id`; roles from DB on every request

## There is no separate Latch user service

Each **company** has one Postgres database. The app connects to it and reads/writes `latch_*` through the **DAL** with `PermissionContext` — same path as business data.

```
Company DB (one per deployment)
├── latch_users, latch_user_roles, latch_roles, …   ← platform template tables
├── jobs, customers, …                              ← app business tables
└── All access via app DAL + PolicyService.resolve
```

## What `getUser(id)` looks like

Not a global platform API. Pattern from the spike:

```ts
const principal = await getRequestPrincipal();
const ctx = await buildUserRolesDetailContext(pool, principal);
const user = await userRolesDetailDal.getUserRoles(ctx, id);
```

- Row lives in **`latch_users`** (platform table in the app’s DB)
- **Authorization** — `PolicyService.resolve` on `user_roles_detail` → manifest
- **Implementation** — app IAM DAL (`lib/iam-user/repository.ts`)

## Division of labour

```
┌─────────────────────────────────────────────────────────┐
│  Latch platform (@latch/* + template migrations)        │
│  • Schema for identity + roles                            │
│  • Who MAY do what (PolicyService)                        │
│  • How to narrow reads/writes (DAL kernel)                │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ PermissionContext
┌─────────────────────────────────────────────────────────┐
│  Business app (spike_policy, crm, future template)      │
│  • IAM Surface metadata + generated schemas               │
│  • get / patch / create / delete methods                │
│  • Assignment validation (P4a, P4b, T8)                   │
│  • Routes, actions, UI                                  │
│  • Auth → latch_users.id                                │
└─────────────────────────────────────────────────────────┘
```

| Concern | Owner |
|---------|--------|
| Table DDL + system row seeds | Latch template migrations |
| Auth provider | Business app (must map to `latch_users.id`) |
| Runtime grants + assignments | Company DB; mutated via IAM Surfaces |
| Vocabulary | App codegen |
| Merge / synthesis rules | `@latch/policy` |
| Enforcement | App DALs |

## `@latch/policy` in the app (reference)

Live map: **`/dev/policy-api`** in the spike. Summary:

| Export | App use |
|--------|---------|
| `PolicyService`, `definePolicyRegistry` | Every request bootstrap |
| `MemoryRoleGrantProvider` + preload | DB grants → resolve |
| `validateGrantTuple` | Role editor write-time |
| Merge helpers | Inside `resolve`; visible in manifest inspector |

`CachingPolicyService` — Phase 06; not wired in spike UI yet.

## Practical path for new apps

| Step | Action |
|------|--------|
| 1 | Copy template migrations `001`–`008` into app `migrations/` |
| 2 | Copy or adapt `modules/iam/` + `lib/iam*` from spike (reference impl) |
| 3 | Register IAM surfaces in `policy-registry.ts` |
| 4 | Wire `getPrincipal` + `createPolicyServiceForPrincipal` |
| 5 | Ship UI or API-only IAM (CRM v1 = API-only) |
| 6 | Later: extract shared IAM into `@latch/iam` if duplication hurts |

`apps/spike_policy` **is** the reference for “what every business app wires” — not a remote service you call.

## Related

- [01 — User console](./01-user-console.md)
- [02 — Privileged assignment](./02-privileged-assignment.md)
- Compartments map: [`docs/reference/compartments.md`](../../../../packages/docs/reference/compartments.md#2-identity--permissions)
- Phase 03 package layout: [`docs/phases/03-identity-iam/decisions.md`](../../../../packages/docs/phases/03-identity-iam/decisions.md)
