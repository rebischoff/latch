# 15 — Entity flow (cross-slice sketch)

## Goal

Add a one-page **entity flow** to [`architecture.md`](../architecture.md) so Slice 2 DDL (task **17**) fits the full domain picture — without drafting tasks for slices 3–7.

**Docs only — no migrations, no application code.**

## Prerequisites

Slice 1 complete ([14-contact-child-collections.md](./14-contact-child-collections.md)).

## Files

| File | Action |
|------|--------|
| [`../architecture.md`](../architecture.md) | **Update** — new `## Entity flow` section (mermaid + short prose) |

## Steps

### Locked during task

Task-scoped choices (doc structure for this sketch) are recorded **here**, not in [`decisions.md`](../decisions.md) — unless a contradiction with a global Decision is found.

#### Step 1 — section placement (2026-06-15) ✓

| Choice | Locked value |
|--------|----------------|
| **Section title** | `## Entity flow` |
| **Placement** | After `## Data model (summary)` (including timestamps note), **before** `## Surface catalog` |
| **Intro** | One paragraph: relationship map across slices; solid = Slice 1 + task 17 DDL; dashed = deferred per [decisions.md](../decisions.md) |

**Recorded in:** [`architecture.md`](../architecture.md) `#entity-flow` (section stub; diagram completed in steps 2–5).

---

1. Add `## Entity flow` after the data model summary (or after `## Data model (summary)` tables). — **done (2026-06-15)**
2. Diagram **implemented** entities solid; **deferred** entities dashed (notes/attachments, `party_user`, address verification, catalog installs at site).
3. Minimum paths to show:

   ```text
   party ── party_location ── location ── site_location ── site
                              ↑                    │
                              └── party (billing)  └── parent_site (hierarchy)
   site ── site_contact ── party
   site ── job (slice 5) ── job_party / job_location
   job ── estimate (slice 4) ── invoice / PO (slice 6)
   item / part (slice 3) ── job_line (slice 5)
   ```

4. Call out what **task 17** creates vs what later slices add (one short table).
5. Link to relevant [decisions.md](../decisions.md) blocks — do not duplicate locked choices.

## Verify (stop gate)

- [ ] `architecture.md` has `## Entity flow` with mermaid (or equivalent) and deferred items marked
- [ ] Flow includes `party` ↔ `location` ↔ `site` and forward pointers to job / catalog / financial slices
- [ ] No contradictions with existing decision blocks (fix decisions first if found)
- [ ] [`../../STATUS.md`](../../STATUS.md) → [16-slice2-planning-gate.md](./16-slice2-planning-gate.md)

## Out of scope

- Full task files for slices 3–7
- DDL or Surface YAML
- Changes to [`decisions.md`](../decisions.md) unless a contradiction is found (then fix decisions, not this sketch)

## Reference

- [decisions.md](../decisions.md) — locked CRM model (2026-06-15)
- [01-task-index.md](./01-task-index.md) — slice map
