# Bootstrap b — Authorization (user / roles)

> **Status:** Proposal (2026-06-10). General plan for scaffolded temp apps.

## Goal

Every server path resolves **manifest from DB-backed roles** before DAL or UI projection. Temp apps **consume** the runtime role catalog; they do not replace `spike_policy` for IAM Surfaces unless explicitly scoped later.

---

## Data model (platform — from template migrations)

| Table | Role |
|-------|------|
| `latch_users` | Identity rows (auth subject) |
| `latch_user_roles` | User → role assignment (+ optional `scope_id`) |
| `latch_roles` | Catalog: `system_data`, `system_iam`, `app` roles |
| `latch_role_surfaces` | Per-role `row_scope` per Surface |
| `latch_role_grants` | Sparse field/action allows |

**Phase 1 seeds:** `system_data` + `system_iam` (synthesized in `PolicyService`); app roles `widget_viewer` / `widget_editor` with grants on business surfaces only.

---

## Wiring (per app)

| Piece | Location |
|-------|----------|
| Surface vocabulary registry | `lib/policy-registry.ts` — business surfaces only |
| Grant preload | `preloadRoleGrantProvider(pool, principalRoleIds(principal))` (pattern from `spike_policy/lib/request-policy.ts`) |
| Request bootstrap | `lib/latch.ts` — `createPolicyServiceForPrincipal`, `resolveContext(surfaceId)` |
| `PermissionContext` | `{ principal, manifest, surface }` passed to every DAL call |

```ts
// Shape every route/action uses
const ctx = await resolveContext("widget_list");
const rows = await widgetDal.list(ctx);
```

---

## System classes

| Class | Behavior |
|-------|----------|
| `system_data` | Wildcard on **business** surfaces (not IAM metadata surfaces) |
| `system_iam` | IAM surfaces — unused in first widget-only app unless you add IAM routes |

Bootstrap admin with both classes is for operator break-glass, not normal widget demos.

---

## Manifest rules (invariants)

- UI renders from manifest; **DAL enforces** — UI is not a security boundary.
- Forbidden fields **omitted** from DTOs, not nulled.
- Mutations **re-resolve** manifest before DAL write.
- Row not visible → `notFound()` on detail (default 404-hide).

---

## IAM UI boundary

| In temp app | In `spike_policy` |
|-------------|-------------------|
| Login + principal | User list, role editor, delegation demo |
| Seed assignments | Runtime grant CRUD |

Optional nav link: “Manage users” → `http://localhost:3001/users` (dev only).

---

## Verify

- [ ] `widget_viewer` manifest: `read` only on permitted fields; no `write` actions
- [ ] `widget_editor` manifest: `write` on editable fields
- [ ] `bootstrap-admin` + `system_data` sees all widget rows (if tested)
- [ ] Changing `latch_user_roles` in DB changes behavior on next request (no role cache in session)
- [ ] `npm run test` — at least one test: principal → manifest → DAL list projection

---

## Related

- [a — Authentication](./a-authentication.md)
- [c — Navigation](./c-navigation.md)
- [`access-control.md`](../../../packages/policy/docs/access-control.md)
