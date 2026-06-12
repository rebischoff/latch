# `@latch/codegen` — documentation map

> **Updated:** 2026-06-10. Package quarterback for **sync** codegen (`npm run codegen`). App skeleton tooling is a separate task — see [05 — Scaffold CLI](./tasks/05-scaffold-cli.md).

## Two tools (do not conflate)

| Tool | Command | Doc home |
|------|---------|----------|
| **Sync codegen** | `npm run codegen` / `codegen:check` | [reference/](./reference/) + [tasks 01–04](./tasks/README.md) |
| **Scaffold CLI** | `npm run latch:new` | [tasks/05-scaffold-cli.md](./tasks/05-scaffold-cli.md) · [scaffold-runbook.md](./scaffold-runbook.md) |

Sync = idempotent `YAML → TS` on every build. Scaffold = one-time copy of `packages/codegen/template/` → `./<slug>/` at repo root (monorepo) or `./<slug>/` (standalone).

---

## Reference (locked boundaries & format)

Read before changing the generator or Surface YAML shape. **Not task files** — no verify gates; update when decisions change.

| Doc | Purpose |
|-----|---------|
| [reference/codegen-scope.md](./reference/codegen-scope.md) | **Boundary** — what sync codegen owns, verifies, and must not own |
| [reference/metadata-and-codegen.md](./reference/metadata-and-codegen.md) | **Format & emit** — `*.surface.yaml` shape, generated artifacts, workflow |

Discussion context: [`docs/discussions/01-codegen.md`](../../docs/discussions/01-codegen.md).

---

## Tasks (executable work)

| # | File | State |
|---|------|--------|
| 00 | [00-decisions-needed.md](./tasks/00-decisions-needed.md) | parking lot |
| 01 | [01-spike-and-multi-app-scan.md](./tasks/01-spike-and-multi-app-scan.md) | complete |
| 02 | [02-types-in-yaml.md](./tasks/02-types-in-yaml.md) | complete |
| 03 | [03-single-table-glue.md](./tasks/03-single-table-glue.md) | complete |
| 04 | [04-policy-registry-gen.md](./tasks/04-policy-registry-gen.md) | complete |
| 05 | [05-scaffold-cli.md](./tasks/05-scaffold-cli.md) | complete (2026-06-10) |

Index: [tasks/README.md](./tasks/README.md).

First consumer app after task 05: [`apps/docs/phase-01-first-app.md`](../../apps/docs/phase-01-first-app.md).

---

## Related

- [`packages/codegen/src/generate.ts`](../src/generate.ts) — implementation
- [`docs/reference/compartments.md`](../../docs/reference/compartments.md#1-codegen-authoring--build-time)
