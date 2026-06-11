# Discussion 10 — Platform opinionation roadmap

> **Status:** Active (2026-06-10). **Do this track one session at a time** — mark each step complete before starting the next.
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
| 7 | Template / scaffold delivery | `[ ]` | [`07-template-scaffold.md`](./07-template-scaffold.md) | How spine + reference adapters ship; zero copy-paste audit writer |
| 8 | Skin patterns | `[ ]` | [`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md), per-app `modules/` | What app authors own; when to fork adapter vs skin |
| 9 | Extraction roadmap | `[ ]` | This file § [Extraction sequence](#extraction-sequence-draft) | Ordered implementation slices (no big-bang) |

**Right now — do this next:** Session **7** (template delivery in [`07-template-scaffold.md`](./07-template-scaffold.md)).

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
| Persistence | `pg` + Drizzle migrations | SQL only behind `StoreAdapter` |
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

### 8 — Skin patterns

**Goal:** What codegen / app authors still own.

- Surface YAML, business tables, descriptors, multi-table escape hatch
- Domain validation (delegation, last-admin)
- Restore `replay()` — domain-specific

### 9 — Extraction roadmap

**Goal:** Sequence implementation without boiling the ocean.

See [Extraction sequence](#extraction-sequence-draft) below; adjust after sessions 2–7.

---

## Extraction sequence (draft)

Ordered slices — **not** committed until session 9.

1. `@latch/adapter-pg-audit`; drop per-app `audit-db-writer.ts` copy-paste
2. `@latch/pg-session` — extract `withPermissionDb` from `@latch/audit`
3. `latch_app_config.audit_mode` migration + DAL mode gate (`full` \| `standard` \| `recovery`)
4. Reference auth adapter — `@latch/adapter-better-auth` in template
5. `@latch/app-kit` bootstrap (`resolveContext`, manifest cache, `ensureAuditWriter`, REST/Action factories)
6. `@latch/adapter-drizzle` `StoreAdapter` helper
7. *(Optional)* Merge server kernel — compartment tests unchanged

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
