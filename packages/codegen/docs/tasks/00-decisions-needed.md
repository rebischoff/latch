# 00 — Decisions needed (parking lot)

> **Status:** Open (2026-06-05). Not a task — a list of choices that **block** deferred codegen work or shape how the executable tasks are packaged. Resolve here (dated **Decision** block), then graduate into [`docs/discussions/01-codegen.md`](../../../../docs/discussions/01-codegen.md) and spawn a task if needed.

These are the *un-decided* items extracted from the discussion. Executable tasks (01–04) do **not** wait on these except where noted.

> **Boundary reference:** the scope these items sit inside is fixed by [`docs/reference/codegen-scope.md`](../../../../docs/reference/codegen-scope.md) — codegen **owns** the logical-surface layer (types/validation/permissions/glue), **verifies** the physical layer (`--check` vs Drizzle), and **does not own** DDL/migrations or page JSX. D2/D5 below are *how/whether* questions **inside** that boundary, not invitations to move it.

---

## D1 — One generator with modes, or separate generators?

**Question:** Is codegen a single tool with modes (`structure` / `glue` / `registry` / `ddl`) or a set of separate generators sharing a parser?

**Why it matters:** Affects how tasks [03](./03-single-table-glue.md) (glue) and [04](./04-policy-registry-gen.md) (registry) are wired — one CLI with flags vs. distinct entrypoints, and whether `--check` covers all outputs at once.

**Affects:** packaging of 03/04 (not their logic). Pick before finalizing their CLI surface.

**Scope:** all modes named here (`structure` / `glue` / `registry`) live **inside** the [codegen boundary](../../../../docs/reference/codegen-scope.md); a `ddl` mode would cross it (see D5).

**Status:** Undecided.

---

## D2 — How does `--check` cross-check types against Drizzle?

**Question:** Decision A says declared YAML types are "cross-checked against the Drizzle schema in `codegen --check`." *How?* Options:

- **Import** each app's `db/schema.ts` table objects and read column types via Drizzle's table introspection (typed, no parser; couples codegen to Drizzle).
- **Parse** `schema.ts` / migration SQL statically (no Drizzle dependency; more brittle).
- **Defer** the cross-check: ship YAML-declared types now, add the Drizzle reconciliation later.

**Why it matters:** Determines whether task [02](./02-types-in-yaml.md) ships the cross-check in one pass or splits it out. The *YAML-declared types + drop `COLUMN_ZOD`* half of task 02 is executable regardless.

**Scope:** this is the **verify** verb in [`codegen-scope.md`](../../../../docs/reference/codegen-scope.md) — codegen reads Drizzle to confirm YAML types match; it never writes Drizzle. Picking import-vs-parse does **not** move the boundary.

**Status:** **Deferred** (2026-06-06) — task 02 shipped YAML-declared types; Drizzle reconciliation is a follow-up once the import-vs-parse approach is picked.

---

## D3 — Column-type declaration shape in YAML

**Question:** How are types attached to columns? Today `fields[].columns` is a list of strings (`"contacts.email"`). Options:

- Per-column object: `- { column: contacts.email, type: text, nullable: true }`.
- A surface-level `columnTypes:` map keyed by qualified column.
- A `types:` block per field.

**Why it matters:** Shapes the YAML schema + parser change in task [02](./02-types-in-yaml.md) and the `SurfaceFieldDef` type. This is an *ergonomics* call (skin), so lean to whatever reads cleanest in the spike; record the pick in task 02 when chosen.

### Decision: per-column object (2026-06-06)

**Choice:** `fields[].columns` is a list of `{ column, type, nullable? }`. Qualified column name stays on `column`; `type` uses the closed vocabulary (`string`, `number`, `boolean`, `timestamp`).

**Rationale:** Co-locates type with column in the Field block; no second lookup map; validates cleanly in `parseSurfaceYaml`.

**Status:** Resolved — implemented in task [02](./02-types-in-yaml.md).

---

## D4 — Starter-page / UI scaffolding (deferred feature)

**Question:** Should codegen "scaffold a starter page once" (Point 5)? If so, what is the "scaffold once, never own/overwrite" mechanism?

**Why it matters:** Overlaps **template delivery** (decision G, [discussion 07](../../../../docs/discussions/07-template-scaffold.md)). No task until both this and the template approach are settled.

**Scope:** [`codegen-scope.md`](../../../../docs/reference/codegen-scope.md) boundary 3 — codegen **does not own** page components/JSX. Any starter-page work must be one-time scaffold (not the idempotent `sync` generator) and must not overwrite app-owned files.

**Status:** Deferred — no task.

---

## D5 — Migration / DDL generation (deferred feature)

**Question:** Do we generate migrations/DDL from structure at all (Point 6)? Discussion calls it a *separate generator, if we do it at all.*

**Why it matters:** Large surface; intersects the Drizzle-as-source-of-truth question (D2). Out of scope for the spike.

**Scope:** generating DDL would **move** the [`codegen-scope.md`](../../../../docs/reference/codegen-scope.md) boundary — it overturns "Drizzle owns the physical schema; codegen only verifies it." The current decision is **stay DB-first**; revisiting this is a deliberate scope change (planning gate), not a follow-up task.

**Status:** Deferred — no task.

---

## Related

- [`docs/reference/codegen-scope.md`](../../../../docs/reference/codegen-scope.md) — **the boundary these decisions sit inside** (owns / verifies / must-not-own).
- [`01-codegen.md`](../../../../docs/discussions/01-codegen.md) — decisions A / B / H and the open questions these expand on.
- [`docs/reference/metadata-and-codegen.md`](../../../../docs/reference/metadata-and-codegen.md).
