# 00 — Lock Phase 02 UI-sync decisions

## Goal

Record the `customer_detail` Surface sketch, role matrix, cross-Surface link contract, response semantics, and component behavior so tasks 04–21 do not re-debate them. **Docs only — do not add application code.**

## Prerequisites

None. First executable task in this phase. Phase 01 ([`../../01-data-access/STATUS.md`](../../01-data-access/STATUS.md)) is complete.

## Files (docs only — do not add application code)

| File | Action |
|------|--------|
| [`../decisions.md`](../decisions.md) | Open items → **Decided** table + Decision blocks (sketch, cross-link, no-list) |
| [`../../../foundations/global-options.md`](../../../foundations/global-options.md) | Confirm `forbiddenFieldResponse` per-Surface `404` is allowed for sensitive Surfaces |
| [`../STATUS.md`](../STATUS.md) | After verify: refresh state; **Execute now** → `04-db-schema.md` |

## Decisions locked (see [`../decisions.md`](../decisions.md))

1. **`customer_detail` sketch** — tables `customers`, `sites`, `jobs.customer_id`; Fields `profile`, `billing` (`sensitivity: high`), `sites`, `job_history` (read-only).
2. **Role matrix** — `office_admin` only (`read`/`write`, rowScope `all`); `field_tech` has **no** binding.
3. **Mutations** — `get` + `patch` only this phase; customer `delete` deferred.
4. **Tech → customer API** — **404 (hide)** via per-Surface `forbiddenFieldResponse: 404`; default platform behavior stays `403`.
5. **Cross-link** — `customer_ref` Field on `job_detail` (`{ id, name }`); `/customers?id=`; admin-gated via manifest.
6. **No `customer_list`** — CRM `/customers` = split shell, detail via `?id=`, empty left pane otherwise. Minimal list deferred as optional stretch.
7. **Nav** — resolve `customer_detail` with `mode: "detail"`; show Customers when surface `read` granted.
8. **`<FieldControl>`** — returns `null` / omits section when no `read` (already implemented).
9. **Surface id** — keep `customer_detail`; defer `job` merge.
10. **Proof app** — `apps/crm` canonical; thin `apps/web` API only if a package test needs a host.

## Verify (stop gate)

- [x] No unchecked items remain in `decisions.md` **Open** section except the noted `job_history` source (deferred to `09`)
- [x] `decisions.md` has Decision blocks for the sketch, cross-link, and no-`customer_list` choices
- [x] `STATUS.md` **Execute now** → `04-db-schema.md`
- [x] No new files under `packages/*`, `apps/web/src`, or `apps/crm/src` from this task

## Out of scope

- `customer_detail.surface.yaml` / `job_detail` `customer_ref` Field (task **06**)
- Schema, DAL, API, or CRM implementation (tasks **04**+)
- `job` / `job_detail` / `job_list` Surface merge (separate change order)
