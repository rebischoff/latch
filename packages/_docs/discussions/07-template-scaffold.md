# Discussion 07 — Template / scaffold

> **Status:** Session **7** complete (2026-06-10). Next: session **8** — skin patterns ([`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md)). Golden source: `packages/codegen/template/` via `latch new`.

## Shared understanding

- A **business-app template** would ship the **platform** pieces so a new app doesn't hand-copy them. Today the platform tables are copy-pasted into each app's migrations.
- Platform tables: full checklist in [`compartments.md` § Platform DDL checklist](../reference/compartments.md#platform-ddl-checklist-packagescodegentemplatemigrations) — identity, ops, audit, scopes, `latch_pending_changes`, and (when added) `latch_app_config` for audit mode.
- Plus a **wiring kit**: the `getPrincipal` seam, `resolveContext`/manifest cache, DAL bootstrap, and route/action factories.
- The template **does not** contain business specifics — surface YAML, policy YAML, business tables, and stores remain per-app.
- Migrations are **artifacts** (SQL files applied by the existing runner). **Hosting** (Neon dual URL, pooler vs direct) is an **adapter** — not spine.

## Points to confirm

1. The platform tables listed above are the **template's database core**. ✅ session 7.1 (2026-06-10) — **all** platform migrations ship on every `latch new`; no subset scaffold.
2. Scaffolding ships **migrations as files** + applies them via the existing runner (`scripts/db-migrate.mjs`), not bespoke per-app SQL.
3. IAM/audit tables on every new database; Neon branch API → Phase 07 optional add-on. ✅ session 7.5
4. Monorepo scaffolds declare `@latch/*` deps via **`workspace:*`**; published version pins → Phase 07. ✅ session 7.4
5. Wiring via `@latch/app-kit` + `@latch/adapter-*` — **packages first**. ✅ session 7.2
6. Thin per-app `lib/latch.ts` (registry + adapter injection) per bootstrap **C** (session 4). ✅ session 7

### Decision: full platform migrations on every scaffold (2026-06-10)

**Choice:** `latch new` copies the **complete** platform migration chain from `packages/codegen/template/migrations/` — including `011_latch_pending_changes` and `latch_app_config` (audit mode) when those migrations land. Supersedes scaffold-task wording that treated `latch_pending_changes` as optional. Business DDL is always per-app, added after scaffold.

**Rationale:** Session 3 platform DDL checklist; approval table is harmless when unused; audit mode is scaffold-time immutable config.

### Decision: adapter delivery — packages first (2026-06-10)

**Choice:** **B — packages first.** Scaffold target is **import** from `@latch/adapter-*` + `@latch/app-kit` + `@latch/pg-session` — **no permanent copied adapter implementations** in `packages/codegen/template/`. Build each package before (or in the same PR as) switching the template from copy → import. Extraction order: [`10-opinionation-roadmap.md` § Extraction sequence](./10-opinionation-roadmap.md#extraction-sequence-draft). Existing copied files (e.g. `audit-db-writer.ts`) are **temporary** until their package lands; do not add new copy-paste adapter code to the template.

**Rationale:** Session 5 locked package homes; session 6.5 retired per-app writer copy-paste. “Staged” without packages first invites more template debt. One package per slice keeps PRs reviewable.

### Decision: audit mode at scaffold CLI (2026-06-10)

**Choice:** **`latch new <slug> --audit-mode=full|standard|recovery`** — default **`full`** when flag omitted. Persisted to `latch_app_config` (migration TBD) on first migrate or via seed migration generated at scaffold. No interactive prompt (CI/script friendly).

**Rationale:** Session 6.6–6.7 — mode is scaffold-time only; flag is explicit and automatable.

### Decision: monorepo scaffold dependencies (2026-06-10)

**Choice:** `latch new` inside the Latch monorepo generates `package.json` with **`workspace:*`** on `@latch/contracts`, `@latch/dal`, `@latch/policy`, `@latch/audit`, `@latch/approval`, `@latch/react`, `@latch/codegen`, and (as they land) `@latch/adapter-*`, `@latch/app-kit`, `@latch/pg-session`. **Published semver pins** for apps outside the monorepo → **Phase 07** ([`phases/07-scale-out`](../phases/07-scale-out/README.md)).

**Rationale:** In-repo apps consume local packages today; `workspace:*` is npm workspaces idiomatic. External `latch new` needs publish + cwd-based tooling — explicitly deferred.

### Decision: Neon hosting adapter (2026-06-10)

**Choice:** **Neon is the default hosting adapter for v1** — **not spine.** Postgres DDL + `latch_app` remain spine; connection discipline lives in **`@latch/adapter-neon`**: dual URL convention (`DATABASE_URL` = pooled runtime, `DATABASE_URL_DIRECT` = migrate/psql), SSL, `LATCH_APP_ROLE_PASSWORD`, setup checklist in `latch new` output. Template `.env.example` documents dual URL until the package ships. **`@latch/app-kit`** accepts injected `DatabaseConnections` — **no Neon imports** in app-kit. Neon branch provisioning API → Phase 07 optional. Generic Postgres (Docker) stays contributor escape hatch via a future alternate hosting adapter.

**Rationale:** Internal apps assume Neon + Postgres together for security/ops (pooler vs direct, least-privilege `latch_app`). Keeping Neon in its own package preserves spine portability to other Postgres hosts without kernel changes.

### Decision: Template delivery & opinionation (2026-06-05)

Sorted via the [spine-vs-skin rule](./00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05):

- **G — Delivery:** **copyable app now, CLI (`create-latch-app`) later, internal-first.** Low effort to start (reuse `test1`), and we're not publishing externally yet (goal is internal platform first; see [00-overview](./00-overview.md)).
- **How opinionated (cross-refs):** **auth library = flexible** with one reference adapter ([F](./02-identity-and-permissions.md)); **UI kit + shell/theme = flexible/app-owned** ([D/E](./06-ui-sync.md)); **folder layout + platform wiring = opinionated** (the template's whole point). Forms get the opinionated manifest-driven `<SurfaceForm>` ([C](./06-ui-sync.md)).

## Open questions

- ~~Is the template a CLI, a copyable app, or both?~~ **Resolved (G): copyable now, CLI later, internal-first.**
- ~~Template source?~~ **Resolved:** `packages/codegen/template/` via `latch new` (not CRM/test1).
- ~~How opinionated is the template?~~ **Resolved:** auth + UI kit + shell **flexible**; layout + wiring **opinionated**.
- Publish `@latch/*` for external users? → **Phase 07**; internal-first per [00-overview](./00-overview.md).

## Verify (session 7 stop gate)

- [x] Platform migrations + adapter delivery model recorded (decisions above)
- [x] Packages-first; no new copy-paste adapter code in template
- [ ] Extraction slices implemented (`adapter-pg-audit`, `adapter-neon`, `app-kit`, …) — **implementation**, not session 7
- [ ] Scaffolded app: zero custom `audit-db-writer.ts` — **after** extraction slice 1

## Related

- [`../reference/packages.md`](../reference/packages.md), [`scripts/db-migrate.mjs`](../../../scripts/db-migrate.mjs), [`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md)
