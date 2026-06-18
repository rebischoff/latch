# Routing & libraries

> Answers planning questions on **dynamic routes**, **parallel routes**, and proficient use of **Next.js**, **Ant Design**, **React Hook Form**, and **TanStack Query**.

## Pages — explicit routes, not catch-all Surfaces

### Recommendation: **no** `app/[surface]/…` catch-all

Your instinct matches ours ([decision](./decisions/README.md)): each domain page is its own route tree because:

| Concern | Why catch-all fails |
|---------|---------------------|
| Form layout | Contacts need phone/email field arrays; jobs need line grids and assignment pickers |
| Toolbar actions | Create / delete / copy-from-estimate differ per Surface |
| Master-detail chrome | Some lists are filtered subsets (`customer_list` vs `contact_list`) |
| RSC data loading | Server components prefetch different joins per page |

**Do use** dynamic **`[id]`** (and optional `[lineId]` later) for entity identity:

```
app/(app)/contacts/page.tsx           → “Select a contact”
app/(app)/contacts/[id]/page.tsx      → detail for one party
app/(app)/jobs/[id]/page.tsx          → job detail (different form entirely)
```

**Do share** server factories — not pages:

```ts
// api/contacts/[id]/route.ts — thin wrapper
export const { GET, PATCH, DELETE } = createSurfaceRouteHandlers({
  resolveContext,
  resolveContextFresh,
  toDetailInput: (id) => ({ surfaceId: "contact_detail", entityId: id }),
  dal: getContactsDal(),
});
```

### API routes — same rule

```
api/contacts/route.ts          → GET list (contact_list)
api/contacts/[id]/route.ts     → GET | PATCH | DELETE (contact_detail)
api/customers/route.ts         → GET list (customer_list — filtered)
```

Not: `api/[surface]/[id]/route.ts`.

---

## Master-detail — nested layout, not parallel routes

### Recommendation: **no** parallel route slots in v1

**Parallel routes** (`app/contacts/@list`, `@detail`) give independent `loading.js` / `error.js` per slot. Cost:

- Slot composition in every `layout.tsx` (`{ list, detail }`)
- Easy to break on hard refresh if default slots missing
- Harder to reason about prefetch and shared selection state

**Preferred pattern — nested layout with list in layout:**

```
app/(app)/contacts/
  layout.tsx      ← Client or RSC wrapper: Ant Layout Sider (list) + Content ({children})
  page.tsx        ← Placeholder when no id selected
  [id]/page.tsx   ← Detail form; list stays mounted in parent layout
```

**Navigation:** list row → `<Link href={/contacts/${id}}>` or `router.push`.

**Data loading:**

| Piece | Where | Library |
|-------|-------|---------|
| List | `layout.tsx` (client) or server wrapper | React Query `useSurfaceList('contact_list')` |
| Detail | `[id]/page.tsx` | React Query `useSurfaceDetail('contact_detail', id)` |
| Manifest | Server parent passes to `CapabilitiesProvider` | RSC `resolveContext` |

**When to revisit parallel routes:** measured need for independent error boundaries (e.g. detail pane fails while list stays interactive) *and* team comfort with slot APIs.

Phase 02 CRM used `?id=` query params; SubHub uses **path segments** for shareable URLs — same split-shell idea, cleaner links.

---

## Catalog tables — editable table page

Small master/catalog tables (`site_contact_relation`, future job relation catalogs, …) use a **single Surface** — not master-detail ([decision](./decisions/general.md#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16).

```
app/(app)/sites/contact-relations/page.tsx   → editable Table (site_contact_relation_table)
api/sites/contact-relations/route.ts         → GET list, POST create
api/sites/contact-relations/[id]/route.ts    → PATCH | DELETE
```

| Piece | Pattern |
|-------|---------|
| Surface id | `{table}_table` |
| Nav | Same sidebar group as consuming domain (e.g. Sites → “Contact relations”) |
| UI | Ant Design `Table` + row add/edit/delete (or modal rows); `SurfaceToolbar` for New / Save as needed |
| vs master-detail | No `/[id]` detail route; sparse catalogs do not need a list sider + detail split |

Progressive setup may **suggest** initial catalog rows on first use; the catalog table page is the permanent edit path.

---

## Next.js App Router (16)

| Practice | SubHub usage |
|----------|----------------|
| **RSC default** | Shell layout, `requireAuth` on private pages, manifest + principal check before DAL |
| **`'use client'` boundary** | Master-detail interactive shell, forms, React Query provider, Ant Design tree |
| **`@ant-design/nextjs-registry`** | Wrap root layout — required for Ant Design SSR/hydration |
| **Route groups** | `(public)` vs `(private)` — both share root shell; `(private)` gates unauthenticated access |
| **No catch-all pages** | See above |
| **Request dedup** | `createResolveContext` already uses React `cache()` — call `resolveContext` once per RSC tree branch |
| **Server Actions** | Optional for mutations; **prefer REST + React Query** for consistent `{ data, manifest }` responses and cache invalidation |
| **Webpack** | Template uses `--webpack` flag; keep until Turbopack + Ant Design path is verified |

### Auth gating

Next.js 16 deprecates `middleware.ts` → **`proxy.ts`**. Proxy is a network boundary (rewrites, redirects, header injection) — **not** SubHub's auth firewall. Do **not** add `proxy.ts` / `middleware.ts` for session checks. Authoritative gating lives in Server Components and the DAL.

| Concern | Where | Mechanism |
|---------|-------|-----------|
| Nav chrome (logged in vs out) | Root `layout.tsx` | `isAuthenticated()` → `RootShell`; `router.refresh()` after login/logout |
| Voluntary login | `UserMenu` (client) | `usePathname()` → `/login?callbackUrl=…` |
| Session gate (authentication) | Each `(private)` page | `await requireAuth('/explicit/path')` at top of RSC |
| Authorization (403/404) | Page + DAL | `resolveContext` / manifest — separate from login |
| Sign-in UI | `(public)/login/page.tsx` | RHF + Better Auth client; not behind private gate |

**Single login entry:** `/login` inline form inside shell — no modal.

**`callbackUrl` sources:**

- **Voluntary:** client builds path from `usePathname()` + query string.
- **Gate:** server passes explicit href to `requireAuth` (layouts cannot read URL — [Next.js `usePathname`](https://nextjs.org/docs/app/api-reference/functions/use-pathname)).
- **Sanitize:** `sanitizeCallbackUrl` — same-origin relative paths only (`/…`, not `//…` or absolute URLs). Default when missing: `/`.

**Partial rendering caveat:** root layout session for nav may be stale across client navigations until `router.refresh()`. Data paths still re-check via `requireAuth` / `resolveContext` on each RSC render.

**Optional proxy (out of scope v1):** optimistic cookie-only redirect before render — still requires authoritative check in page/DAL. SubHub defers unless measured need.

```ts
// lib/require-auth.ts — pattern (illustrative)
export const requireAuth = async (callbackPath: string) => {
  if (!(await isAuthenticated())) {
    redirect(loginHref(callbackPath));
  }
};

// app/(private)/settings/page.tsx
const SettingsPage = async () => {
  await requireAuth("/settings");
  return (/* ... */);
};
```

Public routes: `(public)/page.tsx`, `(public)/login/page.tsx`, auth API routes.

### Sidebar navigation

Nav merges **public** routes (always), **session** items (authenticated, not Surfaces), and **manifest-filtered** Surface catalog entries — see [task 05](./tasks/05-nav-manifest.md) and [decisions](./decisions/README.md).

| Practice | Detail |
|----------|--------|
| **Grouping** | Chrome (Home, Settings) = top-level `Menu` items. Surface catalog = `type: 'group'` (IAM, Contacts, …). Optional divider between chrome and groups |
| **Route prefetch** | Sidebar labels use `next/link` (default prefetch on). Avoid `Menu` `onClick` → `router.push` for primary nav — no RSC flight prefetch |
| **Selection** | `usePathname()` drives Ant Design `Menu` `selectedKeys`; longest-prefix match for nested routes |
| **Server filter** | `getNavItems(principal)` in RSC root layout; pass serializable props to client `SideNav` |
| **Data prefetch** | Optional `queryClient.prefetchQuery` on list row hover — separate from route prefetch; add only if lists feel slow |

```tsx
// SideNav — pattern (illustrative)
import Link from "next/link";

const items = [
  { key: "/", icon: <HomeOutlined />, label: <Link href="/">Home</Link> },
  ...(authenticated
    ? [{ key: "/settings", icon: <SettingOutlined />, label: <Link href="/settings">Settings</Link> }]
    : []),
  { type: "divider" },
  {
    type: "group",
    label: "IAM",
    children: navSurfaces.iam.map((item) => ({
      key: item.href,
      icon: item.icon,
      label: <Link href={item.href}>{item.label}</Link>,
    })),
  },
];
```

Master-detail **list rows** may use `<Link href={/contacts/${id}}>` or `router.push` — prefer Link when the target route is static enough to prefetch.

### App header

Global chrome in root `Layout.Header` — **not** a horizontal `Menu`.

| Slot | Component | Notes |
|------|-----------|-------|
| Title | `Typography.Title` | App name |
| Global search | `Input.Search` | Optional v1 stub; flex width adapts |
| Account / settings | `Dropdown` | Extends `UserMenu`: login, sign out; optional link to `/settings`; theme later |

Session auth lives here. Do not manifest-gate dropdown entries except where a future feature needs it.

### Surface toolbar

Per-route action row at the top of the working area (inside route `layout.tsx` or page). Implemented by **`SurfaceToolbar`** (task **08**). **Not** `Menu mode="horizontal"`.

| Practice | Detail |
|----------|--------|
| **Layout** | `Flex` / `Space` + `Button`; optional page-local `Input.Search` on the left |
| **Gating** | Each action wrapped in `<Can>` — hidden actions omitted from bar **and** overflow menu |
| **Overflow (Pattern A)** | Actions declare `priority: 'primary' \| 'secondary'`. Primary stays in the bar; secondary moves to a **More** (`⋯`) `Dropdown` when compact or width is tight |
| **Compact** | Optional `Grid.useBreakpoint()` — icon + `Tooltip` instead of text label on narrow desktop widths |
| **Scope** | Desktop-only — handle half-screen / narrow windows, not mobile breakpoints |

```tsx
// SurfaceToolbar — action shape (illustrative)
type ToolbarAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  priority: "primary" | "secondary";
  action: "write" | "delete" /* manifest action for <Can> */;
  danger?: boolean;
  onClick: () => void;
};
```

First consumer: IAM UI (task **08**). Contacts and later Surfaces reuse the same component.

---

## Ant Design 6

| Practice | Detail |
|----------|--------|
| **Registry** | `AntdRegistry` in root layout ([`@ant-design/nextjs-registry`](https://ant.design/docs/react/use-with-next)) |
| **`App` component** | Wrap client shell for `message`, `modal`, `notification` static APIs |
| **`ConfigProvider`** | Theme token overrides once in shell — avoid per-form providers |
| **Forms** | **Do not** use antd `Form` as the source of truth — use **RHF** + antd inputs as controlled children |
| **Read-only Fields** | Per Latch alignment: readable ∧ ¬writable → `Typography.Text`, `Descriptions.Item`, or `Input` with `readOnly` + plain styling — **not** `disabled` (disabled grays out and implies non-data) |
| **Tables** | `Table` for list panes; row click → `<Link>` to `[id]` (or `router.push` when prefetch is undesirable) |
| **Responsive** | `readOnly` display can use `Descriptions` column={{ xs:1, lg:2 }}` for multi-column labels on wide viewports |
| **Icons** | `@ant-design/icons` for nav and toolbar |
| **Toolbar overflow** | Priority + `Dropdown` (More menu) — not horizontal `Menu`; see [Surface toolbar](#surface-toolbar) |

---

## React Hook Form 7

| Practice | Detail |
|----------|--------|
| **Resolver** | `zodResolver(narrowPatchSchema(...))` from codegen — same shape server validates |
| **Default values** | `reset(dto)` when React Query loads detail or `id` changes (`useEffect` on `data.id`) |
| **Controllers** | One thin wrapper per control (`RhfInput`, `RhfSelect`, …) forwarding `field` + `fieldState` |
| **Field arrays** | `useFieldArray` for child collections — see [child-collections.md](./child-collections.md) |
| **Strict writes** | Submit only keys present in writable patch schema; unknown keys rejected server-side |
| **`<Can>` / `<FieldControl>`** | Wrap sections and array add/remove buttons — not every `<Input>` |

---

## TanStack Query 5

| Practice | Detail |
|----------|--------|
| **Query keys** | `['surface', surfaceId, 'list', filters]`, `['surface', surfaceId, 'detail', id]` |
| **Provider** | Single `QueryClientProvider` in client shell; create client with `useState(() => new QueryClient())` |
| **`staleTime`** | 30–60s for detail manifests (manifest is cache, not auth) — refetch on window focus optional |
| **Mutations** | `onSuccess`: `invalidateQueries` for list + detail keys; **no optimistic updates** (decision) |
| **Id changes** | `placeholderData: keepPreviousData` optional when switching rows in master-detail to avoid flash |
| **Errors** | Map 403/404 to empty state or `notFound()`; 400 validation → inline field errors from API body |
| **Prefetch** | Optional `queryClient.prefetchQuery` on list row hover — add only if list feels slow |

### Suggested hooks (app-local)

```ts
useSurfaceList(surfaceId, query?)
useSurfaceDetail(surfaceId, id)
useSurfacePatch(surfaceId, id)
useSurfaceCreate(surfaceId)   // when POST list route exists
```

Each hook knows the **explicit API path** for that surface (not a dynamic URL builder keyed only by id string).

---

## `@latch/react`

| Export | Use |
|--------|-----|
| `CapabilitiesProvider` | Wrap detail pane with server-provided manifest |
| `<Can field action>` | Toolbar buttons (`SurfaceToolbar`), section visibility |
| `<FieldControl>` | Server-safe omission; client sections |

`<SurfaceForm>` is **not shipped yet** — SubHub builds Ant Design + RHF wrappers; consider upstreaming patterns to `@latch/ui-antd` later ([latch-feedback.md](./latch-feedback.md)).

---

## Related

- [decisions.md](./decisions/README.md) — explicit routes, no parallel routes
- [child-collections.md](./child-collections.md) — `useFieldArray` + DAL array Fields
- [architecture.md](./architecture.md) — directory layout
