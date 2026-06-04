# test1 — decisions

> Lock items in task **[00-decisions.md](./tasks/00-decisions.md)** before code tasks **02+**.

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-06-03 | App purpose | Learning harness; second Latch consumer (scope override) |
| 2026-06-03 | Auth provider | **Better Auth** in test1; CRM keeps Auth.js |
| 2026-06-03 | Auth/RBAC split | Better Auth = authn only; Latch DB = roles + grants + manifest |
| 2026-06-03 | Surface model | One id per domain; `PolicyScope.mode` = `list` \| `detail` |
| 2026-06-03 | Policy storage (phased) | Structure in YAML/codegen; role defs + grants → Postgres (tasks 20–23) |
| 2026-06-03 | Stack | Next 16, Ant Design, RHF, Neon, `@latch/*` |
| 2026-06-03 | STATUS home | `apps/test1/docs/STATUS.md` only — no root STATUS pointer |
| 2026-06-03 | Codegen (phased) | Option A: no codegen changes in tasks **02–03**; generalize `@latch/codegen` at task **10** |
| 2026-06-03 | Per-app env | `apps/test1/.env.local` (+ committed `.env.example` in **02+03**) — not repo root, not CRM’s file |
| 2026-06-03 | Scaffold tasks **02+03** | Implement monorepo entry and app shell in **one** pass |
| 2026-06-03 | Next bundler (02+03) | Turbopack default (`next dev` / `next build`); no CRM `--webpack` until `@latch/dal` imports need aliases |

### Decision: Latch is auth-library agnostic (2026-06-03)

**Choice:** `@latch/*` packages import **no** auth library. The app implements `getPrincipal()` → [`Principal`](../../../packages/contracts/src/types.ts) (`id`, `roles[]`, optional `policyVersion`).

**Rationale:** Authentication (who) and authorization (what) stay separate. Session/JWT carries user id only; roles load from company DB every request. CRM uses Auth.js; test1 uses Better Auth — same seam.

### Decision: Better Auth for test1 (2026-06-03)

**Choice:** [Better Auth](https://better-auth.com/) for test1 login/session. Document in [AUTH.md](./AUTH.md).

**Rationale:** Explicit learning choice; demonstrates Latch does not depend on Auth.js. **Do not** use Better Auth organization/role plugins for Latch authorization — they conflict with `PolicyService` + DB grants.

### Decision: unified Surface + mode (2026-06-03)

**Choice:** Surfaces `contact`, `project`, `task`, `user`, `role`. Roles bind to **base** policy on each Surface id; mode overlays **restrict only** (never widen `read`).

**Rationale:** Matches locked glossary model ([`docs/foundations/glossary.md`](../../../docs/foundations/glossary.md)). Avoid CRM transitional split ids (`job_list` / `job_detail`).

### Decision: DB-backed RBAC target (2026-06-03)

**Choice:** Persist `latch_roles`, `latch_role_grants`, and assignments in Postgres. `iam_master` edits via `user` and `role` IAM Surfaces. YAML policies used first (tasks 10–12) before `@latch/policy` DB loader (task 22).

**Rationale:** test1 differentiator vs CRM; proves runtime-editable grants. Platform change to `packages/policy` is a separate PR when task 22 runs.

### Decision: built-in system roles (2026-06-03)

**Choice:** Seed `iam_master` and `data_master` as `kind: system` in `latch_roles`. Non-deletable; grant editing restricted to `iam_master` on `role` Surface (details in task 23).

**Rationale:** Parallels CRM built-ins. `data_master` wildcard on **business** Surfaces only (`kind: business` in registry); IAM Surfaces excluded.

### Decision: scope override (2026-06-03)

**Choice:** test1 is allowed as a second consumer despite [`docs/foundations/scope.md`](../../../docs/foundations/scope.md) deferred list.

**Rationale:** Explicit learning track; does not block CRM or platform phases.

### Decision: codegen phased — document now, wire at task 10 (2026-06-03)

**Choice:** Tasks **02–03** do **not** change `@latch/codegen`. Root `npm run codegen` continues to scan **CRM only** until test1’s first Surface YAML (task **10**). At task **10**, generalize the generator so it is **not hardcoded to one app** (e.g. discover all `apps/*/modules/`). See [`../../crm/docs/CODEGEN.md`](../../crm/docs/CODEGEN.md).

**Rationale:** Codegen is only useful when it respects per-app `modules/` trees. Hardcoding `apps/crm/modules` was fine for a single consumer; a second app requires a multi-root scan in one CLI. No YAML exists under test1 yet, so Option A avoids premature platform churn.

### Decision: per-app env files (2026-06-03)

**Choice:** test1 uses **`apps/test1/.env.local`** (gitignored) and a committed **`apps/test1/.env.example`** (added in tasks **02+03**). Never put test1 secrets in `apps/crm/.env.local` or a repo-root `.env`.

**Rationale:** Each app has its own Neon DB, dev port (**3003**), and auth variable names (`BETTER_AUTH_*` vs CRM’s `AUTH_SECRET`). Migrate scripts and Next.js load env from the app directory; a shared file would send migrations or sessions to the wrong database. See [CONFIG.md](./CONFIG.md).

### Decision: Better Auth env names (2026-06-03)

**Choice:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TEST1_DEV_PASSWORD` — not CRM’s `AUTH_SECRET` / `CRM_DEV_PASSWORD`. Lock in task **04** when Better Auth is wired; `.env.example` documents them in **02+03**.

**Rationale:** Running CRM (3002) and test1 (3003) locally must not share one auth secret namespace.

## Open / to lock (before task 22)

- Normalized grant rows vs JSON blob per role (recommend normalized — task 21).
- `data_master` grant floor on system roles (can `iam_master` strip all grants from a custom role?).
- Row scope storage shape (`latch_role_row_scope` table vs column on grants).

## Related

- [PLAN.md](./PLAN.md) · [AUTH.md](./AUTH.md) · [DATABASE.md](./DATABASE.md) · [CONFIG.md](./CONFIG.md)
- CRM codegen + env: [`../../crm/docs/CODEGEN.md`](../../crm/docs/CODEGEN.md) · [`../../crm/docs/CONFIG.md`](../../crm/docs/CONFIG.md)
- CRM IAM decisions: [`docs/phases/03-identity-iam/decisions.md`](../../../docs/phases/03-identity-iam/decisions.md)
