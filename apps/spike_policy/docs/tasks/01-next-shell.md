# 01 — Next.js shell

> **Status:** Stub (2026-06-08). **Unblocked:** [policy 04 — P10](../../../packages/policy/docs/tasks/04-p10-test-harness.md) complete.

## Goal

Add a minimal Next.js app to `apps/spike_policy`: root layout, nav, Postgres pool, dev **“Act as”** principal (cookie or header), **Ant Design 6** shell, **policy version badge** in the nav, and a read-only **`/dev/policy-api`** reference page. No production auth.

## Deliverables

### App shell

- `app/layout.tsx` — Ant Design `Layout` + nav: **Users** | **Roles** | **Dev** (policy API)
  - Right side: **Act as** picker + **`Policy v{N}`** tag (see below)
- `app/page.tsx` — redirect to `/users`
- `lib/db.ts` — shared `Pool` from `DATABASE_URL` (`.env.local`)
- `lib/act-as.ts` — read/set dev principal id; default `bootstrap-admin`
- `lib/iam/policy-version.ts` — extend with **`getPolicyVersion(pool)`** → `SELECT version FROM latch_policy_version WHERE id = 1` (read-only; bump already exists)
- `package.json` — `next`, `react`, `antd@^6`, `react-hook-form`, `@hookform/resolvers`, workspace deps (`@latch/contracts`, `@latch/policy`, …)

### Policy version badge (nav)

```
┌──────────────────────────────────────────────────────────────────┐
│  Latch Policy Spike    Users  Roles  Dev    [Act as ▼]  v12    │
└──────────────────────────────────────────────────────────────────┘
                                                      ↑
                                            Tag: "Policy v{N}"
```

- Root layout (Server Component) calls `getPolicyVersion(pool)` on each render.
- Tasks **03** / **04** server actions call `revalidatePath('/', 'layout')` after `bumpPolicyVersion` so the tag increments without a full browser reload.
- Tooltip (optional): “Global permission generation — bumps on grant, binding, role delete, and assignment changes.”

This spike does **not** use `CachingPolicyService`; the badge proves the **write → bump** path. Phase 06 will also key manifest cache entries on this value.

### Dev policy API reference (`/dev/policy-api`)

Read-only documentation page (Ant Design `Typography` + `Table` / `Collapse`) listing:

| Section | Contents |
|---------|----------|
| **`@latch/policy` exports** | `PolicyService`, `definePolicyRegistry`, `RoleGrantProvider`, `validateGrantTuple`, synthesis helpers, merge helpers, manifest-cache types |
| **Per-export detail** | Purpose, constructor/config props, method signatures, return types (`Manifest`, `PolicyRegistry`, `RoleGrant`, …) |
| **Spike bootstrap** | `loadPrincipalFromDb`, `createPolicyServiceForPrincipal`, `preloadRoleGrantProvider`, `getPolicyVersion`, `spikePolicyRegistry` |
| **Resolve flow** | Diagram: DB grants → preload → `PolicyService.resolve` → `PermissionContext` → DAL |
| **Deny semantics** | Three-way table — see [README](./README.md#deny--what-the-spike-proves-vs-what-stays-in-the-engine). State clearly: spike Postgres grants are **allow-only**; `denyWins` is engine-only (unit tests). |
| **`policyVersion`** | What bumps the counter; link to `latch_policy_version`; note Phase 06 cache |

No runtime playground required in v1 — static reference is enough.

### Conventions (carry into tasks 03–04)

- **Server Actions** for IAM mutations; pages are Server Components where possible; client islands for forms (RHF + antd).
- **No raw `db.*`** in `app/` — orchestration calls `lib/` only.
- **After permission mutations:** `bumpPolicyVersion` + `revalidatePath('/', 'layout')`.

## Verify (stop gate)

- [ ] `npm run dev` (spike_policy workspace) serves layout with nav (Users, Roles, Dev)
- [ ] Nav shows **`Policy v{N}`** matching `SELECT version FROM latch_policy_version`
- [ ] Ant Design theme loads; layout is usable without custom CSS framework
- [ ] “Act as” switches `loadPrincipalFromDb` actor for server actions
- [ ] `/dev/policy-api` documents `PolicyService`, deny semantics (3 meanings), and `policyVersion` bump rules
- [ ] No raw `db.*` in route components — orchestration only

## Next

[02 — Vocabulary fixture](./02-vocabulary-fixture.md)
