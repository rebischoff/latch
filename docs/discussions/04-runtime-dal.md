# Discussion 04 — Runtime / DAL

> **Status:** Open (2026-06-05). Compartment 3 in the [map](../reference/compartments.md#3-runtime--dal-the-enforcement-engine). The user has flagged "more discussion later" here.

## Shared understanding

- The DAL is the **single enforcement path**. Everything (REST, Server Actions, bulk) goes through it, so there is one threat surface, not several.
- **Four steps per request:** identify (`getPrincipal`) → resolve (`PolicyService.resolve` → manifest) → enforce (`dal.get/patch/delete` with the manifest) → store (app `StoreAdapter` runs SQL).
- **Reads today:** the store returns a full row; `projectRow` omits fields the manifest doesn't grant `read` on. Enforcement is at the **DTO boundary**, not the SQL boundary (yet).
- **Writes today:** the body is **narrowed** to permitted fields and `.strict()`-rejected for unknown keys *before* anything is applied; only allowed fields reach the row.
- **SQL lives only in the app store** (`apps/*/db/*`); `@latch/dal` never imports Drizzle. The kernel speaks in Fields, the store speaks in columns.
- **Mutations re-resolve a fresh manifest** (never trust a cached/UI manifest for writes).

## Points to confirm

1. One enforcement path through the DAL is non-negotiable (no raw DB in routes/components).
2. Reads = **fetch-then-project** today; SQL column narrowing is a *future optimization*, valuable for sensitive columns.
3. Writes = **narrow-then-apply**; equivalent to a narrow `UPDATE` when the store is written correctly.
4. SQL belongs in the **app store**, behind the `StoreAdapter` port.
5. A proposed `createDrizzleStore(...)` + `registerSurface(...)` would shrink per-app glue without changing the kernel.

## Open questions (the "later" discussion)

- When/whether to add **SQL column narrowing** for reads, and for which sensitivity classes.
- How much of `project.ts` / `apply-patch.ts` / `descriptors.ts` can be generated vs must stay hand-written for multi-table surfaces.
- Error model: throw typed errors (today) vs `{ data, error }` returns at the boundary.
- REST route factory vs Server Actions as the default for our apps (and for OSS consumers).
- Where the bootstrap (`resolveContext`, manifest cache, DAL singletons) should live — per-app vs an `@latch/app-kit`.

## Related

- [`../reference/permissions-and-ui-sync.md`](../reference/permissions-and-ui-sync.md), [`../reference/api-style.md`](../reference/api-style.md), [`packages/dal/src/create-surface-dal.ts`](../../packages/dal/src/create-surface-dal.ts)
