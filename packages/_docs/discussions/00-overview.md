# Discussion 00 — Overall picture

> **Status:** Living charter (confirmed 2026-06-05; extended 2026-06-10). The direction below is shared, but **not exhaustive** — adapter defaults, platform packaging, and per-compartment opinionation are still open. Work through them in order: [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md).

## Shared understanding

**What Latch is, in one sentence:** the **governed layer between Postgres and the app** — given a user and a screen, resolve which fields they may see/edit, route every read/write through a single enforcement path, and keep the client aligned so unauthorized fields never appear on the wire or in the UI.

**The DB ↔ app sandwich.** Business tables live in Postgres; pages and APIs live in Next.js. Latch sits in the middle:

```
App (routes, actions, components)
        ↕ manifest + PermissionContext
Latch spine (resolve → enforce → audit / approval)
        ↕ StoreAdapter (adapter)
Postgres
```

**Server enforcement (security boundary).** Every mutation and read goes through one path: `getPrincipal` → `PolicyService.resolve` → DAL with a fresh manifest. No raw DB access from routes, Server Actions, or components. Details: [04-runtime-dal](./04-runtime-dal.md), invariants in [`.cursor/rules/10-invariants.mdc`](../../../.cursor/rules/10-invariants.mdc).

**Client alignment (UX + leak prevention).** The UI is not the security boundary, but the client must not *display* or *receive* fields the manifest denies:

| Mechanism | Role |
|-----------|------|
| RSC / server loaders | Resolve manifest server-side; pass allowed shape to the tree |
| DAL projection | Forbidden columns never enter the DTO |
| `@latch/react` (`CapabilitiesProvider`, `<Can>`, `<FieldControl>`) | Render actions/fields from the same manifest the DAL used |

Exact wiring is still evolving ([06-ui-sync](./06-ui-sync.md)); the invariant is **one manifest, two consumers** (DAL + UI), not hide-show CSS as security.

**The original goal** was a single permission-aware package: `query(thing, args, user) → permission-aware result`. Runtime concerns split into `@latch/policy`, `@latch/dal`, `@latch/audit`, `@latch/approval`, plus client-safe `@latch/contracts` and `@latch/react` — same goal, multiple packages. See [Package topology](#package-topology-spine-split-vs-merge) below.

**Three time-phases** (a useful mental model that cuts across the compartments):

| Phase | What happens | Where the value is |
|-------|--------------|--------------------|
| **Authoring** (build time) | YAML → codegen → types/Zod/glue | developer ergonomics |
| **Policy** | role→field definitions (YAML) + user→role assignments (DB) | who-can-do-what |
| **Runtime** | resolve manifest → enforce in DAL → query via store | **the actual safety** |

**Platform vs per-app** is the other axis. Everything is either *platform* (identical for every business app → belongs in a template) or *per-app* (authored per business domain). See the [compartment map](../reference/compartments.md).

**The honest assessment:** the engine (runtime/DAL + policy) is sound and is where the value lives. The pain is the *authoring experience* — too many hand-written files per surface. The fix is to **generate the glue**, not rewrite the engine. That same metadata-driven authoring is what makes the template and AI-authored-surface ambitions realistic.

### Toolchain vs runtime (two products in one repo)

| Concern | What it is | Likely home |
|---------|------------|-------------|
| **Runtime spine** | Enforce permissions on every request | `@latch/contracts` + merged server kernel (policy, dal, audit, approval — see [Package topology](#package-topology-spine-split-vs-merge)) |
| **Adapters** | Swappable bindings (auth, Drizzle store, Postgres audit writer, **UI/manifest components**) | `@latch/adapter-*` or template `lib/adapters/` |
| **Toolchain / CLI** | Scaffold apps, sync YAML → TS, (future) YAML → migrations | `@latch/codegen` today; may grow into `@latch/cli` |
| **AI authoring substrate** | Validate/constrain declarative output before apply | Extends toolchain + gates — not the runtime kernel |

Scaffold CLI (`latch new`) already lives in `@latch/codegen` separate from sync (`npm run codegen`). YAML → migrations is **unproven** until more template apps exist — track as toolchain ambition, not v1 spine.

## Package topology: spine split vs merge

**Original vision:** one package. **Today:** several server packages + `contracts` + `react`, bound by import rules ([`packages.md`](../reference/packages.md)).

**Why it split (historical):** early monorepo scaffold + npm package cycles (`dal` imports `audit`/`approval`; those packages must not import `dal` back — so they became **sibling packages**). That sibling layout is a **packaging workaround**, not proof they are separate domains.

**What must stay separate regardless:**

| Package | Why |
|---------|-----|
| `@latch/contracts` | Client-safe types; only package the browser may import |
| `@latch/react` (today) | Client-only manifest UI helpers — thin today; likely graduates to a **UI adapter** (`@latch/adapter-ui-*` or template-owned) rather than core spine |

**Merge candidate — server kernel:** `@latch/policy` + `@latch/dal` + `@latch/audit` + `@latch/approval` → one server package (e.g. `@latch/core` or `@latch/server`). Internal modules replace cross-package cycle rules; apps get one mental import for enforcement.

**Compartments vs packages:** [Compartments](../reference/compartments.md) test **logical concerns** (resolve, enforce, audit, approve) — in-memory fixtures, threat tests, PG smoke tests. That test strategy works **whether or not** the npm packages are merged. Package merge is an ergonomics/maintainability choice, not a testing architecture choice.

| Approach | Pros | Cons |
|----------|------|------|
| **Keep physical split** | Import graph enforced by ESLint today | Harder to reason about “what is Latch?”; sibling layout is cycle artifact |
| **Merge server kernel** | Matches original one-package mental model; cycles become internal | Requires strict internal module boundaries; server-only export map |
| **Facade only** (re-exports) | Less churn short-term | Two ways to import; doesn’t fix cycle rationale |

**Working lean (2026-06-10):** merge **policy + dal + audit + approval** when a scaffold app proves it; keep **`contracts` separate**; treat **`react` as UI adapter territory** (reference impl now, swappable later). Adapters stay **out** of the server kernel. Validate via compartment tests before/after merge — behavior should be unchanged.

### Decision: runtime package topology (TBD)

**Choice:** TBD — favor **merged server kernel** + separate `contracts` + UI adapter; confirm with compartment test parity after merge.

**Rationale:** TBD — run merge experiment when scaffold path is stable on 2–3 apps.

## CLI and AI substrate

**CLI (toolchain)** — reasonable as its **own concern**, even if it shares a repo folder with codegen today:

- `latch new` — copy template, optional adapter choices (auth, ORM)
- `latch codegen` / `codegen --check` — YAML → Zod, glue, vocabulary
- *(Future)* `latch migrate` or codegen subcommand — Surface YAML → DDL/migrations (practicality TBD)

**AI-generated apps** — same **declarative pipeline** as human authors, not a separate runtime:

1. AI emits constrained YAML (+ proposed migration)
2. Toolchain validates (`codegen --check`, schema gate, human review)
3. Runtime spine enforces regardless of who authored the YAML

So AI substrate is **validation + schema + apply gates** on the toolchain side ([08-ai-authored-surfaces](./08-ai-authored-surfaces.md)), not a replacement for `@latch/dal`. It may surface as CLI subcommands (`latch validate`, `latch plan`) rather than a new runtime package. Orchestration (calling an LLM) stays outside the kernel — app, script, or optional `@latch/authoring` only if multiple consumers need it.

### Decision: CLI package boundary (TBD)

**Choice:** TBD — stay in `@latch/codegen` vs rename/split to `@latch/cli`.

**Rationale:** TBD after scaffold + sync stabilize on 2–3 apps.

### Decision: AI substrate packaging (TBD)

**Choice:** TBD — CLI extensions vs thin `@latch/authoring` vs app-only scripts.

**Rationale:** TBD; smallest proof is AI-assisted YAML for one Surface behind existing `codegen --check`.

### Decision: Overall picture confirmed (2026-06-05)

**Choice:** The five points below are confirmed (with the noted refinements). Primary goal is **(a) a cleaner internal platform for our own apps**, with **(c) substrate for AI-generated apps** as a later objective; **(b) open-source framework** is not a goal. The overarching aim is to make the library **more readable and user-friendly**.

**Rationale:** The engine/DAL is sound; the work is authoring ergonomics, UI/permission alignment, and scaffolding. Prioritizing internal apps first keeps scope honest while leaving the door open for AI-authored surfaces, which the same metadata-driven authoring enables.

## Points confirmed (2026-06-05)

1. ✅ The **purpose statement** above is accurate and shared — **plus** the UI must reflect the manifest (hide unavailable actions/fields, read-only where applicable) while the server remains the enforcement boundary (see Shared understanding).
2. ✅ Latch's **value is at runtime**; codegen is an *authoring* convenience, not the security boundary.
3. ✅ The complexity problem is **authoring ergonomics**, addressed by **generation + factories**, not an engine rewrite. **Note:** reducing complexity/ambiguity is about making the library more **readable and user-friendly** — it is not a claim that the engine/DAL is incomplete.
4. ✅ The **platform vs per-app** split is the right organizing principle for a future template. **Goal:** templates (via codegen) scaffold new business apps — generating the core Next.js files and setting up the DB (or at minimum producing the migrations).
5. ✅ Every business app has permissions — there is **no permissionless mode**, even for one user / one role.

### Decision: Opinionated vs. flexible — "spine vs. skin" (2026-06-05)

**Choice:** The deciding rule is **be opinionated about the spine, flexible about the skin.** Anything touching *correctness or enforcement* (validation, permissions, the DAL path) is **opinionated** — one way, no per-app choice. Anything *presentational or business-specific* (look, layout, UI kit, business tables) is **flexible** — app-owned, with the platform shipping good defaults where useful.

**Rationale:** A wrong choice on the spine is a bug or a vulnerability, so there's no upside to configurability there; forcing one answer on the skin just annoys app authors (and AI authors). The invariants are already opinionated-and-locked; the open decisions below were sorted with this rule.

### Decision: spine / adapters / skin — three layers (2026-06-10)

**Choice:** Add a middle **adapter** layer between spine and skin. Spine owns **ports and contracts**; **adapters** implement them with swappable libraries (Better Auth, Drizzle, Postgres audit writer); **skin** is business domain. See [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md).

**Rationale:** Most internal apps will share the same stack (Next.js, Postgres, a default auth library), but libraries and versions change. Adapters keep the kernel stable without pretending to be storage- or auth-agnostic.

**The open decisions, sorted (each recorded in its home doc):**

| # | Decision | Bucket | Home doc |
|---|---|---|---|
| A | Column types | Opinionated — declare in YAML, cross-check Drizzle (drop `COLUMN_ZOD`) | [01-codegen](./01-codegen.md) |
| B | Surface glue | Opinionated for single-table; hand-written escape hatch for multi-table | [01-codegen](./01-codegen.md) |
| C | Forms | Opinionated alignment via manifest-driven `<SurfaceForm>`; flexible widgets | [06-ui-sync](./06-ui-sync.md) |
| D | UI kit | Flexible — not tied to any library | [06-ui-sync](./06-ui-sync.md) |
| E | App shell / theme | Flexible — app-owned | [06-ui-sync](./06-ui-sync.md) |
| F | Auth library | Flexible library; opinionated constraint: `latch_users` is the one identity table | [02-identity](./02-identity-and-permissions.md) |
| G | Template delivery | Copyable app now, CLI later, internal-first | [07-template-scaffold](./07-template-scaffold.md) |
| H | Policy definitions | Opinionated — generate registry from `policies.yaml` (single source) | [02-identity](./02-identity-and-permissions.md) |

## Open questions

- **(Resolved 2026-06-05)** End goal is **(a) internal platform first, (c) AI-generated-app substrate later**; not (b) open source. See Decision above.
- **(Resolved 2026-06-05)** Opinionated vs. flexible is decided by the **spine-vs-skin** rule; the eight open axes are sorted in the Decision block above.
- **(Active 2026-06-10)** Platform opinionation track — adapter catalog, audit packaging, scaffold delivery. See [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md).
- **(Active 2026-06-10)** Runtime topology — keep package split, add `@latch/core` facade, or merge server packages? See [Package topology](#package-topology-spine-split-vs-merge).
- **(Active 2026-06-10)** YAML → migrations — toolchain feature; prove on 2–3 template apps before committing.
- **(Active 2026-06-10)** AI substrate — CLI validate/plan gates vs separate authoring package; see [CLI and AI substrate](#cli-and-ai-substrate).

## Related

- **Opinionation track:** [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md) · [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md) · [`12-audit-opinionation.md`](./12-audit-opinionation.md)
- Each major point: [01](./01-codegen.md)–[09](./09-role-delegation-and-scope.md)
- [`../reference/compartments.md`](../reference/compartments.md), [`../foundations/architecture-overview.md`](../foundations/architecture-overview.md)
