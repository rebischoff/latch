# Staff lens — `employee_list` · `employee_detail`

> **Wave:** 0 · **Status:** target spec (2026-06-19) — **shipped:** `employee_list` + `employee_detail` (interim YAML) · **Contrast:** person-only base lens + staff marker + identity provision — no org hub — [`manufacturer.md`](./manufacturer.md) · **Catalog:** [`surfaces.md`](../surfaces.md#employee_list--employee_detail) · **DBML:** `party`, `party_person`, `employee`, `labor_class` *(costing FK deferred)* · **Decisions:** [employee scope](../decisions/party.md#decision-employee_detail-scope--marker-now-hr-later-2026-06-17), [HR fields deferred](../decisions/party.md#decision-employee-hr-fields-deferred-2026-06-16), [party identity](../decisions/party.md#decision-party-identity--party_person-login-link-2026-06-18), [labor class](../decisions/catalog.md#decision-catalog--simplified-parts-items-categories-2026-06-16)

**Related:** IAM role admin on **`user_roles_detail`** for **existing** users. **Provision** login: person surface **Add User** → **`/users/new`** ([`iam-user.md`](./iam-user.md), [provision decision](../decisions/party.md#decision-provision-app-user-from-person-surface-2026-06-25)). Subcontract labor uses **`job_party`**, not `employee`. **Retire:** shipped `employee.latch_user_id` + `account_link` Field at identity wave.

---

## Locked product answers (2026-06-19)

| # | Topic | Choice |
|---|--------|--------|
| 1 | HR depth | **Defer** full HR module — wave 0 through wave 1+ = staff marker + person profile + identity provision; HR scalar Fields land in **HR slice** ([decision](../decisions/party.md#decision-employee-hr-fields-deferred-2026-06-16)) |
| 2 | Hub depth | **Base lens only** — `profile`, `phones`, `emails`, `staff`; no subsidiaries, sites tree, or related job/activity lists in v1 |
| 3 | Kind | **Person only** — `party.kind = person` on create; DAL rejects organization employees |
| 4 | Trade / “type” for estimates | **`default_labor_class_id`** → catalog **`labor_class`** — **not** a separate employee-type enum; lands in **costing slice** (DDL + Surface Fields deferred until `labor_class_table` exists) |
| 5 | Pay & burdened rates | Org rates on deferred **`labor_rate`** + **`burden_profile`** (keyed by `labor_class`); **snapshotted** on `estimate_line.unit_cost` / `unit_price` at quote time — **not** live columns on `employee` |
| 6 | `job_title` vs `labor_class` | **Distinct** — `job_title` is HR display (deferred); costing / quote defaults use **`labor_class`** |
| 7 | Identity | **`add_as_db_user`** initiates **Add User** → `/users/new`; IAM **`user_list` `create`** on POST; existing users: roles + password on `user_roles_detail` |
| 8 | Termination | Future **`employment_status`** on `employee`; IAM **suspends roles** — do not delete `latch_users` when history/payroll access may still be required |
| 9 | Subcontract labor | **`job_party`** + `subcontractor` relation — not `employee` |
| 10 | Operational attribution | Existing FKs (`job_work_item.reported_by`, `requested_order.requested_by`, …) — attribution only; **no** v1 job assignment / crew scheduling |
| 11 | Nav group | **Contacts** (with other party lenses) |
| 12 | List / search / policy | Standard `read` / `write` / `delete` + optional `add_role` / `remove_role`; search `display_name`; optional filters when deferred columns ship (`employment_status`, `default_labor_class`) |

---

## A — Identity

### `employee_list`

| Key | Value |
|-----|-------|
| `surface_id` | `employee_list` |
| Pair | list pane for `employee_detail` |
| Route | `/employees` — `employees/layout.tsx` |
| API | `GET /api/employees` |
| Nav group | Contacts |
| Anchor table | `party` |
| DAL lens | `party_role.role = 'employee'` |
| All tables (DAL) | `party`, `party_role`, `employee`, `party_person` |
| Shipped vs target | **Shipped** list; align list projection + kind extensions at identity wave |

### `employee_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `employee_detail` |
| Pair | detail pane for `employee_list` |
| Route | `/employees/[id]` — `id` = `party.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/employees/[id]` |
| Anchor table | `employee` |
| DAL lens | `party_role.role = 'employee'` + `employee.party_id` row exists; create auto-inserts tag + extension row |
| All tables (DAL) | `party`, `party_person`, `party_phone`, `party_email`, `party_role`, `employee`; read may join `labor_class`, `site` when costing/HR Fields granted |
| Shipped vs target | **Shipped** detail (interim `account_link` / `employee.latch_user_id`) — target uses `party_person.latch_user_id` + `add_as_db_user` |

---

## B — Fields

### `employee_list`

#### Wave 0 (target through wave 1+)

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `party.id`, `party.display_name`, `party_person.latch_user_id` | `has_login` derived: `latch_user_id IS NOT NULL` |

**List search:** `party.display_name` (case-insensitive contains).

**List sort:** `display_name` ascending.

#### Costing slice (deferred — document only)

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | *(extend projection)* | read | + `employee.default_labor_class_id` → `labor_class.name` | Filter by labor class |

#### HR slice (deferred — document only)

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | *(extend projection)* | read | + `employee.employment_status` | Filter active / terminated / on_leave |

---

### `employee_detail` — wave 0 (target through wave 1+)

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | `party_person.first_name`, `last_name`, `nick_name`, `display_name`, `avatar_url` | `display_name` DAL-maintained — not primary edit |
| `phones` | collection | read + write | `party_phone` | replace-array PATCH |
| `emails` | collection | read + write | `party_email` | `is_login_email` when linked; sync → `latch_users.login_email` |
| `staff` | scalar | read | `employee.party_id` | Marker — row exists when person is staff; not user-editable |
| `add_as_db_user` | action | — | Navigates to `/users/new` with `linkPartyId`; POST creates `latch_users`, sets `party_person.latch_user_id`; optional sync if `is_login_email` row exists |

**Omit on wave 0:** HR scalars, `default_labor_class`, `related_*`, org hub Fields, IAM `role_assignments`.

#### Collection — `phones` element

```json
{
  "id": "<party_phone.id>",
  "label": "Mobile",
  "number": "+1 555 0100",
  "sort_order": 0
}
```

#### Collection — `emails` element

```json
{
  "id": "<party_email.id>",
  "label": "Work",
  "address": "alex@example.com",
  "is_login_email": true,
  "sort_order": 0
}
```

#### `staff` DTO (read)

```json
{
  "party_id": "<party.id>",
  "is_staff": true
}
```

---

### `employee_detail` — costing slice (deferred — document only)

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `default_labor_class` | scalar | read + write | `employee.default_labor_class_id` → `labor_class.id`, `labor_class.name` | Picker from `labor_class_table`; **not** pay rate — rates live on deferred `labor_rate` |

**Policy:** `write` on `default_labor_class` may be broader than pay-rate Fields; individual **pay overrides** (if ever added) stay HR/admin-restricted.

**Estimate use:** DAL may default labor line `item.labor_class_id` / costing lookup from assignee’s `default_labor_class_id` — implementation detail on `estimate_detail` spec (#20).

---

### `employee_detail` — HR slice (deferred — document only)

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `employment` | scalar | read + write | `employee.hire_date`, `termination_date`, `employee_number`, `employment_status` | `employment_status` CHECK: `active`, `on_leave`, `terminated` |
| `job_title` | scalar | read + write | `employee.job_title` | Business title — ≠ Latch IAM role, ≠ `labor_class` |
| `department` | scalar | read + write | `employee.department` | Text or future FK — TBD at HR migration |
| `reports_to` | scalar | read + write | `employee.reports_to` → `employee.party_id` → person `display_name` | Nullable FK; link to `/employees/[id]` |
| `primary_site` | scalar | read + write | `employee.primary_site_id` → `site.name` | Home office / default dispatch; requires site slice |

**Not on `employee` (locked):** name (`party_person`), phones/emails (`party_*`), login (`party_person.latch_user_id`), permissions (`latch_user_roles`).

**Sensitive Fields:** `employment`, future pay overrides — manifest may restrict `read`/`write` to admin/accounting roles.

---

### Shipped interim Fields (retire at identity wave)

| Field id | Status | Replacement |
|----------|--------|-------------|
| `account_link` | **Retire** | `add_as_db_user` + `party_person.latch_user_id` |
| `profile` on `party` columns | **Retire** | `party_person` kind extension |

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `employee_list` | `read` | grant on list | Each GET list |
| `employee_detail` | `read` | grant on detail | Each GET |
| `employee_detail` | `write` | grant on detail + Field | Each PATCH |
| `employee_detail` | `delete` | grant on detail | Each DELETE |
| `employee_detail` | `add_role` / `remove_role` | grant (optional) | Each action |
| `employee_detail` | `add_as_db_user` | grant on action + writable `emails` | Each action |

**403 vs 404:** follow platform default unless Surface overrides (no 404-hide required for employee lens).

---

## D — DAL read

### `employee_list`

- **`list(ctx, { limit, offset, q?, employment_status?, labor_class_id? })`** — join `party` + `party_role` filter `employee`; left join `employee`, `party_person`; sort `display_name`.
- **Search:** `q` matches `party.display_name` (case-insensitive contains).
- **Deferred filters:** `employment_status`, `labor_class_id` when costing/HR columns exist.

### `employee_detail`

- **`get(ctx, id)`** — verify `employee` tag + `employee` row; project granted Fields only.
- **`staff`:** always present when lens matches.
- **No** hub aggregates (`related_jobs`, `related_work_items`, …) in v1.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile`, optional `phones`, `emails` | Insert `party` (`kind = person`), `party_person`, `party_role.employee`, `employee` row |
| `patch` | manifest-narrowed `profile`, `phones`, `emails`, deferred HR/costing scalars | replace-array collections |
| `delete` | — | Hard delete; blocked when downstream FKs reference `employee.party_id` — structured `ConflictError` *(enumerate blockers at implementation)* |

### Actions

| Action | Behavior |
|--------|----------|
| `add_as_db_user` | Navigate to `/users/new?linkPartyId=…&returnTo=…`; user create POST (see [`iam-user.md`](./iam-user.md)) sets `party_person.latch_user_id`; copy `login_email` only if designated `is_login_email` row exists |

**Transactions:** each mutation single transaction; audit on success.

---

## F — Domain rules

- **`party.kind` immutable** after create — must be `person` ([party profile decision](../decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)).
- **Staff marker:** `employee` extension row + `party_role.employee` tag — both required; create inserts both.
- **Login split:** credentials on `latch_users`; link on `party_person`; provision from this Surface — not from `user_roles_detail`.
- **Costing split:** `labor_class` = rate bucket on catalog labor items; `default_labor_class_id` on employee = person default; org burdened rates on deferred `labor_rate` / `burden_profile` — not stored per employee except optional future pay override (HR slice).
- **Subcontractors:** express on `job_party` — do not tag external subs as `employee`.
- **Termination (HR slice):** set `employment_status = terminated`; IAM suspends app roles separately; preserve `latch_users` + audit history.
- **Delete:** operational FKs (`job_work_item.reported_by`, …) use **`SET NULL`** — delete may succeed with nulled attribution; document UX.
- **Audit:** all mutations on registered tables.

---

## G — UI layout

### List + detail

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): list in `employees/layout.tsx`, detail in `[id]/page.tsx`.

### `employee_detail` (person only)

Single column — no tree, no related panels:

```text
┌─────────────────────────────────────────┐
│ SurfaceToolbar — Save | Revert | Delete │
├─────────────────────────────────────────┤
│ {display_name}                          │
│ [Add User] or [App user] link           │  ← identity chrome under title
├─────────────────────────────────────────┤
│ profile → phones → emails               │
│ staff (read-only badge)                 │
│ [HR / costing sections — deferred]      │
└─────────────────────────────────────────┘
```

**Create:** always person; POST inserts `employee` row + tag.

**Shared component:** `PartyDetailForm` parameterized by `surfaceId` — employee branch adds `staff` + identity actions; omits org hub sections.

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `employee_detail` |
| 2 | New (list) | POST create |
| 3 | Delete | confirm modal → DELETE |

**Under title (identity chrome):**

| State | Control |
|-------|---------|
| No `latch_user_id` | **Add User** → `/users/new?linkPartyId=…&returnTo=…` when `add_as_db_user` granted |
| Linked | **App user** link → `/users/[latch_user_id]` (interim) |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `employee_detail` | `/users/[partyId]` | Person has login — **App user** link |
| `user_roles_detail` | `/employees/[id]` | Person is staff — HR / provision link ([`iam-user.md`](./iam-user.md)) |
| `employee_detail` | `/sites/[id]` | `primary_site` set (HR slice) |
| `employee_detail` | `/catalog/labor-classes` | Admin maintains `labor_class` catalog (costing slice) |

No `related_work_items` or job assignment UI on this Surface in v1.

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `phones` | inline row | — | "No phone numbers" |
| `emails` | inline row | — | "No email addresses"; **Login email** checkbox when person linked or `emails` writable |

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create employee | POST | `party` person + `employee` row + `employee` tag |
| Provision login | **Add User** → `/users/new` | Creates `latch_users` + link; optional roles on create; return to employee |
| Terminate (HR slice) | PATCH `employment` | `employment_status = terminated`; IAM role suspend is separate step |
| Remove employee tag | `remove_role` | Does not delete `party` or `employee` row — clarify product: usually terminate instead |
| Delete employee | DELETE | Hard delete party subtree when allowed; attribution FKs nulled |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Organization POST** | Reject — employees are persons only |
| **Duplicate login email** | `latch_users.login_email` UNIQUE; app pre-check on `add_as_db_user` / `emails` sync |
| **`add_as_db_user` without email** | **Allowed** — `login_email` null; designate login row on person `emails` later |
| **Employee without login** | Normal — field tech may have no app account |
| **Person with login, not staff** | Allowed — `party_person.latch_user_id` without `employee` row; IAM list shows user; no `/employees` row |
| **Shipped `employee.latch_user_id`** | Migrate to `party_person.latch_user_id`; drop column + `account_link` Field |
| **`job_title` vs `labor_class`** | UI copy distinguishes HR title from costing class picker |
| **Pay rate on employee** | Defer — org rates on `labor_rate`; do not add `burdened_rate` scalar to wave 0 |
| **Codegen L1/L2** | Hand-written descriptor + repository for collections until codegen ships |

---

## Verify (stop gate)

- [x] Locked answers (2026-06-19) — HR deferral, costing split, identity provision
- [x] A–B complete — wave 0 Fields + deferred costing/HR field tables
- [x] C–K complete — person-only lens; no hub
- [ ] Costing decision (`default_labor_class_id`, `labor_rate` shape) folded into `catalog.md` or `party.md` at implementation
- [ ] Implementation deferred until task 19 exit + party/identity migration
