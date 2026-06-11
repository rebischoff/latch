# Codegen scope & source-of-truth

> **Status:** Decision (2026-06-06). States what codegen **owns** (generates), what it **verifies** (cross-checks), and what it must **not own**. Companion to [`metadata-and-codegen.md`](./metadata-and-codegen.md) (the *how*); this doc is the *boundary*.

## Principle

Latch has **three authoring inputs**, each the source of truth for a different layer. Codegen owns the **logical-surface layer** and **verifies alignment** with the physical layer. It does **not** author the database or the UI.

> "In sync" is achieved by one of three mechanisms — **(a)** generating a downstream artifact from one source, **(b)** cross-checking two sources at build time, or **(c)** sharing one runtime artifact — **not** by a single mega-generator that emits everything from one file.

### Decision: codegen owns the logical layer, verifies the physical layer (2026-06-06)

**Choice:** Surface/policy YAML is the source of truth for the **logical surface** (Fields, column maps, types, permissions) and the **glue** that drives the kernel. The **physical database** keeps its own source of truth (Drizzle schema + migrations); codegen **reads** it to cross-check, never generates it. The **UI** is kept in sync at runtime via a shared, manifest-narrowed Zod schema — codegen emits the metadata, not the page JSX.

**Rationale:** A single source spanning all layers sounds powerful but buys drift and migration pain — generating DDL means reinventing Drizzle Kit's migration diffing against live data, and generating form JSX drifts the moment it is hand-edited. Cross-check (`--check`) plus a shared runtime schema delivers the same "everything in sync" guarantee while letting Drizzle own DDL and the app own look-and-feel (the [spine-vs-skin rule](../discussions/00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05)).

## Sources of truth

| Input | Owns | Status |
|---|---|---|
| `*.surface.yaml` | Logical surface: Fields, column maps, types, verification flags, policy **vocabulary** (`kind`, action sets) | authoritative |
| `latch_roles` + `latch_role_surfaces` + `latch_role_grants` (runtime DB) | Permission **grants**: sparse Field/action allows + `row_scope` per (role, surface) | authoritative (runtime data) |
| `db/schema.ts` (Drizzle) + migrations | Physical DB: tables, columns, types, constraints, indexes | authoritative |

There is **no single source of truth** spanning all layers. Surface YAML is *not* truth for physical columns (Drizzle is) nor for role grants (the DB is, as of 2026-06-06).

> **Updated (2026-06-06) — roles are runtime data; `*.policies.yaml` retired.** Policy vocabulary lives in `*.surface.yaml` and is emitted to `*.schema.generated.ts`. Grants are CRUD'd by app users into `latch_role_surfaces` + sparse `latch_role_grants`. See [`access-control.md`](./access-control.md#decision-app-defined-roles-are-runtime-data-2026-06-06).

## What codegen does — three verbs

| Verb | Artifacts | Source |
|---|---|---|
| **Generate** | `FieldIds`, `columnMap`, Zod read + patch schemas, DTO types (`z.infer`), verification ids | `*.surface.yaml` |
| **Generate** | Single-table glue (`projectRow` / `applyPatch` / descriptor); anchor-slice + relation stubs for multi-table | `*.surface.yaml` |
| **Generate** | Policy **vocabulary** catalog (`${surface}SurfacePolicyDef`) — **not** role grants | `*.surface.yaml` |
| **Cross-check** | Declared YAML column types vs Drizzle column types (`--check` fails on mismatch) | YAML ↔ Drizzle |
| **Don't own** | Role grants (which role gets what) — runtime DB data, validated by the role editor at write time | `latch_role_grants` |
| **Don't own** | Physical DDL / migrations | Drizzle Kit |
| **Don't own** | UI form JSX / page components | runtime `<SurfaceForm>` over generated metadata |

## How each consumer stays in sync

- **DTO ↔ Zod:** DTO type is `z.infer<>` of the generated schema — same file, cannot drift.
- **Server ↔ client form:** both validate with the **same** generated, manifest-narrowed Zod; [`<SurfaceForm>`](../discussions/06-ui-sync.md#decision-forms-ui-kit-shell--opinionatedflexible-2026-06-05) is a runtime component, not generated code.
- **YAML ↔ DB:** `codegen --check` cross-checks declared types against Drizzle; CI fails on drift (threat [T11](../foundations/threat-model.md)).
- **YAML ↔ generated TS:** committed output + `--check` drift gate.

## Boundaries (hard rules)

1. Codegen is **authoring-time only** — never a runtime dependency, never a security boundary. Wrong output is caught by `--check` + Zod + the kernel.
2. Codegen **does not create database tables or migrations.** Drizzle owns physical schema; codegen only reads it to cross-check.
3. Codegen **does not generate page components or form JSX.** It generates the metadata/schema that the runtime `<SurfaceForm>` / `<FieldControl>` consume.
4. Codegen **does not generate policy/enforcement logic** — only the Field/action **vocabulary** catalog from `*.surface.yaml`. Role **grants** are runtime DB data (`latch_role_grants`), never generated.
5. Generated files live under `generated/`, are committed, and are **never hand-edited** (invariant 8).

## Multi-table policy (refinement of [Decision B](../discussions/01-codegen.md))

- **Single-table** (all columns resolve to `anchorTable`): generate full glue.
- **Multi-table**: generate the **anchor-table slice** of `projectRow` / `applyPatch` + typed **relation stubs**; hand-write only the cross-table field behavior.

> **Today:** multi-table emits a `MULTI_TABLE_GLUE_SKIPPED` marker (all-or-nothing). The anchor-slice + relation-stub refinement above is the **proposed next step**, not yet built — see [task 03](../../packages/codegen/docs/tasks/03-single-table-glue.md) follow-ups and [`00-decisions-needed.md`](../../packages/codegen/docs/tasks/00-decisions-needed.md).

## Explicitly deferred (parking lot — no decision taken)

Tracked in [`packages/codegen/docs/tasks/00-decisions-needed.md`](../../packages/codegen/docs/tasks/00-decisions-needed.md):

- Generating SQL/DDL from YAML (**D5**) — would overturn "Drizzle is truth"; **stay DB-first**.
- The Drizzle cross-check *mechanism* (import vs parse — **D2**).
- One-generator-with-modes vs separate generators (**D1**).
- Starter-page scaffolding (**D4**).

## One-sentence summary

> Codegen owns the logical-surface layer — types, validation, permissions, and glue — and proves it stays aligned with the physical DB (via `--check`) and the UI (via a shared runtime schema); it does **not** author the database or the page JSX.

## Related

- [`metadata-and-codegen.md`](./metadata-and-codegen.md) — what codegen emits + the YAML format
- [`compartments.md`](./compartments.md#1-codegen-authoring--build-time) — codegen as compartment 1
- [`../discussions/01-codegen.md`](../discussions/01-codegen.md) — decisions A / B / H
- [`../discussions/00-overview.md`](../discussions/00-overview.md) — spine-vs-skin rule
- [`packages/codegen/docs/tasks/`](../../packages/codegen/docs/tasks/README.md) — executable task plan
