# SubHub — decisions

> Lock choices here before implementation tasks. Add a dated **Decision** block when something new is settled.

## Open

_None._

---

## Decided

### Decision: single `/login` page — no modal (2026-06-12)

**Choice:** One `/login` route with an inline form inside the root shell. Voluntary login (header/user menu) and auth gating both navigate to `/login?callbackUrl=…`. No separate login modal. `/login` lives under **`(public)`**, not `(private)`.

**Rationale:** Simpler than dual modal + page paths; shell chrome stays consistent. `callbackUrl` returns the user to the public page they came from or the private route they intended. Failed sign-in stays on `/login`. Manifest 403/404 on the destination is separate from authentication.

### Decision: no `proxy.ts` / `middleware.ts` for auth (2026-06-12)

**Choice:** SubHub does **not** use Next.js `proxy.ts` (formerly `middleware.ts`) for session gating or `callbackUrl` plumbing.

**Rationale:** Next.js 16 renamed middleware to proxy to clarify it is a **network boundary** (rewrites, fast redirects) — not an application auth firewall. Authoritative checks belong in layouts, pages, and the DAL. Injecting `x-pathname` via proxy to work around layout limitations couples auth to the wrong layer. See [routing-and-libraries.md](./routing-and-libraries.md#auth-gating).

### Decision: per-page `requireAuth(path)` for private routes (2026-06-12)

**Choice:** Each `(private)` page calls `requireAuth('/explicit/path')` at the top of the Server Component. The helper reads `readBetterAuthSession`; on failure, `redirect(loginHref(path))`. Voluntary login from `UserMenu` builds `callbackUrl` client-side via `usePathname()`.

**Rationale:** Server layouts cannot read the current URL (intentional Next.js design for partial rendering). SubHub already uses explicit routes — each page knows its href. Fits dynamic routes (`/contacts/[id]` → `` requireAuth(`/contacts/${id}`) ``). `(private)/layout.tsx` stays a passthrough; no `/login` exemption hack.

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

**Choice:** Business DDL in `migrations/014+`; single-table store SQL from codegen; hand-written `repository.ts` for multi-table / collection Surfaces.

**Rationale:** Platform decision — see [codegen scope](../../../packages/codegen/docs/reference/codegen-scope.md).

### Decision: desktop-only (2026-06-12)

**Choice:** No mobile layout investment; Ant Design master-detail at fixed breakpoints.

**Rationale:** Owner request; Ant Design targets desktop workflows.

### Decision: shared root shell — nav varies by session (2026-06-12)

**Choice:** `AppShell` (sider + header + content) mounts in **root** `layout.tsx` for all routes. Public and `(private)` pages share the same chrome. Login/logout changes **nav items** (and header user menu), not whether the shell renders. Private-route session gates run in **pages** via `requireAuth`, not in `(private)/layout.tsx`.

**Rationale:** Consistent chrome; login stays in-context (sidebar visible). Root layout passes `authenticated` for nav; call `router.refresh()` after login/logout (layouts may not re-check session on every client navigation). Manifest-filtered nav lands in task 05.

### Decision: three nav sources — public, session, manifest (2026-06-12)

**Choice:** Sidebar merges three lists: **(1)** public routes always shown (e.g. Home `/`); **(2)** session chrome shown when authenticated but not manifest-gated (e.g. Settings `/settings`); **(3)** Surface catalog entries filtered server-side via `resolveContext` per `surfaceId`. Static lists live in `lib/nav.ts`; filtering in `lib/nav-server.ts`.

**Rationale:** Public and app-chrome links are not Surfaces; manifest filtering applies only to business/IAM list entry points. Keeps Home visible when logged out without faking a Surface grant.

### Decision: sidebar nav uses `next/link` for route prefetch (2026-06-12)

**Choice:** Sidebar menu item labels wrap **`next/link`** (default `prefetch` on in production). Selection state uses `usePathname()`. Do **not** navigate the sidebar with `router.push` alone — that skips App Router RSC route prefetch.

**Rationale:** Static explicit hrefs (`/iam/users`, `/contacts`, …) benefit from viewport/hover prefetch. List-row navigation and optional React Query `prefetchQuery` remain separate concerns. See [routing-and-libraries.md](./routing-and-libraries.md).

### Decision: sidebar grouping — chrome flat, Surfaces in Menu groups (2026-06-13)

**Choice:** `SideNav` uses Ant Design `Menu` **`mode="inline"`**. Three nav sources render as:

1. **Public** — top-level items, no `type: 'group'` (e.g. Home).
2. **Session chrome** — top-level items when authenticated, no group (e.g. Settings). Optional `type: 'divider'` before manifest groups.
3. **Surface catalog** — `type: 'group'` per catalog `group` field (e.g. IAM, Contacts). Flat links under each group — no `SubMenu` nesting. Omit an entire group when no Surface in it passes manifest filter.

**Rationale:** Public and session links are **app chrome** (not Latch Surfaces, not manifest-gated). IAM/Contacts/etc. **are** Surfaces — grouped and filtered server-side. Mixing chrome into Surface groups would blur the security model and complicate `nav-server.ts`.

### Decision: shell chrome layers — sidebar, app header, page toolbar (2026-06-13)

**Choice:** Three horizontal/vertical zones, not one `Menu` for everything:

| Zone | Location | Purpose | Ant pattern |
|------|----------|---------|-------------|
| **Sidebar** | `Layout.Sider` | Route navigation (where can I go?) | `Menu mode="inline"` + `next/link` labels |
| **App header** | Root `Layout.Header` | Global chrome: title, optional global search, account/settings dropdown | `Flex` + `Input.Search` + `Dropdown` |
| **Page toolbar** | Per-route layout / content top | Surface actions (New, Delete, Save, …) | `Flex` / `Space` + `Button` — **not** `Menu` |

**App header dropdown** (extends `UserMenu`): login / sign out now; link to `/settings` optional; theme and density later. Session auth chrome stays in the header dropdown — not in the Surface catalog.

**Rationale:** Matches Ant Design [Header-Sider application layout](https://ant.design/components/layout): primary nav in the sider, global utilities in the header, contextual actions in the working area. Horizontal `Menu` is for site-level navigation categories, not CRUD buttons.

### Decision: SurfaceToolbar — priority actions + overflow menu (2026-06-13)

**Choice:** Per-page toolbars use **`SurfaceToolbar`**: a horizontal row of `Button`s (and optional page-local `Input.Search`), gated by `<Can>`. **Pattern A — priority + overflow:** each action declares `priority: 'primary' | 'secondary'`. Primary actions stay visible in the bar; secondary actions move into a **More** (`⋯`) `Dropdown` when space is tight or on compact breakpoints. Do **not** use `Menu mode="horizontal"` for toolbar actions.

**Rationale:** Toolbar is a list of controls, not navigation. Overflow via `Dropdown` preserves button semantics (disabled, danger, modals). Desktop-only scope still requires narrow-window / half-screen behavior — see [routing-and-libraries.md](./routing-and-libraries.md#surface-toolbar).

### Decision: first-run setup — no SQL user seed (2026-06-13)

**Choice:** Platform migrate leaves **`latch_users` empty**. First admin via **`/setup`**: validate `LATCH_SETUP_KEY`, collect **login_name** + password, create user with `system_data` + `system_iam`. Migration `013_latch_identity_guards.sql` adds `login_name`, `setup_complete`, and DB triggers (immutable `role_class`, system catalog not deletable, last system-role holder not revocable). DAL mirrors last-holder guard. No `bootstrap-admin`, no SQL dev user seed.

**Identity:** `login_name` is the setup login identifier. `login_email` stays null until linked from `party_email` (task 10+). **Display name** lives on `party` (1:1 via `employee.latch_user_id`) — not on `latch_users`. Sign-in accepts username or linked email (`resolveLatchUserId`).

**Rationale:** Matches production bootstrap (customer chooses admin identity). `PolicyService` synthesizes IAM for `system_iam` — no grant seed. Platform-locked: [P4b amendment](../../../packages/policy/docs/tasks/00-decisions-needed.md#amendment-first-run-setup--db-identity-guards-2026-06-13) + [scaffold runbook](../../../packages/codegen/docs/scaffold-runbook.md#first-run-setup).

### Decision: Slice 0 dev seed — single master user, system roles (2026-06-13) — **superseded**

**Superseded by** [first-run setup](#decision-first-run-setup--no-sql-user-seed-2026-06-13) above.

### Decision: row timestamps vs audit — DDL vs Surface Fields (2026-06-13)

**Choice:** Three layers, not one global rule:

| Layer | Rule |
|-------|------|
| **`latch_audit`** | Authoritative for **who / when / what changed** on mutations (history, compliance, restore). |
| **DDL convenience columns** | `created_at` / `updated_at` on **business anchor** tables (`party`, `job`, `estimate`, …) for list sort and “last edited” without joining audit. **`created_by`** deferred until `own` row scope or owner UI is needed. **Platform IAM catalog** (`latch_roles`, grants, bindings): no row timestamps — per [P11](../../../packages/policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08). Legacy `latch_users.created_at` may remain in DDL but is not a Surface Field. |
| **Surface YAML** | Map a column to a Field only when the UI/API needs it **and** manifest should gate read/write. Do **not** expose audit-metadata (`created_at`, `created_by`) on IAM surfaces; omit on business surfaces unless product requires manifest-gated display. |

**Rationale:** Audit and row timestamps answer different questions; lighter audit modes (`standard`, `recovery`) do not always record enough on `insert` to replace `created_at` for list UX. Surface Fields add patch surface area — metadata columns should not be writable via PATCH unless explicitly intended.
