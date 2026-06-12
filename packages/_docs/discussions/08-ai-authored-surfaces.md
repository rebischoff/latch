# Discussion 08 — AI-authored surfaces

> **Status:** Session **8** complete (2026-06-10). Next: session **9** — extraction roadmap ([`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md)). Depends on [01 codegen](./01-codegen.md), [02 permissions](./02-identity-and-permissions.md), and [07 template](./07-template-scaffold.md).

## Shared understanding

- The ambition: an end user (or operator) **adds/updates/deletes surfaces** with AI assistance — e.g. "build me a trades-service app with contacts and jobs."
- The current architecture is **well-suited** to this *precisely because* of the metadata indirection that otherwise feels heavy:
  - AI emits **constrained, validatable YAML** (surface + policies) and a migration — **not** arbitrary TypeScript or SQL it invents freely.
  - A **validation gate** (`codegen --check` + Zod + migration review) rejects malformed AI output before runtime.
  - The **kernel enforces invariants** (strict writes, forbidden-field omission, audit) regardless of what the AI authored — bounded blast radius.
- This is **"expose the authoring artifacts to an AI behind a gate,"** not a new architecture.

### Decision: AI artifact boundary — declarative only (2026-06-10)

**Choice:** **A — strict declarative only.** AI may emit `*.surface.yaml`, `*.policies.yaml` (Field/action vocabulary), and business **DDL migrations** (SQL files). All executable TypeScript comes from **`codegen`** (`modules/**/generated/*`) or **human** hand-written escape hatches (multi-table glue, pages, domain validation). AI must **not** author DAL/policy/audit code, route handlers, or ad-hoc query SQL.

**Rationale:** Keeps one enforcement path; `codegen --check` remains the drift gate on generated output; aligns with spine vs skin and session 1 codegen decisions (glue is codegen's job for single-table surfaces).

### Decision: authoring gate — tiered validation + human (2026-06-10)

**Choice:** **C — tiered gate.** **Always (automated):** JSON Schema / YAML lint on surface + policies files; `npm run codegen` + `codegen --check`; migration syntax/lint. **Additionally (human, v1 developer-assist):** PR or explicit reviewer sign-off before **applying migrations** — especially `DROP`, `ALTER` narrowing, or data backfills. YAML-only additive changes (new surface, new fields on new table) may apply after automated validation passes without a separate approval workflow. **Not** routed through runtime `submit`/`approve` ([03-approval](./03-approval.md)) — that is business workflow, not authoring.

**Rationale:** DDL is the highest blast-radius artifact; structural YAML errors are caught by codegen. End-user self-service may add stricter gates later (open question #1).

### Decision: runtime boundary — kernel only (2026-06-10)

**Choice:** **A — affirm.** AI-authored surfaces use the **same runtime path** as human-authored ones: `getPrincipal` → `PolicyService.resolve` → DAL with `PermissionContext` and manifest-narrowed Zod. **No** AI-specific runtime APIs, flags, or extra enforcement layers. Wrong structure is caught at the authoring gate (8.2); wrong grants are operator/DB concern; forbidden reads/writes are kernel-enforced regardless of who wrote the YAML.

**Rationale:** Security boundary is already the spine; tagging or QA gates at runtime would duplicate invariants without adding guarantees.

### Decision: keep YAML/codegen/kernel split (2026-06-10)

**Choice:** **A — affirm.** AI-authored surfaces are a **north-star justification** for metadata indirection — not a reason to collapse YAML, bypass codegen, or let AI write enforcement/glue TS. The authoring gate (8.2) and kernel (8.3) depend on this split.

**Rationale:** Removing the split would trade short-term ergonomics for unbounded AI blast radius; contradicts 8.1 and the core Latch value prop ([00-overview](./00-overview.md)).

### Decision: v1 author persona — developer-assist first (2026-06-10)

**Choice:** **A — developer-assist first.** v1 AI authoring target is **engineers in the monorepo** (Cursor, CLI, PR workflow) emitting declarative artifacts behind the tiered gate (8.2). **End-user self-service** (“operator adds a screen in prod”) is an explicit **later phase** — revisit gates and product surface when a real operator persona and hosted app exist.

**Rationale:** Matches current toolchain and git-based review; avoids building in-app authoring UI before extraction slices land. Ultimate ambition stays valid without premature product scope.

### Decision: migration apply — PR + destructive linter (2026-06-10)

**Choice:** **B — PR review + migration linter.** AI proposes `migrations/NNN_*.sql`; human reviews the PR diff; apply via existing `scripts/db-migrate.mjs` (local or post-merge). **CI migration linter** flags destructive patterns (`DROP`, narrowing `ALTER`, `TRUNCATE`, etc.) — fails unless the file includes an explicit marker (e.g. `--- latch:requires-review`) **and** the PR has human approval. Additive-only migrations pass linter on automated validation alone (consistent with 8.2).

**Rationale:** PR review alone is easy to skim; linter enforces the tiered gate for DDL blast radius without banning AI from all refactors.

### Decision: YAML constraint — schema + fixtures + codegen (2026-06-10)

**Choice:** **A — three layers.** (1) **Committed JSON Schema** for `*.surface.yaml` and `*.policies.yaml` under `@latch/codegen` (hand-maintained initially; generate from parser later — path to **D**). (2) **Golden fixture examples** in `packages/codegen/fixtures/` or `apps/spike_codegen/modules/` for AI prompt context and docs. (3) **`codegen --check`** as semantic gate (types vs **migration DDL** — SQL-first 2026-06-11, was Drizzle; registry drift). CI order: schema/YAML lint → `codegen` → `codegen --check`.

**Rationale:** Structural errors fail fast; codegen remains authoritative for semantics; examples teach the AI the allowed vocabulary without bypassing the gate.

### Decision: first proof — single-table E2E in spike_codegen (2026-06-10)

**Choice:** **A — `contact_list` in `apps/spike_codegen`.** Smallest end-to-end proof: AI (or scripted prompt) emits additive `contacts` migration + `contact_list.surface.yaml` + policies vocabulary → JSON Schema lint → `codegen` → `codegen --check` → optional PG smoke read. **Out of scope for the proof:** pages/UI, multi-table glue, end-user in-app authoring. Document the prompt + verify checklist in codegen docs when implemented.

**Rationale:** Exercises full developer-assist gate (8.1–8.7) without escape-hatch complexity; matches single-table codegen path ([01-codegen](./01-codegen.md) decision B).

## Points to confirm

1. AI authors **declarative artifacts** (YAML + migrations), never enforcement logic or ad-hoc SQL. ✅ session 8.1 (2026-06-10)
2. A **validation/approval gate** is mandatory between AI output and applying changes. ✅ session 8.2 (2026-06-10)
3. Runtime safety does **not** depend on the AI being correct — the kernel still enforces. ✅ session 8.3 (2026-06-10)
4. This ambition is a **reason to keep** the YAML/codegen/kernel split, not remove it. ✅ session 8.4 (2026-06-10)

## Open questions

- ~~Who is the author?~~ **Resolved (8.5):** developer-assist first; end-user self-service later.
- ~~How are AI-proposed migrations reviewed/applied?~~ **Resolved (8.6):** PR + `db-migrate`; CI linter on destructive DDL.
- ~~How do we constrain the AI to the allowed YAML schema?~~ **Resolved (8.7):** JSON Schema + fixtures + `codegen --check`.
- ~~What's the smallest first proof?~~ **Resolved (8.8):** `contacts` + `contact_list` in `spike_codegen` behind full CI gate.

## Verify (session 8 stop gate)

- [x] AI artifact boundary, gate, runtime, and YAML/codegen split locked (8.1–8.4)
- [x] Developer-assist v1 persona + migration + schema constraints (8.5–8.7)
- [x] First proof defined (8.8)
- [ ] JSON Schema, migration linter, `contact_list` proof — **implementation** (codegen tasks)
- [ ] Per-app skin ownership (multi-table glue, `replay()`, domain validation) — **deferred** to extraction / [`06-ui-sync`](./06-ui-sync.md); not blocking session 9

## Related

- [`07-template-scaffold.md`](./07-template-scaffold.md), [`01-codegen.md`](./01-codegen.md), [`../reference/compartments.md`](../reference/compartments.md)
