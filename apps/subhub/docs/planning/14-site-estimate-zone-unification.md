# 14 — Site / estimate zone unification (proposal)

> **Status:** **§§ 1–3 locked + shipped (42a/42b/42c, 2026-07-14).** Line Items zone icon → checkable root-scoped tree + exclusive qty ↔ places (Z1–Z8; amends G3/X3; no schema). § 4 (asset-level history / estimate write to `site_asset`) remains deferred. Decisions: [site zone tree unification](../decisions/site.md#decision-site-zone-tree-unification-2026-07-14); [estimate root condition ↔ site zone link](../decisions/estimate.md#decision-estimate-root-condition--site-zone-link-2026-07-14); [zone tree popover](../decisions/estimate.md#decision-line-items-zone-tree-popover--exclusive-qty-2026-07-14).
>
> **Origin:** chat discussion 2026-07-14 (sites → scopes & zones vs. estimates/jobs). **Related:** [`site.md`](../surface-specs/site.md), [`decisions/site.md`](../decisions/site.md), [`decisions/estimate.md`](../decisions/estimate.md), [11-categories-scope-model.md](./11-categories-scope-model.md).

## Why

Today `site_scope`/`site_zone` (site geography) and `estimate_condition` (commercial tree) are fully decoupled — both key off the same catalog `root_item_id`, but neither references the other. This leaves "which zones can this line allocate into?" unanswerable without guessing by catalog root, which breaks down the moment a site has multiple instances of the same root (Bldg A / Bldg B Fire Alarm). This proposal makes the site zone tree the single shared place registry, while keeping the commercial (estimate) tree structurally independent.

## Summary of the proposed model

```text
site_zone (unified tree; root = scope instance, i.e. "base zone")
    │
    ├── site_asset (device; own status lifecycle; site_zone_id FK; provenance)
    │       └── note (polymorphic, entity_type = 'site_asset')
    │
    └── estimate_condition
            root:     site_zone_id FK → a root-level site_zone ("base zone")
            children: parent_condition_id — separate tree, NOT site_zone rows
                └── estimate_line → estimate_line_allocation → site_zone_id (leaf, qty)
```

Three separate proposals, adopt independently or together:

1. Unify `site_scope` + `site_zone` into one self-referencing tree.
2. Bind estimate root conditions to a root `site_zone` (live FK + independently-editable name), instead of a bare catalog `root_item_id`.
3. Keep asset-level lifecycle/history on `site_asset`, not on the zone; loosen `site_asset` write access so estimates may pin `proposed` devices, not just jobs.

None of this requires a monolithic migration — (1) and (2)/(3) can ship as separate tasks, in either order.

---

## 1 — Unify `site_scope` + `site_zone`

**Current (2 tables):**

```text
site_scope { id, site_id, root_item_id, name, status, sort_order }
site_zone  { id, site_id, site_scope_id (nullable = General), parent_zone_id, name, status, sort_order }
```

**Proposed (1 table):**

```text
site_zone {
  id
  site_id
  parent_zone_id   -- null = root ("base zone" = scope instance, or General)
  root_item_id       -- required when parent_zone_id is null AND it's a real scope; null on General root + all children
  name
  status               -- proposed | active | removed | cancelled
  sort_order
}
```

`site_asset` and `job_scope_group` collapse their dual `site_scope_id` + `site_zone_id` FKs down to one `site_zone_id` that can point at any node (root or leaf).

**Open fork — root delete semantics.** Today, deleting a `site_scope` sets its children's `site_scope_id` to `NULL` (they survive, reparented into General). Once scope and zone are the same table, "delete a root" becomes "delete a node with children," and needs an explicit rule:

| Option | Behavior | Recommendation |
|--------|----------|-----------------|
| **Block** | Can't delete a root while it has children — same posture as existing reference-block rules | **Recommended** — least surprising, forces explicit cleanup |
| **Cascade** | Delete root → delete entire subtree | Avoid as default — dangerous with real as-built data |
| **Reparent to General** | Children survive, orphaned into General (today's actual behavior) | Not obviously portable once General is just another root |

---

## 2 — Estimate root condition ↔ root site zone (hybrid link)

```text
estimate_condition {
  id
  estimate_id
  parent_condition_id  -- null = root
  site_zone_id           -- NOT NULL on roots; must reference a root-level site_zone; null on children
  name                     -- independently editable, prefilled from base zone name at creation
  complexity_factor_id
  sort_order
}
```

Drop the separately-stored `root_item_id` on the condition — derive it by joining the linked root `site_zone.root_item_id` at read time. Avoids drift entirely; no case where a condition's catalog root disagrees with its bound zone's root.

**Link model comparison:**

| | Live FK only | Full snapshot copy | **Hybrid (recommended)** |
|---|---|---|---|
| Stored on `estimate_condition` | `site_zone_id` only | `root_item_id` + `name` copied, no FK enforcement | `site_zone_id` FK (enforced) + `name` independently editable |
| Rename on site propagates? | Yes, always | Never | Yes, until estimator renames locally |
| Root item drift possible? | No | Yes | No — derived, never stored |
| Delete integrity enforced? | Yes | No — orphan risk | Yes |

This is almost exactly today's existing pattern for `site_scope.name` (prefill from category, then independently editable) — just adding the FK for delete-safety and dropping the redundant `root_item_id` copy.

**No second freeze layer needed at win.** `job_scope_group` already carries its own nullable `site_scope_id`/`site_zone_id` — win already creates an independent snapshot reference at that point. Live/hybrid binding is fine while the estimate is open. Document/PDF generation is a separate export-time snapshot concern (freeze the name into the rendered doc at generation/send time), not a schema concern.

**Delete guard.** Leaf zones are **already** blocked (409) when referenced by `estimate_line` (via `estimate_line_allocation`), `job_line`, or `site_asset` — shipped behavior, unchanged by this proposal ([`site.md`](../surface-specs/site.md) § E). This proposal adds one more entry to the **same** block set, applicable to **root** zones only: **block delete of a root `site_zone` while any `estimate_condition.site_zone_id` (root condition) references it** — regardless of the estimate's approval status (see fork below). Net result once adopted: a `site_zone` row (root or leaf) cannot be deleted while referenced by any of `estimate_line` / `job_line` / `site_asset` (leaf) or `estimate_condition` (root only).

**Other forks to decide before implementation:**

| Fork | Question | Lean |
|------|----------|------|
| Duplicate roots | May two root conditions in the same estimate point at the same base zone? | Unique (`estimate_id`, `site_zone_id`) on root conditions by default; relax only if a real use case appears |
| Lost/expired estimates | Do they block base-zone delete forever? | Block regardless of status for v1 (matches existing site/job/estimate reference rules); relaxing to "only open estimates block" is a v1.5 candidate, not a default |

---

## 3 — Build flow (resolves 3.1–3.3)

| Question | Answer |
|----------|--------|
| **Where are zones created?** | On the **site** only (Scopes & zones tab) — unchanged source of truth. |
| **Does a new estimate auto-populate its condition tree from the site's zones?** | **No.** The **S** panel starts blank. |
| **Copied or referenced?** | **Referenced** — live FK (hybrid model above), never copied/duplicated into estimate tables. |
| **Does adding a zone on the site retroactively show up on open estimates?** | **No.** It becomes an available option in future "Add root" pickers; it does not insert itself into any existing tree. |
| **Build sequence** | Blank **S** → "Add root" (pick an existing base zone, or "New…" to create one inline, `proposed`) → build condition children under it exactly as today → add lines → line's zone icon resolves to that root's zone subtree only (**42c**: checkable tree + exclusive qty). |
| **Can a root zone be deleted if an estimate used it, even unapproved?** | Blocked (409) by default, regardless of approval status — see fork table above. |

---

## 4 — Asset-level history stays on the asset, not the zone

`site_zone.status` (`proposed | active | removed | cancelled`) describes whether **the place itself** still exists. It is *not* where device install/removal/replace history belongs — that's already `site_asset`'s job (own `status` lifecycle + `replaced_by_site_asset_id` chain). No schema change needed here beyond what already exists; the amendment is **who may write it**.

**Validated pipeline:**

| Stage | Mechanism | v1 or target? |
|-------|-----------|----------------|
| Job created (optionally from estimate) | `job` (+ win copies `estimate_line` → `job_line`) | v1 |
| Assets assigned to zone | `site_asset` row, `site_zone_id` FK, `status = planned` (or `proposed` if estimate-originated — **new** amendment) | v1 shape; estimate-write is the open amendment |
| Tech updates install progress | Two distinct signals, kept separate: discrete device status (`site_asset.status`) for serialized devices; fractional qty (`progress_entry` → `scope_phase.completed_qty`) for bulk/labor-phase work, optionally tagged `site_zone_id`/`site_asset_id` per entry line | v1 |
| Progress report | Read-side rollup of `scope_phase` qty + `site_asset` status counts by zone/scope | v1 (reporting only, no new write table) |
| Billing based on install progress | **Target, not v1.** Locked B4: v1 billing is manual (`billable_line` curated by PM); auto-generation from `scope_phase` rollups is already the documented future direction | target (v1.5+) |
| Notes/issues | Reuse existing polymorphic `note` table, extend `entity_type` to include `site_asset` | note table exists; structured "issue" concept would be new — defer |

**Estimate write amendment:** allow an estimate line to create a `proposed` `site_asset` pin at a zone under its condition's bound base zone, gated by a Field grant (same pattern as `site_detail` `scopes`/`write`). Add `created_by_estimate_line_id` alongside the existing `installed_by_job_id` for provenance, rather than overloading one FK.

**History storage:** don't add a bespoke ledger by default — `latch_audit` (append-only, restorable per platform invariant) already covers full row history. Only add a thin curated projection table (`site_asset_event`: `event_type`, `at`, `by_job_id`/`by_estimate_id`, `note`) if/when a timeline UI needs clean copy without parsing audit JSON — this is already flagged as deferred in [`decisions/site.md`](../decisions/site.md).

---

## Open forks to lock before any implementation task is filed

1. Root-delete semantics under unification — block / cascade / reparent (lean: **block**).
2. Estimate write access to `site_asset` — Field-grant shape, always `proposed`.
3. Duplicate root-condition constraint on same base zone (lean: unique per estimate).
4. Lost/expired estimates still blocking base-zone delete forever (lean: yes for v1).
5. Curated `site_asset_event` timeline table — defer until a concrete UI needs it.

## Non-goals right now

- § 4 asset-level history / estimate write to `site_asset` — still deferred.
- **42c** shipped (UI-only; no DBML/migration) — Z1–Z8 locked.

## Related tasks

- [42a](../tasks/42a-site-zone-tree-unification.md) ✅ · [42b](../tasks/42b-estimate-condition-zone-link.md) ✅ · [42c](../tasks/42c-estimate-line-zone-tree-popover.md) ✅
