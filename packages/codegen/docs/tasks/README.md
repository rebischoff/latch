# Codegen — task plan

> **Quarterback for `@latch/codegen` work.** Docs map: [`../README.md`](../README.md). Source of intent: [`docs/discussions/01-codegen.md`](../../../docs/discussions/01-codegen.md).
> Updated: 2026-06-10.

---

## Two tracks

| Track | Tasks | Reference |
|-------|-------|-----------|
| **Sync** (`npm run codegen`) | 01–04 (complete) | [codegen-scope](../reference/codegen-scope.md), [metadata-and-codegen](../reference/metadata-and-codegen.md) |
| **Scaffold** (`latch new`) | **05** (complete) | [05-scaffold-cli.md](./05-scaffold-cli.md) |

---

## Goal (sync tasks 01–04 — complete)

Make codegen **app-agnostic** and grow it from a structure emitter into a glue + policy-vocabulary generator. Evaluation vehicle: `apps/spike_codegen`.

---

## Tasks

| # | Task | Decision | State |
|---|------|----------|-------|
| 00 | [Decisions needed](./00-decisions-needed.md) | — | parking lot (blocks deferred sync work only) |
| 01 | [Spike harness + multi-app scan](./01-spike-and-multi-app-scan.md) | Point 3 | complete (2026-06-06) |
| 02 | [Types in YAML (drop `COLUMN_ZOD`)](./02-types-in-yaml.md) | A | complete (2026-06-06) |
| 03 | [Single-table glue generation](./03-single-table-glue.md) | B | complete (2026-06-06) |
| 04 | [Surface policy *vocabulary* (roles move to runtime)](./04-policy-registry-gen.md) | H (reversed for grants, 2026-06-06) | complete (2026-06-06) |
| 05 | [Scaffold CLI (`latch new`)](./05-scaffold-cli.md) | G / discussion 07 | complete (2026-06-10) |

### Deferred (sync — see [00](./00-decisions-needed.md))

Migration/DDL generation (D5); Drizzle cross-check mechanism (D2); one-generator-with-modes (D1). Starter pages → task **05**, not sync codegen (D4).

---

## Sequencing (sync 01–04)

```
01 (scan generic)  →  02 (types generic)  →  03 (glue)
                   ↘                      ↘
                     04 (policy vocabulary)
```

Task **05** is a **parallel track** — does not modify `@latch/codegen` sync logic.

---

## Status discipline

Each task carries a `> **Status:**` line under its title and a **Verify (stop gate)** checklist. When a task's implementation finishes, follow [`.cursor/rules/45-phase-tasks.mdc`](../../../../.cursor/rules/45-phase-tasks.mdc): set the **Status** line, tick **every** `- [ ]`, and repoint this README's table + the "do first" pointer at the next task. No partial checklists.

> **Do next:** [Phase 1 first app](../../../../apps/docs/phase-01-first-app.md) — widgets list + detail surfaces on the scaffolded app.
>
> **Recently completed:** 05 — scaffold CLI + `packages/codegen/template/` (2026-06-10); 04 — policy vocabulary (2026-06-06); 03 — glue (2026-06-06); 02 — types in YAML (2026-06-06); 01 — spike harness (2026-06-06).
