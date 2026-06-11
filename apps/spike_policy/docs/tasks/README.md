# `apps/spike_policy` — task plan (policy console UI)

> **Quarterback for the UI spike.** Platform lib + migrations (tasks 01–03 under [`packages/policy/docs/tasks`](../../../packages/policy/docs/tasks/README.md)) are **complete**. This folder plans turning the harness into a **visible policy console** that **proves [`@latch/policy`](../../../packages/policy)** — edit users/roles in Postgres, see effective manifests update live.
>
> **Updated:** 2026-06-10 (tasks 01–04, **07–08** complete).

---

## Right now — do this next

Spike UI tasks 01–04 and **07–08** are **complete**. Scoped **row filtering** consumer proof continues in [Phase 08](../../../../packages/_docs/phases/08-scoped-access/STATUS.md) task 04 (`apps/spike_business`) — this spike proved assignment + delegation only ([two-harness decision](../../../../packages/_docs/phases/08-scoped-access/decisions.md#decision-two-harness-proof-model--repoint-task-04-2026-06-10)).

Optional spike follow-ups: profile write, wire `CachingPolicyService` (CRM already has it). Discussions: [`../discussions/README.md`](../discussions/README.md).

---

## Goal

A minimal Next.js app on top of the existing spike:

- **Users** — list + detail; name + **multi-select roles**; **merged manifest inspector** on the same detail page (auto-refreshes after save).
- **Roles** — list + detail; CRUD app roles + grant matrix (`role_detail`, **Postgres-backed** so work persists across sessions).
- **Vocabulary fixture** — 5 synthetic business surfaces in [`spike_codegen`](../../../spike_codegen) (fields + actions only; **no business tables, lists, or CRUD pages**). Grant matrix + manifest inspector exercise the full registry.
- **Dev reference** — `/dev/policy-api` documents `@latch/policy` exports, spike bootstrap helpers, and **deny semantics** (see below).
- **Policy version** — global counter visible in the **root nav**; increments on permission-affecting mutations.

Dev-only **“Act as”** principal picker (no Auth.js in v1). Real auth graduates with the template app.

**Primary proof target:** `PolicyService.resolve` + `validateGrantTuple` wired through Postgres preload, IAM DALs, and the manifest inspector — visible in the browser when roles or assignments change.

---

## Execution sequence

| Step | Task | Deliverable | State |
|------|------|-------------|-------|
| — | *(policy)* [04 — P10 test harness](../../../packages/policy/docs/tasks/04-p10-test-harness.md) | Lock P10; DAL T8 in spike | **complete** (2026-06-08) |
| **1** | **[01 — Next.js shell](./01-next-shell.md)** | Layout, antd, DB pool, “Act as”, nav **policy v{N}**, `/dev/policy-api` | **complete** (2026-06-09) |
| **2** | **[02 — Vocabulary fixture](./02-vocabulary-fixture.md)** | 5 synthetic surfaces in codegen + `spikePolicyRegistry` | **complete** (2026-06-09) |
| **3** | **[03 — Roles UI + PG DAL](./03-roles-ui.md)** | `/roles`, `/roles/[id]`; Postgres `role_detail`; react-hook-form | **complete** (2026-06-09) |
| **4** | **[04 — Users UI + inspector](./04-users-ui.md)** | `/users`, `/users/[id]`; Postgres assignments + manifest inspector | **complete** (2026-06-09) |
| — | ~~05 — Manifest inspector~~ | *Folded into [04](./04-users-ui.md)* | superseded |
| — | ~~06 — Widgets demo~~ | *Deferred — not needed for policy proof* | deferred |
| 5 | [07 — User create](./07-user-create.md) | Admin sets up other users; `INSERT latch_users` + optional roles; audited | **complete** (2026-06-09) |
| 6 | [08 — Scoped delegation](./08-scoped-delegation.md) | Prove scoped assignment + delegation (policy half) in the console | **complete** (2026-06-09) |

### Dependency graph

```
policy 04 (P10 harness) ✓
         │
         ▼
    01 (Next shell + antd + policy v{N} badge + policy API page)
         │
         ├──► 02 (vocabulary fixture — codegen YAML only)
         │
         ├──► 03 (roles UI + PG DAL) ──► allow-only grant matrix
         │
         └──► 04 (users UI + PG DAL + manifest inspector on same page)
                   └── needs 02 + 03
```

---

## Decision: runtime grants are allow-only; no explicit deny authoring (2026-06-08)

**Choice:** The spike and v1 role editor use **sparse allow rows only** ([P2a](../../../packages/policy/docs/tasks/00-decisions-needed.md)). No `effect` column on `latch_role_grants`, no tri-state grant matrix, no Postgres path for `effect: "deny"`.

| Layer | Explicit `effect: "deny"`? |
|-------|----------------------------|
| **Spike UI + Postgres grants** | **No** — unchecked = no row = default deny |
| **`@latch/policy` merge (`denyWins`)** | **Stays** — locked platform seam since 2026-05-27 ([`access-control.md`](../../../docs/reference/access-control.md)); covered by **package unit tests** only |
| **Future product** | Re-open only if a platform decision adds `effect` to DDL + role editor UX |

**Rationale:** “No access” is expressed by **not granting**, not by a deny row. Explicit deny only matters when `union_grants` stacks roles and one must carve out another’s allow (e.g. `system_data` synthesis) — but P4a blocks `system_data` + app roles on the same user, so the main product case is rare. Shipping half of deny (engine without authoring) in an “optional” task was inconsistent: either demonstrate end-to-end or don’t build authoring. This spike **does not** demonstrate explicit deny in the browser.

**Removing `denyWins` from `@latch/policy` entirely** is a separate platform change (merge tests, `scope.md`, `global-options.md`) — **not** part of this spike decision.

---

## App shape (target)

```
apps/spike_policy/
├── app/                         # Next.js App Router (new)
│   ├── layout.tsx               # root nav: Users | Roles | Dev | policy v{N}
│   ├── page.tsx                 # redirect → /users
│   ├── users/
│   │   ├── page.tsx             # list
│   │   └── [id]/page.tsx        # detail: profile + roles + manifest inspector
│   ├── roles/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx        # detail: allow-only grant matrix (react-hook-form)
│   └── dev/
│       └── policy-api/page.tsx  # @latch/policy export reference (read-only)
├── lib/                         # existing server lib (+ PG store adapters in 03/04)
│   └── iam/policy-version.ts    # bump + read current version (extend for UI)
├── modules/iam/
├── migrations/                  # 001–008 template + 900 fixture (no business-table migration; fixture surfaces are vocabulary only)
└── docs/tasks/                  # this folder
```

Vocabulary surfaces live in **`apps/spike_codegen/modules/`** (new `fixture/` or expanded module tree), registered via [`lib/policy-registry.ts`](../../lib/policy-registry.ts).

---

## UI stack (locked for this spike)

| Choice | Use |
|--------|-----|
| **Ant Design 6** (`antd`) | Layout, tables, forms, selects, alerts, `Badge` / `Tag` for policy version |
| **react-hook-form** + Zod resolver | Role detail + user detail forms; server still re-resolves manifest |
| **Server Actions** (preferred) | IAM mutations; `revalidatePath` on layout after bumps so nav badge updates |

---

## `policyVersion` — what it is and how the spike shows it

`latch_policy_version` is a **single global counter** (one row, `version` BIGINT). It increments whenever permissions **change for anyone** — not per-user.

| Mutation | Bumps version? | Where |
|----------|----------------|-------|
| Role **grant** or **surface_binding** patch | **Yes** | [`bumpPolicyVersion`](../../lib/iam/policy-version.ts) in `role_detail` DAL |
| Role **delete** (app role) | **Yes** | same |
| User **role_assignments** patch | **Yes** | task **04** — wire `bumpPolicyVersion(pool)` (today memory-only in harness) |
| Role **create** (catalog row only, no grants) | No | no effective permission change yet |
| Display-name-only role patch | No | `patchTouchesPolicyData` guard |

**Why it exists:** Phase 06 manifest cache keys include `principal.policyVersion`. When the counter bumps, cached manifests for the old generation are stale. The spike does **not** wire `CachingPolicyService` yet — every inspector load calls `resolve` fresh — but the counter still proves the **invalidation seam** is hooked up on writes.

**Spike UI (locked):** show current version in the **root layout nav** as `Policy v{N}` (antd `Tag` or `Badge`). Read via `getPolicyVersion(pool)` → `SELECT version FROM latch_policy_version WHERE id = 1`. After any server action that bumps, call `revalidatePath('/', 'layout')` so the badge ticks up without a manual refresh.

Do **not** put `policyVersion` on each manifest inspector row — it is global, not per-surface.

---

## Deny — what the spike proves vs what stays in the engine

| Term | What it means | Spike |
|------|---------------|-------|
| **Default deny (sparse grants)** | No grant row → manifest `fields[id]: []` via `ensureFieldKeys` | **Proved** — inspector + unchecked matrix |
| **`denyWins` / `effect: "deny"`** | Merge rule in `@latch/policy`; explicit deny strips allows when roles stack | **Not proved in UI** — [`packages/policy` unit tests](../../../packages/policy/src/policy-service.test.ts) only; runtime DB never emits deny rows |
| **Auth deny (403 / 404)** | DAL / route rejection (`ForbiddenError`, T8 hide) | **Proved** — error handling in IAM UI |

`/dev/policy-api` must document all three and state which apply to runtime Postgres grants.

---

## Decisions already locked (reuse)

- **P8** — deny self grant/binding edits on `role_detail` ([`repository.ts`](../../lib/iam/repository.ts))
- **P9** — one Surface `role_detail` ([`03-role-editor-surface.md`](../../../packages/policy/docs/tasks/03-role-editor-surface.md))
- **P4a / P4b** — assignment exclusivity + last-`system_iam` guard (task **04**)
- **P7** — `mode` overlays deferred
- **P2a** — sparse **allow** rows only in runtime grant table
- **Postgres persistence** — roles, assignments, and users survive dev restarts (tasks **03** / **04** replace memory stores on the UI path)
- **Manifest inspector on user detail** — not a separate route (was task **05**)
- **Policy version badge** — root nav, global counter, revalidate on mutation

## Out of scope (v1 spike)

- Production Auth.js / break-glass login UI
- Scope **row-filtering RLS** (`WHERE scope_id IN (…)`) — needs business tables the spike lacks; proven in `@latch/dal` + `apps/crm`. (The **policy half** — scoped assignment + delegation — *is* in-spike: [08](./08-scoped-delegation.md), built on [`packages/policy` task 05](../../../packages/policy/docs/tasks/05-scope-and-delegation.md).)
- Full `@latch/react` component library
- Business-surface list/CRUD pages (`/widgets`, `widgets` table migration)
- `row_scope: own` row-filter demos requiring assignment joins
- **`effect: deny` grant rows** — DDL, fold, tri-state editor (see Decision above)
- **`CachingPolicyService`** — Phase 06; badge proves bumps, not cache hits

---

## Where `@latch/policy` runs (proof map)

| Layer | Module | `@latch/policy` API | Why |
|-------|--------|---------------------|-----|
| Registry | [`lib/policy-registry.ts`](../../lib/policy-registry.ts) | `definePolicyRegistry` | Vocabulary catalog for resolve + validation |
| Request bootstrap | [`lib/request-policy.ts`](../../lib/request-policy.ts) | `PolicyService`, preload (app) | Actor/target principal → sync resolve |
| Role writes | [`lib/iam/validate-patch.ts`](../../lib/iam/validate-patch.ts) | `validateGrantTuple` | Grants stay inside codegen vocabulary |
| Merge | inspector (task **04**) | `unionGrants`, `mergeRowScope`, `unionSurfaceActions` via `resolve` | **Multi-role user** → combined **allows** |
| Default deny | inspector | `ensureFieldKeys` via `resolve` | Ungranted fields show `[]` |
| Authorization | IAM DALs | *(via `PermissionContext.manifest`)* | `surfaceAllows` / `fieldAllows` |
| Invalidation seam | tasks **03** / **04** + nav badge | `bumpPolicyVersion` → `latch_policy_version` | Counter proves permission mutations |
| **UI proof** | User detail inspector | `PolicyService.resolve` per registry surface | Visual confirmation |

See [`01-next-shell.md`](./01-next-shell.md) (`/dev/policy-api`) for export-level API reference.

---

## Related

- Spike README: [`../../README.md`](../../README.md)
- Runtime roles engine tasks: [`packages/policy/docs/tasks`](../../../packages/policy/docs/tasks/README.md)
- Vocabulary fixture: [`apps/spike_codegen`](../../../spike_codegen)
