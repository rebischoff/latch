# STATUS — Phase 02 UI sync

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-01.

- **Home packages:** `@latch/react`, `@latch/dal`, `apps/crm` (proof harness)
- **State:** **paused** — `<Can>` / `<FieldControl>` shipped in the pilot; `customer_detail` stack not built. Blocked on the inserted change order [`../02b-platform-extraction/`](../02b-platform-extraction/STATUS.md) (genericize `@latch/*` before adding a second domain). Decisions locked (see [`decisions.md`](./decisions.md)).

## Right now — do this next

**Paused → resume after Phase 02b.** When 02b's DoD passes, **Execute now → [`tasks/04-db-schema.md`](./tasks/04-db-schema.md)** — `customers`, `sites`, `jobs.customer_id`; seed + store, **in `apps/crm`** (not `@latch/dal`).

## Blockers

- **Phase 02b — platform extraction.** Customer schema must land in `apps/crm` on the generic kernel, not in `@latch/dal`. See [`../02b-platform-extraction/STATUS.md`](../02b-platform-extraction/STATUS.md).

## Recently completed

- Task **00** — Phase 02 decisions locked (`customer_detail` sketch, admin-only roles, cross-link `customer_ref`, no `customer_list`, 404-hide for tech, `apps/crm` canonical). Verify gate passed (2026-06-01).
- `CapabilitiesProvider`, `<Can>`, `<FieldControl>` delivered during the `job_detail` pilot.
- Phase 02 decisions locked: admin-only `customer_detail`, `get`+`patch` only, cross-link via `customer_ref`, no `customer_list`, `FieldControl`=null, `apps/crm` canonical (2026-06-01).
- Task chain drafted: [`tasks/00-decisions.md`](./tasks/00-decisions.md), [`tasks/01-task-index.md`](./tasks/01-task-index.md).
