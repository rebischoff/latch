# Bootstrap guides — Phase 2 (general)

> **Updated:** 2026-06-10. Apply to **any** app created by [`latch new`](../../../packages/codegen/docs/tasks/05-scaffold-cli.md) after [Phase 1](../phase-01-first-app.md) (domain YAML + migrations) is in place.
>
> App-specific verify checklists live in `apps/<slug>/docs/` — not here.

## Order

```
a authentication  →  b authorization  →  c navigation  →  d forms  →  e crud
                              ↑
                    f (constraints apply throughout)
```

| Step | Guide | Outcome |
|------|-------|---------|
| a | [a-authentication.md](./a-authentication.md) | Login, session, `getPrincipal` from DB |
| b | [b-authorization.md](./b-authorization.md) | `resolveContext`, manifest per Surface |
| c | [c-navigation.md](./c-navigation.md) | Sidebar + list/detail routes |
| d | [d-forms.md](./d-forms.md) | Shared RHF + manifest field controllers |
| e | [e-crud.md](./e-crud.md) | Create, edit, delete + silent audit |
| f | [f-explicitly-out-of-scope.md](./f-explicitly-out-of-scope.md) | What first temp apps skip |

## Shared conventions

- **UI kit:** Ant Design 6 (matches `spike_policy`); shell/theme remain app-owned.
- **IAM admin:** `spike_policy` for role/user CRUD unless a temp app explicitly adds IAM Surfaces later.
- **DAL:** All business reads/writes through `createSurfaceDal` + `PermissionContext`.
- **Audit:** Writes go to platform `latch_audit`; no viewer UI in first go ([f](./f-explicitly-out-of-scope.md)).

## Phase 2 stop gate (any temp app)

- [ ] Login as viewer vs editor → different rows/fields/actions in UI
- [ ] Sidebar shows only Surfaces with manifest `read`
- [ ] List + detail for each business Surface; create + edit + delete work
- [ ] `latch_audit` rows appear on mutate (verify in DB, not UI)
- [ ] RHF controllers live under `lib/forms/` (extract to `@latch/react` later if stable)
- [ ] `npm run test` includes at least one app-level policy → DAL test
