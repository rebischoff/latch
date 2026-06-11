# Discussion 11 — Spine, adapters, skin

> **Status:** Session **5** complete (2026-06-10); TanStack Query row deferred. Next: session **6** — audit compartment ([`12-audit-opinionation.md`](./12-audit-opinionation.md)). See [opinionation roadmap](./10-opinionation-roadmap.md).
>
> **Extends:** the spine-vs-skin rule in [`00-overview.md`](./00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05) with a middle **adapter** layer.

## Shared understanding

Latch is **not** a storage-agnostic audit/DAL library for arbitrary backends. It is a **governed Next.js + Postgres platform** with ports at real boundaries so default libraries can change without rewriting the kernel.

The 2026-06-05 **spine vs skin** rule remains valid. This discussion adds **adapters** between them:

| Layer | Question it answers | Changes when… | Wrong to make per-app |
|-------|---------------------|---------------|------------------------|
| **Spine** | What must be true for security/correctness? | Almost never | Audit table shape, DAL bypass, optional audit |
| **Adapters** | Which library implements a spine **port**? | Library major versions, second app variant | — (swappable by design) |
| **Skin** | What is this business? | Every app / vertical | — (app-owned by design) |

**Artifact classification** (session 2 — agreed leanings)

| Artifact | Layer | Port (if adapter) | Notes |
|----------|-------|-------------------|-------|
| `PolicyService.resolve`, manifest shape | Spine | — | Kernel |
| `PermissionContext`, `Manifest`, `Principal` types | Spine | — | `@latch/contracts` |
| `createSurfaceDal`, narrow/project, strict patch | Spine | — | Kernel |
| `StoreAdapter` interface | Spine | `StoreAdapter` | Contract only — no ORM in `@latch/dal` |
| Drizzle / memory `StoreAdapter` impl | Adapter | `StoreAdapter` | Business tables only; separate from audit |
| `SurfaceDescriptor` (`projectRow`, `applyPatch`, …) | Spine | — | Port shape; per-surface **values** are glue |
| Codegen single-table glue (generated) | Spine (toolchain) | — | Opinionated 80% path from YAML |
| Multi-table hand glue | Skin | — | Escape hatch (e.g. `job_detail`) |
| `*.surface.yaml`, business DDL (`jobs`, `widgets`) | Skin | — | Domain authoring |
| Policy vocabulary (Field ids + actions from YAML) | Spine (output) / Skin (input) | — | Codegen emits catalog; YAML is per-app source |
| `latch_role_grants`, assignments | Spine (tables) | — | Runtime DB data; not codegen |
| `AuditEntryInput`, `writeAudit`, “every mutation audits” | Spine | `AuditWriter` | Contract + invariant 6 |
| `latch_audit` DDL + immutability trigger | Spine | — | Platform migration — apps do not fork shape |
| `createPostgresAuditWriter` (raw `pg` INSERT) | Adapter | `AuditWriter` | **Not** the Drizzle store adapter — own port |
| `withPermissionDb` / `SET LOCAL` | Adapter | DB session | Target extract to `@latch/pg-session` (name TBD) |
| `setAuditWriter`, `ensureAuditWriter` | Adapter (wiring) | — | Bootstrap; graduates out of per-app copy-paste |
| `createMemoryAuditWriter` | Adapter (test) | `AuditWriter` | Compartment / local dev |
| `restoreFromAuditEntry` orchestration | Spine | — | Auth + eligibility |
| `replay()` per table / FK order | Skin | — | Domain restore logic |
| `getPrincipal` → `Principal` | Spine | Identity | Contract |
| Better Auth (session → `latch_users.id`) | Adapter | Identity | Default reference; swappable |
| `latch_users` as sole identity table | Spine | — | No second user store |
| Surface YAML IAM (`user_roles_detail`, …) | Skin (module) | — | Platform *shape* templated; still a Surface |
| Manifest gates (`<Can>`, `<FieldControl>`) | Spine (contract) | — | UI must honor manifest |
| `<SurfaceForm>` alignment (proposed) | Spine (contract) | — | Omit / read-only / writable from manifest |
| RHF, form submit wiring | Skin | — | Vehicle to Server Action → DAL; app-owned |
| antD (or other kit) + RHF field wrappers | Skin | — | Widget layer; spine does not mandate a kit |
| `@latch/react` (current pkg) | Adapter (reference UI) | — | Thin today; reference impl of manifest UI port |
| App shell, nav, theme, layout | Skin | — | Chrome around business screens |
| Next.js App Router | Spine (v1) | — | Platform framework bet |
| TanStack Query | Convention | — | Session **5** — not a spine port; template pattern |
| `resolveContext`, route/action factories | Spine-adjacent bootstrap | — | Session **4** — `@latch/app-kit` vs per-app `lib/latch.ts` |
| v1 relational storage model (`latch_*`, SQL ports) | Spine (v1 bet) | — | Multi-backend DAL out of scope |
| Neon / `pg` Pool / hosted Postgres | Adapter | Persistence engine | Default engine binding, not the enforcement kernel |

## Adapter rules (confirmed session 2)

1. Spine packages (`@latch/dal`, `@latch/policy`, `@latch/contracts`, `@latch/audit` core types) **never import** adapter concretions.
2. Every adapter implements a **named port** owned by spine or `@latch/contracts`.
3. Template ships **one reference adapter per port**; add a second only when about to swap.
4. Version churn stays in adapter packages or `packages/codegen/template/lib/adapters/`, not in the kernel.
5. **Not everything flexible is an adapter** — folder layout, CSS, RHF, and app shell are skin/convention unless there is a real port.
6. **One port, one adapter family** — do not fold audit INSERT into the Drizzle `StoreAdapter`; both may use `pg` under the hood.
7. **Publish adapters as npm packages** when a port has a stable contract and 2+ apps need the same binding — start from template reference, extract to `@latch/adapter-*` (session **5** names packages).

## Points to confirm

1. ✅ Three layers (spine / adapters / skin) are the decision lens going forward.
2. ✅ “Flexible auth” means **any library that implements `getPrincipal`**, not any user-table shape.
3. ✅ v1 **storage model** is relational Postgres (`latch_*` platform DDL, SQL behind ports); Neon / `pg` / Drizzle are **default adapters**. Generic multi-backend DAL is **out of scope**.
4. ✅ Reference adapters are **defaults**, not spine requirements (e.g. Better Auth vs another session library).

## Open questions (deferred)

- Which ports get a formal `@latch/adapter-*` package vs template-only convention? → **Session 5** (lean: publish per port when template copy-paste hurts).
- Is TanStack Query a port or a scaffold convention? → **Session 5** (lean: convention, not a port).
- Where does `@latch/app-kit` sit — spine packaging or adapter bundle? → **Session 4** (lean: spine-adjacent bootstrap orchestration; adapters injected, not bundled into kernel).

### Decision: three-layer taxonomy (2026-06-10)

**Choice:** Adopt **spine / adapters / skin** as the permanent classification lens. **Spine** = correctness contracts, enforcement orchestration, and v1 platform bets (Postgres storage *model*, `latch_*` DDL, DAL-only access, manifest re-resolve, audit mandatory). **Adapters** = swappable implementations of **named ports** (`StoreAdapter`, `AuditWriter`, `getPrincipal`, DB session, reference UI). **Skin** = business domain (Surface YAML, business tables, multi-table glue, `replay()`, form library, UI kit, shell/theme). A **port** is the TypeScript contract the spine owns; an adapter implements it. **Convention** (no port) covers patterns the template documents but the kernel does not import (e.g. TanStack Query). Postgres-only v1 **narrows adapters**; it does not collapse the spine — compartment tests already prove the kernel without production Postgres.

**Rationale:** The 2026-06-05 spine-vs-skin rule lacked a place for library bindings. Adapters explain why `@latch/audit` can stay generic at the type layer while `latch_audit` DDL is platform spine, and why `createPostgresAuditWriter` must graduate out of per-app copy-paste without merging into the Drizzle store. Splitting **storage model** (spine bet) from **engine binding** (`pg`, Neon, Drizzle) answers “is there much spine left?” — policy resolve, manifest projection, strict writes, codegen vocabulary, and restore orchestration remain Latch IP regardless of which Postgres client library is used. Adapter packages (`@latch/adapter-*`) are the intended distribution shape once ports stabilize on 2+ apps.

---

## Migrating the eight axes (2026-06-05)

| # | Topic | Spine | Adapter | Skin |
|---|-------|-------|---------|------|
| A | Column types | Declare in YAML; cross-check DDL | Drizzle column mapping in store | — |
| B | Surface glue | Generated single-table path | — | Multi-table hand glue |
| C | Forms | Manifest-driven `<SurfaceForm>` alignment | — | RHF + submit wiring; layout |
| D | UI kit | — | — | antD (or other) + RHF wrappers; app-owned |
| E | App shell / theme | — | — | App-owned |
| F | Auth | `latch_users` + `Principal` port | Better Auth (default) | — |
| G | Template delivery | Platform DDL + wiring | Reference adapters bundled | Business modules |
| H | Policy vocabulary | Codegen Field/action catalog | — | Per-app Surface YAML |

> **Note:** Decision H’s “grants in YAML” half was superseded (2026-06-06) — grants are runtime DB data; vocabulary stays codegen.

---

## Spine lock list (draft)

Session **4** — confirm, contest, or move items. Do not implement until this list is reviewed.

### Likely spine (confirm)

- [x] DAL-only DB access from routes/actions/components — ✅ session 4 (2026-06-10)
- [x] Manifest re-resolve on every mutation — ✅ session 4 (2026-06-10); writes only; cost negligible (in-memory `resolve`); read cache is separate (`manifestCacheMode`)
- [x] Writable Zod `.strict()`; forbidden fields omitted server-side — ✅ session 4 (2026-06-10)
- [x] Hard delete only; recovery via restore-from-audit — ✅ session 4 (2026-06-10)
- [x] One `latch_audit` stream (IAM + business); split only via partition/view if compliance forces — ✅ session 4 (2026-06-10)
- [x] Audit rows immutable (trigger + `latch_app` INSERT-only) — ✅ session 4 (2026-06-10)
- [x] RBAC; Surface as policy boundary; Field-level read/write — ✅ session 4 (2026-06-10)
- [x] Relational Postgres storage model for v1 (Neon/`pg`/Drizzle = default adapters) — ✅ session 4 (2026-06-10)

### Contested / TBD

- [x] SQL column narrowing on read — **deferred**; v1 spine = fetch-then-project + DTO omission; SQL `SELECT` narrowing = future adapter optimization — ✅ session 4 (2026-06-10)
- [x] Bootstrap home — **hybrid (C):** `@latch/app-kit` orchestration + thin per-app `lib/latch.ts` (registry, adapters); build in extraction slice #4 — ✅ session 4 (2026-06-10)
- [x] HTTP surface — REST route handlers **required** platform contract (RN, integrations); Server Actions **optional** Next.js convention on same DAL — ✅ session 4 (2026-06-10)

### Decision: spine lock list (2026-06-10)

**Choice:** Lock the eleven spine items in § Likely spine above. Contested items resolved: **(1)** v1 read enforcement = fetch-then-project + DTO omission; SQL `SELECT` narrowing deferred as adapter optimization. **(2)** Bootstrap = hybrid **C** (`@latch/app-kit` + thin `lib/latch.ts`). **(3)** HTTP = REST required platform contract; Server Actions optional Next.js sugar.

**Rationale:** Session 4 stops re-debating invariants already proven in phases 00–08. DTO-boundary reads match current DAL and invariant 4 without forcing column-level SQL in every store adapter. Bootstrap hybrid balances spike flexibility with extraction roadmap slice #4. REST-as-contract satisfies React Native and external clients without elevating Next.js Server Actions to spine — Actions remain ergonomic web-only wiring on the same enforcement path.

---

## Adapter catalog (draft)

Session **5** — lock default adapter per port and whether it is a package or template convention.

| Port | Spine contract | Default adapter (proposal) | Package vs template | Status |
|------|----------------|----------------------------|---------------------|--------|
| Identity | `getPrincipal()` → `Principal` | Better Auth | `@latch/adapter-better-auth` | `[x]` session 5.1–5.1b (2026-06-10) |
| Business persistence | `StoreAdapter` | Drizzle + `pg` | `@latch/adapter-drizzle` | `[x]` session 5.2 (2026-06-10) |
| Audit persistence | `writeAudit` → `latch_audit` | Postgres pool writer | `@latch/adapter-pg-audit` | `[x]` session 5.3 (2026-06-10) |
| DB session | `withPermissionDb` / `SET LOCAL` | `pg` Pool | `@latch/pg-session` | `[x]` session 5.4 (2026-06-10) |
| HTTP read | manifest + DAL | REST route factory | `@latch/app-kit` | `[x]` session 5.5 (2026-06-10) |
| HTTP write | manifest + DAL | Server Action helper (optional) | `@latch/app-kit` | `[x]` session 5.6 (2026-06-10) |
| Client reads | manifest props | RSC default; TanStack Query **deferred** until a app needs it | — | `[~]` hold — session 5.7 |

### Decision: adapter package layout (2026-06-10)

**Choice:** **Option 2** — **separate npm packages** per port (independent deps and versions). Optional monorepo grouping under `packages/adapter/<name>/` (each with its own `package.json`). **Do not** use one umbrella `@latch/adapter` package with subpath exports (dependency coupling). **Naming:** `@latch/adapter-<vendor>` for third-party bindings (Better Auth, Drizzle); `@latch/pg-<concern>` for first-party raw Postgres ports (`pg-session`; `adapter-pg-audit` may rename to `pg-audit` later for symmetry).

**Rationale:** Adapters pull different third-party stacks; a single `@latch/adapter` package would force unrelated deps on every consumer (e.g. RN API server needing only `pg-audit`). Filesystem grouping gives clarity without publish coupling.

### Decision: adapter catalog (2026-06-10)

**Choice:** Default adapters and package homes locked (table above). **TanStack Query deferred** — no package or convention until a real app uses it; until then RSC props + REST JSON suffice. **`@latch/app-kit`:** bootstrap orchestration (session 4 **C**) plus REST route factory + optional Server Action helpers (not a vendor `adapter-*` package).

**Rationale:** Separate packages per port (Option 2 layout) keep deps isolated. Vendor bindings use `@latch/adapter-*`; first-party Postgres uses `@latch/pg-*`. HTTP factories belong in `app-kit` as Next.js platform wiring, distinct from DAL kernel. Client cache library is presentation-tier — premature to standardize without a consumer.

---

## Related

- [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md) · [`00-overview.md`](./00-overview.md) · [`12-audit-opinionation.md`](./12-audit-opinionation.md)
- [`02-identity-and-permissions.md`](./02-identity-and-permissions.md) (auth port) · [`04-runtime-dal.md`](./04-runtime-dal.md) (`StoreAdapter`)
- [`../reference/compartments.md`](../reference/compartments.md)
