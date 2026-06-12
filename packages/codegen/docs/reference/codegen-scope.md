# Codegen scope & source-of-truth

> **Kind:** Reference (boundary). **Not** a task file. Companion: [`metadata-and-codegen.md`](./metadata-and-codegen.md) (format & emit). Tasks: [`../tasks/README.md`](../tasks/README.md).
>
> **Status:** Decision (2026-06-06); **SQL-first update (2026-06-11)** — see notes below. States what **sync** codegen (`npm run codegen`) **owns** (generates), **verifies** (cross-checks), and **must not own**. App scaffolding is [`../tasks/05-scaffold-cli.md`](../tasks/05-scaffold-cli.md) — a different tool.
>
> **SQL-first (2026-06-11):** Drizzle is retired as the runtime engine ([`11-spine-adapters-skin.md`](../../../docs/discussions/11-spine-adapters-skin.md#decision-sql-first-persistence--retire-drizzle-as-the-runtime-orm-2026-06-11)). The **physical layer's source of truth is SQL migration files** (not a Drizzle schema). Codegen additionally **generates single-table store SQL** (`store.generated.ts`) and **cross-checks YAML types against parsed migration DDL**. References to "Drizzle schema" below are superseded by "migration DDL"; the logical/physical split is otherwise unchanged.

## Principle

Latch has **three authoring inputs**, each the source of truth for a different layer. Codegen owns the **logical-surface layer** and **verifies alignment** with the physical layer. It does **not** author the database or the UI.

> "In sync" is achieved by one of three mechanisms — **(a)** generating a downstream artifact from one source, **(b)** cross-checking two sources at build time, or **(c)** sharing one runtime artifact — **not** by a single mega-generator that emits everything from one file.

### Decision: codegen owns the logical layer, verifies the physical layer (2026-06-06)

**Choice:** Surface/policy YAML is the source of truth for the **logical surface** (Fields, column maps, types, permissions) and the **glue + store query SQL** that drives the kernel. The **physical database** keeps its own source of truth (**SQL migration files** as of 2026-06-11; was Drizzle schema + migrations); codegen **reads/parses** it to cross-check, never generates the schema. The **UI** is kept in sync at runtime via a shared, manifest-narrowed Zod schema — codegen emits the metadata, not the page JSX.

**Rationale:** A single source spanning all layers sounds powerful but buys drift and migration pain — generating DDL means reinventing migration diffing against live data, and generating form JSX drifts the moment it is hand-edited. Cross-check (`--check`) plus a shared runtime schema delivers the same "everything in sync" guarantee while letting the SQL migration files own DDL and the app own look-and-feel (the [spine-vs-skin rule](../../../docs/discussions/00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05)). **SQL-first update (2026-06-11):** codegen also emits single-table *query* SQL (`store.generated.ts`), but the *schema* stays migration-owned — the "don't generate DDL" boundary is unchanged.

## Sources of truth

| Input | Owns | Status |
|---|---|---|
| `*.surface.yaml` | Logical surface: Fields, column maps, types, verification flags, policy **vocabulary** (`kind`, action sets) | authoritative |
| `latch_roles` + `latch_role_surfaces` + `latch_role_grants` (runtime DB) | Permission **grants**: sparse Field/action allows + `row_scope` per (role, surface) | authoritative (runtime data) |
| SQL **migration files** (`migrations/*.sql`) | Physical DB: tables, columns, types, constraints, indexes | authoritative (**SQL-first, 2026-06-11**; was Drizzle `db/schema.ts`) |

There is **no single source of truth** spanning all layers. Surface YAML is *not* truth for physical columns (Drizzle is) nor for role grants (the DB is, as of 2026-06-06).

> **Updated (2026-06-06) — roles are runtime data; `*.policies.yaml` retired.** Policy vocabulary lives in `*.surface.yaml` and is emitted to `*.schema.generated.ts`. Grants are CRUD'd by app users into `latch_role_surfaces` + sparse `latch_role_grants`. See [`access-control.md`](../../../policy/docs/access-control.md#decision-app-defined-roles-are-runtime-data-2026-06-06).

## What codegen does — three verbs

| Verb | Artifacts | Source |
|---|---|---|
| **Generate** | `FieldIds`, `columnMap`, Zod read + patch schemas, DTO types (`z.infer`), verification ids | `*.surface.yaml` |
| **Generate** | Single-table glue (`projectRow` / `applyPatch` / descriptor); anchor-slice + relation stubs for multi-table | `*.surface.yaml` |
| **Generate** | Single-table **store SQL** (`store.generated.ts`: parameterized `pg` get/list/insert/update/delete) — **SQL-first, 2026-06-11** | `*.surface.yaml` (`columnMap`) |
| **Generate** | Policy **vocabulary** catalog (`${surface}SurfacePolicyDef`) — **not** role grants | `*.surface.yaml` |
| **Cross-check** | Declared YAML column types vs **migration DDL** column types (`--check` fails on mismatch; was Drizzle) | YAML ↔ `migrations/*.sql` |
| **Don't own** | Role grants (which role gets what) — runtime DB data, validated by the role editor at write time | `latch_role_grants` |
| **Don't own** | Physical DDL / migrations | hand/AI-authored SQL migration files (gated by destructive-migration linter) |
| **Don't own** | Multi-table store SQL / joins | hand-written `repository.ts` (escape hatch) |
| **Don't own** | UI form JSX / page components | runtime `<SurfaceForm>` over generated metadata |

## How each consumer stays in sync

- **DTO ↔ Zod:** DTO type is `z.infer<>` of the generated schema — same file, cannot drift.
- **Server ↔ client form:** both validate with the **same** generated, manifest-narrowed Zod; [`<SurfaceForm>`](../../../docs/discussions/06-ui-sync.md#decision-forms-ui-kit-shell--opinionatedflexible-2026-06-05) is a runtime component, not generated code.
- **YAML ↔ DB:** `codegen --check` cross-checks declared types against the **parsed migration DDL**; CI fails on drift (threat [T11](../../../docs/foundations/threat-model.md)). *(Was Drizzle schema; SQL-first 2026-06-11.)*
- **YAML ↔ store SQL:** single-table `store.generated.ts` is emitted from the same `columnMap`; committed output + `--check` drift gate (cannot drift from the schema it was generated from).
- **YAML ↔ generated TS:** committed output + `--check` drift gate.

## Boundaries (hard rules)

1. Codegen is **authoring-time only** — never a runtime dependency, never a security boundary. Wrong output is caught by `--check` + Zod + the kernel.
2. Codegen **does not create database tables or migrations.** SQL migration files (hand/AI-authored, linter-gated) own physical schema; codegen only **reads/parses** them to cross-check. *(Was "Drizzle owns physical schema"; SQL-first 2026-06-11.)* Codegen **does** emit single-table **store query SQL** from the YAML `columnMap` — generated artifact, never a migration.
3. Codegen **does not generate page components or form JSX.** It generates the metadata/schema that the runtime `<SurfaceForm>` / `<FieldControl>` consume.
4. Codegen **does not generate policy/enforcement logic** — only the Field/action **vocabulary** catalog from `*.surface.yaml`. Role **grants** are runtime DB data (`latch_role_grants`), never generated.
5. Generated files live under `generated/`, are committed, and are **never hand-edited** (invariant 8).

## Multi-table policy (refinement of [Decision B](../../../docs/discussions/01-codegen.md))

- **Single-table** (all columns resolve to `anchorTable`): generate full glue.
- **Multi-table**: generate the **anchor-table slice** of `projectRow` / `applyPatch` + typed **relation stubs**; hand-write only the cross-table field behavior.

> **Today:** multi-table emits a `MULTI_TABLE_GLUE_SKIPPED` marker (all-or-nothing). The anchor-slice + relation-stub refinement above is the **proposed next step**, not yet built — see [task 03](../tasks/03-single-table-glue.md) follow-ups and [`00-decisions-needed.md`](../tasks/00-decisions-needed.md).

## Explicitly deferred (parking lot — no decision taken)

Tracked in [`00-decisions-needed.md`](../tasks/00-decisions-needed.md):

- Generating **DDL/migrations** from YAML (**D5**) — **still deferred**; migrations remain the hand/AI-authored source of truth (SQL-first keeps schema DB-first, even though codegen now emits *query* SQL).
- The cross-check *mechanism* (**D2**) — **resolved direction (2026-06-11):** parse migration DDL (SQL-first), not import a Drizzle schema; exact parser TBD in task 08.
- One-generator-with-modes vs separate generators (**D1**).
- Starter-page scaffolding (**D4**) — use scaffold CLI ([task 05](../tasks/05-scaffold-cli.md)), not sync codegen.

## One-sentence summary

> Sync codegen owns the logical-surface layer — types, validation, permissions, and glue — and proves it stays aligned with the physical DB (via `--check`) and the UI (via a shared runtime schema); it does **not** author the database or the page JSX.

## Related

- [`metadata-and-codegen.md`](./metadata-and-codegen.md) — YAML format and generated artifacts
- [`../tasks/05-scaffold-cli.md`](../tasks/05-scaffold-cli.md) — `latch new` (not sync codegen)
- [`../README.md`](../README.md) — docs map
- [`compartments.md`](../../../docs/reference/compartments.md#1-codegen-authoring--build-time)
- [`01-codegen.md`](../../../docs/discussions/01-codegen.md) — decisions A / B / H
