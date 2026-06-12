# Discussion 01 — Codegen

> **Status:** Open (2026-06-05). Compartment 1 in the [map](../reference/compartments.md#1-codegen-authoring--build-time). Executable work is now tracked in [`packages/codegen/docs/tasks/`](../../codegen/docs/tasks/README.md).

## Shared understanding

- Codegen is an **authoring-time** tool: a pure function `YAML → files`. It does not run at runtime and is **not** a security boundary.
- **Today:** reads `*.surface.yaml`, emits Field ids, read/patch Zod schemas, `columnMap`, and verification field ids. It scans **CRM only** (hardcoded path) and resolves column *types* from a hardcoded `COLUMN_ZOD` map inside the package.
- **Flow:** YAML lives in the app (`apps/<app>/modules/`) → codegen writes generated TS back into the same app (`modules/**/generated/`, committed) → CI `codegen --check` fails on drift.
- Codegen **does not create database tables.** Tables come from Drizzle schema + SQL migrations, which are separate.
- **Evaluation vehicle:** to judge the decisions below we will watch `YAML → TS` run on a clean surface in a throwaway **`apps/spike_codegen`** app, replacing `apps/crm` / `apps/test1` (see the Decision below).

### Decision: Evaluate via a spike app; retire crm/test1 (2026-06-05)

**Choice:** Stand up a minimal **`apps/spike_codegen`** as the sole codegen evaluation vehicle and **delete `apps/crm` and `apps/test1`** clean. Codegen becomes app-agnostic in two beats: **(1)** scan any app's `modules/` (drop the hardcoded `apps/crm/modules` root); **(2)** drop the hardcoded `COLUMN_ZOD` map in favour of YAML-declared types. Executable work lives in [`packages/codegen/docs/tasks/`](../../codegen/docs/tasks/README.md).

**Rationale:** The codegen calls (A/B/H below) can only be judged by seeing the generator run on a fresh surface, not by reading docs. crm's hand-written stacks were the known-good baseline but also noise; test1 was a half-built scaffold whose stated purpose (codegen learning vehicle) is exactly what the spike now serves. A disposable sandbox keeps the evaluation honest and *forces* decision A — a brand-new app has no entries in the crm-flavoured `COLUMN_ZOD` map, so the only correct answer is YAML-declared types. **Accepted cost:** deleting crm removes the only end-to-end/threat-model integration coverage (only `packages/*` unit tests remain) and parks the runtime engine until a real app returns; this is deliberate for the spike phase.

### Decision: Codegen opinionated/flexible calls (2026-06-05)

Sorted via the [spine-vs-skin rule](./00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05):

- **A — Column types (opinionated):** types are **declared in the YAML** and **cross-checked against the migration DDL** in `codegen --check` (**SQL-first, 2026-06-11**; was "against the Drizzle schema" — see [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md#decision-sql-first-persistence--retire-drizzle-as-the-runtime-orm-2026-06-11)). The hardcoded `COLUMN_ZOD` map in the codegen package is removed. *(Why opinionated: types feed Zod validation — correctness/spine.)*
- **B — Surface glue (opinionated + escape hatch):** codegen **generates the glue** (`projectRow` / `applyPatch` / descriptor) for **single-table** surfaces; **multi-table** surfaces (e.g. `job_detail`, which spans `jobs`/`customers`/`sites`/`assignments`) keep **hand-written** glue as the escape hatch.
- **H — Policy definitions (reversal — now opinionated):** codegen **generates the runtime policy registry from `*.policies.yaml`**, making YAML the **single source of truth**. This supersedes the earlier "hand-synced is deliberate" stance — see [02](./02-identity-and-permissions.md). *(Why: the YAML/TS hand-sync is a permission-correctness drift risk.)* **Re-scoped for grants (2026-06-06):** role→Field **grants** are now **runtime DB data** (`latch_roles` + `latch_role_grants`), not generated from YAML. Codegen emits only the per-Surface Field/action **vocabulary**; YAML is the source of truth for *what exists*, not *who gets what*. See the "roles are runtime data" Decision in [02](./02-identity-and-permissions.md) and [`scope.md`](../foundations/scope.md).

### Decision: Latch is an installable SDK + CLI; monorepo apps are dev-only (2026-06-06)

**Choice:** Two tools hide under "codegen" and are kept distinct: **(1) sync** — the existing `@latch/codegen`, a build-time, idempotent `YAML → TS` generator that is **never hand-edited** and is drift-gated by `--check`; **(2) scaffold** — a one-time project-skeleton generator (`create-latch-app` / `latch new`), **deferred** (D4 / [discussion 07](./07-template-scaffold.md)). "Scaffold a new app" is *not* a codegen job.

The **target distribution model:** business apps are developed **outside this monorepo**, importing published `@latch/*` runtime packages and running `latch codegen` as a devDependency from their own app root. The in-repo `apps/*` (today `spike_codegen`) are a **development convenience only** — an external consumer app must be **structurally identical** to an in-repo one.

**Design principle (do now, cheaply):** keep all tooling **location-agnostic** so "in-repo" and "external" are one code path, not a fork. Concretely, codegen discovery must anchor to the **invocation root (`process.cwd()` / config)**, not the package's install location. Today it derives the scan root from `import.meta.url`:

```
const APPS_ROOT = path.join(REPO_ROOT, "apps"); // REPO_ROOT from import.meta.url — breaks once installed in node_modules
```

This is a latent portability bug to fix when the publish work is pulled.

**Build vs. design split:** publishing `@latch/*` and shipping the CLI for external consumption stays **deferred to [Phase 07](../phases/07-scale-out/README.md)** (no driver yet — internal apps stay in-repo). Only the *design* (location-agnostic tools, clean `exports`) is in scope now.

**Rationale:** The owner confirmed (2026-06-06) that internal/Latch-dev apps stay in this monorepo, but once proven, new business apps will live in their own repos and import Latch. Naming the sync/scaffold split now prevents the recurring generator and the one-time scaffolder from being conflated; locking the "external == in-repo" principle keeps the eventual publish a packaging step, not a refactor.

## Points to confirm

1. Codegen's job is to remove typing, **not** to remove risk — output is validated downstream (`--check` + Zod + kernel).
2. Column **types belong in YAML**, not in the codegen package (`COLUMN_ZOD` should go away). **(Confirmed — A above; task [02](../../codegen/docs/tasks/02-types-in-yaml.md).)**
3. Codegen should **scan all apps** (`apps/*/modules/**`), not one. **(Confirmed — task [01](../../codegen/docs/tasks/01-spike-and-multi-app-scan.md).)**
4. Codegen *may* generate **single-table glue** (`projectRow` / `applyPatch` / descriptor); multi-table surfaces keep hand-written hooks as an escape hatch. **(Confirmed — B above; task [03](../../codegen/docs/tasks/03-single-table-glue.md).)**
5. Codegen should generate **UI-driving metadata**, and *may* scaffold a starter page once, but must **not own/overwrite page components**. *(Deferred — see [00-decisions-needed](../../codegen/docs/tasks/00-decisions-needed.md); overlaps template delivery in [07](./07-template-scaffold.md).)*
6. Generating **migrations/DDL** from structure is a *separate generator* from surface codegen, if we do it at all. *(Deferred — see [00-decisions-needed](../../codegen/docs/tasks/00-decisions-needed.md).)*

## Open questions

- ~~Do we declare types in YAML, infer them from Drizzle, or both?~~ **Resolved (A): YAML-declared, cross-checked against Drizzle.**
- ~~Should policy definitions ever be codegen'd, or stay hand-synced?~~ **Resolved (H): generate the registry from `policies.yaml`** — task [04](../../codegen/docs/tasks/04-policy-registry-gen.md). **Re-scoped (2026-06-06):** codegen emits the Field/action *vocabulary* only; *grants* are runtime DB data — see reworked task [04](../../codegen/docs/tasks/04-policy-registry-gen.md) and the [policy task series](../../policy/docs/tasks/README.md).
- One generator with modes (structure / glue / DDL) vs separate generators? *(Tracked in [00-decisions-needed](../../codegen/docs/tasks/00-decisions-needed.md); affects how tasks 03/04 are packaged.)*
- **How** does `--check` cross-check declared types against the Drizzle schema (import the `db/schema.ts` table objects vs. parse)? *(Mechanism for decision A — tracked in [00-decisions-needed](../../codegen/docs/tasks/00-decisions-needed.md).)*

## Related

- Task plan: [`packages/codegen/docs/tasks/`](../../codegen/docs/tasks/README.md)
- [`../reference/metadata-and-codegen.md`](../../codegen/docs/reference/metadata-and-codegen.md), [`packages/codegen/src/generate.ts`](../../codegen/src/generate.ts)
