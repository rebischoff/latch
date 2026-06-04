# Surface metadata (future)

`*.surface.yaml`, `*.policies.yaml`, and `generated/` per Surface.

Populated starting at task **10** ([`../docs/tasks/10-contact-surface.md`](../docs/tasks/10-contact-surface.md)).

**Codegen today:** root `npm run codegen` scans **CRM only** (`apps/crm/modules`). Before task 10 adds YAML here, `@latch/codegen` must be generalized to discover `apps/*/modules/` — see [`../../crm/docs/CODEGEN.md`](../../crm/docs/CODEGEN.md).
