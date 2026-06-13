# SubHub — decisions

> Lock choices here before implementation tasks. Add a dated **Decision** block when something new is settled.

## Open

_None._

---

## Decided

### Decision: SubHub is the primary Latch consumer app (2026-06-12)

**Choice:** Build SubHub as the real trades/AV integration app on the scaffolded template (`apps/subhub`), developing `@latch/*` in parallel when gaps appear.

**Rationale:** Platform packaging (Phase 09) is complete; a full domain app is the right proof and product driver.

### Decision: no approval / verification workflow (2026-06-12)

**Choice:** SubHub v1 excludes pending changes, accept/reject, and `requires_verification` Fields.

**Rationale:** Owner request; simplifies DAL and UI paths while the domain model is still evolving.

### Decision: party spine for contacts (2026-06-12)

**Choice:** One `party` table (`kind`: `person` \| `organization`) with `party_role` tags (`customer`, `vendor`, `manufacturer`, `employee`). Subset list Surfaces filter by role; one `contact_detail` Surface for CRUD.

**Rationale:** Avoids duplicate CRUD across Customer/Vendor/Manufacturer tables; matches “subset of contacts” language.

### Decision: explicit routes — no catch-all surface pages or APIs (2026-06-12)

**Choice:** **Do not** use dynamic catch-all routes such as `app/[surface]/page.tsx` or `api/surfaces/[surfaceId]/[id]/route.ts`. Each domain gets explicit App Router segments and API route files (`contacts/[id]`, `api/contacts/[id]`). Entity id segments (`[id]`) are fine.

**Rationale:** Forms, toolbars, and multi-table layouts differ per Surface; a generic page would accumulate exceptions. Shared **factories** (`createSurfaceRouteHandlers`, DAL descriptors) still deduplicate server logic — only the route **files** stay explicit. See [routing-and-libraries.md](./routing-and-libraries.md).

### Decision: master-detail via nested layout, not parallel routes (2026-06-12)

**Choice:** List + detail uses a **shared parent `layout.tsx`** (list in the layout, detail in child `page.tsx` / `[id]/page.tsx`). **Do not** use parallel route slots (`@list` / `@detail`) in v1.

**Rationale:** Parallel routes add slot wiring, soft-navigation edge cases, and duplicate data-fetch coordination for modest gain. Nested layouts keep the list mounted when switching ids, URLs stay shareable (`/contacts/abc`), and implementation matches prior CRM split-shell learning without `?id=` query strings. Revisit parallel routes only if independent `loading.tsx` / `error.tsx` per pane becomes a measured need.

### Decision: UI stack (2026-06-12)

**Choice:** Ant Design 6 + `@ant-design/nextjs-registry`, React Hook Form + `@hookform/resolvers` (Zod from codegen), TanStack Query v5. `@latch/react` for `<Can>` / `<FieldControl>` / `CapabilitiesProvider`.

**Rationale:** Owner request; alignment table from [UI sync discussion](../../../packages/_docs/discussions/06-ui-sync.md) still applies (omit / read-only / editable from manifest).

### Decision: child collections as logical Fields (2026-06-12)

**Choice:** Related rows (phones, emails, line items) are **logical Fields** on the parent detail Surface — projected as arrays in the DTO, patched via strict Zod array keys, edited with RHF `useFieldArray`. v1 patch semantics: **replace whole collection** on save for that Field.

**Rationale:** Fits Latch Field vocabulary; avoids a Surface per child row. Canonical pattern: [child-collections.md](./child-collections.md).

### Decision: line-item snapshots on estimate → job → invoice (2026-06-12)

**Choice:** `estimate_line`, `job_line`, `invoice_line`, and `po_line` store **copied** description/qty/price at creation time; live catalog joins are not used for billed amounts.

**Rationale:** Standard trades accounting; prevents retroactive price drift.

### Decision: SQL-first persistence (inherits platform 2026-06-11)

**Choice:** Business DDL in `migrations/013+`; single-table store SQL from codegen; hand-written `repository.ts` for multi-table / collection Surfaces.

**Rationale:** Platform decision — see [codegen scope](../../../packages/codegen/docs/reference/codegen-scope.md).

### Decision: desktop-only (2026-06-12)

**Choice:** No mobile layout investment; Ant Design master-detail at fixed breakpoints.

**Rationale:** Owner request; Ant Design targets desktop workflows.
