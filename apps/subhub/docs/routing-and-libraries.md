# Routing & libraries

> Answers planning questions on **dynamic routes**, **parallel routes**, and proficient use of **Next.js**, **Ant Design**, **React Hook Form**, and **TanStack Query**.

## Pages — explicit routes, not catch-all Surfaces

### Recommendation: **no** `app/[surface]/…` catch-all

Your instinct matches ours ([decision](./decisions.md)): each domain page is its own route tree because:

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

## Next.js App Router (16)

| Practice | SubHub usage |
|----------|----------------|
| **RSC default** | Shell layout, initial manifest + principal check, redirect unauthenticated users from `(app)` group |
| **`'use client'` boundary** | Master-detail interactive shell, forms, React Query provider, Ant Design tree |
| **`@ant-design/nextjs-registry`** | Wrap root layout — required for Ant Design SSR/hydration |
| **Route groups** | `(public)` vs `(app)` — home stays public; business routes gated |
| **No catch-all pages** | See above |
| **Request dedup** | `createResolveContext` already uses React `cache()` — call `resolveContext` once per RSC tree branch |
| **Server Actions** | Optional for mutations; **prefer REST + React Query** for consistent `{ data, manifest }` responses and cache invalidation |
| **Webpack** | Template uses `--webpack` flag; keep until Turbopack + Ant Design path is verified |

### Auth gating

- `(app)/layout.tsx`: server checks session; redirect to `/login` or render shell with login modal trigger
- Public: `(public)/page.tsx`, auth API routes
- Per-page: still resolve manifest — 404 when Surface not granted (existence hide where appropriate)

---

## Ant Design 6

| Practice | Detail |
|----------|--------|
| **Registry** | `AntdRegistry` in root layout ([`@ant-design/nextjs-registry`](https://ant.design/docs/react/use-with-next)) |
| **`App` component** | Wrap client shell for `message`, `modal`, `notification` static APIs |
| **`ConfigProvider`** | Theme token overrides once in shell — avoid per-form providers |
| **Forms** | **Do not** use antd `Form` as the source of truth — use **RHF** + antd inputs as controlled children |
| **Read-only Fields** | Per Latch alignment: readable ∧ ¬writable → `Typography.Text`, `Descriptions.Item`, or `Input` with `readOnly` + plain styling — **not** `disabled` (disabled grays out and implies non-data) |
| **Tables** | `Table` for list panes; row click → navigate to `[id]` |
| **Responsive** | `readOnly` display can use `Descriptions` column={{ xs:1, lg:2 }}` for multi-column labels on wide viewports |
| **Icons** | `@ant-design/icons` for nav and toolbar |

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
| `<Can field action>` | Toolbar buttons, section visibility |
| `<FieldControl>` | Server-safe omission; client sections |

`<SurfaceForm>` is **not shipped yet** — SubHub builds Ant Design + RHF wrappers; consider upstreaming patterns to `@latch/ui-antd` later ([latch-feedback.md](./latch-feedback.md)).

---

## Related

- [decisions.md](./decisions.md) — explicit routes, no parallel routes
- [child-collections.md](./child-collections.md) — `useFieldArray` + DAL array Fields
- [architecture.md](./architecture.md) — directory layout
