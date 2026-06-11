# Discussion 07 — Template / scaffold

> **Status:** Open / Proposal (2026-06-05). Compartment 6 in the [map](../reference/compartments.md#6-template--scaffold-proposed--not-built). Not built yet.

## Shared understanding

- A **business-app template** would ship the **platform** pieces so a new app doesn't hand-copy them. Today the platform tables are copy-pasted into each app's migrations.
- Platform tables to standardize: `latch_users`, `latch_user_roles`, `latch_policy_version`, `latch_audit` (+ immutability trigger), `latch_pending_changes`, and the `latch_app` least-privilege role.
- Plus a **wiring kit**: the `getPrincipal` seam, `resolveContext`/manifest cache, DAL bootstrap, and route/action factories.
- The template **does not** contain business specifics — surface YAML, policy YAML, business tables, and stores remain per-app.
- Migrations are **artifacts** (SQL files applied by the existing runner); this keeps it portable and cloud-agnostic.

## Points to confirm

1. The platform tables listed above are the **template's database core**.
2. Scaffolding ships **migrations as files** + applies them via the existing runner (`scripts/db-migrate.mjs`), not bespoke per-app SQL.
3. Creating the IAM/audit tables on a new database is a **default** of scaffolding; auto-provisioning a Neon branch is an **optional add-on**, kept separate so the core stays cloud-agnostic.
4. A reusable wiring kit (proposed `@latch/app-kit`, `@latch/store-drizzle`) is in-scope for this direction.

### Decision: Template delivery & opinionation (2026-06-05)

Sorted via the [spine-vs-skin rule](./00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05):

- **G — Delivery:** **copyable app now, CLI (`create-latch-app`) later, internal-first.** Low effort to start (reuse `test1`), and we're not publishing externally yet (goal is internal platform first; see [00-overview](./00-overview.md)).
- **How opinionated (cross-refs):** **auth library = flexible** with one reference adapter ([F](./02-identity-and-permissions.md)); **UI kit + shell/theme = flexible/app-owned** ([D/E](./06-ui-sync.md)); **folder layout + platform wiring = opinionated** (the template's whole point). Forms get the opinionated manifest-driven `<SurfaceForm>` ([C](./06-ui-sync.md)).

## Open questions

- ~~Is the template a CLI, a copyable app, or both?~~ **Resolved (G): copyable now, CLI later, internal-first.**
- Which existing app is the template source — a reset `test1`, a fresh app, or extracted from CRM?
- ~~How opinionated is the template (auth library, UI kit, folder layout)?~~ **Resolved:** auth + UI kit + shell **flexible**; layout + wiring **opinionated** — see Decision above.
- Do we publish `@latch/*` to support external template users, or keep it internal first? **(Leaning internal-first per the goal-priority decision in [00](./00-overview.md).)**

## Related

- [`../reference/packages.md`](../reference/packages.md), [`scripts/db-migrate.mjs`](../../scripts/db-migrate.mjs), [`08-ai-authored-surfaces.md`](./08-ai-authored-surfaces.md)
