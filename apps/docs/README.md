# Temp business apps — planning

> **Updated:** 2026-06-10. Guides for disposable apps scaffolded via [`latch new`](../../packages/codegen/docs/tasks/05-scaffold-cli.md). **Spikes** (`spike_policy`, `spike_business`, `spike_codegen`) stay separate — they are not templates for new apps.

## Why temp apps

Prove the platform is **useful**, not only **correct**: scaffold cost, nav/pages per Surface, RHF forms, auth wiring, and silent audit writes on business mutations. Success = YAML + thin store/wiring, not three hand-maintained permission stacks.

## Phases

| Phase | Doc | Deliverable |
|-------|-----|-------------|
| **0** | [05 — Scaffold CLI](../../packages/codegen/docs/tasks/05-scaffold-cli.md) | `latch new` + `packages/codegen/template/` |
| **1** | [phase-01-first-app.md](./phase-01-first-app.md) | First CLI-born app: **widgets** (`widget_list` + `widget_detail`), `system_iam` + `system_data` bootstrap |
| **2** | [bootstrap/](./bootstrap/README.md) | General wiring guides **a–f** (apply to any scaffolded app) |

After Phase 1 scaffold + domain YAML exist, write **app-specific** task notes under `apps/<slug>/docs/` (verify gates, seed ids, port).

## Bootstrap guides (Phase 2 — general)

Apply in order after platform migrate + codegen for the app's surfaces:

| | Guide | Topic |
|---|--------|--------|
| a | [a-authentication.md](./bootstrap/a-authentication.md) | Auth.js, session, `getPrincipal` |
| b | [b-authorization.md](./bootstrap/b-authorization.md) | Runtime roles, manifest, `resolveContext` |
| c | [c-navigation.md](./bootstrap/c-navigation.md) | Sidebar, list/detail routes per Surface |
| d | [d-forms.md](./bootstrap/d-forms.md) | RHF controllers reusable across apps |
| e | [e-crud.md](./bootstrap/e-crud.md) | Create, edit, delete (+ silent `latch_audit` writes) |
| f | [f-explicitly-out-of-scope.md](./bootstrap/f-explicitly-out-of-scope.md) | No audit UI, restore, or approval in first go |

## Spikes vs temp apps

| App | Role |
|-----|------|
| `spike_policy` | IAM console, delegation, policy inspector — **not** a business CRUD template |
| `spike_business` | Scoped DAL vitest harness — **not** copied by `latch new` |
| `spike_codegen` | Codegen vocabulary fixture |
| `apps/<slug>` from CLI | **Canonical** path for new business apps |

## Related

- [`STATUS.md`](../../STATUS.md) — global pointer (update when a phase closes)
- [Discussion 07 — Template / scaffold](../../packages/docs/discussions/07-template-scaffold.md)
