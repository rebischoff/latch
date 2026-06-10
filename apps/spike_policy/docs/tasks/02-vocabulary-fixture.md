# 02 — Vocabulary fixture (5 synthetic surfaces)

> **Status:** Complete (2026-06-09). Next: [03 — Roles UI](./03-roles-ui.md).
>
> **Replaces** the former “widget table + seeds” plan (retired 2026-06-08). Policy proof uses **codegen vocabulary only** — no business DB tables or list pages.

## Goal

Expand [`spike_codegen`](../../../spike_codegen) with **5 synthetic `kind: business` surfaces** (plus existing IAM surfaces) so the role grant matrix and user manifest inspector exercise a realistic permission vocabulary.

These are **fake surfaces** — **policy vocabulary only** (field ids + actions). **None has a backing table, seed row, DAL, route, or page**, and nothing is ever read or written through them. They exist purely so `PolicyService.resolve` has a realistic catalog to merge grants against. We are **not** building a working business surface (that was the retired task 06 widgets demo).

`PolicyService.resolve` only needs:

1. Surface definitions in `spikePolicyRegistry` (from codegen)
2. Sparse grant rows in `latch_role_grants` / bindings in `latch_role_surfaces` (edited via roles UI or `900_fixture_pilot_roles.sql`)

## Deliverables

### Codegen surfaces (suggested layout)

Under `apps/spike_codegen/modules/fixture/` (or similar), add YAML such as:

| Surface id | Fields (count) | Notes |
|------------|----------------|-------|
| `alpha_list` | 4 | baseline read/write fields; union-demo overlap |
| `beta_detail` | 6 | mix of field actions |
| `gamma_form` | 3 | `approve` / `submit` in `fieldActions` |
| `delta_report` | 8 | wide matrix for grant UI stress |
| `zeta_inventory` | 5 | `row_scope` binding demos (`own` / `all`) |

Vary `surfaceActions` and `fieldActions` per surface where codegen allows. All names are **neutral/synthetic** — do **not** reuse `widget_*` (retired with the task 06 demo).

### Registry

- Run `npm run codegen` (spike_codegen app)
- Register all new `*SurfacePolicyDef` exports in [`lib/policy-registry.ts`](../../lib/policy-registry.ts)
- Retain `role_detail` + `user_roles_detail` IAM surfaces
- **Retire the leftover `widget_list` / `widget_join` smoke surfaces** (codegen YAML + generated defs). Drop their imports from [`lib/policy-registry.ts`](../../lib/policy-registry.ts) and repoint any `widget_list` grants in [`900_fixture_pilot_roles.sql`](../../migrations/900_fixture_pilot_roles.sql) to the new synthetic surfaces. After this task **no `widget_*` surface is registered**.

### Fixture grants (**required**)

Update [`900_fixture_pilot_roles.sql`](../../migrations/900_fixture_pilot_roles.sql) so pilot personas are useful on day one:

- `field_tech` / `office_admin` sparse grants on **≥3 fixture surfaces** (not just one)
- **Multi-role union demo:** add a third app role (e.g. `union_demo_a`, `union_demo_b`) with **overlapping grants on the same surface** (e.g. both touch `alpha_list.status` — one `read` + `own`, one `write` + `all`) so task **04** can assign both to one user and prove `unionGrants` + `mergeRowScope` in the inspector

### Explicit non-deliverables

- No `901_fixture_widgets.sql` or `widgets` business table
- No `/widgets` route
- No list DAL for fixture surfaces
- No `effect: deny` grant rows (allow-only — [README Decision](./README.md#decision-runtime-grants-are-allow-only-no-explicit-deny-authoring-2026-06-08))

## Verify (stop gate)

- [x] `npm run codegen --check` passes for spike_codegen + spike_policy
- [x] `spikePolicyRegistry` contains 5 business surfaces + 2 IAM surfaces
- [x] **No `widget_*` surface remains** in `spike_codegen` modules or `spikePolicyRegistry`; fixture SQL grants reference synthetic surfaces only
- [x] `validateGrantTuple` accepts grants on new surfaces; rejects unknown field ids
- [x] `preloadRoleGrantProvider` + `PolicyService.resolve` returns distinct manifests per persona for **multiple** fixture surfaces (unit or integration test)
- [x] Fixture SQL seeds grants on ≥3 surfaces; union-demo roles exist for multi-role testing

## Next

[03 — Roles UI](./03-roles-ui.md) (parallel once registry is stable)
