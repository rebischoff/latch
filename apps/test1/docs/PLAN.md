# test1 — plan (docs only)

> **Learning harness.** Build to understand Latch — not to ship a product.

## 1. Purpose

`apps/test1` exists so you can **ask better questions while building**. Success = you can trace auth → principal → manifest → DAL → UI for every Surface, and edit persisted roles/grants via IAM pages.

**Build only what teaches Latch:**

| Package | What test1 must demonstrate |
|---------|----------------------------|
| `@latch/contracts` | Manifest + DTO types flow server → client |
| `@latch/policy` | Nav + per-Surface `PolicyService.resolve` (YAML first, then DB grants) |
| `@latch/dal` | `list`, `get`, `patch`, `delete` with `PermissionContext` |
| `@latch/react` | `CapabilitiesProvider`, `<Can>`, `<FieldControl>` |
| `@latch/codegen` | Surface YAML → Zod on submit |
| `@latch/audit` | Mutations produce audit rows (when Postgres wired) |

**Defer until asked:** verification/pending UI, bulk toolbar, restore-from-audit, reports, settings, i18n, theming beyond Ant defaults.

## 2. Surfaces (target model)

**One Surface id per domain.** List and detail are **`mode`** on `PolicyScope`, not separate role matrices.

| Surface id | kind | Route | Modes |
|------------|------|-------|-------|
| `contact` | business | `/contacts` | `list`, `detail` |
| `project` | business | `/projects` | `list`, `detail` |
| `task` | business | `/tasks` | `list`, `detail` |
| `user` | iam | `/iam/users` | `list`, `detail` |
| `role` | iam | `/iam/roles` | `list`, `detail` |

**Nav:** Policy-driven catalog in `(app)/layout` — `navManifestScope: minimal` (only routes principal may `read`). See [LAYOUT.md](./LAYOUT.md).

**Row scope:** Set once per role on the Surface base policy; same filter for list, detail, and bulk.

## 3. Roles vision (target — tasks 20–23)

| Concern | test1 target |
|---------|--------------|
| Role definitions | `latch_roles` — CRUD by `iam_master` on `role` Surface |
| User ↔ role assignment | `latch_user_roles` — editable on `user` Surface |
| Grants | `latch_role_grants` — per Surface, per Field, actions (`read`, `write`, …) |
| Structure (Fields, columns) | Repo YAML + codegen (reviewed like schema) |
| Built-ins | `iam_master`, `data_master` seeded as `kind: system`; non-deletable |

**Learning order:** Tasks **10–12** use **YAML policies** (CRM-compatible) on one business Surface before turning on DB-backed grants.

## 4. Phased delivery

```
00-decisions (docs)
  → 02–05 scaffold (monorepo, shell, Better Auth, Neon skeleton)
  → 10–12 business Surfaces (YAML policy phase — learn the loop)
  → 20–23 DB RBAC (persisted roles + grant matrix)
  → 90 harden, 99 DoD
```

Full index: [tasks/01-task-index.md](./tasks/01-task-index.md).

## 5. Simplicity — anti–scope-creep

| Allowed | Not allowed |
|---------|-------------|
| 5 Surfaces above + split list/detail pages | Extra entities, dashboards, analytics |
| Better Auth email/password dev login | Better Auth org/role plugins for Latch authz |
| IAM pages for `user` + `role` | Separate admin product / settings sprawl |
| Plain Ant Design defaults | Tailwind, custom design system |
| Copy patterns from `apps/crm` | Re-architecting `@latch/*` for test1 convenience |

**Rule of thumb:** If removing a screen does not reduce confidence that Latch works, do not build it.

## 6. References

- [decisions.md](./decisions.md) · [AUTH.md](./AUTH.md) · [DATABASE.md](./DATABASE.md)
- [STACK.md](./STACK.md) · [LAYOUT.md](./LAYOUT.md) · [CONFIG.md](./CONFIG.md)
- CRM patterns: [`apps/crm/docs/`](../../crm/docs/)
- Platform: [`docs/reference/packages.md`](../../../docs/reference/packages.md)
