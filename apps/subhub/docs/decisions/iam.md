# SubHub decisions — IAM

> Role catalog, grant matrix, and IAM Surface conventions. **Grant model v2** below is **platform intent** (applies to `@latch/policy`, `@latch/dal`, role editor, and all apps) — mirrored in [`packages/policy/docs/access-control.md`](../../../../packages/policy/docs/access-control.md#decision-grant-authoring-model-v2-target-2026-06-18). Platform baseline: Phase 03 [`decisions.md`](../../../../packages/_docs/phases/03-identity-iam/decisions.md), [approval / pending](../../../../packages/_docs/discussions/03-approval.md), [audit restore](../../../../packages/audit/docs/audit-and-lifecycle.md).

[Index](./README.md) · [All decisions](./README.md)

---

### Decision: grant authoring model v2 (target) (2026-06-18)

**Status:** Target — supersedes **read/write checkbox** role-editor UX (shipped interim). Rewriting `PolicyService` / manifest compile is in scope for the implementation wave.

**Choice:** Role editor authors a structured grant model per **(role × surface)** and **(role × surface × field)**. Runtime still resolves to a `Manifest` for DAL/UI; storage may compile to today’s sparse `latch_role_grants` rows or evolve schema.

#### Surface capabilities (per role × surface)

| Control | Type | Meaning |
|---------|------|---------|
| **`grantLevel`** | `none` \| `readOnly` \| `update` | List/detail access and ongoing field edit ceiling. `update` ⇒ read + write (no write-without-read). |
| **`canCreate`** | bool | May INSERT new anchor rows (`mode: create` / surface create). Independent of `grantLevel` — e.g. `readOnly` + `canCreate` = create-then-view-only (timesheet). |
| **`canDelete`** | bool | May **hard_delete** anchor ([v1 lifecycle](../../../../packages/audit/docs/audit-and-lifecycle.md)); no soft delete. |
| **`canRestore`** | bool | May replay eligible **`delete`** audit rows for this surface ([`restoreFromAuditEntry`](../../../../packages/audit/src/restore.ts)). Implies surface-scoped read of delete audit (deleted-list lens); not a global `latch_audit` admin Surface. |
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
| **`canPropose`** | bool | On fields with YAML `requires_verification` — staged **field update** (`submit` ∧ ¬`write`) → `latch_pending_changes` ([Phase 05](../../../../packages/_docs/phases/05-verification/decisions.md)). |
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
4. **Allow-only authoring** — absence = deny (P2a); no explicit deny in editor ([prior decision](#decision-iam-role-editor--allow-only-grants-2026-06-18)); engine `denyWins` unchanged for tests.
5. **`canRestore` + delete audit:** only rows with full `before` snapshot (role had restore at delete time) are restorable; metadata-only deletes show in deleted lens but Restore disabled.

#### Deleted-list lens (list UI)

Per business **list Surface**, filter/group dropdown includes **Deleted** (trash):

- Lists `latch_audit` rows `action = delete` for `module_id` / surface, anchor absent from live table, filtered by `row_scope`.
- User selects row → **Restore** when `canRestore`.
- API: scoped list query + `POST …/restore { auditId }` — not raw audit table browsing for operators.

#### Shipped interim

SubHub (and platform spike) still use **read/write checkboxes** in `GrantMatrix` and `FieldAction[]` in contracts. v2 is the **target** for role wave + optional `PolicyService` compile refactor.

**Spec:** [`surface-specs/iam-role.md`](../surface-specs/iam-role.md) § L · Platform pointer: [`access-control.md`](../../../../packages/policy/docs/access-control.md#decision-grant-authoring-model-v2-target-2026-06-18).

---

### Decision: IAM role catalog — app CRUD, system cosmetic edit (2026-06-18)

**Choice:**

| `role_class` | Create | Edit `display_name` | Edit grants / bindings | Delete |
|--------------|--------|---------------------|------------------------|--------|
| `app` | Yes — sparse start (P2a) | Yes | Yes | Yes when no `latch_user_roles` rows |
| `system_data`, `system_iam` | No (template-seeded) | **Yes** (cosmetic label only) | No — synthesized in `PolicyService` | No — DB trigger |

`role_class` remains DB-immutable. Renaming "Data master" does not change synthesis or permissions.

**Rationale:** `display_name` is UI/audit chrome ([P11](../../../../packages/policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)); security is keyed on `role_class` + grant rows. Shipped SubHub over-blocks system rows (fully read-only) — relax to this table at identity/role wave.

**Spec:** [`surface-specs/iam-role.md`](../surface-specs/iam-role.md).

---

### Decision: IAM role editor — allow-only grants (2026-06-18)

**Choice:** Grant matrix authors **allow rows only**. Absence of a grant = default deny (P2a). **No** explicit `effect: deny` in the role editor — engine `denyWins` stays for tests/static policy only ([platform deferral](../../../../packages/_docs/reference/platform-status.md)).

**Shipped UX:** independent `read` / `write` checkboxes. **Target UX:** [`grantLevel`](#decision-grant-authoring-model-v2-target-2026-06-18) (`none` \| `readOnly` \| `update`) — still allow-only.

**Rationale:** Per-role matrix cannot show cross-role merge outcomes; explicit deny on one role while another role grants the same action is unmaintainable without an effective-permissions preview. Revisit only with per-user or per-user×surface simulator UI.

---

### Decision: IAM role create — list POST + New toolbar (2026-06-18)

**Choice:** Creating an `app` role is a **`role_list`** operation, not a detail PATCH:

1. Toolbar **New role** on `/roles` (manifest `create` on `role_list`).
2. Navigate to **`/roles/new`** — blank detail form ([`/new` create route](./general.md#decision-surface-create-route--new--db-assigned-id-2026-06-25)).
3. **Save** → `POST /api/iam/roles` with strict `{ catalog: { display_name }, grants?, surface_bindings? }` — **no client `id`**; DB assigns UUID; inserts `role_class = 'app'` (sparse / zero grants allowed).
4. `router.replace(/roles/[db-id])` — configure grants on `role_detail`; subsequent saves PATCH.

**Shipped gap:** GET-only list API; no toolbar; client-UUID create pattern not used for roles.

**Implementation:** [task 26](../tasks/26-iam-role-crud.md).

**Spec:** [`surface-specs/iam-role.md`](../surface-specs/iam-role.md).

---

### Decision: IAM role detail UI — grant matrix app-only (2026-06-18)

**Choice:** `RoleDetailForm` renders **`GrantMatrix` only when `catalog.role_class === 'app'`**. For `system_data` and `system_iam`:

- Show catalog (`display_name` editable, `role_class` read-only).
- **Do not** show grants / bindings sections (synthesis — no stored rows; empty matrix is confusing).
- Optional one-line note: permissions come from `role_class`.

**Shipped:** matrix shown read-only for system rows — replace with hidden section at role wave.

**Spec:** [`surface-specs/iam-role.md`](../surface-specs/iam-role.md) § G.

---

### Decision: IAM routes — `/roles`, `/users` (2026-06-18)

**Choice:** Canonical SubHub IAM list+detail routes are **`/roles`**, **`/roles/[id]`**, **`/users`**, **`/users/[id]`** (`lib/nav.ts`, `lib/nav-routes.ts`). APIs stay under `/api/iam/*`.

**Rationale:** Shipped code uses short paths; older task docs referenced `/iam/roles` — catalog updated to match code.

---

### Decision: IAM assignment self-patch — platform rule, IAM DAL layer (2026-06-18)

**Choice:** Principals **cannot** PATCH their own `role_assignments` on `user_roles_detail` ([Phase 03 self-patch denied](../../../../packages/_docs/phases/03-identity-iam/decisions.md#decision-iam-self-patch-denied-2026-06-02)). Enforced in **app IAM DAL wrapper**, not Postgres and not generic `@latch/dal`. Business apps must not bypass the IAM DAL to mutate `latch_user_roles`.

**P8 (role editor):** Deny `grants` / `surface_bindings` patches when target `role_id ∈ principal.roles`; `display_name` on held roles still allowed. **Target** — SubHub gap until role wave.

**Rationale:** DB role `latch_app` has CRUD on `latch_user_roles`; integrity triggers (last system holder, FK RESTRICT) are not a substitute for authorization. Graduate guards to shared app-kit / `@latch/iam` when extracted.

**Spec:** [`surface-specs/iam-user.md`](../surface-specs/iam-user.md), [`surface-specs/iam-role.md`](../surface-specs/iam-role.md).

---

### Decision: `role_assignments` — v1 flat picker, all roles (2026-06-18)

**Choice:**

| Topic | v1 |
|-------|-----|
| **Spec location** | [`iam-user.md`](../surface-specs/iam-user.md) § `role_assignments` — no separate `iam-user-roles.md` |
| **PATCH / read DTO** | Flat `role_id[]` — whole-array replace on `latch_user_roles` |
| **Role picker** | All roles from `role_list` (including `system_data` / `system_iam`) |
| **`scope_id` on assignment** | **Deferred in UI** — DAL writes `NULL` (company-wide). Column qualifies **user × role** on `latch_user_roles`, **not** the `latch_roles` catalog row. Distinct from `latch_role_surfaces.row_scope` on the role definition. Scoped assignment UX lands with Phase 08 delegation/scope work ([`policy task 05`](../../../../packages/policy/docs/tasks/05-scope-and-delegation.md)). |
| **System classes + scope** | Assignments for `system_data` / `system_iam` stay `scope_id = NULL` when scope UI ships |

**Rationale:** Assignments are one collection Field on `user_roles_detail` — splitting a second spec file duplicated `iam-user.md`. Shipped SubHub already uses flat `role_id[]` and lists every role. Scope is an attribute of the **assignment** (“who holds which role where”), not of the role definition; v1 operates company-wide until scoped IAM UI is worth building.

**Spec:** [`surface-specs/iam-user.md`](../surface-specs/iam-user.md).
