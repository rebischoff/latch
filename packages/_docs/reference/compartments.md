# Compartment map

> **Purpose:** a lens for understanding and *developing* Latch as a set of independently buildable, independently testable concerns ("compartments"), rather than one monolith. Use this to decide what to build/test in isolation.
>
> **Status:** Proposal / living map (2026-06-05). Describes today's code plus proposed extensions (clearly marked). Not a scope change — see [`../foundations/scope.md`](../foundations/scope.md).
>
> **Platform DDL checklist** (session 3): refresh this doc as part of [`../discussions/10-opinionation-roadmap.md`](../discussions/10-opinionation-roadmap.md). Layer taxonomy: [`../discussions/11-spine-adapters-skin.md`](../discussions/11-spine-adapters-skin.md). **Canonical migrations:** [`packages/codegen/template/migrations/`](../../codegen/template/migrations/) — copied by `latch new`; not `apps/_template` (no such workspace).

### Decision: platform DDL scope rule (2026-06-10)

**Choice:** Every business app — in-repo (`apps/<slug>/`) or external (future consumer repo) — runs the **same** platform migration chain from `packages/codegen/template/migrations/`. Business tables and Surface YAML are per-app additions only. The golden skeleton lives in **`@latch/codegen`** (`packages/codegen/template/`), not under `apps/`.

**Rationale:** Platform spine DDL must not fork per vertical. `latch new` copies the package template; monorepo spike apps (`widgets`, `spike_business`, …) are dev instances of the same shape external apps will use once publish lands (Phase 07).

### Platform DDL checklist (`packages/codegen/template/migrations/`)

Session 3 — confirm each block. Canonical source only; business migrations are per-app.

| # | Migrations | Objects | Session 3 |
|---|------------|---------|-----------|
| A | `001`–`004` | `latch_users`, `latch_user_roles`, `latch_roles`, `latch_role_surfaces`, `latch_role_grants`, assignment FK | ✅ agreed 2026-06-10 |
| B | `005`–`008` | `latch_policy_version`, `latch_app` role, bootstrap super-admin seed, role-editor `GRANT`s | ✅ agreed 2026-06-10 |
| C | `009` | `latch_audit` + immutability trigger; IAM + business share one stream (`entity_type`) | ✅ agreed 2026-06-10 |
| D | `010` | `latch_scopes`, `latch_role_delegations`, scoped `latch_user_roles` | ✅ agreed 2026-06-10 |
| E | `011` *(to add)* | `latch_pending_changes` — single table; `latch_app` SELECT/INSERT/UPDATE grants | ✅ agreed 2026-06-10 |

### Decision: `latch_pending_changes` in platform core (2026-06-10)

**Choice:** **`latch_pending_changes` is platform spine** — one table (+ `latch_app` grants in the same migration). Add `011_latch_pending_changes.sql` to `packages/codegen/template/migrations/`. Approval remains **opt-in per field** (`requires_verification` in Surface YAML); the empty table is harmless when unused.

**Rationale:** Storage is a single platform table ([`03-approval`](../discussions/03-approval.md)); runtime routing lives in `@latch/approval` + DAL — no extra DDL. Shipping the table in every app avoids a forked migration path when an app later enables verification.

## What "compartment" means

A **compartment** is a concern boundary you can build and test on its own — ideally with its own test app or fixtures — without standing up the whole system. Each is labelled **platform** (same for every business app → belongs in the template) or **per-app** (authored per business domain).

| # | Compartment | Category | One-line job | Isolated test |
|---|---|---|---|---|
| 1 | Codegen | platform tool | YAML → TS types/Zod/glue | fixtures → assert emitted TS (no DB) |
| 2 | Identity & Permissions | platform tables + per-app vocab | who is the user, what may they do (grants are runtime DB data) | pure `resolve()` matrices (grants injected) |
| 2.1 | Approval | extension of #2 | gate some writes behind accept/reject | on top of #2 + #3 |
| 3 | Runtime / DAL | platform engine | enforce permissions per request | in-memory store (no DB) |
| 4 | Audit | platform tables + runtime hook | immutable record + restore | memory writer + one PG trigger test |
| 5 | UI sync | platform (client) | render from manifest, never a security boundary | component tests against a manifest |
| 6 | Template / scaffold | platform packaging (**proposed**) | ship platform tables + wiring to a new app | scaffold an app; run migrations |

Dependency order for building/testing in isolation: **1 → 2 → 3 → 4 → 2.1 → 5 → 6**.

---

## 1. Codegen (authoring / build time)

Pure `YAML → files`. No runtime role, no security responsibility. If output is wrong, `codegen --check` + Zod + the kernel catch it.

| Role | Files |
|---|---|
| Generator | [`packages/codegen/src/generate.ts`](../../codegen/src/generate.ts), [`glue.ts`](../../codegen/src/glue.ts), [`types.ts`](../../codegen/src/types.ts), [`index.ts`](../../codegen/src/index.ts) |
| Input (per-app) | `apps/*/modules/**/*.surface.yaml` |
| Output (per-app, committed) | `apps/*/modules/**/generated/*.schema.generated.ts`, `*.glue.generated.ts` |
| Doc | [`codegen/docs/`](../../codegen/docs/README.md) — [`codegen-scope`](../../codegen/docs/reference/codegen-scope.md) (boundary), [`metadata-and-codegen`](../../codegen/docs/reference/metadata-and-codegen.md) (emit) |

**Today:** emits Field ids, read/patch Zod, `columnMap`, verification field ids; scans **CRM only** (`MODULES_ROOT` hardcoded); column types live in a hardcoded `COLUMN_ZOD` map inside the package.

**Proposed:** (a) declare column `type` in YAML, drop `COLUMN_ZOD`; (b) multi-app scan `apps/*/modules/**`; (c) generate per-surface glue (`projectRow`/`applyPatch`/descriptor) for single-table surfaces.

**Should not:** generate policy/enforcement logic; own/overwrite page components; be a runtime dependency.

---

## 2. Identity & Permissions

Three sub-things, two categories. Platform tables are template candidates; the per-app artifact is now the Field/action **vocabulary** (codegen), not grants.

> **Updated (2026-06-06):** role **definitions** (catalog + grants) moved from per-app YAML/code to **runtime DB data** (`latch_roles` + `latch_role_grants`). Codegen now emits only the per-Surface Field/action vocabulary; the resolver loads grants from a `RoleGrantProvider`. See [`access-control.md`](../../policy/docs/access-control.md#decision-app-defined-roles-are-runtime-data-2026-06-06) and [`../discussions/02-identity-and-permissions.md`](../discussions/02-identity-and-permissions.md).

### Platform tables (template)

| Table | Purpose | Migration (today) |
|---|---|---|
| `latch_users` | identity | crm `001`, test1 `001` |
| `latch_user_roles` | user → role assignments (runtime data) | crm `004`, test1 `001` |
| `latch_roles` | role catalog (`UUID`, `role_class`; seeded `system_data` / `system_iam`) | `apps/spike_policy` (P11 shape; [01b](../../policy/docs/tasks/01b-p11-catalog-realignment.md) complete) |
| `latch_role_grants` | role → surface → field → action grants (runtime data) | **proposed** — see [policy tasks](../../policy/docs/tasks/README.md) |
| `latch_policy_version` | manifest cache invalidation | crm `007`, test1 `001` |

### Engine (platform)

| Role | Files |
|---|---|
| Resolve manifest | [`packages/policy/src/policy-service.ts`](../../policy/src/policy-service.ts), [`merge.ts`](../../policy/src/merge.ts), [`registry.ts`](../../policy/src/registry.ts) |
| Types + checks | [`packages/contracts/src/types.ts`](../../contracts/src/types.ts) (`Principal`, `Manifest`, `RoleSurfacePolicy`), [`narrow.ts`](../../contracts/src/narrow.ts) (`fieldAllows`, …) |

### Vocabulary + identity seam (per-app)

| Role | Files |
|---|---|
| Field/action vocabulary | `apps/*/modules/**/*.surface.yaml` → `generated/*.schema.generated.ts` (`${surface}SurfacePolicyDef`; **no grants** as of 2026-06-06) |
| Runtime grant source | `latch_role_grants` via a `RoleGrantProvider` (replaces the hand-synced/codegen registry of grants) |
| Identity seam | `apps/crm/src/lib/auth/*` (`getPrincipal.ts`, `provider-session.ts`, `session.ts`, `auth.ts`) |
| Role loading | `apps/crm/src/lib/iam/load-roles.ts`, `policy-version.ts` |

### IAM as a Surface (the "edit users/roles" page — template candidate)

Managing assignments is itself a permission-gated Surface, persisting to `latch_user_roles`, audited.

| Role | Files |
|---|---|
| IAM Surface metadata | `apps/crm/modules/iam/user_roles_detail.*` |
| IAM DAL + projection | `apps/crm/src/lib/iam/{repository,project,apply-patch,descriptors,schemas}.ts` |
| IAM API | `apps/crm/src/lib/api/iam-handler.ts`, `apps/crm/src/app/api/iam/users/[id]/route.ts` |

**System roles (standardized):** `system_data` (business wildcard) and `system_iam` (IAM) — catalog `role_class` ([P11](../../policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)). One user may hold both. Synthesized in [`policy-service.ts`](../../policy/src/policy-service.ts) from `role_class` via `Principal.roleClasses` (DB-generated ids; no fixed UUID constants).

**Pure-function test:** `PolicyService.resolve(principal, scope)` needs only a registry → assert manifests per role. No DB.

---

## 2.1 Approval (extension of permissions)

Opt-in, **per field** via YAML `requires_verification: true`. `submit` proposes (→ pending store), `approve` accepts/rejects. Remove the flag → approval doesn't exist for that app.

| Role | Files |
|---|---|
| Pending store + state machine | [`packages/approval/src/*`](../../approval/src/index.ts) |
| Routing in kernel | [`packages/dal/src/pending-routing.ts`](../../dal/src/pending-routing.ts) |
| Per-app API | `apps/crm/src/lib/pending-api.ts`, `apps/crm/src/lib/api/pending-handler.ts`, `apps/crm/src/app/api/pending/*` |
| Table (template) | `latch_pending_changes` — crm `006` |
| Doc | [`approval-trails.md`](../../approval/docs/approval-trails.md) |

---

## 3. Runtime / DAL (the enforcement engine)

The single enforcement path. Platform kernel + per-app store/glue. SQL lives **only** in the app store.

| Role | Files |
|---|---|
| Kernel | [`packages/dal/src/create-surface-dal.ts`](../../dal/src/create-surface-dal.ts), [`surface-descriptor.ts`](../../dal/src/surface-descriptor.ts), [`store-adapter.ts`](../../dal/src/store-adapter.ts), [`project.ts`](../../dal/src/project.ts), [`patch-utils.ts`](../../dal/src/patch-utils.ts), [`bulk.ts`](../../dal/src/bulk.ts), [`delete-row.ts`](../../dal/src/delete-row.ts) |
| Narrowing | [`packages/contracts/src/narrow.ts`](../../contracts/src/narrow.ts) |
| Bootstrap (per-app) | `apps/crm/src/lib/latch.ts` (`resolveContext`, manifest cache, DAL singletons), `latch-config.ts`, `manifest-request-scope.ts` |
| Per-app glue | `apps/crm/src/lib/<domain>/{descriptors,project,apply-patch,repository,schemas}.ts` |
| StoreAdapter impls (SQL/memory) | `apps/crm/db/store.ts`, `apps/crm/db/memory-store.ts` |
| HTTP surface (per-app) | `apps/crm/src/lib/api/*`, `apps/crm/src/app/api/**/route.ts` |
| Connection safety (T5/T12) | [`packages/audit/src/permission-db.ts`](../../audit/src/permission-db.ts) (`withPermissionDb`); `latch_app` role — crm `005`, test1 `002` |
| Doc | [`permissions-and-ui-sync.md`](./permissions-and-ui-sync.md), [`api-style.md`](./api-style.md) |

**Proposed:** `@latch/adapter-pg-store` (`createPgStoreAdapter(table, columnMap)`, raw `pg` — SQL-first, 2026-06-11; was `@latch/store-drizzle`) and a route/action factory + `registerSurface()` bootstrap so per-app glue shrinks to ~3 files.

**In-memory test:** the whole engine runs against `memory-store.ts` — full enforcement coverage, no database.

---

## 4. Audit (runtime hook + template tables)

Table shape is identical for every app; writing happens inside the DAL on each mutation; restore replays `before` snapshots.

| Role | Files |
|---|---|
| Service + restore | [`packages/audit/src/audit-service.ts`](../../audit/src/audit-service.ts), [`restore.ts`](../../audit/src/restore.ts), [`config.ts`](../../audit/src/config.ts), [`types.ts`](../../audit/src/types.ts) |
| Table + immutability trigger (template) | `latch_audit` — crm `001`, test1 `001` (`latch_audit_deny_mutation` trigger) |
| Per-app writer | `apps/crm/src/lib/audit-db-writer.ts` |
| Per-app restore | `apps/crm/src/lib/restore/{fetch-audit,replay}.ts` |
| Doc | [`audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md) |

---

## 5. UI sync (client)

Renders from the manifest; never a security boundary. Client imports `@latch/contracts` + `@latch/react` only.

| Role | Files |
|---|---|
| Provider + controls | [`packages/react/src/*`](../../react/src/index.ts) (`CapabilitiesProvider`, `<Can>`, `<FieldControl>`) |
| Per-app pages | `apps/crm/src/app/(app)/**`, `apps/crm/src/components/**`, `apps/crm/src/lib/nav.ts` |

---

## 6. Template / scaffold (proposed — not built)

Packages the **platform** tables + wiring so a new business app starts with audit/IAM/permissions in place instead of hand-copying migrations.

| Role | Files / target |
|---|---|
| Migration runner (exists) | [`scripts/db-migrate.mjs`](../../../scripts/db-migrate.mjs) |
| Platform tables to templatize | `latch_users`, `latch_user_roles`, `latch_policy_version`, `latch_audit` (+trigger), `latch_pending_changes`, `latch_app` role |
| Proposed packages | `@latch/app-kit` (`registerSurface`, `resolveContext`, route/action factories), `@latch/adapter-pg-store` (raw `pg`, SQL-first), `create-latch-app` CLI |
| Optional add-on | Neon-API branch provisioning (keep opt-in; core stays cloud-agnostic) |

**Roadmap note:** this compartment is the substrate for **AI-authored surfaces** — AI emits constrained YAML + a migration, the validation gate (`codegen --check` + Zod + migration review) guards it, and the kernel enforces invariants regardless of what was authored.

## Related

- [`packages.md`](./packages.md) — package boundaries (the import rules these compartments must respect)
- [`../foundations/architecture-overview.md`](../foundations/architecture-overview.md) — runtime request flow
- [`access-control.md`](../../policy/docs/access-control.md) · [`metadata-and-codegen.md`](../../codegen/docs/reference/metadata-and-codegen.md) · [`audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md) · [`approval-trails.md`](../../approval/docs/approval-trails.md)
