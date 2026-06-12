# 11 — AI authoring toolchain (parallel)

> **Status:** Not started (parallel track). May run alongside tasks 02–05.

## Goal

Land the session-8 authoring substrate ([`08-ai-authored-surfaces.md`](../../../discussions/08-ai-authored-surfaces.md)) so AI-assisted (developer-assist) surface authoring is constrained behind the gate. Not on the adapter critical path.

## Files

| File | Action |
|------|--------|
| `packages/codegen/schema/*.json` (new) | JSON Schema for `*.surface.yaml` + `*.policies.yaml` (hand-maintained; generate-from-parser later) |
| `packages/codegen/fixtures/` | Golden examples for AI prompt context |
| migration linter (CI) | Flag destructive DDL (`DROP`, narrowing `ALTER`, `TRUNCATE`) unless marked `--- latch:requires-review` + human approval |
| `contact_list` proof | AI emits additive `contacts` migration + `contact_list.surface.yaml` + policies → schema lint → codegen → `--check` (in the scaffolded proof app or a fixture set) |

## Verify (stop gate)

- [ ] JSON Schema validates surface + policies YAML in CI before codegen.
- [ ] Destructive-migration linter blocks unmarked destructive DDL.
- [ ] `contact_list` single-table surface authored end-to-end passes the full gate (schema → codegen → `--check`).
- [ ] `npm run codegen:check` green.
- [ ] [`../STATUS.md`](../STATUS.md) parallel-track line updated.

## Out of scope

- End-user self-service authoring UI (later phase); multi-table glue.
