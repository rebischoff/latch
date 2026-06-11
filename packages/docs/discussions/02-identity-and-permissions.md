# Discussion 02 — Identity & Permissions

> **Status:** Open (2026-06-05). Compartment 2 in the [map](../reference/compartments.md#2-identity--permissions).

## Shared understanding

Three sub-things, often lumped together:

| Sub-thing | What | Where | Category |
|-----------|------|-------|----------|
| **Identity** | who the user is | `latch_users` + auth library | platform table + per-app auth |
| **Assignments** | which roles a user has | `latch_user_roles` (runtime data) | platform table |
| **Definitions** | what a role may do | `latch_roles` + `latch_role_surfaces` (`row_scope`) + `latch_role_grants` (sparse allows); Field/action **vocabulary** still codegen-emitted | platform tables + per-app vocab |

- The **manifest** is the resolved result of (principal.roles × policy definitions) for one surface — computed in memory per request, not stored as a blob.
- **Role definitions are runtime DB data** (Decision below, 2026-06-06) — `latch_roles` (catalog), `latch_role_surfaces` (per role × surface `row_scope`), and sparse `latch_role_grants` (explicit allow-rows only; default deny). Codegen no longer emits grants; it emits only the Field/action **vocabulary** the role editor validates against. *(Supersedes Decision H's "YAML is the single source of truth for grants"; the YAML→TS hand-sync drift risk it solved is now moot because grants aren't generated at all.)*
- **Assignments are runtime DB data** — never codegen. `latch_user_roles.role_id` FK → `latch_roles.id` with **`ON DELETE RESTRICT`** — a role cannot be deleted while users hold it; revoke via `user_roles_detail` first.
- **`latch_roles` is a platform table** (added 2026-06-06). Template seeds one **`system_data`** and one **`system_iam`** row (UUID PK, **DB-generated**; identified by `role_class` via the singleton index, not a fixed id; not app-deletable); grants for both are synthesized in `PolicyService` from `role_class`, not stored as grant rows ([P11](../../packages/policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)).
- **Two built-in roles** exist: `data_master` (business wildcard) and `iam_master` (manage users/roles). A single user can hold both.
- **Editing users/roles is itself a Surface** (`user_roles_detail` in CRM) — permission-gated, persists to `latch_user_roles`, audited.

### Decision: Auth library & policy source — opinionated/flexible (2026-06-05)

Sorted via the [spine-vs-skin rule](./00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05):

- **F — Auth library (flexible, one constraint):** the auth library is **the app's choice**, but `latch_users` is the **single identity table**. To avoid a second user table that must be synced, the auth library runs in **session/JWT-only mode and must NOT own its own user table**; the `getPrincipal` seam maps the provider's subject id → `latch_users.id` (roles load from the DB). The template ships **one reference adapter** (e.g. Auth.js session) as a starting point, swappable. *(This resolves the "two user stores" question — answer: one store, `latch_users`.)*
- **H — Policy definitions (opinionated):** the runtime registry is **generated from `*.policies.yaml`** — YAML is the single source of truth. See [01-codegen](./01-codegen.md) for the generator side. *(Supersedes point 2's "definitions stay per-app, hand-synced" framing: definitions are still **authored per-app**, but **no longer hand-synced into TS** — they're generated.)* **Superseded for grants by the Decision below (2026-06-06).**

### Decision: roles are runtime data, not codegen (2026-06-06)

**Choice:** Reverses the "definitions live in code/YAML" half of Decision H. Role **definitions** — the role catalog, per-(role,surface) `row_scope` bindings, and sparse field/action grants — are **runtime DB data**, CRUD'd by app users through a permission-gated IAM Surface (sibling of `user_roles_detail`), audited like any mutation. New platform tables: `latch_roles` (catalog), `latch_role_surfaces` (`row_scope` per role × surface), and `latch_role_grants` (one row per explicit allow; optional `mode`). Deleting an app role cascades grant/binding rows; assignments **RESTRICT** deletion until revoked. Codegen's policy job narrows to emitting the **Field/action vocabulary** per Surface (the generated `FieldIds` + the closed action set); the role editor uses that vocabulary as its allowed-options menu and rejects grants outside it. `*.policies.yaml` is retired as the grant source (kept, if at all, only as optional seed data). The two built-ins (`data_master`, `iam_master`) remain synthesized/seeded in code and are not app-deletable catalog rows.

**Rationale:** Assignments were already runtime; keeping definitions at build time meant every permission change was a dev redeploy. The safety invariant is preserved by splitting **vocabulary (codegen, build time) from grants (DB, runtime)**: the resolver and the role editor both read the codegen Field catalog, so a runtime grant can never reference a Field the Surface doesn't define. `PolicyService.resolve` gains a DB-backed grant source in place of the static per-role bindings in the registry (`SurfacePolicyDefinition.roles`). Grant-row granularity (rows vs blob) and mode-overlay editing are to be fine-tuned in a follow-up discussion. See [`../foundations/scope.md`](../foundations/scope.md) for the v1 scope change and [`01-codegen.md`](./01-codegen.md) for the codegen side.

### Decision: built-in roles — storage, synthesis, exclusivity, bootstrap (2026-06-06)

Re-evaluated the user/roles contract from scratch (supersedes an interim "boolean columns on `latch_users`" sketch). Canonical fork detail: [P4 / P4a / P4b](../../packages/policy/docs/tasks/00-decisions-needed.md#p4--iam_master-grants-synthesized-in-code-or-db-seeded-rows-doc-tension--resolve-first).

**Choice:**

- **Synthesis (both system classes).** `system_data` (wildcard on Surface `kind: business`) and `system_iam` (wildcard on Surface `kind: iam`) are synthesized in `PolicyService` from catalog `role_class`; neither has `latch_role_grants` rows.
- **Uniform storage.** System assignments are ordinary `latch_user_roles` rows (catalog UUID FKs). No built-in columns on `latch_users`. `Principal` stays `{ id, roles: RoleId[], policyVersion? }` (`RoleId` = catalog UUID string).
- **Separation of duties.** `system_data` = data plane; `system_iam` = control plane. Composable on one user; `system_data` alone cannot widen IAM access.
- **Exclusivity (write-time validation).** `system_data` may **not** combine with `app` roles (may combine with `system_iam`); `app` roles only when `system_data` is absent.
- **Privileged assignment (2026-06-08).** Assign `system_iam` only if actor holds `system_iam`; assign `system_data` only if actor holds `system_data`; hold both → assign both.
- **Bootstrap.** Provisioning seeds one initial super admin (`data_master` + `iam_master`). The assignment DAL refuses to remove the **last** `iam_master`. An env break-glass (`LATCH_BOOTSTRAP_ADMIN_EMAIL`) promotes on login when zero `iam_master` exist; synthesis makes the promoted user immediately functional.

**Rationale:** One assignment table = one source of truth for a user's roles and a uniform resolver; `role_class` encodes plane + deletability ([P11](../../packages/policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)). Synthesizing both removes the bootstrap chicken-and-egg while keeping the codegen-vocabulary safety property. Separation of duties + per-class assignment keep cross-plane escalation in check.

## Points to confirm

1. `latch_users`, `latch_user_roles`, `latch_policy_version` are **platform/template tables** (identical shape every app).
2. Policy **definitions are runtime DB data** (per-company DB), not per-app code; assignments are data too. **(Updated 2026-06-06 — see "roles are runtime data" Decision; supersedes Decision H for grants. Only the Field/action *vocabulary* stays per-app/codegen.)**
3. Standardize **two built-in roles** — one business (`data_master`), one IAM (`iam_master`); one user may hold both.
4. Every app has permissions, even with **one user / one role** — mandatory by design.
5. The **"edit users/roles" page should be a templated IAM Surface**, not bespoke per app.
6. The **auth library is a per-app seam** (`getPrincipal` → `{ id, roles }`), but the **template picks one default** for all our apps while keeping it swappable. **(Confirmed — F: flexible library, one identity table.)**

## Open questions

- ~~Which auth library is the template default?~~ **Flexible (F)** — the template ships one *reference* adapter, but no library is mandated.
- ~~Two stores for identity (auth user vs `latch_users`) or one?~~ **Resolved (F): one — `latch_users`.** Auth library stays session/JWT-only. (See [`apps/test1/docs/discussions/01-identity-two-user-stores.md`](../../apps/test1/docs/discussions/01-identity-two-user-stores.md).)
- ~~Do we ever need a DB-backed role catalog (`latch_roles`), or are string ids + YAML enough?~~ **Resolved (2026-06-06): yes — `latch_roles` + `latch_role_grants`, with grants CRUD'd by app users. See the "roles are runtime data" Decision above.**
- Should the IAM Surface ship in the template, or be opt-in?
- How do **non-`iam_master`** users assign roles "within their scope"? Split to [discussion 09 — role delegation & scope](./09-role-delegation-and-scope.md) (leaning subset-of-self for v1; org-chart / region / RLS scope is the template line-drawing question).

## Related

- [`../reference/access-control.md`](../reference/access-control.md), [`packages/policy/src/policy-service.ts`](../../packages/policy/src/policy-service.ts)
