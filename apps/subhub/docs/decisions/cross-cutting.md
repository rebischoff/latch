# SubHub decisions — cross-cutting

> Notes, attachments, progressive catalog setup, and seeding rules.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: delete blocked by referential use — structured errors (2026-06-18)

**Choice:** When `DELETE` fails because dependent rows exist (FK `RESTRICT`, not missing manifest permission), the DAL **must** surface a structured **`ConflictError`** (409) with machine-readable blockers — not a raw Postgres message or generic toast.

**Minimum payload intent:**

| Field | Example |
|-------|---------|
| `code` | `in_use` |
| `entity` | `role`, `customer`, … |
| `blockers` | `[{ type: 'user_role_assignment', count: 3 }]` |

**UI:** Actionable copy + deep link where possible (e.g. role delete → "3 users still assigned" → filtered user list). **DB** remains the hard guarantee; DAL pre-check or `23503` mapping is required for UX.

**First instance:** `role_detail` delete while `latch_user_roles` rows exist ([`iam-role.md`](../surface-specs/iam-role.md)).

**Rationale:** Integrity constraints are correct at Postgres; operators need to know *what* blocks the action. Cross-cutting — same pattern for customer+jobs RESTRICT, etc.

**Status:** Spec locked; DAL/UI implementation deferred to implementation wave after task 19.

---

### Decision: progressive setup — master catalogs (2026-06-16)

**Choice:** Master/catalog tables that block downstream forms (`site_contact_relation`, and similar catalogs in later slices) are populated through **progressive first-use setup** — a series of guided forms with **suggested defaults**, not automatic DDL seeds. This pattern recurs as new slices add catalogs. **Regardless of setup**, each catalog also gets a permanent [catalog table page](./general.md#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16) for ongoing edit.

| Layer | When | What |
|-------|------|------|
| Runtime setup | First use / empty catalog | Wizard or inline prompts; user confirms or edits suggestions |
| Catalog table page | Always (same slice as consuming UI) | Editable table Surface — add/edit/delete rows any time |
| Dev seed | Local QA only, when advised | Approved `*_dev_seed.sql`; Postgres-assigned ids only ([seeding rule](#decision-business-data-seeding-2026-06-15)) |
| DDL migration | Task 17+ | Table shape only — no business `INSERT`s unless explicitly re-decided |

**Dev workflow:** When a slice needs catalog rows for manual testing, task docs or migration notes **advise** whether a dev seed is needed — do not add seeds or hard-coded ids without discussion. Example: standing contacts on `site_detail` need at least one `site_contact_relation` row before the relation picker is usable.

**Approved dev seed (2026-06-16):** `migrations/020_site_contact_relation_dev_seed.sql` — four suggested relation display names; Postgres-assigned ids; idempotent on `display_name`. DDL migration `019_site.sql` stays empty; seed is a separate migration for local QA only.

**Rationale:** Catalog content is a product choice; first-run UX should teach the model. DDL seeds fight the empty-catalog default and leak fixed ids into docs and tests.


### Decision: notes and attachments — shared tables (deferred) (2026-06-15, **amended 2026-06-17**)

**Choice:** **Do not** add ad-hoc `notes TEXT` columns on business anchors (`party`, `site`, `site_contact`, …). **Global cross-cutting** data model:

| Table | Shape |
|-------|--------|
| `note` | Polymorphic (`entity_type`, `entity_id`, `body`, …) — **multiple rows** per entity allowed |
| `attachment` | Polymorphic files/images — **multiple rows** per entity *(table deferred)* |

**Surface linkage (not universal):** `notes` and `attachments` are optional **logical Fields** declared per Surface in [`surfaces.md`](../surfaces.md#cross-cutting-fields-notes-attachments) — only on anchors where product needs them. Not every Surface gets these Fields.

**UI:** **Deferred** past wave 1 party/site lenses. DDL may create `note` and migrate inline `party.notes` → rows; Surface YAML + DAL + UI land in a dedicated cross-cutting slice when ready.

**Schema view:** [`schema/current.dbml`](../schema/current.dbml) — `note` in `cross_cutting`. Reuse `entity_type` vocabulary aligned with `latch_audit.entity_type`. No `party_note` or per-anchor note tables.

**Rationale:** One global pattern for free text and files; opt-in per Surface keeps manifests and forms lean; multiple notes/attachments per entity without schema churn.


### Decision: business data seeding (2026-06-15)

**Choice:**

1. **Do not add business seed migrations** (`*_dev_seed.sql`, fixture `INSERT`s in DDL tasks) **without prior discussion** — default for new slices is **DDL only**.
2. When seeding **is** approved: let Postgres assign ids (`DEFAULT gen_random_uuid()::text` or `INSERT … RETURNING id`); **do not** hard-code string ids like `seed-party-acme` in new seeds.
3. **`/setup`** (first admin user) is not business seeding — it stays the only runtime identity bootstrap.

**Rationale:** Fixed seed ids leak into docs, tests, and manual QA paths and fight the repo’s normal id convention. Seeds are a product choice (what demo data exists), not an automatic deliverable per migration task. Historical seeds (e.g. `017_party_dev_seed.sql`) predate this rule; do not extend that pattern without explicit approval.
