# Access control

How Latch thinks about **granular** data access. Combines **Surface** (working name: Module), **Field**, mandatory **DAL**, optional Postgres RLS, and **UI-aligned manifests**. See [permissions-and-ui-sync.md](../../docs/reference/permissions-and-ui-sync.md) and [glossary.md](../../docs/foundations/glossary.md).

## Resource hierarchy

```
Company (deployment ? own Postgres database)
 ??? Surface (one form / list screen ? spans tables & views)
      ??? Table / view (physical; may appear in many Surfaces)
      ??? Row (entity instance)
      ??? Field (logical, on that Surface)
```

We **do not** use shared-schema multi-tenancy. Each company has its own database; Surfaces never imply cross-company data.

### Decision: database per company (2026-05-27)

**Choice:** Each **company** gets a dedicated PostgreSQL database, provisioned from the same migration template. The application connects to one database per request (or host).

**Out of scope:** Many companies in one database with `tenant_id` row isolation.

**Implications:**

- Company ? `DATABASE_URL` routing (TBD)
- User/role assignment in each company DB (`latch_users`, `latch_user_roles` — see Phase 03 decisions)
- RLS for row/owner rules **within** a company DB
- Hosted Postgres on Vercel (e.g. Neon) ? see [development.md](../../docs/foundations/development.md)

Actions (draft): `read`, `write`, `delete`, `restore`, `approve`, `hard_delete`.

## Decision: app-defined roles are runtime data (2026-06-06)

**Choice:** **Supersedes the "Surface/Field policies per role in repo YAML/JSON" line in the RBAC decision below.** Role definitions — the role catalog and each role's Field/action grants + `rowScope` — are **runtime DB data** (`latch_roles` catalog, `latch_role_surfaces` bindings, `latch_role_grants`), created/updated/deleted by app users through a permission-gated IAM Surface, audited. Codegen still owns the per-Surface **Field/action vocabulary**; the role editor validates each grant against it. The two system classes (`system_data`, `system_iam`) stay template-seeded and synthesized in `PolicyService`. Canonical detail: [`../foundations/scope.md`](../../docs/foundations/scope.md), [`../discussions/02-identity-and-permissions.md`](../../docs/discussions/02-identity-and-permissions.md). Runtime tasks: [`../../packages/policy/docs/tasks/README.md`](./tasks/README.md).

**Rationale:** Assignments were already runtime (`latch_user_roles`); leaving definitions at build time forced a dev redeploy for every permission tweak. Splitting **vocabulary (codegen, build time) from grants (DB, runtime)** preserves the safety property — a runtime grant can never reference a Field the Surface doesn't define, because the role editor and the resolver both read the codegen catalog — while letting business admins own the policy.

### Decision: runtime role catalog tables + FK semantics (2026-06-06)

**Choice:**

| Table | Purpose |
|-------|---------|
| `latch_roles` | Role catalog (`id` UUID, `role_class`, `display_name`) — [P11](./tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08) |
| `latch_role_surfaces` | One row per **(role, surface)** — authoritative `row_scope` (`own` \| `all`) |
| `latch_role_grants` | Sparse allow-rows: one per **(role, surface, field, action)**; no `row_scope` |
| `latch_user_roles` | Assignments (unchanged); `role_id` FK → `latch_roles.id` |

**FK on delete:**

| Child | Parent | `ON DELETE` |
|-------|--------|-------------|
| `latch_user_roles.role_id` | `latch_roles.id` | **RESTRICT** — cannot delete role while assigned; revoke first |
| `latch_role_grants.role_id` | `latch_roles.id` | **CASCADE** |
| `latch_role_surfaces.role_id` | `latch_roles.id` | **CASCADE** |

**System roles:** Template seeds exactly one `system_data` and one `system_iam` catalog row (**DB-generated UUIDs**, identified by `role_class` via the singleton index; **immutable `role_class`**, not deletable — DB triggers + role editor). Grants for **both** are **synthesized in `PolicyService`** from `role_class` (`system_data` → Surface `kind: business`; `system_iam` → Surface `kind: iam`), not stored as grant rows. Storage, exclusivity, and bootstrap: P4 / P4a / P4b / P11 in [`../../packages/policy/docs/tasks/00-decisions-needed.md`](./tasks/00-decisions-needed.md).

**Sparse grants:** New roles need **no** grant rows until configured; missing grants → default deny. Only surfaces the editor touches get `latch_role_surfaces` rows.

**Seed order:** `latch_roles` before `latch_user_roles` assignment seeds.

**Rationale:** RESTRICT on assignments preserves an explicit, auditable revoke path. CASCADE on definition children avoids orphan grant/binding rows. Template provisioning seeds built-in catalog rows only; pilot app roles are created at runtime (or in `apps/spike_policy` fixture seeds for tests).

Canonical parking-lot detail: [`../../packages/policy/docs/tasks/00-decisions-needed.md`](./tasks/00-decisions-needed.md) (P1, P2, P2a, P3, P4, P4a, P4b, P4c).

### Decision: built-in roles — synthesis, storage, exclusivity, bootstrap (2026-06-06)

**Choice:**

- **Synthesize both.** `system_data` (wildcard on Surface `kind: business`) and `system_iam` (wildcard on Surface `kind: iam`) are synthesized in `PolicyService` from assigned catalog `role_class`; neither is stored in `latch_role_grants`. Synthesis reads the codegen `fieldIds`, so a system role can't reference an undefined Field.
- **Uniform storage.** System assignments are ordinary `latch_user_roles` rows (catalog UUID FKs). No built-in columns on `latch_users`. `Principal.roles` is a flat list of catalog UUIDs (`RoleId`).
- **Separation of duties.** `system_data` (data plane) ≠ `system_iam` (control plane). Composable on one user; `system_data` alone cannot widen IAM access.
- **Exclusivity (write-time validation).** `system_data` may not combine with `app` roles (may combine with `system_iam`); `app` roles only when `system_data` absent.
- **Privileged assignment (2026-06-08).** Assign `system_iam` only if actor holds `system_iam`; assign `system_data` only if actor holds `system_data`; hold both → assign both.
- **Bootstrap.** First admin via app `/setup` wizard (`LATCH_SETUP_KEY` + `login_name` + password) when `latch_users` is empty — not SQL seed ([P4b amendment](./tasks/00-decisions-needed.md#amendment-first-run-setup--db-identity-guards-2026-06-13)). Assignment DAL + DB triggers refuse removing the **last** `system_iam` or `system_data` holder. `role_class` is immutable at the DB.
- **Identity.** `login_name` is the setup-time login identifier; `login_email` nullable until linked from `party_email`. Login resolves `login_name` or `login_email`.

**Rationale:** One assignment table keeps a single source of truth and a uniform resolver; `role_class` encodes plane + deletability ([P11](./tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)). Synthesizing both removes the bootstrap lockout risk; separation of duties + per-class assignment stop cross-plane escalation. Scoped delegation for non-`system_iam` assigners is deferred to [discussion 09](../../docs/discussions/09-role-delegation-and-scope.md).

## Decision: RBAC with built-in roles (2026-05)

**Choice:**

- Platform ships **built-in roles** (catalog locked 2026-06-02 — see below).
- **Users are assigned to one or more roles** via `latch_user_roles` in the company DB; IdP group sync deferred.
- ~~Surface/Field policies per role in **repo YAML/JSON**.~~ **Superseded (2026-06-06):** role→Field grants are **runtime DB data**, not repo YAML — see the Decision above. Repo YAML now owns only the Field/action *vocabulary*.

### Decision: role catalog — system classes + app roles (2026-06-02; shape 2026-06-08)

**Choice:** Catalog rows use **UUID** PK + `role_class` ([P11](./tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)):

| `role_class` | Template seed | Purpose |
|--------------|---------------|---------|
| `system_data` | Yes (one row; DB-generated UUID) | Read/write all **business** Surfaces/Fields (not IAM metadata) |
| `system_iam` | Yes (one row; DB-generated UUID) | Users, role **assignments**, and role **definitions** (editor) on IAM Surfaces |
| `app` | No (runtime) | App-defined roles (e.g. pilot `field_tech`, `office_admin` — fixture or role editor) |

`display_name` is the human label (e.g. "Data master", "Field tech"). Assignments reference catalog **UUIDs** in `latch_user_roles`.

**Rationale:** Separates pilot personas from platform administration; system classes satisfy Phase 03 sub-goals with a proper catalog table.

> **Updated (2026-06-08):** only `system_data` / `system_iam` are template-seeded. Pilot personas are **runtime** `app` rows (role editor or `apps/spike_policy` fixture only) — [P3](./tasks/00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty).

Canonical detail: [`../phases/03-identity-iam/decisions.md`](../../docs/phases/03-identity-iam/decisions.md).

### Decision: data_master wildcard (2026-06-02)

**Choice:** `@latch/policy` treats `data_master` as a built-in with wildcard grants on all **registered business** Surface ids in the app policy registry. IAM Surface ids (at minimum `user_roles_detail`) are **excluded**. No `data_master` block in per-Surface `*.policies.yaml`.

**Rationale:** New business Surfaces gain `data_master` access when registered + app-role policies are added — no hand-edited `data_master` YAML. Regression-tested in Phase 03 task **21**.

Implementation: `PolicyService.resolve` synthesizes `read`/`write` on all `fieldIds` when the principal holds `role_class = 'system_data'` and the registry entry has `kind: "business"`. Surface actions: builtin `read`, `write`, `delete` **plus** any **custom** `surfaceActions` declared on the surface registry entry (e.g. `add_as_db_user` on `employee_detail`) — same union rule as IAM synthesis. IAM entries use `kind: "iam"` (e.g. `user_roles_detail`). `synthesizeDataMasterBinding` in `@latch/policy` (keyed on `role_class` since [01b](./tasks/01b-p11-catalog-realignment.md); no fixed role-id constant).

**Amended (2026-06-25):** Custom business `surfaceActions` must be included in `system_data` synthesis so manifest grants match surface YAML (provision decision in SubHub [`party.md`](../../apps/subhub/docs/decisions/party.md#decision-provision-app-user-from-person-surface-2026-06-25)).

### Decision: iam_master wildcard (2026-06-08)

**Choice:** `@latch/policy` treats `iam_master` as a built-in with wildcard grants on all **registered IAM** Surface ids in the app policy registry. Business Surface ids are **excluded** (separation of duties — see P4a).

**Rationale:** New IAM Surfaces (role editor, user assignments, etc.) gain `iam_master` access when registered — no grant rows in `latch_role_grants`. Synthesis removes bootstrap lockout risk when the grant table is empty or broken.

Implementation: `PolicyService.resolve` synthesizes `read`/`write` on all `fieldIds` (+ surface `read`/`write` actions) when the principal holds a role of `role_class = 'system_iam'` (via `Principal.roleClasses`) and the registry entry has `kind: "iam"`. `synthesizeIamMasterBinding` in `@latch/policy` (keyed on `role_class` since [01b](./tasks/01b-p11-catalog-realignment.md); no fixed role-id constant).

### Decision: multiple roles ? `multiRoleCombine` (2026-05-27, revised)

**Choice (v1):** When a user has multiple roles, effective permissions are merged using global option **`multiRoleCombine`**. **v1 implements `union_grants` only.** The other three modes are designed as pluggable strategies but not built or tested in v1 ([`scope.md`](../../docs/foundations/scope.md)).

| Mode | Status | Semantics |
|---|---|---|
| `union_grants` | **v1 default and only mode** | Union of allows ? if **any** role grants an action on a Field/Surface, user has it. |
| `intersection_grants` | Deferred | User has an action only if **every** assigned role grants it. |
| `most_restrictive` | Deferred | Per Field/action, take **least privilege** across roles. |
| `priority` | Deferred | Each role has `priority`; for conflicts, highest-priority role wins. |

**`denyWins` (global, default `true`):** Explicit `deny` in policy overrides allows from any role.

**v1 deliverable:** `PolicyService` unit tests for `union_grants` ? `denyWins` matrix. Engine ships with a `RoleMergeStrategy` seam so other modes can be added without refactor.

See [global-options.md](../../docs/foundations/global-options.md).

### Decision: Step 3 pilot Surface (2026-05-28)

**Choice:** The v1 pilot Surface id is **`job_detail`**. It covers use cases **S1**, **S3**, and **S4** in [`use-cases.md`](../../docs/foundations/use-cases.md) (field tech read, PM approval, cross-tech denial).

**Rationale:** One multi-table Surface exercises Field-level permissions (financials hidden from field tech), row-level rules (own jobs), approval (change orders), audit, and hard delete without building the full trades-CRM surface set.

**Locked with this decision (task 00):**

- **D4:** v1 implements **`union_grants` only** with global **`denyWins: true`** (see **Decision: multiple roles ? `multiRoleCombine`** above).
- **D5:** **RLS deferred**; v1 enforcement is DAL-only ([`scope.md`](../../docs/foundations/scope.md)).

## Surface as policy boundary

Most UI and API entry points are **Surface-scoped** (one domain screen family: list, detail, or create on the same anchor entity):

- `PolicyService.resolve(principal, { surface: "job", mode: "list" | "detail", entityId? })` ? one manifest per request
- Same anchor table (e.g. `jobs`) powers list, detail, and bulk; **row scope and Field `read` come from base role policy on that Surface id**, not from separate `*_list` / `*_detail` role files
- Cross-Surface access is explicit (e.g. link from `job` detail to `customer_detail` by id)

### Decision: list and detail are modes on one Surface (2026-06-01)

**Choice:** Use **one Surface id per domain** (e.g. `job`) with **`mode`**: `list`, `detail`, or `create`. **Roles bind once** in base policy (`job.policies.yaml` target shape). **Mode overlays** (optional YAML section or generated equivalent) restrict actions or surfaceActions for a screen; they **must not** grant `read` on a Field denied in base policy.

**Rationale:** Users have roles, not “list roles” vs “detail roles.” If `financial_terms` is not readable for `field_tech`, list and detail must both omit it; detail may still allow `submit` via overlay. Row filters (`rowScope: own`) apply to `GET /jobs` and `GET /jobs/:id` alike. Future RLS on `jobs` keys off the same row semantics, not Surface id suffixes.

**Transitional (Phase 01):** Implementation still uses `job_list` and `job_detail` as separate registry keys and policy files. Semantics follow this decision; consolidation (single id + `PolicyScope.mode` in `PolicyService`) is follow-up work. Until then, **keep base grants aligned** across both files (especially `rowScope` and Field `read`).

**Resolve (target):**

```text
base   = role grants for surface "job"     # rowScope, Field read/write/deny
overlay = mode grants for surface "job"   # list: read-only summary; detail: submit on financial_terms; etc.
manifest.fields = union_grants(base, overlay) with denyWins; overlay cannot add read denied in base
```

`PolicyScope.mode` exists in `@latch/contracts`; wire in `packages/policy` when merging split ids.

See [`../foundations/glossary.md`](../../docs/foundations/glossary.md).

## Field-level permissions

Policies attach to **Field IDs** on a Surface, not raw column names:

```yaml
# Illustrative ? see metadata-and-codegen.md
surface: contract_detail
fields:
  - id: financial_terms
    columns: [contracts.payment_terms, contracts.liability_cap]
```

### Decision: omit vs read-only vs deny (2026-05)

| Manifest | API / DAL | UI |
|----------|-----------|-----|
| No `read` | Field omitted from query and response | Control not rendered |
| `read`, no `write` | Value included | Read-only control |
| Client requests Field without `read` | **403** at gate | N/A |

Optional global setting: **404** instead of **403** for sensitive Fields.

### Decision: grant authoring model v2 (target) (2026-06-18)

**Status:** Target — supersedes **read/write checkbox** role-editor UX (shipped interim in `apps/subhub` and policy spike). Rewriting `PolicyService` / manifest compile is in scope for the implementation wave.

**Choice:** Role editor authors a structured grant model per **(role × surface)** and **(role × surface × field)**. Runtime still resolves to a `Manifest` for DAL/UI; storage may compile to today's sparse `latch_role_grants` rows or evolve schema.

#### Surface capabilities (per role × surface)

| Control | Type | Meaning |
|---------|------|---------|
| **`grantLevel`** | `none` \| `readOnly` \| `update` | List/detail access and ongoing field edit ceiling. `update` ⇒ read + write (no write-without-read). |
| **`canCreate`** | bool | May INSERT new anchor rows (`mode: create` / surface create). Independent of `grantLevel` — e.g. `readOnly` + `canCreate` = create-then-view-only (timesheet). |
| **`canDelete`** | bool | May **hard_delete** anchor ([v1 lifecycle](../../audit/docs/audit-and-lifecycle.md)); no soft delete. |
| **`canRestore`** | bool | May replay eligible **`delete`** audit rows for this surface ([`restoreFromAuditEntry`](../../audit/src/restore.ts)). Implies surface-scoped read of delete audit (deleted-list lens); not a global `latch_audit` admin Surface. |
| **`row_scope`** | `own` \| `all` \| `scope` | Unchanged — on `latch_role_surfaces`; row filter only. |

**Compile (v2 → manifest actions):**

| Authoring | `Manifest` / runtime |
|-----------|----------------------|
| `grantLevel: readOnly` | field `read` |
| `grantLevel: update` | field `read` + `write` |
| `canCreate` | surface `create` (and create-mode field write where applicable) |
| `canDelete` | `hard_delete` (collapse legacy `delete` in contracts) |
| `canRestore` | surface `restore` |

#### Field capabilities (per role × surface × field)

| Control | Type | Rule |
|---------|------|------|
| **`grantLevel`** | `none` \| `readOnly` \| `update` | **Must be ≤ surface `grantLevel`** — enforced in grant-matrix UI and DAL on save. |
| **`canPropose`** | bool | On fields with YAML `requires_verification` — staged **field update** (`submit` ∧ ¬`write`) → `latch_pending_changes` ([Phase 05](../../docs/phases/05-verification/decisions.md)). |
| **`canApprove`** | bool | May accept/reject pending **updates** on those fields (`approve`). |

**`canPropose` / `canApprove` today:** guard **PATCH proposals** on existing rows only. **Target extension** (not shipped): surface-level **`canProposeCreate`**, **`canProposeDelete`**, and unified **`canApprove`** for pending create/delete — same pending store, `kind: create \| update \| delete`.

| Pending kind | Authoring (target) | Live effect after approve |
|--------------|-------------------|---------------------------|
| `update` | `canPropose` on field | PATCH from pending |
| `create` | `canProposeCreate` on surface | INSERT from pending |
| `delete` | `canProposeDelete` on surface | hard_delete from pending |

**Approval ≠ restore:** approval is forward-looking staging; restore is backward replay of a **completed** delete from audit.

#### Invariants

1. **Field `grantLevel` ≤ surface `grantLevel`** (ordered enum).
2. **`update` implies read** — no write-without-read on detail/edit.
3. **`canPropose*` ⇒ at least `readOnly`** on the same field/surface (must see what is proposed).
4. **Allow-only authoring** — absence = deny (P2a); no explicit deny in editor; engine `denyWins` unchanged for tests.
5. **`canRestore` + delete audit:** only rows with full `before` snapshot (role had restore at delete time) are restorable; metadata-only deletes show in deleted lens but Restore disabled.

#### Deleted-list lens (list UI)

Per business **list Surface**, filter/group dropdown includes **Deleted** (trash):

- Lists `latch_audit` rows `action = delete` for `module_id` / surface, anchor absent from live table, filtered by `row_scope`.
- User selects row → **Restore** when `canRestore`.
- API: scoped list query + `POST …/restore { auditId }` — not raw audit table browsing for operators.

#### Shipped interim

Apps still use **read/write checkboxes** in role editors and `FieldAction[]` in contracts. v2 is the **target** for role wave + optional `PolicyService` compile refactor.

**Reference:** SubHub decision + role-editor spec — [`apps/subhub/docs/decisions/iam.md`](../../../apps/subhub/docs/decisions/iam.md#decision-grant-authoring-model-v2-target-2026-06-18), [`apps/subhub/docs/surface-specs/iam-role.md`](../../../apps/subhub/docs/surface-specs/iam-role.md) § L.

**Rationale:** Encodes write⇒read, surface/field hierarchy, create-without-edit, hard delete + audit restore UX, and approval staging without write-without-read footguns. `PolicyService` / `@latch/contracts` may be refactored to compile v2 → manifest rather than bolting on checkboxes.

## Row-level rules

### Decision: row scope v1 + expansion deferred (2026-06-06)

**Choice:** v1 exposes two `row_scope` values on `latch_role_surfaces`, resolved into `manifest.rowScope`:

| Value | Meaning |
|-------|---------|
| **`own`** | Principal sees only rows **linked to them** — implemented per Surface in the store's `isRowVisibleToPrincipal` (pilot jobs: assignment join). |
| **`all`** | No row filter; all rows on the Surface (subject to field grants). |

Set **once per (role, surface)** on `latch_role_surfaces`; applies to list, detail, and bulk alike. When a user holds multiple roles, `mergeRowScope` takes the most permissive (`all` beats `own`).

**Deferred (post-v1):** richer scopes (team/colleagues, manager subtree, site-scoped, etc.) via additional `row_scope` enum values and/or Surface row-rule metadata; ABAC/ReBAC remains out of v1 ([`scope.md`](../../docs/foundations/scope.md)). Keep `row_scope` as a string column so new values do not require a breaking DDL change.

**Rationale:** Covers the pilot personas without committing to a full row-rule language. Policy passes `own`/`all`; the store owns *how* “own” is evaluated.

### Decision: bounded scope primitive — `row_scope: scope` + scoped delegation (2026-06-09)

**Choice (seam locked; full build is a dedicated phase):** Add a third `row_scope` value **`scope`** plus a bounded **scope primitive** for branch/site/crew isolation and local role delegation. This is *namespaced RBAC*, not ABAC/ReBAC. Canonical model + rationale: [`../discussions/09-role-delegation-and-scope.md`](../../docs/discussions/09-role-delegation-and-scope.md#decision-bounded-scope-primitive--scoped-delegation-2026-06-09).

**Seam edits this flags (additive, no breaking DDL):**

| Surface | Change |
|---------|--------|
| `row_scope` enum | gains `scope` (third rung: `own ⊂ scope ⊂ all`); `mergeRowScope` keeps most-permissive |
| `latch_scopes` (new table) | boundary registry: `id`, `kind`, `parent_id?`, `display_name` (app instantiates) |
| `latch_user_roles` | nullable `scope_id` FK → `latch_scopes.id` (`NULL` = company-wide) |
| `latch_role_delegations` (new table) | `(role_id, assignable_role_id)` allow-list for delegated assigners |
| business rows | app `scope_id` column tags each row to a boundary |
| `Principal` (contracts) | scoped bindings `{ roleId, scopeId \| null }[]` instead of flat `RoleId[]` |
| `Manifest` (contracts) | optional `scopeIds` (the principal's scopes for a `scope`-rung role) |

**Rung-per-role:** `scope`-rung roles filter `WHERE scope_id IN (manifest.scopeIds)`; `own` ignores scope (assignment join already crosses boundaries); `all` ignores it. **Field/action grants stay role-level** — scope narrows rows only; per-scope differential field grants are **deferred**.

**System classes stay unscoped:** `system_iam` / `system_data` are always company-wide (`scope_id = NULL`); scope qualifies **`app` roles only**. Scoped administration ("branch admin") is an app role on an IAM Surface + scope.

**Delegation (three dials, default closed):** capability (`read`/`write` grant on IAM Surface `user_roles_detail`) × which-roles (`latch_role_delegations` allow-list) × where (scope fence: target `scope_id` ∈ actor's delegator scopes). Adopts discussion 09 **Option B + C-lite**.

### Future patterns (proposal)

Common patterns within a company database:

- Owner: `created_by = current_user`
- Assignment: join to `assignments` table
- Hierarchy: manager sees subtree

**Proposal:** row rules in Surface metadata; compile to RLS where useful; DAL applies `WHERE` clauses.

## DAL (application layer)

**Decision (2026-05):** All application access goes through the **DAL** with `PermissionContext` (manifest + principal + active Surface).

The DAL:

- Loads only tables/views declared for the active Surface
- Projects columns from allowed Fields only
- Applies row filters from manifest / metadata
- Rejects writes to non-writable Fields

## Postgres integration (safety net)

See [postgres-rls-and-security.md](../../docs/discovery/postgres-rls-and-security.md).

**Hybrid:** DAL + manifest for Field-level and UI sync; RLS for row rules where discovery confirms value.

## Bulk operations

Bulk update/delete is part of v1. The per-row evaluation model is documented in [`bulk-operations.md`](../../dal/docs/bulk-operations.md). Key invariant: bulk paths use the same `PolicyService` + `PermissionContext` as single-record paths ? *no parallel enforcement*.

## Open points

Deny policy YAML syntax, break-glass audit, per-Surface override of `multiRoleCombine`. Multi-company DB routing is deferred ([`../scope.md`](../../docs/foundations/scope.md)).

Identity storage, D2 auth provider (Auth.js), and built-in catalog are locked in [`../phases/03-identity-iam/decisions.md`](../../docs/phases/03-identity-iam/decisions.md).
