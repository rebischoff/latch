# Phase 1 — First CLI-born app (widgets)

> **Status:** Proposal (2026-06-10). **Blocked on:** [Phase 0 scaffold CLI](../../packages/codegen/docs/tasks/05-scaffold-cli.md).
>
> **Do not** promote `spike_business` as the template. The first app must be created with `latch new` on a **clean slate** so we test the scaffolder honestly.

## Goal

One temp business app with a **single domain** (`widgets`), **two Surfaces** (list + detail), platform bootstrap including **`system_iam`** and **`system_data`**, and enough structure to execute [bootstrap guides](./bootstrap/README.md) (Phase 2).

## App identity

| Item | Choice |
|------|--------|
| Slug (example) | `widgets` → `apps/widgets/` |
| Package | `@latch/widgets` |
| Dev port | `3003` (policy spike `3001`, business spike `3002`) |

Slug is whatever the operator passes to `latch new`; this doc uses `widgets` as the reference name.

---

## Step 1 — Scaffold (Phase 0 output)

```bash
npm run latch:new -- widgets
node scripts/db-migrate.mjs --app=widgets
```

Verify platform tables exist in Neon: `latch_users`, `latch_roles` (with `system_data`, `system_iam`), `latch_user_roles`, `latch_audit`, etc. Bootstrap user `bootstrap-admin` holds **both** system roles (migration `007_bootstrap_super_admin.sql` in template).

---

## Step 2 — Business DDL (app-owned)

Add migration `apps/widgets/migrations/020_widgets.sql`:

```sql
-- Business anchor table (single-table surfaces; no scope_id in Phase 1 unless opted in later).
CREATE TABLE widgets (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label  TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE widgets TO latch_app;
```

Re-run migrate. **Do not** copy `spike_business` migration `900_fixture_*` — add app-specific seeds in `021_fixture_widgets.sql` if needed.

---

## Step 3 — Surface YAML + codegen

Under `apps/widgets/modules/widget/`:

| File | Surface id | Mode |
|------|------------|------|
| `widget_list.surface.yaml` | `widget_list` | list |
| `widget_detail.surface.yaml` | `widget_detail` | detail |

Minimum fields: `label`, `status` (string). `kind: business`. Vocabulary: `read`, `write` on fields; surface actions `read`, `write`.

```bash
npm run codegen
npm run codegen:check
```

Register both surfaces in `lib/policy-registry.ts`.

---

## Step 4 — Runtime roles (DB seeds)

Phase 1 needs **app roles** for widget demos plus the **system** rows already in template:

| Role | `role_class` | Purpose |
|------|--------------|---------|
| Data master | `system_data` | Synthesized full business access (template seed) |
| IAM master | `system_iam` | Synthesized IAM access (template seed) |
| `widget_viewer` | `app` | Read-only on widget surfaces |
| `widget_editor` | `app` | Read + write; `row_scope: all` on both surfaces |

Seed fixture migration `022_fixture_widget_roles.sql`: insert app roles, `latch_role_surfaces` + sparse `latch_role_grants`, two demo users (`viewer@demo`, `editor@demo`) with assignments. IAM CRUD UI remains in `spike_policy` — this app only **consumes** assignments.

**Bootstrap admin:** `bootstrap-admin` keeps `system_iam` + `system_data` for break-glass; map to Auth.js credentials in bootstrap guide **a**.

---

## Step 5 — Stop before Phase 2 UI

Phase 1 **ends** when the scaffolded app has:

- [ ] Platform + business migrations applied
- [ ] Two surfaces codegen'd + registry wired
- [ ] App role seeds + demo users (viewer / editor) + bootstrap admin
- [ ] `npm run codegen:check` green
- [ ] Placeholder `app/page.tsx` links to forthcoming `/widgets` (or stub route)

**Not in Phase 1:** login UI, sidebar, forms, DAL Postgres adapter, Server Actions — those are [bootstrap a–e](./bootstrap/README.md).

---

## App-specific docs (after scaffold)

Create `apps/widgets/docs/README.md` with:

- Neon branch / env var names
- Seed user passwords (dev only)
- Port and `npm run dev` command
- Checklist copied from bootstrap verify gates

---

## Verify (Phase 1 stop gate)

- [ ] App created **only** via `latch new`, not by renaming `spike_business`
- [ ] `system_data` and `system_iam` rows present; `bootstrap-admin` has both assignments
- [ ] `widget_list` + `widget_detail` generated glue exists under `modules/widget/generated/`
- [ ] `widgets` table exists; no dependency on spike migrations
- [ ] `apps/widgets/docs/README.md` started

---

## Related

- [Phase 0 — Scaffold CLI](../../packages/codegen/docs/tasks/05-scaffold-cli.md)
- [Bootstrap guides](./bootstrap/README.md)
