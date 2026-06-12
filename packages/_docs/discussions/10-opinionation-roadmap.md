# Discussion 10 — Platform opinionation roadmap

> **Status:** Opinionation track **complete** (2026-06-10). **Implementation graduated to [Phase 09 — platform packaging](../phases/09-platform-packaging/README.md)** (2026-06-11). Start at [task 00 — clean slate](../phases/09-platform-packaging/tasks/00-clean-slate.md); slices 9.1–9.8 map to phase tasks 02–09.
>
> **Charter:** [`00-overview.md`](./00-overview.md) (living, not exhaustive). **Taxonomy:** [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md).

## Why this track exists

Phase delivery proved the runtime engine. The next work is **platform packaging**: what Latch locks (spine), what ships as swappable defaults (adapters), and what stays per-app (skin). Several packages — especially `@latch/audit` — look generic at the code layer while the docs already assume opinionated platform tables and Postgres.

This roadmap sequences the debates so later sessions do not re-argue earlier ones.

## Three layers (summary)

| Layer | Job | Changes when… |
|-------|-----|----------------|
| **Spine** | Correctness + enforcement contracts | Rarely — explicit decision + migration |
| **Adapters** | Library bindings that implement spine **ports** | Library upgrades, second consumer needs a variant |
| **Skin** | Business domain | Every new app / vertical |

Full definitions: [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md).

---

## Session checklist

Mark **Status** when the session’s **Outcome** is recorded (Decision block in the linked doc, or compartments refresh merged).

| # | Session | Status | Primary doc | Outcome (stop gate) |
|---|---------|--------|-------------|---------------------|
| 1 | Charter refresh | `[x]` | [`00-overview.md`](./00-overview.md) | Preamble + open-work list agreed; goals unchanged |
| 2 | Spine / adapters / skin taxonomy | `[x]` | [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md) | Three-layer model + classification rules locked |
| 3 | Platform vs per-app inventory | `[x]` | [`../reference/compartments.md`](../reference/compartments.md) | Platform DDL checklist complete; IAM + business same template core |
| 4 | Spine lock list | `[x]` | [`11-spine-adapters-skin.md` § Spine lock list](./11-spine-adapters-skin.md#spine-lock-list-draft) | Confirmed vs contested spine items listed |
| 5 | Adapter catalog | `[x]` | [`11-spine-adapters-skin.md` § Adapter catalog](./11-spine-adapters-skin.md#adapter-catalog-draft) | Default adapter per port + formal port vs template convention (TanStack Query deferred) |
| 6 | Audit compartment | `[x]` | [`12-audit-opinionation.md`](./12-audit-opinionation.md) | Spine vs adapter split for `@latch/audit`; IAM + business audit table decision |
| 7 | Template / scaffold delivery | `[x]` | [`07-template-scaffold.md`](./07-template-scaffold.md) | How spine + reference adapters ship; zero copy-paste audit writer |
| 8 | AI authoring substrate | `[x]` | [`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md) | Declarative-only AI path, tiered gate, developer-assist v1; `contact_list` proof in spike_codegen |
| 9 | Extraction roadmap | `[x]` | This file § [Extraction sequence](#extraction-sequence) | Eight ordered slices + optional kernel merge locked (9.1–9.8) |

**Right now — do this next:** **Implementation** — extraction slice **1** (`@latch/adapter-pg-audit`). Parallel toolchain: session 8 JSON Schema + migration linter + `contact_list` proof ([`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md)).

---

## Session guides (agenda)

### 1 — Charter refresh

**Goal:** Same page on what Latch is *for* without treating `00-overview` as closed.

- Re-read the one-liner and v1 goals ([`scope.md`](../foundations/scope.md)).
- Add explicit “living charter” framing and pointer to this roadmap.
- List work **not** settled by the 2026-06-05 spine/skin table (adapters, audit packaging, `@latch/app-kit`, ORM default).
- Capture **DB↔app layer** framing, **runtime vs toolchain** split, package topology (split vs facade), CLI boundary, AI substrate ([`00-overview.md`](./00-overview.md) updated 2026-06-10).
- **Do not** debate Better Auth or audit DDL here.

### 2 — Spine / adapters / skin

**Goal:** Decision lens for every future package argument.

- Lock definitions and adapter rules ([`11`](./11-spine-adapters-skin.md)).
- Classify ~15 existing artifacts (audit writer, `createSurfaceDal`, `StoreAdapter`, `getPrincipal`, …).
- Migrate the eight axes from `00-overview` into three columns.

### 3 — Platform vs per-app inventory

**Goal:** One checklist of identical-every-app platform tables and wiring.

Walk template core in [`compartments.md`](../reference/compartments.md):

- Identity + policy: `latch_users`, `latch_user_roles`, `latch_roles`, `latch_role_grants`, `latch_policy_version`, `latch_scopes`, …
- Audit + approval: `latch_audit`, `latch_pending_changes`
- Ops: `latch_app` role, immutability triggers

**Outcome:** “Platform DDL checklist” section in compartments (or linked appendix).

### 4 — Spine lock list

**Goal:** Stop re-debating settled invariants; name real forks.

Confirm spine (likely): DAL-only access, manifest re-resolve on write, strict writes, hard delete + restore-from-audit, Postgres/Neon v1, RBAC + Surface boundary, audit mandatory on mutation.

List **contested** spine candidates (SQL column narrowing, bootstrap package home, …).

### 5 — Adapter catalog

**Goal:** “What we use 95% of the time” without freezing libraries in the kernel.

Debate each port: formal `@latch/adapter-*` package vs `packages/codegen/template/` convention only.

| Port | Likely default | Spine constraint |
|------|----------------|------------------|
| Session → `Principal` | Better Auth (update from Auth.js in older docs) | Subject → `latch_users.id`; no second user table |
| Persistence | **raw `pg` + SQL migrations** (Drizzle retired 2026-06-11) | SQL only behind async `StoreAdapter`; single-table SQL codegen'd |
| Audit write | Postgres INSERT → `latch_audit` | Append-only; `latch_app` INSERT-only |
| HTTP reads / writes | REST factory + Server Actions helper | Re-resolve manifest per request |
| Client cache | TanStack Query (convention?) | UI not security boundary |

### 6 — Audit compartment

**Goal:** Apply taxonomy to `@latch/audit` — see [`12-audit-opinionation.md`](./12-audit-opinionation.md).

Supersedes the shallow open questions in [`05-audit.md`](./05-audit.md) for packaging opinionation (runtime behavior remains in [`audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md)).

### 7 — Template / scaffold delivery

**Goal:** New app gets platform migrations + reference adapters without hand-copying `audit-db-writer.ts`.

Extend [`07-template-scaffold.md`](./07-template-scaffold.md) with spine + adapter delivery model from sessions 2–6.

**Test:** scaffolded app runs migrations + audit bootstrap with zero custom audit glue.

### 8 — AI authoring substrate ✅

**Goal:** How AI-assisted surface authoring fits the existing architecture (not a new runtime).

Locked in [`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md) (8.1–8.8). **Deferred** to extraction / per-app docs: multi-table glue, `replay()`, domain validation (original “skin patterns” bullets — see [`06-ui-sync`](./06-ui-sync.md)).

### 9 — Extraction roadmap ✅

**Goal:** Sequence implementation without boiling the ocean.

Locked in [Extraction sequence](#extraction-sequence) (decisions 9.1–9.8).

---

## Extraction sequence

Ordered implementation slices — lock one per session 9 decision. **Today:** per-app `audit-db-writer.ts` is copy-paste; each slice replaces copies with `@latch/*` imports.

### Decision: slice 1 — `@latch/adapter-pg-audit` first (2026-06-10)

**Choice:** **A — pg-audit before pg-session.** Create `packages/adapter-pg-audit/` (`@latch/adapter-pg-audit`) with `createPostgresAuditWriter`. **Stop gate:** template + `apps/widgets` + `apps/spike_policy` import the package and **delete** `lib/audit-db-writer.ts`; package tests cover INSERT behavior. May import `withPermissionDb` from `@latch/audit` until slice 2. **Out of scope:** `ensureAuditWriter` (slice 6), audit mode gate (slice 4), Neon (slice 3).

**Rationale:** Removes the most visible copy-paste debt first ([`12-audit-opinionation`](./12-audit-opinionation.md) 6.5); temporary `@latch/audit` dependency is acceptable for one slice.

### Decision: slice 2 — `@latch/pg-session` extract + re-export (2026-06-10)

**Choice:** **A — extract with deprecation re-export.** Move `permission-db.ts` from `@latch/audit` to `packages/pg-session/` (`@latch/pg-session`). `@latch/audit` re-exports `withPermissionDb` during deprecation; `@latch/adapter-pg-audit` and other consumers switch to `@latch/pg-session`. **Stop gate:** T12 / permission-db tests pass from new package; no `withPermissionDb` implementation left in `@latch/audit` (re-export only).

**Rationale:** Fixes spine leakage ([`11-spine-adapters-skin`](./11-spine-adapters-skin.md)); re-export avoids a big-bang import churn in one PR.

1. ✅ **`@latch/adapter-pg-audit`** — drop per-app `audit-db-writer.ts` copy-paste (locked 9.1)
2. ✅ **`@latch/pg-session`** — extract `withPermissionDb` from `@latch/audit` (locked 9.2)

### Decision: slice 3 — `@latch/adapter-neon` before app-kit (2026-06-10)

**Choice:** **A — Neon package now, thin port.** Ship `@latch/adapter-neon` with `createDatabaseConnections()` (reads `DATABASE_URL`, `DATABASE_URL_DIRECT`, `LATCH_APP_ROLE_PASSWORD`); shared `DatabaseConnections` type in `@latch/contracts` or `@latch/pg-session`. Template `.env.example` updated; apps wire manually until slice 6 (`@latch/app-kit`). **No** Neon imports in spine or app-kit. **Stop gate:** package + env docs; pooled vs direct pools verified in one spike app.

**Rationale:** Session 7.5 — hosting is adapter, not spine; don't block on full bootstrap ([`07-template-scaffold`](./07-template-scaffold.md)).

3. ✅ **`@latch/adapter-neon`** — dual URL; thin `DatabaseConnections` port (locked 9.3)

### Decision: slice 4 — audit mode end-to-end (2026-06-10)

**Choice:** **A — full slice.** Ship `latch_app_config` migration (or equivalent) + DAL mode gate (`full` \| `standard` \| `recovery`) + `latch new --audit-mode` seed in one slice. **Stop gate:** three modes match session 6 payload table; compartment/threat tests; upgrade-only change policy documented (no runtime toggle). `011_latch_pending_changes` may land same PR as platform migrations bundle but is **not** required for mode gate.

**Rationale:** Migration without DAL gate leaves dead config ([`12-audit-opinionation`](./12-audit-opinionation.md) 6.6–6.7); scaffold flag without persistence is incomplete ([`07-template-scaffold`](./07-template-scaffold.md) 7.3).

4. ✅ **`latch_app_config.audit_mode`** + DAL mode gate + `--audit-mode` (locked 9.4)

### Decision: slice 5 — `@latch/adapter-better-auth` + template (2026-06-10)

**Choice:** **A — package + template.** Ship `@latch/adapter-better-auth` with Better Auth → `getPrincipal()` binding (`subject` → `latch_users.id`; roles from DB, not cookie). Template `lib/latch.ts` wires the adapter. **Stop gate:** package tests mapping contract; template `getPrincipal` returns DB-backed `Principal`; no second user table ([`02-identity`](./02-identity-and-permissions.md) F). Spike apps may migrate in same PR or follow-on.

**Rationale:** Matches slices 1–3 (package first, template imports); auth must work on `latch new` before app-kit orchestration (slice 6).

5. ✅ **`@latch/adapter-better-auth`** in template (locked 9.5)

### Decision: slice 6 — full `@latch/app-kit` (2026-06-10)

**Choice:** **A — full bootstrap slice.** One `@latch/app-kit` package: `resolveContext`, manifest cache, `ensureAuditWriter`, `DatabaseConnections` injection (from `@latch/adapter-neon`), REST route factory, optional Server Action helpers. Template `lib/latch.ts` = thin registry + adapter injection only; delete duplicated `audit-bootstrap.ts` / request wiring. **Stop gate:** scaffolded app runs migrations + audit bootstrap with zero custom audit glue ([`07-template-scaffold`](./07-template-scaffold.md)); REST read works for one surface in a spike app.

**Rationale:** Session 4 bootstrap **C** + 4.11 REST contract; slices 1–3 and 5 are orphaned without orchestration. Single package avoids `@latch/next-kit` sprawl for v1.

6. ✅ **`@latch/app-kit`** — full bootstrap + REST/Actions (locked 9.6)

### Decision: slice 7 — `@latch/adapter-drizzle` helper (2026-06-10) — **SUPERSEDED (2026-06-11)**

**Choice:** **A — helper package.** `@latch/adapter-drizzle` implements `StoreAdapter` for single-table Drizzle schemas (`createDrizzleStoreAdapter` or equivalent); template + one spike surface demonstrate usage. Memory/in-memory stores remain valid for tests. Multi-table glue stays hand-written ([`01-codegen`](./01-codegen.md) B).

**Rationale:** Session 5.2 locked Drizzle as default business store; adapter stays out of `@latch/dal` kernel. Completes the adapter catalog before optional kernel merge.

> **Superseded by SQL-first (2026-06-11):** Drizzle is retired as the runtime engine. Slice 7 becomes **`@latch/adapter-pg-store`** — an **async** `StoreAdapter` over raw `pg` plus codegen-emitted single-table store SQL (`store.generated.ts`). Memory stores are demoted to kernel-unit-test doubles only. See [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md#decision-sql-first-persistence--retire-drizzle-as-the-runtime-orm-2026-06-11) and [`../phases/09-platform-packaging/tasks/08-adapter-drizzle.md`](../phases/09-platform-packaging/tasks/08-adapter-drizzle.md).

7. ✅ **`@latch/adapter-drizzle`** `StoreAdapter` helper (locked 9.7) — **re-scoped to `@latch/adapter-pg-store` (SQL-first, 2026-06-11)**

### Decision: slice 8 — merge server kernel after adapters (2026-06-10)

**Choice:** **A — merge after slice 7.** Once a scaffold app runs end-to-end on extracted adapters, merge `@latch/policy` + `@latch/dal` + `@latch/audit` + `@latch/approval` → one server package (name TBD: `@latch/core` or `@latch/server`). Keep `@latch/contracts` and `@latch/react` separate; adapters stay out. **Stop gate:** compartment + threat tests unchanged; strict internal module boundaries.

**Rationale:** [`00-overview`](./00-overview.md) working lean — merge is ergonomics after adapters prove the ports, not a prerequisite.

8. ✅ **Merge server kernel** (optional slice, locked 9.8)

### Parallel track — AI / codegen toolchain (session 8)

Not numbered in the adapter sequence; may run alongside slices 1–4:

- JSON Schema for surface/policies YAML
- CI migration linter (destructive DDL marker)
- `contact_list` proof in `apps/spike_codegen`

See [`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md).

## Verify (session 9 stop gate)

- [x] Slices 1–8 ordered and locked with stop gates (9.1–9.8)
- [x] Parallel toolchain track noted (session 8)
- [ ] Slice 1 implemented — **start here**

---

## Anti-patterns (call out in session 2)

- **Adapter sprawl** — a formal port for every npm dependency
- **Default mistaken for spine** — Better Auth required vs `latch_users` mapping required
- **Spine leakage** — `permission-db` living inside `@latch/audit`
- **Per-app spine choice** — different audit table shape per app

## Related

- [`00-overview.md`](./00-overview.md) · [`11-spine-adapters-skin.md`](./11-spine-adapters-skin.md) · [`12-audit-opinionation.md`](./12-audit-opinionation.md)
- [`05-audit.md`](./05-audit.md) (compartment primer) · [`../reference/compartments.md`](../reference/compartments.md)
- [`.cursor/rules/10-invariants.mdc`](../../../.cursor/rules/10-invariants.mdc)
