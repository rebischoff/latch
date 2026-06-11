# Discussion 01 — User console (bootstrap, create, self-patch)

> **Status:** Closed (2026-06-09) — user create shipped in [task 07](../tasks/07-user-create.md). Spike: [`apps/spike_policy`](../..).

## Question

Today there is one super-admin (`bootstrap-admin`) with both system roles. That user cannot be edited in the UI, and there is no way to add users. What is going on, and what is missing?

## Current state

### Seeded users

| `latch_users.id` | Display name | Typical roles | Source |
|------------------|--------------|---------------|--------|
| `bootstrap-admin` | Bootstrap admin | `system_data` + `system_iam` | `007_bootstrap_super_admin.sql` |
| `field-tech` | Field Tech | `field_tech` (app) | `900_fixture_pilot_roles.sql` |
| `office-admin` | Office Admin | `office_admin` (app) | `900_fixture_pilot_roles.sql` |

System catalog rows use **DB-generated UUIDs**; assignments resolve them by `role_class` at seed time ([P11](../../../../packages/policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)).

### What the Users UI does today

- **List** all rows in `latch_users`
- **Get** one user + **patch `role_assignments`** on `user_roles_detail`
- **Manifest inspector** — merged effective permissions for the selected user
- **Create** users via **+ Add** (`createUser` DAL + server action) — app-chosen `id`, `display_name`, optional initial roles
- **Does not** write `display_name` after create (profile write still deferred)

Task 04 deferred **user create**; [task 07](../tasks/07-user-create.md) closed that gap (2026-06-09).

## Why bootstrap looks “not editable”

When **Act as** is `bootstrap-admin` and the selected user is also `bootstrap-admin`, the form is disabled — **self-patch denied** (locked in Phase 03; T8 guard):

- Actor cannot PATCH their own `role_assignments`
- Prevents self-escalation (e.g. adding `system_iam` while only holding an app role)

```90:96:apps/spike_policy/app/components/user-detail-form.tsx
      {isSelf ? (
        <Alert
          type="info"
          showIcon
          message="You cannot edit your own role assignments (self-patch denied)."
        />
      ) : null}
```

**Workaround today:** Act as `bootstrap-admin` → select **Field Tech** or **Office Admin** → edit roles → Save.

## How to add users

**UI (preferred):** Act as a `system_iam` holder → `/users` → **+ Add** → enter id + display name (+ optional roles) → Create → detail page with manifest inspector.

**SQL (break-glass / migrations only):**

```sql
INSERT INTO latch_users (id, display_name) VALUES ('new-user', 'New User');
INSERT INTO latch_user_roles (user_id, role_id) VALUES ('new-user', '<role-uuid>');
```

### Decision: user create (2026-06-09)

**Choice:** App-chosen string `id`; empty initial roles allowed; gated on `user_roles_detail` surface `write`; P4a/P4b validation before any insert.

**Rationale:** Mirrors seed ids + future auth subject mapping; atomic create (validation failure leaves no row); audited `INSERT` on `latch_users`.

## Remaining gap

| Follow-up | Notes |
|-----------|-------|
| **Profile write** | Editable `display_name` when manifest grants field `write` |
| **Scoped delegation create** | Non-`system_iam` actors creating users in scope — [task 08](../tasks/08-scoped-delegation.md) |

## Open questions

| # | Question | Options |
|---|----------|---------|
| 1.1 | User id on create — app-chosen string vs DB default? | Spike uses string `id` (`bootstrap-admin`); align with auth subject mapping |
| 1.2 | Initial roles on create — required or empty? | Empty user is valid; assignments patched separately |
| 1.3 | Replace Act as with Auth.js? | Defer to template app; break-glass via `LATCH_BOOTSTRAP_ADMIN_EMAIL` |

## Related

- [02 — Privileged assignment](./02-privileged-assignment.md)
- [03 — IAM ownership](./03-app-iam-ownership.md)
- Task 04: [`../tasks/04-users-ui.md`](../tasks/04-users-ui.md)
