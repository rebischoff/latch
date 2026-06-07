# 00 — Decisions needed (parking lot)

> **Status:** Partially resolved (2026-06-06). P1, P2, P2a, P3, **P4** locked and graduated. **P4a** (built-in storage + exclusivity) and **P4b** (first-admin bootstrap) locked here. P5–P10 open as noted; **scoped role delegation** split to [discussion 09](../../../../docs/discussions/09-role-delegation-and-scope.md). Not a task — a parking lot for forks that **block** or **shape** runtime-roles work.

The big architectural choice is already locked — **"roles are runtime data"** (2026-06-06, see the discussion). These are the *fine-tune forks* that the locked decision deferred. Tasks are gated as noted; nothing here re-opens the runtime-data decision itself.

> **Boundary reference:** vocabulary (Surfaces/Fields/actions that *exist*) is codegen, build time; grants (who gets what) are DB, runtime. Neither of those moves. These items are *how* the runtime grant layer is shaped — see [`docs/reference/codegen-scope.md`](../../../../docs/reference/codegen-scope.md) and [`access-control.md`](../../../../docs/reference/access-control.md).

---

## Blocks task 01 (DDL + seeds)

### P1 — `row_scope` granularity: per grant row, or per (role, surface)?

**Question:** `rowScope` (`own` | `all`) is a property of a role's binding to a Surface, not of a single Field/action. Where does it live?

- **Per grant row** — `latch_role_grants.row_scope` on every `(role, surface, field, action)` row. Simple single table; the provider takes the max across a role×surface group (matches `mergeRowScope`).
- **Per (role, surface)** — a companion column on a `latch_role_surfaces` row (or a small side table). No duplication; one authoritative value per role×surface.

**Why it matters:** Shapes the task 01 DDL and the `DbRoleGrantProvider` aggregation (P5). `PolicyService.mergeRowScope` already takes the most-permissive scope across role policies, so per-row works if authored consistently — but "authored consistently" no longer means "by a developer in YAML."

### Decision: `row_scope` lives per (role, surface) (2026-06-06)

**Choice:** Store `row_scope` **once per `(role, surface)`** — on a `latch_role_surfaces` binding row (or an equivalent single authoritative column per role×surface), **not** duplicated on every field×action grant row. `latch_role_grants` rows carry no `row_scope`.

**Rationale:** The "[roles are runtime data](../../../../docs/discussions/02-identity-and-permissions.md)" reversal means an **app user** edits grants through the IAM Surface matrix, not a developer in YAML. The editor exposes **one** "row scope: own / all" control per role×surface; per-row storage would force the write path to fan that single value across every grant row and the read path to collapse it via `mergeRowScope`, creating an inconsistency hazard a human editor can trip (e.g. half a role's rows say `own`, half say `all`). One authoritative value per `(role, surface)` maps 1:1 to the control and removes the hazard. `PolicyService` is **unchanged** — it already reduces to one `rowScope` per role×surface before the cross-role merge; only the `DbRoleGrantProvider` fold reads the binding row instead of a grant-row column. Cross-**role** merge still uses `mergeRowScope` (`all` beats `own`).

**Status:** Locked (per `(role, surface)`). Task 01 ([`01-role-tables.md`](./01-role-tables.md)) DDL aligned: `latch_role_surfaces(role_id, surface_id, row_scope, …)` binding table; **no `row_scope` on `latch_role_grants`**.

### Decision: `row_scope` values v1 — `own` | `all`; expansion deferred (2026-06-06)

**Choice:** v1 stores only **`own`** and **`all`** on `latch_role_surfaces.row_scope` (and `RowScope` in `@latch/contracts`). **`own`** means “rows visible to this principal per the Surface store” (pilot: assignment join on jobs). **`all`** means no row filter. Cross-role merge: `all` beats `own` (`mergeRowScope`). Richer patterns (team, colleagues, manager subtree, site-scoped, etc.) are **deferred** — see [`access-control.md`](../../../../docs/reference/access-control.md#decision-row-scope-v1--expansion-deferred-2026-06-06).

**Rationale:** Two values cover the pilot (`field_tech` / `office_admin`) without committing to ABAC/ReBAC. Keep `row_scope` as a string column so new enum values can land without a breaking DDL change.

**Status:** Locked for v1. Expansion tracked in access-control open points.

---

### P2 — FK `latch_user_roles.role_id` → `latch_roles.id`?

**Question:** Should assignments reference the catalog by foreign key now that `latch_roles` exists?

**Why it matters:** Prevents orphan assignments (a user assigned a deleted/never-defined role). Requires built-in catalog rows to be seeded **before** any assignment seed (ordering).

### Decision: role catalog FKs + delete semantics (2026-06-06)

**Choice:**

- **`latch_user_roles.role_id` → `latch_roles.id`** with **`ON DELETE RESTRICT`**. A role **cannot** be deleted while one or more users are assigned; operators revoke via `user_roles_detail` first.
- **`latch_role_grants.role_id`** and **`latch_role_surfaces.role_id` → `latch_roles.id`** with **`ON DELETE CASCADE`**. When an app role is deleted (no assignments left), grant and binding rows are removed automatically.
- **Seed order:** `latch_roles` (built-ins + pilot app roles per P3) **before** any `latch_user_roles` assignment seeds in the same migration chain.
- **Built-ins:** `data_master` and `iam_master` seeded with `is_builtin = true`; role editor (task 03) **must not** delete or edit them.

**Rationale:** RESTRICT on assignments forces an explicit revoke path (audited via `user_roles_detail`) instead of silently stripping roles from users when a catalog row disappears. CASCADE on grants/bindings avoids orphan definition rows and matches the Phase 04 “DAL deletes anchor; DB cascades structural children” pattern — here the anchor is `latch_roles`. The FK on assignments also blocks typo/unknown `role_id` strings at insert time.

**Status:** Locked. Task 01 DDL aligned. Graduated to [`access-control.md`](../../../../docs/reference/access-control.md) and [`02-identity-and-permissions.md`](../../../../docs/discussions/02-identity-and-permissions.md).

---

### P3 — Seed pilot app roles, or start the catalog empty?

**Question:** Decision 1 says only `data_master` / `iam_master` are code-defined and the catalog "otherwise starts empty." But the 2026-06-06 scope reversal turned `field_tech` / `office_admin` into runtime rows. Do we seed them, or leave the catalog to app users?

**Why it matters:** A fresh DB with an empty catalog can't reproduce the pilot personas without the role editor (task 03) existing first — a bootstrapping gap for tests/spike.

### Decision: seed pilot app roles as deletable runtime rows (2026-06-06)

**Choice:** Seed **`field_tech`** and **`office_admin`** in `latch_roles` as `kind: app`, `is_builtin: false`, with sparse `latch_role_surfaces` / `latch_role_grants` rows (only surfaces/fields the persona needs — **not** a full matrix). They remain app-editable/deletable via the role editor (task 03), subject to P2 RESTRICT while assigned.

**Rationale:** Reproducible spike/harness and tests without depending on task 03. Built-ins stay the only non-deletable catalog rows.

**Status:** Locked. Task 01 seeds aligned.

---

### P2a — Sparse grants (default deny)

**Question:** When a user creates a `latch_roles` row, must `latch_role_grants` be populated for every Surface and Field?

### Decision: sparse grants, default deny (2026-06-06)

**Choice:** **No.** New roles start with **zero** grant rows (no permissions) until an `iam_master` adds them in the role editor. Only explicit `(role, surface, field, action)` rows are stored; ungranted Fields resolve to empty action lists (`ensureFieldKeys` → default deny). `latch_role_surfaces` rows are created **per surface configured** in the editor, not for every Surface in the app.

**Rationale:** Matches Phase 03 default-deny semantics and keeps the grant table small. A role with no grants is valid (inert until configured).

**Status:** Locked. Graduated to [`access-control.md`](../../../../docs/reference/access-control.md).

---

### P4 — `iam_master` grants: synthesized in code, or DB-seeded rows? **(doc tension — resolve first)**

**Question:** The discussion says **both** built-ins are "synthesized/seeded in code." In the code today, only `data_master` is synthesized ([`synthesizeDataMasterBinding`](../../src/policy-service.ts)); `iam_master` grants come from the `RoleGrantProvider` (see the `iam_console` fixture in [`policy-service.test.ts`](../../src/policy-service.test.ts)). Which is canonical?

- **Synthesize `iam_master` in code** (mirror `data_master`): wildcard `read`/`write` on all `kind: iam` Surfaces. Avoids the chicken-and-egg of "who seeds the grants that let someone reach the role editor."
- **DB-seed `iam_master` grants** as normal rows: uniform with app roles, but a botched seed/edit could lock everyone out of IAM.

**Why it matters:** Decides whether `@latch/policy` gains a `synthesizeIamMasterBinding` + `IAM_MASTER_ROLE_ID` (and a `kind: iam` wildcard branch in `resolve`), and whether task 01 seeds `iam_master` grants at all. This is the one item where the docs and code currently disagree.

### Decision: synthesize **both** built-ins in code (2026-06-06)

**Choice:** Both built-ins are synthesized in `PolicyService`, never stored as `latch_role_grants` rows:

- `data_master` → wildcard `read`/`write` on every `kind: business` Surface (already shipped — `synthesizeDataMasterBinding`).
- `iam_master` → wildcard `read`/`write` on every `kind: iam` Surface (**new** — add `IAM_MASTER_ROLE_ID` + `synthesizeIamMasterBinding`, parallel branch in `resolve`).

Catalog rows for both stay seeded with `is_builtin = true`. The `iam_console` test fixture moves off the grant provider onto synthesis (parallel to the `data_master` throwaway-Surface test).

**Rationale:** Symmetry (one mental model: business plane ↔ control plane), and it removes the bootstrap chicken-and-egg — an empty or broken `latch_role_grants` table can never strip IAM access, because `iam_master` grants come from code + registry, not data. Synthesis reads `surfaceDef.fieldIds` from the codegen vocabulary, so a built-in can never reference a Field its Surface doesn't define. `data_master` still gets **no** IAM synthesis (separation of duties — see P4a).

**Status:** Locked (synthesize both). Graduated to [`02-identity-and-permissions.md`](../../../../docs/discussions/02-identity-and-permissions.md) and [`access-control.md`](../../../../docs/reference/access-control.md). Task 01 seeds catalog rows only; task 02c wires `synthesizeIamMasterBinding`.

---

### P4a — Built-in role storage + exclusivity **(blocks task 01 seeds + task 03/assignment DAL)**

**Question:** Where do built-in *assignments* live, and may `data_master` stack with app roles? (Re-evaluated 2026-06-06 — supersedes the earlier "two boolean columns on `latch_users`" sketch.)

### Decision: uniform assignment storage; `is_builtin` is a catalog flag; `data_master` is exclusive (2026-06-06)

**Choice:**

- **One assignment table.** `data_master` / `iam_master` are ordinary `latch_user_roles` rows. There are **no** built-in boolean columns on `latch_users`. "Built-in" is a property of the **role catalog** (`latch_roles.is_builtin`), not of where the assignment is stored. `Principal.roles` stays a flat `RoleId[]` and `resolve` stays uniform.
- **Separation of duties.** Two built-ins, composable on one user: `data_master` (data plane — business Surfaces) and `iam_master` (control plane — users, assignments, role definitions). A `data_master` alone **cannot** widen access; that needs `iam_master`.
- **Exclusivity (validation, not storage).** The assignment DAL rejects role sets where:
  - `data_master` is combined with **any app role** (synthesis already grants full business access; app roles are redundant and create audit confusion). `data_master` may still stack with `iam_master`.
  - `iam_master` may be assigned alone or alongside `data_master`; app roles are allowed only when `data_master` is absent.
- **Privileged assignment.** Only `iam_master` may assign/revoke a role whose catalog row is `is_builtin = true`. Delegated (non-`iam_master`) assigners are app-roles-only — see [discussion 09](../../../../docs/discussions/09-role-delegation-and-scope.md).

**Rationale:** Uniform storage keeps one source of truth for "what roles does a user have" and avoids special-casing the resolver. Making `is_builtin` a catalog flag means "assigning a built-in is more privileged" collapses to a single check (*is the target `role_id` built-in?*) rather than "column write vs junction write," and a third built-in later needs no schema change. Exclusivity is enforced at write time, so it holds regardless of storage.

**Status:** Locked. Task 01 (`latch_roles.is_builtin`), task 10-style assignment DAL (exclusivity + built-in guard), and task 03 (editor) align.

---

### P4b — First-admin bootstrap + last-admin protection **(blocks task 01 seeds)**

**Question:** A fresh company DB has no `iam_master`, so no one can reach the IAM Surface to create one — and nothing guarantees an admin survives a bad revoke. How is the first admin established and protected?

### Decision: provision-time super-admin seed + last-`iam_master` invariant + break-glass (2026-06-06)

**Choice:**

1. **Provision seed.** Each per-company DB is provisioned from the migration template; that step seeds **exactly one** user assigned **both** built-ins (`data_master` + `iam_master`) — the initial super admin. Deterministic, audited, no race.
2. **Last-admin protection.** The assignment DAL refuses any revoke/replace that would leave **zero** `iam_master` users. This is the primary anti-lockout rule.
3. **Break-glass (defense in depth).** An env-gated bootstrap (`LATCH_BOOTSTRAP_ADMIN_EMAIL`) promotes that identity to `iam_master` on login **only when the DB currently has zero `iam_master`**. Because `iam_master` is synthesized (P4), the promoted user is immediately functional with no grant rows. Avoid "first user to sign up becomes admin" outside local/dev (race + internet-facing footgun).

**Rationale:** Provisioning is the natural, auditable place to mint the first admin; the last-admin invariant prevents the most common self-inflicted lockout; break-glass guarantees recovery even if the seed is skipped, leaning on built-in synthesis so recovery needs no data repair.

**Status:** Locked. Task 01 seeds the super-admin; assignment DAL adds the last-`iam_master` guard; break-glass env documented with the seed.

---

## Blocks task 02 (DB-backed provider wiring)

### P5 — `DbRoleGrantProvider` location + sync-resolve strategy

**Question:** `PolicyService.resolve` is **sync** (locked in [task 02](./02-role-grant-provider.md)). A DB provider is inherently async. Where does the provider live and how does it stay sync at resolve time?

- **Location:** `@latch/policy` (alongside `MemoryRoleGrantProvider`) vs a store package (e.g. `@latch/store-drizzle`) vs the app. Mirror how the audit/pending stores are seamed.
- **Sync strategy:** request-scoped **preload** — load all grants for the principal's roles once per request at bootstrap, hand `PolicyService` a sync provider backed by that snapshot. (Aligns with the manifest cache's request scope, Phase 06.)

**Why it matters:** Determines the task 02 implementation surface and whether `@latch/policy` takes a DB dependency (it should not — keep it pure; the DB provider belongs in a store/app layer feeding a sync snapshot).

**Recommendation:** Provider **interface stays in `@latch/policy`** (already does). The **DB implementation lives in the app/store layer** and does a per-request preload into a `MemoryRoleGrantProvider`-shaped snapshot. No async in `resolve`.

**Status:** Proposal. Confirm when starting task 02 DB wiring.

---

### P6 — `validateGrantAgainstCatalog` helper home

**Question:** Task 03 needs write-time validation ("can't grant a Field/action the Surface doesn't define"). Is that a reusable `@latch/policy` helper or app-local?

**Recommendation:** Ship `validateGrantAgainstCatalog(grant, surfaceDef)` in `@latch/policy` (pure function over the vocabulary catalog), consumed by the role-editor DAL. Keeps the safety check next to the resolver that also reads the catalog.

**Status:** Proposal. Confirm at task 03.

---

## Blocks task 03 (role editor Surface) — can defer

### P7 — Mode overlays editable in v1?

**Question:** `latch_role_grants.mode` (per-screen `list`/`detail`/`create` narrowing) — author it in v1, or leave the column unused?

**Recommendation:** **Defer.** Keep the `mode` column nullable and out of the grant PK; the editor writes `mode = NULL` (applies to all modes) in v1. Revisit in a follow-up discussion.

**Status:** Proposal (defer). Confirm at task 03.

---

### P8 — Self-escalation guard for the role editor

**Question:** When an `iam_master` edits grants that would widen *their own* effective permissions — deny, or allow with extra audit?

**Recommendation:** **Deny self-affecting grant edits** by default, mirroring `user_roles_detail` self-patch denial (Phase 03 decisions). Operators use a second `iam_master` principal. Document if relaxed. (Scoped **assignment** delegation for non-`iam_master` users is a separate fork — see [discussion 09](../../../../docs/discussions/09-role-delegation-and-scope.md).)

**Status:** Proposal (deny). Confirm at task 03.

---

### P9 — Role editor: one Surface or split (catalog vs grant matrix)?

**Question:** `role_detail` (catalog row only) vs `role_detail` + `role_grants_detail` (separate grant matrix Surface).

**Recommendation:** **One Surface** (`role_detail`) with nested grant fields first; split into a dedicated grant-matrix Surface only if the UX/permission story demands it.

**Status:** Proposal (one Surface). Confirm at task 03.

---

## Cross-cutting (not a code blocker, but plan it)

### P10 — Test harness after `apps/crm` deletion

**Question:** `tests/threat.test.ts` still imports `@latch/crm` and `apps/crm/*` (now deleted). Where do the IAM/threat/e2e assertions for runtime roles live?

**Why it matters:** CI is red until this is resolved; task 03's threat tests need a host.

**Recommendation:** Treat `apps/spike_policy` as a **fixture** (DDL + Drizzle schema + registry assembly), and keep assertions in `packages/policy/src/*.test.ts` (vitest only scans `packages/**`). The fuller threat/e2e harness lands with the template app (discussion 07) — track separately, do not block task 01/02 on it.

**Status:** Proposal (spike = fixture; full harness with template). Confirm during planning.

---

## Related

- [`docs/discussions/02-identity-and-permissions.md`](../../../../docs/discussions/02-identity-and-permissions.md) — "roles are runtime data" Decision (the locked parent)
- [`docs/foundations/scope.md`](../../../../docs/foundations/scope.md) — v1 scope change
- [`docs/reference/access-control.md`](../../../../docs/reference/access-control.md) · [`compartments.md`](../../../../docs/reference/compartments.md)
- Tasks: [`01-role-tables.md`](./01-role-tables.md) · [`02-role-grant-provider.md`](./02-role-grant-provider.md) · [`03-role-editor-surface.md`](./03-role-editor-surface.md)
- Engine: [`policy-service.ts`](../../src/policy-service.ts) · [`grant-provider.ts`](../../src/grant-provider.ts) · [`registry.ts`](../../src/registry.ts)
