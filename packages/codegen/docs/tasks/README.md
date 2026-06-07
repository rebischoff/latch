# Codegen — task plan

> **Quarterback for `@latch/codegen` work.** Source of intent: [`docs/discussions/01-codegen.md`](../../../../docs/discussions/01-codegen.md). These tasks make codegen **app-agnostic** and grow it from a structure emitter into a glue + policy-registry generator.
> Updated: 2026-06-06.

---

## Goal

Today codegen is a pure `YAML → TS` function but it is **coupled to `apps/crm`** in two places (hardcoded scan root + a crm-flavoured `COLUMN_ZOD` map) and only emits *structure* (Field ids, `columnMap`, read/patch Zod, verification ids). The plan:

1. Stand up a disposable **`apps/spike_codegen`** to watch codegen run on a clean surface (crm/test1 are deleted — see the [discussion decision](../../../../docs/discussions/01-codegen.md#decision-evaluate-via-a-spike-app-retire-crmtest1-2026-06-05)).
2. Make codegen **generic** (scan any app; types from YAML, not a hardcoded map).
3. Grow it to generate **single-table glue** and the **policy registry**.

---

## Tasks

| # | Task | Decision | State |
|---|------|----------|-------|
| 00 | [Decisions needed](./00-decisions-needed.md) | — | parking lot (blocks deferred work only) |
| 01 | [Spike harness + multi-app scan](./01-spike-and-multi-app-scan.md) | Point 3 | complete (2026-06-06) |
| 02 | [Types in YAML (drop `COLUMN_ZOD`)](./02-types-in-yaml.md) | A | complete (2026-06-06) |
| 03 | [Single-table glue generation](./03-single-table-glue.md) | B | complete (2026-06-06) |
| 04 | [Surface policy *vocabulary* (roles move to runtime)](./04-policy-registry-gen.md) | H (reversed for grants, 2026-06-06) | complete (2026-06-06) |

### Executable now vs. deferred

- **Complete:** **01–04** (structure, types, glue, policy vocabulary in schema emit + `RoleGrantProvider` seam).
- **Deferred** (needs a decision first — see [00](./00-decisions-needed.md)): migration/DDL generation (Point 6); starter-page scaffolding (Point 5); the *one-generator-with-modes vs. separate-generators* packaging question; Drizzle type cross-check in `--check` ([D2](./00-decisions-needed.md#d2--how-does---check-cross-check-types-against-drizzle)).

---

## Sequencing

```
01 (scan generic)  →  02 (types generic)  →  03 (glue)
                   ↘                      ↘
                     04 (policy registry)
```

- **01 first** — until the scan root is generalized, `apps/spike_codegen` generates nothing and codegen throws ("No `*.surface.yaml` found"). 01 also covers deleting crm/test1, scaffolding the spike, and fixing root `package.json` scripts.
- **02 next** — after 01 codegen *runs* against any app, but it isn't truly generic until `COLUMN_ZOD` is gone. Run 01→02 back-to-back so spike columns never have to be added to the hardcoded map.
- **03 and 04** build on a generic generator; both can proceed once 01 (and, for 03, 02) lands. Their packaging may be gated by the one-vs-many generator decision in [00](./00-decisions-needed.md).

---

## Status discipline

Each task carries a `> **Status:**` line under its title and a **Verify (stop gate)** checklist. When a task's implementation finishes, follow [`.cursor/rules/45-phase-tasks.mdc`](../../../../.cursor/rules/45-phase-tasks.mdc): set the **Status** line, tick **every** `- [ ]`, and repoint this README's table + the "do first" pointer at the next task. No partial checklists.

> **Do next:** runtime role tasks in [`packages/policy/docs/tasks/`](../../../policy/docs/tasks/README.md) (DB tables, DB-backed provider, role-editor IAM Surface). Deferred items remain in [00 — Decisions needed](./00-decisions-needed.md).
>
> **Recently completed:** 04 — policy vocabulary in schema emit + `RoleGrantProvider` seam; `*.policies.yaml` retired (2026-06-06); 03 — single-table glue (2026-06-06); 02 — types in YAML (2026-06-06); 01 — spike harness (2026-06-06).
