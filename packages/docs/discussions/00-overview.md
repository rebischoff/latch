# Discussion 00 — Overall picture

> **Status:** Confirmed (2026-06-05). The big-picture agreement is locked — see the Decision block below. Each major point has its own discussion; this one is about how they fit and what Latch is *for*.

## Shared understanding

**What Latch is, in one sentence:** given a user and a screen, decide which fields they may see/edit, and make every read/write obey that decision through a single enforced path.

**UI reflects permissions, server enforces them.** The client UI must match what the manifest grants (hide unavailable actions, omit unreadable fields, render read-only where edit isn't granted) — a *UX* obligation, not a security boundary, since every read/write is still validated server-side in the DAL. Detailed requirements live in [06-ui-sync](./06-ui-sync.md#uipermission-alignment-requirements).

**The original goal** was a generic, permission-aware DAL: `query(thing, args, user) → permission-aware result`. Latch delivers that idea, but expressed in layers rather than one function, because real requirements (field-level permissions, approval, audit, multiple storage backends) forced a split.

**Three time-phases** (a useful mental model that cuts across the compartments):

| Phase | What happens | Where the value is |
|-------|--------------|--------------------|
| **Authoring** (build time) | YAML → codegen → types/Zod/glue | developer ergonomics |
| **Policy** | role→field definitions (YAML) + user→role assignments (DB) | who-can-do-what |
| **Runtime** | resolve manifest → enforce in DAL → query via store | **the actual safety** |

**Platform vs per-app** is the other axis. Everything is either *platform* (identical for every business app → belongs in a template) or *per-app* (authored per business domain). See the [compartment map](../reference/compartments.md).

**The honest assessment:** the engine (runtime/DAL + policy) is sound and is where the value lives. The pain is the *authoring experience* — too many hand-written files per surface. The fix is to **generate the glue**, not rewrite the engine. That same metadata-driven authoring is what makes the template and AI-authored-surface ambitions realistic.

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

## Related

- Each major point: [01](./01-codegen.md)–[08](./08-ai-authored-surfaces.md)
- [`../reference/compartments.md`](../reference/compartments.md), [`../foundations/architecture-overview.md`](../foundations/architecture-overview.md)
