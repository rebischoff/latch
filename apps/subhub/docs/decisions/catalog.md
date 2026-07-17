# SubHub decisions — catalog

> Parts, items, categories, labor phases, and catalog modeling.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: CCTV starter spec namespace (2026-07-16)

**Status:** **Locked** (2026-07-16). **Seed:** `migrations/081_catalog_cctv_dev_seed.sql`. **Amended** by [CCTV accessories](#decision-cctv-accessories--mounts-recorders-licenses-2026-07-16) (`082`).

**Problem:** CCTV exists as a scope root (from catalog `system` → unified item tree) but has no `spec_def` namespace, item subtree, or part specs — blocking an end-to-end CCTV quote → win → job path that exercises the C panel matcher.

**Choice — starter set only (four enums on the CCTV scope root):**

| # | Spec | `value_type` | Options | Role |
|---|------|--------------|---------|------|
| **S1** | **Platform** | enum | ONVIF, Axis, Avigilon, Hikvision | Project ecosystem lock (FA analogue: SLC Protocol) |
| **S2** | **Form Factor** | enum | Dome, Bullet, Turret, PTZ, Fisheye | Primary camera filter |
| **S3** | **Resolution** | enum | 2MP, 4MP, 8MP | Common bid assumption |
| **S4** | **Housing** | enum | Indoor, Outdoor, Vandal | Environmental / rating filter |

| Topic | Choice |
|-------|--------|
| Namespace | Flat on **CCTV** scope root (`scope_root_item_id`) — whole namespace on C panel (S7 / V2) |
| Manufacturer as spec | **No** — technical defs only ([C2](../planning/06-catalog-trade-system.md)) |
| Mount | **Not a spec** — own **Mounts** branch ([accessories](#decision-cctv-accessories--mounts-recorders-licenses-2026-07-16)) |
| Deferred | Lens, IR/night, PoE class, recorder channel count (number), codec — add only when a real matcher need appears |
| Part rows | Cameras carry S1–S4; mounts / licenses / NVR·server carry **Platform only** — absent rows = wildcard (V5) |

**Rationale:** Four enums are enough to prove scope-panel → part narrowing → quote → job without over-authoring. Mirrors Fire Alarm’s platform + family + capability shape.

---

### Decision: CCTV accessories — mounts, recorders, licenses (2026-07-16)

**Status:** **Locked** (2026-07-16). **Seed:** `migrations/082_catalog_cctv_accessories_seed.sql`. **Builds on:** [CCTV starter specs](#decision-cctv-starter-spec-namespace-2026-07-16); [D2 emergent composition](#locked-decisions-review-2026-07-05); [Z5 None rate](#decision-item-commercial-margin-inherit-checkbox-2026-07-09).

**Problem:** Starter CCTV seed had cameras + one NVR only. Quotes need mounts, servers, and software licenses. Licenses are non-physical but still carry a purchasable fee **and** Program labor — there is no `expense`/`license` `item.kind` ([D2](#locked-decisions-review-2026-07-05)).

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **A1** | License fee | **Part-backed** — `manufacturer_part` + `vendor_part` → `unit_material`; labor via `item_labor_phase`. Non-physical ≠ zero material $. |
| **A2** | Mounts | **Own branch** — separate quote lines from cameras |
| **A3** | Specs on parts | Cameras **S1–S4**; mounts / licenses / NVR·server **Platform only** |
| **A4** | Recorders | Two leaves: **NVR** and **Server / VMS Host** |
| **A5** | License leaves | **Camera Channel License** + **Viewing Client License** (analytics later) |
| **A6** | Labor | Cameras: Install + Program + Test; Mounts: Install; NVR/Server: Install + Program + Test; Licenses: **Program only** |
| **A7** | Freight on licenses | Own **`freight` / `None` (0%)** override on Software & Licenses ancestry so a later root freight rate does not tax license fees. Seed relaxes `cost_add_on_type` CHECK to allow 0%/\$0 (Z5). |
| **A8** | Mount leaves | Wall Mount, Pendant Mount, Pole Mount, Corner Bracket (+ ROM) |

**Tree (after 082):**

```text
CCTV
├── Cameras (+ Fisheye Camera)
├── Mounts                    ← new
├── Recorders (+ Server / VMS Host)
├── Software & Licenses       ← new
├── Network & Power
├── Wire & Cable
└── Test & Commission
```

**Rationale:** Licenses stay first-class sellable SKUs with real Program hours for Field progress; mounts are BOM lines, not Form Factor options; Platform-only accessory specs keep C-panel filters useful without Form Factor noise on brackets/licenses.

---

### Decision: spec participation removed — narrow by scope-root namespace, part-row presence is the filter (2026-07-12)

**Status:** **Locked** (2026-07-12). **Task:** [37ai](../tasks/37ai-spec-participation-removal.md). **Amends/supersedes:** [spec definitions scoped to root, flat item participation (S1–S10, 2026-07-07)](#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07) — **S3, S6, S8, S9, S10 retired outright** (participation as a concept is gone, not just re-shaped); **S1, S2, S4, S5, S7 unchanged** (definitions still a flat namespace per scope root, edited on the scope's Specs tab; categories still carry no spec Fields; `item_spec_exclude` stays dropped; estimate scope panel stays the whole root namespace).

**Problem:** even the flattened, no-inheritance participation model (S1–S10) still required every leaf item to be individually opted into every spec dimension it should be filtered on — a real authoring cost once a category has many leaves that all genuinely need the same specs (worked example: **Notification Appliances** → 3 sub-categories × 5 leaves = 15 leaves needing `Notification Color`, `Notification Series`, and `Candela` — 45 individual checkbox clicks, repeated again for every new spec or every new leaf). Two paths were weighed to fix that:

| Rejected alternative | Why |
|---|---|
| **Category-level participation with ancestry-merge inheritance** (leaf → root, presence-wins, mirroring [37ad](#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12)'s labor-phase merge) | Solves the authoring cost, but reopens exactly the blast-radius problem S9 was written to close: a category-level participation edit can silently change the effective spec set for every descendant leaf and every part linked to any of them at once, with `manufacturer_part_spec` pruning (K1) only wired to fire on a part's own `item_links` save — not on an ancestor's participation edit. Fixable (widen the prune trigger to fire on any participation write, scoped to the edited node's descendant leaves), but it's new write-path machinery, a new policy/Field-grant surface on category nodes, and a fourth attempt at inheritance semantics in this exact area in two weeks — see chat discussion for the full pros/cons/orphan-risk breakdown. |
| **Bulk-apply / "copy from item" UI convenience only** (S10, never built) | Cheapest, zero schema risk, but doesn't remove the underlying per-leaf row bookkeeping — adding a 16th leaf or a 4th spec later still requires remembering to re-run the bulk action; no structural guarantee the set stays in sync. |

**Choice — drop participation entirely, narrow by the part's own recorded values:**

| # | Topic | Choice |
|---|---|---|
| **V1** | Storage | **Drop `item_spec_participation` table.** No replacement junction, no category-level table, no ownership/inheritance concept anywhere in the tree. A leaf item has **zero** spec Fields on `item_detail` — nothing to select, nothing to display. |
| **V2** | "Effective defs" for an item | **The item's scope root's entire namespace** — `SELECT * FROM spec_def WHERE scope_root_item_id = <item's root>` (`scopePanelDefs`, unchanged function, now also the per-item answer — S7's "broader than any subtree union" framing turns out to be the *only* answer once participation is gone, not just the scope-panel answer). |
| **V3** | Part contextual union | **Union of `scopePanelDefs(root)` across the distinct scope root(s) of a part's linked leaves** — replaces S6's `⋃ item_spec_participation`. A part linked only to Fire Alarm leaves sees the whole Fire Alarm namespace as writable `part_specs` rows, not a hand-curated subset. |
| **V4** | Guardrail removed (explicit trade-off) | `assertValidPartSpecs`'s "not allowed for this part's item links" check now validates against the wider root namespace, not participation — an admin may record a value for **any** def in scope, including ones that don't semantically apply to that part family. Accepted cost: nothing catalog-side stops a Horn/Strobe part from getting an `slc_protocol` value; the part's own spec-value rows are the only signal of relevance now (V5). |
| **V5** | Matching semantic flip — the load-bearing change | A part with **zero** `manufacturer_part_spec` rows for a def is no longer "fails to match" — it's **"no opinion, skip this dimension for this part."** `spec-match.ts`'s `enumOptionSetMatches`, the numeric bucket check, and the boolean check all flip their zero-rows case from `false` to `true` (pass-through) when the bucket has a non-blank value for that def. This is what makes V2/V3's wider namespace safe to filter on: Horn/Strobe parts simply never get an `slc_protocol` row, so an SLC bucket value set anywhere in the Fire Alarm scope has no effect on them — they're skipped on that dimension, not excluded. |
| **V6** | Line-level narrowing | Bucket (line → zone → scope merge, unchanged) is now checked against **every def in the item's scope-root namespace** (V2) instead of `bucket ∩ participation(item)` (old S8). The intersection step is gone — there's nothing to intersect with. |
| **V7** | Orphan / staleness risk | **Lower than before, not higher.** Moving from a narrow, per-item, admin-curated set (participation) to the full root namespace only ever *widens* what's allowed — no existing `manufacturer_part_spec` row becomes newly invalid. `prunePartSpecsToContextTx` (K1) is unchanged in mechanism and still runs on `item_links` replace, but fires far less often since almost every existing spec value is now in-namespace by construction. |
| **V8** | `in_use_participation_count` | Dropped from `spec_definitions[]` DTO and delete-guard payloads (`spec-detail-write.ts`, `item-spec-definitions-write.ts`) — nothing left to count. `in_use_part_count` (against `manufacturer_part_spec`) is the only remaining delete-guard signal for a def. |

**Worked example — Fire Alarm, Notification Appliances (15 leaves):**

```text
Fire Alarm (scope root) — spec_def namespace: { slc_protocol, notification_color, notification_series, candela }
├── Initiating Devices (category)
│   └── Pull Station (item) — no spec Fields on this item's detail page at all
└── Notification Appliances (category)
    ├── Strobes (category) × 5 leaves
    ├── Horns (category) × 5 leaves
    └── Horn/Strobes (category) × 5 leaves
```

No item anywhere has a participation checklist to fill in. Every one of the 15 Notification leaves' linked parts can carry values for `notification_color`, `notification_series`, and `candela` — and, if someone mistakenly links a Notification part to `slc_protocol`, that's allowed (V4) but harmless: no Notification part will ever have an `slc_protocol` row, so an SLC bucket value on the Fire Alarm scope silently skips every Notification line (V5) exactly as it should. Pull Station parts never get `candela`/`color`/`series` rows for the same reason. The correctness now lives entirely in "does this part have a row for this def," authored once per part on `part_detail`, not "does this item participate," authored once per leaf on `item_detail` — one fewer place to keep in sync, at the cost of the guardrail in V4.

**Rationale:** the real cost driver in the 15-leaf example wasn't *which* defs matter to each leaf — every leaf in the same physical product family already gets its "relevance" signal for free from what its actual parts are rated for. Participation was catalog metadata restating a fact that `manufacturer_part_spec` already encodes at the part level. Removing it removes an entire authoring surface (leaf Specs Field, `item_spec_participation` table, `item-spec-participation-write.ts`) without needing category-level inheritance, ancestry walks, or a widened prune trigger — at the accepted cost of one guardrail (V4) that was catching data-entry mistakes, not correctness bugs (a part's own blank/filled rows are still the source of truth either way).

**Planning:** chat discussion (2026-07-12, this session) walked Option C (category-ancestry-merge participation) and Option E (this decision) side by side before locking Option E. **Task:** [37ai](../tasks/37ai-spec-participation-removal.md).

---

### Decision: labor phase per-row override — merge across full ancestry (2026-07-12)

**Status:** **Locked** (2026-07-12). **Task:** [37ad](../tasks/37ad-labor-phase-per-row-override.md). **Amends:** [unified item tree "Labor" clause](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) (37l); [labor phase inclusion N2](#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07) (37n). **Aligns with:** [item commercial margin inherit checkbox Z1–Z5](#decision-item-commercial-margin-inherit-checkbox-2026-07-09) — same inherit/override vocabulary, now applied per-row instead of per-scalar-field.

**Problem:** 37l/37n locked labor resolution as an **atomic group**: a node with *any* own `item_labor_phase` rows fully replaces the ancestor's whole set, even for phases the node never touched. Authoring one override (e.g. bump `Program` hours on a specific leaf) silently drops every other inherited phase (`Test`, `Install`, …) from that leaf's cost — surprising, and the opposite of what "override" should mean. Locked at the time as the simpler v1 shape, revisited now that the real fix is small.

**Choice:**

| Topic | Choice |
|---|---|
| **Resolution** | Merge, not swap. Walk **leaf → parent → … → root**; build one map keyed by `labor_phase_id`. The **first row seen per phase id wins** (nearest node to the leaf); keep walking to the root regardless, to fill any phase id not yet claimed by a nearer node. Replaces "self's whole set, else first non-empty ancestor's whole set" in both `resolveLaborGroup` (costing) and the catalog display resolver. |
| **Single resolver** | One shared merge helper, used by **both** the estimate/job costing engine (`estimate-commercial.ts`) and the catalog display DAL (`item-detail.ts`). The catalog UI and the cost math must never disagree about what a node's effective labor set is. |
| **Exclusion — no new state** | To suppress an inherited phase at a lower node, author an **own override row for that `labor_phase_id` with `hours_per_unit = 0`**. Row presence (any value, including zero) wins per the resolution rule above; row *absence* always means "no opinion, inherit." No tombstone column, no schema change — zero-hours is the existing shape doing double duty as "explicitly none," same spirit as [Z5's catalog **None** rate type](#decision-item-commercial-margin-inherit-checkbox-2026-07-09) for margin FKs. |
| **Catalog UI / DTO** | Whole-table `labor_phase_mode` (`empty`/`inherited`/`override`) and single `source_item_id`/`source_item_name` are replaced by **per-row origin**: each resolved row carries `origin: "own" \| "inherited"` plus its own `source_item_id`/`source_item_name` when inherited. Overriding one inherited row seeds an editable own row from its current value (checkbox/affordance mirrors [Z2](#decision-item-commercial-margin-inherit-checkbox-2026-07-09)'s per-field inherit checkbox, applied per array row); deleting that one own row reverts just that phase back to its inherited placeholder — not the whole table. |
| **Unaffected** | Category + item authoring surface (N2) is unchanged — this changes how a node's *effective* set is computed from itself plus ancestry, not who may author rows. `estimate_scope_labor_phase` / `estimate_zone_labor_phase` inclusion (N4) and job `scope_phase` seed (N6) are structurally unchanged — they still filter whatever `labor_phase_id`s the resolver returns, just a more accurate (usually larger) set now. |
| **Data note** | No DDL migration. Any node that previously relied on "my partial own set blanks the rest" will pick up previously-hidden ancestor phases on next load — call out in manual smoke, not a schema migration. |

**Rationale:** presence-based per-phase override is the smaller, more literal reading of "override" — a node states only what's different, everything else still flows from ancestry. The zero-hours idiom reuses the existing row shape instead of inventing an exclusion marker. Consolidating catalog display and costing onto one merge helper removes a standing risk that the UI shows a labor set the engine wouldn't actually cost.

**Supersedes:** the "Labor: … atomic group … no per-phase merge/override across levels" clause of the [unified item tree 37l amendment](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05); the "atomic, no per-phase merge across levels" clause of [N2](#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07).

---

### Decision: item labor axis override — single-spec axis, no compound (2026-07-11)

**Status:** **Superseded (2026-07-11)** by [item placement + mount axis override — reverted, leaf duplication instead](#decision-item-placement--mount-axis-override--reverted-leaf-duplication-instead-2026-07-11). Never shipped past Step 3 (Step 4 stayed blocked on `estimate_line_spec` write). **Do not implement** `commercial_axis`, `variant_spec_option_id`, or `item_cost_override` — text below is historical. **Was locked** (2026-07-11). **Task:** [37ab](../tasks/37ab-item-placement-mount-axis.md), reverted by [37ac](../tasks/37ac-item-placement-mount-axis-revert.md). **Amended:** [D4 unified `resolveRate`](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) — the two narrow exceptions below (`item_labor_phase` **M1–M6**, margin FKs **M7**) are retired; D4's single self→ancestry→neutral walk is unamended once more.

**Problem:** some device families genuinely need different install labor depending on **mount** (ceiling / wall / outdoor), while everything else about the device — name, freight/incidental/markup policy, and most of the eligible part pool — stays the same. Two alternatives were weighed and rejected:

| Rejected alternative | Why |
|---|---|
| **Split a leaf per mount value** (`Strobe — Ceiling`, `Strobe — Wall`, `Strobe — Outdoor`, ×5 device families = 15 leaves) | `part_item` is leaf-only (locked — [U1–U3](#decision-part-item-links-leaf-only--specs-value-ux-2026-07-08)), so every mount-universal part needs re-linking on every leaf it fits, 3× the authoring for no material difference in most cases |
| **Mount as a category branch, leaf reused across branches** | Requires reviving many-to-many `item_category` placement, which was deliberately retired when `category` + `item` were unified into one self-referential tree specifically to keep cost resolution a single deterministic path (self → ancestry → neutral). Re-introducing dual-parent leaves reopens that ambiguity. |
| **`complexity_factor` absorbs the difference** | Wrong layer — complexity is a **job-circumstance** multiplier (lift work, occupied-building access, difficult retrofit), orthogonal to which device was selected. A ceiling-mount box takes different install steps *every time*, regardless of site; that's device-inherent, not circumstantial, so it doesn't belong on the condition. The two layers **compose**: `unit_labor = item's own (axis-resolved) base hours × complexity_factor from the line's condition`. |

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **M1** | Axis def | Any `spec_def` flagged `commercial_axis = true` (new boolean column, default `false`) that the item participates in via `item_spec_participation` |
| **M2** | Storage | `item_labor_phase.variant_spec_option_id` — nullable FK → `spec_option`. `NULL` = base row. Set = override row, used only when the line's resolved value for that def equals this option. |
| **M3** | Resolution | Per phase: use the row where `variant_spec_option_id` matches the line's axis value; else use the row where it is `NULL` (base). No merge across rows — one row wins, same "atomic group" spirit as today's self/ancestor labor set. |
| **M4** | Scope | **Single axis only.** No compound/multi-axis combination logic (no tailwind-variants-style `compoundVariants` tier). Revisit only if a *second*, independently-varying axis is confirmed on real catalog data — do not build this speculatively. |
| **M5** | Estimate input | **No new estimate UI.** The axis value is whatever the estimator already sets in the line's spec bucket for that def — the same click that narrows the part pool also selects the labor row. |
| **M6** | Guardrail | Only defs flagged `commercial_axis` may be referenced by `variant_spec_option_id` — every other spec (color, protocol, candela) stays inert to costing, preserving D4's "specs never touch costing" boundary except for this one narrow, opt-in exception. |
| **M7** | Extend to margin FKs | Confirmed **real** need, not hypothetical — some device families need freight/incidental/markup to vary by the same axis, not just labor. New `item_cost_override(item_id, variant_spec_option_id NULL, freight_rate_type_id, incidental_rate_type_id, markup_type_id)` table; same axis-match-else-base resolution as **M3**, applied to the three margin FKs instead of labor phases. `resolveRate`'s freight/incidental/markup steps gain the same self-row variant lookup labor gets — `item.parent_id` and the ancestry walk itself are untouched. |

**Worked example — Fire Alarm mount:**

```
Notification Appliances
  ├── Strobe
  ├── Horn/Strobe
  ├── Horn
  ├── Speaker
  └── Speaker/Strobe
```

Five leaves, unchanged. `mount` (enum: ceiling / wall / outdoor) is flagged `commercial_axis = true`; each leaf participates. `Strobe`'s `item_labor_phase`:

| Phase | Rate | Hrs/unit | `variant_spec_option_id` |
|---|---|---|---|
| Install | Standard | 0.50 | *(base)* |
| Install | Standard | 0.75 | Ceiling |
| Install | Standard | 0.65 | Outdoor |

Estimator adds a **Strobe** line, sets `mount = Ceiling` on the spec panel (narrowing the part pool to ceiling-rated MPNs, as today) — the same value resolves `unit_labor` to 0.75 hr/unit instead of the 0.50 base. If that line's condition also carries a complexity factor (e.g. 125% for a 30-ft warehouse ceiling), both apply: `0.75 × 1.25`.

**Rationale:** matches the cost/authoring shape of the actual problem (one axis, ≤3 values) instead of building general N-axis machinery for a case that doesn't need it. Reuses the existing `item_labor_phase` table and its `FieldArrayTable` UI with one new optional column, rather than a new variant entity. Keeps the leaf count at "one per real commercial identity" and keeps part authoring at "once per real MPN."

**Planning:** task filed — [37ab](../tasks/37ab-item-placement-mount-axis.md). Would need: `commercial_axis` column on `spec_def` + admin UI toggle; `variant_spec_option_id` column on `item_labor_phase` + "When" column in the labor `FieldArrayTable`; **M7** — new `item_cost_override` table + a "When" affordance on `ItemCommercialFields`; DAL guard rejecting `variant_spec_option_id`/override rows whose def isn't `commercial_axis` or isn't in the item's participation; resolver change in the labor-phase lookup step **and** the freight/incidental/markup lookup step.

---

### Decision: item placement — multi-location browse tree, decoupled from cost resolution (2026-07-11)

**Status:** **Superseded (2026-07-11)** by [item placement + mount axis override — reverted, leaf duplication instead](#decision-item-placement--mount-axis-override--reverted-leaf-duplication-instead-2026-07-11). **Do not implement** `item_placement` or `implies_spec_option_id` — text below is historical. **Was locked** (2026-07-11). **Task:** [37ab](../tasks/37ab-item-placement-mount-axis.md), reverted by [37ac](../tasks/37ac-item-placement-mount-axis-revert.md).

**Problem:** even with M1–M7, `mount` still has to be set as a spec value on the line/condition for labor/margin variance to take effect — but there's no catalog-tree way to *browse* by Wall/Ceiling/Outdoor groupings without either duplicating each leaf per mount value, or giving a leaf multiple structural parents (which reopens the ancestry ambiguity [D1](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) deliberately closed).

**Rejected alternative:**

| Rejected alternative | Why |
|---|---|
| Give the leaf multiple `item.parent_id` values directly (revive `item_category` as **load-bearing** ancestry) | `resolveRate` needs exactly one ancestry path per leaf; multi-parent reopens "which ancestor wins" for labor/freight/incidental/markup — the same ambiguity [D1](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) retired `item_category` to avoid. `estimate_line.item_id` alone also can't record which parent a pick came through, so cost resolution stays ambiguous even after the fact unless the line schema changes shape too. |

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **L1** | Storage | New `item_placement(item_id, parent_id)` — composite PK, many-to-many. `item.parent_id` (single-valued) is untouched and remains the **only** input to `resolveRate`'s self→ancestry walk. |
| **L2** | Placement targets | Constrained to `node_type = 'category'` nodes within the **same scope root** as the item's canonical parent — reuses the guardrail already enforced for drag/drop (`resolveScopeRootId` equality, [`item-tree-dnd.ts`](../../lib/catalog/item-tree-dnd.ts)). No cross-scope-root placement; no placing under another leaf. |
| **L3** | Catalog UI | New **"Parent Items"** field (multi-select TreeSelect) on `ItemDetailForm` — present on both the detail form and the `/items/new` create form. Separate from the existing drag/drop mechanism, which continues to own only the single canonical `parent_id`, unchanged. |
| **L4** | Estimate picker | `useEstimateItemPicker` unions `item.parent_id` edges with `item_placement` edges. Each placement renders as its own tree node keyed by a synthetic id (`place:<item_id>:<parent_id>`) so the same leaf can appear at multiple tree positions (e.g. under both Wall and Ceiling) as distinct, independently selectable nodes — `onChange` decodes the key back to `item_id` (unchanged field) plus the clicked branch. |
| **L5** | Auto-seed bridge | New nullable `implies_spec_option_id` FK (→ `spec_option`) on category nodes. Selecting a leaf through a branch that has this set auto-writes an `estimate_line_spec` row for the corresponding def (e.g. picking through "Wall" seeds `mount = Wall` on the new line) — a UX shortcut for a spec value the estimator would otherwise set by hand for M1–M7 to take effect. **Depends on** `estimate_line_spec` write/UI ([D3](#decision-specs-narrow-parts-separate-from-rates-2026-07-04), still deferred v1) shipping first — no line to write to until then. |
| **L6** | Guardrail | `item_placement` is **never** read by `resolveRate`, `manufacturer_part_spec` matching, or any cost/part resolution path — display and authoring convenience only. The resolved spec value (via M1–M7) stays the **single** input to cost/part resolution; the placement tree is just a faster way to set that value, never a second source of truth for it. |

**Worked example:**

```
Notification Appliances                (item.parent_id — unchanged, canonical home)

Initiating Devices                     (a scope-level browse grouping)
  ├─ Wall        (category, implies_spec_option_id = mount:Wall)
  │   ├─ Horn/Strobe   ← item_placement row; same row as below
  │   └─ Strobe
  └─ Ceiling      (category, implies_spec_option_id = mount:Ceiling)
      ├─ Horn/Strobe   ← same item_id, no duplication
      └─ Strobe
```

Horn/Strobe is authored once — one name, one part pool, one `item_labor_phase` set (with M1–M6 variant rows). Picking it through "Wall" adds a line with `item_id` unchanged and `mount = Wall` pre-seeded; picking it through "Ceiling" does the same with `mount = Ceiling`. Cost/parts resolution never knows or cares which branch was clicked — only the resolved `mount` value, exactly as M1–M7 already specifies.

**Rationale:** keeps `item.parent_id` single-valued and `resolveRate` unambiguous (no ambiguity reopened), avoids catalog-side leaf duplication (no 3× part re-linking for mount-agnostic MPNs), and reuses the spec-value mechanism M1–M7 already requires — the placement tree is additive UX, not a new resolution path.

**Planning:** task filed — [37ab](../tasks/37ab-item-placement-mount-axis.md). Depends on M1–M7 for cost variance and on the deferred `estimate_line_spec` UI for L5's auto-seed; L1–L4 (placement table + catalog UI + picker rendering) can ship independently of both as a pure browsing improvement.

---

### Decision: item placement + mount axis override — reverted, leaf duplication instead (2026-07-11)

**Status:** **Locked** (2026-07-11). **Task:** [37ac](../tasks/37ac-item-placement-mount-axis-revert.md). **Supersedes in full:** [item labor axis override, M1–M7](#decision-item-labor-axis-override--single-spec-axis-no-compound-2026-07-11) and [item placement, L1–L6](#decision-item-placement--multi-location-browse-tree-decoupled-from-cost-resolution-2026-07-11) — both retired same-day, before either shipped past catalog UI (Step 4 line-spec seed was still blocked on `estimate_line_spec` write). **Restores:** [D1/D4 unified tree](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) to its original, unamended single-parent shape.

**Problem:** M1–M7/L1–L6 solved mount-dependent labor/margin variance by keeping the leaf singular and layering two indirections on top — a `commercial_axis` spec value matched via `variant_spec_option_id`/`item_cost_override`, and a separate `item_placement` browse table to let that one leaf appear under Wall and Ceiling in the tree. On review, this reopened exactly the ambiguity `resolveRate` needs to avoid, just one level removed: **which item was actually installed still isn't answerable from the item alone** — the mount value has to travel with the *pick*, not the catalog row, and the only mechanism designed to carry it (L5's auto-seed into `estimate_line_spec`) had a hard, unshipped dependency (D3). Until that landed, `item_placement` changed nothing about resulting cost regardless of which branch was clicked — pure UI decoration with no functional payoff, at the cost of two new tables, a resolver branch, and a picker synthetic-key scheme.

**Rejected alternative (this is what M1–M7 chose over — now the chosen path):**

| Rejected alternative | Why it was rejected at the time | Why it's chosen now |
|---|---|---|
| **Split a leaf per mount value** (`Horn/Strobe` under Wall = one row, under Ceiling = a second row) | `part_item` is leaf-only, so every mount-universal part needs re-linking on every leaf it fits — 3× the authoring for no material difference in most cases | Confirmed the real device-family count is small enough that 2–3× authoring per family is cheap in absolute terms, and it buys back a single deterministic cost path with zero new machinery — the trade favors simplicity once the axis-matching indirection's real cost (two tables, a resolver branch, a blocked seed mechanism) is counted honestly |

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **R1** | Storage | Drop `item_placement`, `item_cost_override`, `spec_def.commercial_axis`, `item_labor_phase.variant_spec_option_id`, `item.implies_spec_option_id` entirely. `item.parent_id` remains the **only** structural relationship a leaf has, unamended since D1. |
| **R2** | Modeling mount variance | Author one item row **per install location** that needs different labor/margin (e.g. `Horn/Strobe` under `Wall`, a second `Horn/Strobe` under `Ceiling`) — same name allowed (name is not a uniqueness key), each with its own `parent_id`, `item_labor_phase`, `item_cost_override`-equivalent inline FKs, `part_item` links, and `item_spec_participation`. |
| **R3** | `resolveRate` | Reverts to exactly [D4](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) — self → ancestry walk-up → neutral, no axis-match step, no variant lookup. The M3/M7 resolver branches are removed, not just unused. |
| **R4** | Cost/part duplication accepted | Re-linking the same MPNs and re-authoring the same labor phase rows across mount-variant leaves is accepted cost, not a bug to solve later — matches the "split a leaf per mount value" alternative's known trade-off, now judged acceptable at real catalog scale. |
| **R5** | Catalog UI | Drop "Parent Items" multi-select from `ItemDetailForm`; drop the labor/cost-override "When" column; drop category "Implies spec value" field; drop `spec_def` "Commercial axis" toggle. Drag/drop remains the **only** way to set `parent_id`, unchanged from before 37ab. |
| **R6** | Estimate picker | `useEstimateItemPicker` goes back to rendering `item.parent_id` edges only — no synthetic `place:<item_id>:<parent_id>` keys, no placement-union step. Each leaf appears exactly once, at exactly one tree position. |

**Rationale:** the axis-match/placement design was betting that keeping one leaf and carrying its install-location as a derived spec value would be cheaper than duplicating leaves — but that bet required `estimate_line_spec` write to exist to pay off, and until it does, the indirection has strictly negative value (all cost, no benefit). Leaf duplication pays off immediately with the tooling that already exists (`part_item`, `item_labor_phase`, drag/drop `parent_id`) and keeps `resolveRate` exactly as simple as D1/D4 intended — one deterministic path, no exceptions, no blocked dependency standing between "pick an item" and "get the right cost."

**Planning:** task filed — [37ac](../tasks/37ac-item-placement-mount-axis-revert.md). Reverts migration `057`; deletes `item_placement`/`item_cost_override` DAL, tests, and UI added in 37ab Steps 1–3; restores the pre-37ab picker and `ItemDetailForm`.

---

### Decision: spec threshold presets + numeric bucket ranges (2026-07-12)

**Status:** **Superseded** (2026-07-13) — preset machinery removed by [41ao](../tasks/41ao-drop-threshold-presets.md); **numeric bucket ranges retained** (T3/T7/T8b, N4/N5). **Historical tasks:** [37ae](../tasks/37ae-spec-threshold-presets-ddl.md) → [37af](../tasks/37af-spec-threshold-presets-catalog-ui.md) → [37ag](../tasks/37ag-spec-threshold-presets-matcher.md) → [37ah](../tasks/37ah-spec-threshold-presets-estimate-ui.md). **Amends:** [N4/N5](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08) (bucket side only — part authoring unchanged). **Supersedes:** the 2026-07-11 *proposals* for numeric bucket range and enum threshold presets (same content, now locked).

**Problem:** (1) Number buckets only store a point today, so capability thresholds ("≥135 cd") reject parts whose band clears the bar but does not contain the exact point. (2) Closed discrete dims (candela switch positions) need estimator shortcuts ("High" / "Low") without inventing fake continuous coverage. Both need admin-curated presets and an activated bucket range column.

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **A1** | **Where presets are edited** | Catalog admin only — **scope root → Specs tab → `spec_definitions` Details popover** (`ItemSpecDefinitionsField`), nested under the same def that owns the options / unit. **Not** a separate Surface, **not** on leaf items, **not** on the part form, **not** in the estimate C panel. |
| **A2** | Where presets are *used* | Estimate **C panel** (`EstimateScopeSpecFields`) — single-select toggle when the def has ≥1 preset; Custom still allows raw option / min–max. Parts keep authoring raw enum rows / number bands only. |
| **T1** | Shared preset table | `spec_threshold_preset (id, spec_def_id, label, sort_order, value_number, value_number_max)` — one table for both types. Number presets fill the numeric columns; enum presets leave them null. |
| **T2** | Enum preset membership | Junction `spec_threshold_preset_option (preset_id, spec_option_id)` — curated **set** of options. Empty set rejected on write. |
| **T3** | Number match (bucket) | Activate `value_number_max` on `estimate_condition_spec` / `estimate_line_spec`. Null semantics: `value_number` null → −∞ floor; `value_number_max` null → +∞ ceiling. Match = interval overlap: `bucket_min ≤ part_max AND part_min ≤ bucket_max`. Exact-target = degenerate `min = max`. **Legacy point-only rows** (pre-range UI: `value_number` set, `value_number_max` null, no preset) are **backfilled** to `value_number_max = value_number` in migration **061** ([37ag](../tasks/37ag-spec-threshold-presets-matcher.md)) so they become `[v, v]` before overlap semantics ship; thereafter min-only without max is intentionally one-sided (e.g. `≥ 135`). |
| **T4** | Enum match (preset) | Part qualifies iff any of its `manufacturer_part_spec` option ids is in the selected preset's set. Single-option buckets keep today's exact membership. |
| **T5** | Bucket row storage | Nullable `spec_threshold_preset_id` on condition/line spec rows. Persist the preset FK when chosen (reload + audit). Matcher expands at match time. |
| **T6** | Mutual exclusion | Per bucket row, at most one of: `spec_threshold_preset_id` \| `spec_option_id` \| numeric pair (`value_number` and/or `value_number_max`). DAL rejects combinations. |
| **T7** | Blank / "is set" | Blank = all value fields null (including preset id). Number is **set** if **either** bound is non-null (so `[, 135]` is a real filter). |
| **T8** | Type split | Enum vs number presets are **not interchangeable** on one def — shape follows `spec_def.value_type`. Choose enum+sets for closed lists with gaps (candela); number+overlap for continuous dims (amps, pressure). |
| **T8b** | Bucket numeric storage | **`value_number` / `value_number_max` stored canonical** in `estimate_condition_spec` / `estimate_line_spec` (same as `manufacturer_part_spec` and number presets). Estimate forms convert display ↔ canonical via `to_canonical_factor` on the hydrated spec row; matcher operates canonical-only. |
| **T8c** | Estimate preset hydration | Each condition/line **spec template row** on estimate GET includes read-only **`presets[]`** (catalog metadata, same shape as `item_detail.spec_definitions[].presets[]`) alongside existing `options[]`. Only **`spec_threshold_preset_id`** is persisted on bucket rows; matcher expands FK at match time. |
| **T8d** | Line-spec DAL parity | **`estimate_line_spec`** gets the same load/write columns and T6 validation as **`estimate_condition_spec`** in 37ag (`value_number_max`, `spec_threshold_preset_id`) — even if line-level spec UI is deferred. |
| **T9** | Delete guards | Block delete of preset / option when referenced by bucket rows or `spec_threshold_preset_option`. |
| **T10** | Job win / legacy | Job snapshot tables stay out of this epic (still legacy `system_spec_*`). |

**Authoring UX (A1 detail):**

| `value_type` | Details popover |
|--------------|-----------------|
| `enum` | Options list (existing) + **Presets** section (label + multi-select of this def's options) |
| `number` | Unit + decimals (existing) + **Presets** section (label + min / max inputs in def unit) |
| `boolean` | unchanged — no presets |

**Estimator UX (A2 detail):** when `presets.length ≥ 1`, render preset chips/toggle + Custom path; when none, keep today's Select / single InputNumber (plus min/max once T3 ships).

**Worked example — candela (enum):** options `15…185`; presets `"High" → {135,150,177,185}`, `"Low" → {15…115}`. Admin authors on Fire Alarm Specs tab; estimator picks High on C panel.

**Rationale:** Presets are catalog policy for a dimension — they belong next to the def's options/unit, not on every leaf or every estimate. Interval overlap + curated enum sets cover the two real shapes without operators or a second Surface. Part authoring stays exact (what the SKU supports); buckets express intent (what the job needs).

**Out of this decision:** cross-spec dependencies (still deferred); commercial axis / costing; wildcard enum option (T11); candela as `number` (use enum + presets).

**Superseded (2026-07-13) for Candela only:** Candela no longer uses cd switch positions or High/Low option-set presets — see [Candela Low/High](#decision-candela-lowhigh-enum-2026-07-13). Threshold-preset system removed by [41ao](../tasks/41ao-drop-threshold-presets.md).

---

### Decision: Candela Low/High enum (2026-07-13)

**Status:** **Locked** (2026-07-13). **Task:** [41an](../tasks/41an-candela-low-high.md). **Supersedes:** Candela worked example in [threshold presets](#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12) (cd switch positions + High/Low option-set presets).

**Problem:** Candela was modeled as an enum of field-selectable cd settings (15…185) with High/Low threshold presets. Datasheets classify devices by capability class (low vs high), not by listing every switch position; presets were often wrong.

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **C1** | Def | `Candela` stays `enum` on Fire Alarm scope root |
| **C2** | Options | **Low** \| **High** only — no cd switch positions, no `Any` |
| **C3** | Authoring guidance | **High** ⇔ datasheet coverage includes ≥135 cd; **Low** ⇔ only below that boundary |
| **C4** | Parts | Multi-select — both options = device spans the low/high boundary |
| **C5** | Estimate bucket | Single `Select` + `allowClear` (same as other enum specs); clear = no filter |
| **C6** | Match | Existing enum set membership — bucket option ∈ part option set |
| **C7** | Migration | Clear all Candela bucket rows; replace options; seed strobe-bearing parts **Low** only |

**Rationale:** Low/High is the estimator mental model; parts that span both boundaries carry both rows. No threshold-preset indirection.

---

### Proposal: `slc_protocol` naming — rename + explicit `none`/`conventional` option (2026-07-11)

**Status:** **Proposal** (2026-07-11) — naming correction, no schema change; safe to apply whenever the def is next touched, no migration urgency.

**Problem:** `slc_protocol` borrows a category name ("SLC protocol") for a value — conventional signaling — that isn't an SLC protocol at all. Separately, using `NULL` to mean "explicitly conventional, no addressable protocol" was considered and rejected: `NULL` already carries a **global** meaning across every def in the system — "this dimension doesn't apply, ignore it for filtering" (blank-bucket-ignore, retained through every value-type revision). Overloading `NULL` for one specific def would make it mean two contradictory things depending on which def you're looking at, and any generic bucket-merge or matcher code that treats blank-as-ignore would silently mishandle it.

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **P1** | Rename | `slc_protocol` → protocol-agnostic display name (e.g. "Device protocol" or "Signaling type") |
| **P2** | Add option | Explicit `conventional` (or `none`) `spec_option` row — not `NULL` |
| **P3** | Cross-def dependency | Not modeled — see deferred proposal below. A hypothetical `protocol_dialect` (meaningful only when addressable) stays collapsed into this one enum rather than split into a dependent second def. |

---

### Deferred: cross-spec dependency and derived specs (2026-07-11)

**Status:** **Deferred** — not v1, not scheduled for v2. Captured so it isn't relitigated from scratch if it resurfaces.

**Finding:** the flat participation model ([37o](#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07)) has no mechanism for "def B's valid values depend on def A's value," or a derived/computed def whose value is calculated from another def. Two shapes were considered and both rejected in favor of a cheaper default:

| Rejected mechanism | Why deferred |
|---|---|
| **Ad hoc write-guard** (DAL rejects one def's value when another def is set a certain way) | Reintroduces exactly the cross-def coupling 37o's flat model was built to avoid — S9's "bounded blast radius" guarantee quietly breaks the moment two defs' write paths know about each other |
| **General dependency framework** (`spec_def.depends_on_spec_def_id` / `depends_on_option_id`, honored by the scope panel, contextual union, and line narrowing) | Touches three separate consumers for a problem usually avoidable by collapsing mutually-exclusive states into one enum def (see the `slc_protocol` proposal above) |

**Default going forward:** when a dependency shows up, prefer collapsing the two defs into one enum with mutually-exclusive options. Only reconsider building real dependency machinery if 3+ independent real cases can't be collapsed this way.

---

### Decision: item commercial margin inherit checkbox (2026-07-09)

**Status:** **Locked** (2026-07-09). **Task:** [37z](../tasks/37z-item-commercial-inherit-ui.md). **Aligns with:** estimate condition inherit UX [Y4](./estimate.md#decision-condition-only-commercial-tree-2026-07-09); unified `resolveRate` [D4](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05).

**Problem:** Freight, incidental, and markup FKs on item nodes already resolve `self → ancestry → neutral` in costing, but `/items` UI only showed those pickers on scope/category nodes and gave no explicit inherit/override affordance on children — unlike estimate **C** configuration.

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **Z1** | Fields on all nodes | Show freight / incidental / markup on **every** `node_type` (`scope`, `category`, quotable `item`) |
| **Z2** | Child inherit checkbox | When `parent_id IS NOT NULL`: checkbox between label and control — **unchecked** = ancestry value read-only; **checked** = own FK editable |
| **Z3** | Root | `parent_id IS NULL`: no checkbox; control always own |
| **Z4** | Storage | **No schema change** — `null` FK = inherit; non-null = override (`resolveRate` unchanged) |
| **Z5** | Explicit zero | Admin creates a catalog **None** rate type (0% + $0) when a child must block an ancestor's margin policy |

**Rationale:** Same UX vocabulary as estimate conditions; leaves may override category margin when a subtype needs different freight/markup. Costing path stays pure — UI only makes inherit intent visible.

---

### Decision: part item links leaf-only + Specs value UX (2026-07-08)

**Status:** **Locked** (2026-07-08). **Task:** [37u](../tasks/37u-part-leaf-links-specs-ui.md). **Amends:** [catalog part authoring J3/J4](#decision-catalog-part-authoring-ui-2026-07-06); closes **N9** from [numeric specs — drop `range`](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08). **Aligns with:** leaf-only estimate/job item pickers ([37l](../tasks/37l-leaf-quotable-item-model.md)); flat leaf participation ([37o](../tasks/37o-spec-participation-flatten.md)).

**Problem:** Allowing `part_item` on scope/category nodes looked convenient, but participation and estimate lines are leaf-only; today’s resolver matches exact `item_id` (no subtree pool), so parent links neither expand the candidate pool nor feed the part specs union. Separately, part Specs value UX needed a clear Spec · Value table (boolean control, number exact/band polish, enum multi).

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **U1** | Linkable nodes | **`item.node_type = 'item'` only** |
| **U2** | `item_links` UI | **One multi `TreeSelect`** (full tree; leaves selectable only) → replace-array `part_item` |
| **U3** | DAL | Reject non-leaf `item_id`; cleanup any existing non-leaf `part_item` rows |
| **U4** | Specs table | **Spec · Value** — rows from contextual union of linked leaves’ participation |
| **U5** | Boolean | **Checkbox** (`true` / `false`); omit row when unset |
| **U6** | Number | **Min + optional max (band)** — one row per def; not a discrete number array. Dual-voltage / closed alternatives → **enum** multi-select |
| **U7** | Enum | Multi-select — unchanged |
| **U8** | Resolver docs | Exact leaf `part_item` only — no parent→subtree claim |

**Rationale:** Same selectable set as estimates/jobs keeps authoring and resolution coherent. Number **band** matches continuous dims against the estimate **point** bucket. Discrete OR sets (12 V **or** 24 V) are closed catalogs — model as **enum** options, not multi-point numbers or a fake band.

---

### Decision: spec definitions scoped to root, flat item participation — no ownership/inheritance (2026-07-07)

**Status:** **S3, S6, S8, S9, S10 superseded (2026-07-12)** by [spec participation removed](#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12) — `item_spec_participation` is dropped outright, not re-shaped. **S1, S2, S4, S5, S7 remain locked** — flat `spec_def` namespace per scope root, edited on the scope's Specs tab; categories carry no spec Fields; `item_spec_exclude` stays dropped; estimate scope panel stays the whole root namespace. Read this block for the retained S1/S2/S4/S5/S7 clauses; read [37ai](../tasks/37ai-spec-participation-removal.md) for what replaced S3/S6/S8/S9/S10.

**Status (original, 2026-07-07):** **Locked.** **Task:** [37o](../tasks/37o-spec-participation-flatten.md). **Supersedes:** [spec ownership — `spec_def.category_id`/`item_id` (2026-07-04)](#decision-spec-ownership--spec_defcategory_id-drop-category_spec_def-2026-07-04) storage + algorithm; [category spec participation — assign-once, branch exclude (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03) storage + algorithm + UI; [category spec visibility — owner-branch knowledge (2026-07-03)](#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03) in full. **Amends:** [D3 in unified item tree (2026-07-05)](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) — the "spec defs inherit down" clause is retired; specs no longer inherit at all. **Retains unchanged:** `spec_def` / `spec_option` row shape, `manufacturer_part_spec`, `estimate_scope_spec` / `_zone_spec` / `_line_spec`, the tiered bucket merge (line → zone → scope), and the part-matching algorithm from [value types (2026-07-02)](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02).

**Problem:** the ownership + branch-exclude model (a spec owned by one tree node, inherited down, cut by an exclude row with no re-include) required an ancestor walk to compute "effective" specs anywhere, tied editing rights to wherever a def happened to be owned, and made every category-level participation edit a potential fan-out across every descendant leaf and every part linked to any of them. That is exactly the "nightmare to maintain" failure mode this area is trying to avoid. A discussion pass converged on a simpler shape that decouples *who can edit a dimension* from *who uses it*.

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **S1** | Definition scope | **`spec_def.scope_root_item_id`** — FK → `item` where `node_type = 'scope'`. Flat namespace per scope; **no owning node inside the tree**, no inheritance semantics on the definition itself. |
| **S2** | Where definitions are edited | **`item_detail` Specs tab** — `spec_definitions` Field on scope roots (`node_type = 'scope'`) only; sortable `FieldArrayTable` + enum options via tags `Select`. **Amended 2026-07-08:** interim `/specs` master-detail Surface (`spec_list` / `spec_detail`) **retired** — definitions return to the scope node's detail form. |
| **S3** | Participation | **New `item_spec_participation (item_id, spec_def_id)`** — leaf items (`node_type = 'item'`) only. Direct opt-in against the scope's namespace. **No ancestry, no inheritance, no exclude table.** |
| **S4** | Category role | **None.** Categories carry no spec Fields at all — pure organizational grouping, not a participation boundary. A category is not guaranteed to be spec-homogeneous (e.g. "Initiating Devices" may mix addressable and conventional devices), so forcing inheritance through it just relocates the override problem, not remove it. |
| **S5** | Drop `item_spec_exclude` | Nothing inherits, so nothing needs excluding. Table dropped. |
| **S6** | Part contextual union | `⋃ participation(item)` across a part's `part_item` links — a **direct join**, not a recursive ancestor walk. Simpler than the prior J6 "contextual union via `effective()`." |
| **S7** | Estimate scope panel | **Entire `spec_def` namespace for the checked scope root** — `SELECT * FROM spec_def WHERE scope_root_item_id = R`. No subtree union, no per-node walk — this is *broader* than the old `scopePanelDefs(R)` and cheaper to compute. |
| **S8** | Line-level narrowing | **Unchanged mechanism** — merge bucket (line → zone → scope) ∩ `participation(item)` for the line's item; filter `part_item` pool against `manufacturer_part_spec`. |
| **S9** | Orphan tolerance | The matcher only ever reads `spec_def_id`s in the item's *current* participation — a stale `manufacturer_part_spec` row left over from a dropped participation is inert, never wrong. **Eager prune stays scoped to the part's own `item_links` save** (unchanged from [37k K1](#decision-part-spec-lifecycle-2026-07-06)); editing one item's participation can only ever affect that one item's own linked parts — no fan-out, unlike the prior category-exclude model. |
| **S10** | Authoring convenience | Repetitive per-item picking (e.g. 15 leaves under one category all needing the same spec) is a **UI affordance** (copy picks from another item / bulk-apply on multi-select) — **not a schema feature**. Inheritance does not exist in storage. |

**Rationale:** decoupling "who can edit a dimension" (always the scope root, one place) from "who uses a dimension" (always the leaf item, a direct row, bounded blast radius) removes both failure modes the old model had — ownership-position ambiguity and cross-subtree edit fan-out — at the cost of some repeated clicking during catalog authoring, which is cheaper to solve with a UI convenience than a schema-level inheritance graph. The estimate scope panel query gets **simpler and more complete** as a side effect: it becomes the scope's whole namespace, not a computed subtree union.

#### Worked example — Fire Alarm

```text
Fire Alarm (scope root)              ← spec_def.scope_root_item_id = Fire Alarm
  slc_protocol   (enum)
  color          (enum)
├── Initiating Devices (category — no spec Fields)
│   ├── Pull Station        (item) → participation: { slc_protocol }
│   └── Smoke Detector      (item) → participation: { slc_protocol, color }
└── Notification Appliances (category — no spec Fields)
    └── Horn/Strobe         (item) → participation: { color }
```

- **Estimate scope panel** (Fire Alarm checked): `{ slc_protocol, color }` — the whole namespace, regardless of which items are on any line yet.
- **Line — Smoke Detector:** narrows on `{ slc_protocol, color }` (its own participation) against merged bucket values.
- **Line — Horn/Strobe:** narrows on `{ color }` only — `slc_protocol` never applies to this item; no exclude row needed to say so.
- **Part** linked to both Pull Station and Smoke Detector: compatibility form shows `{ slc_protocol } ∪ { slc_protocol, color } = { slc_protocol, color }`.

#### Migration shape (planned — `046`, not yet applied)

| Step | Action |
|------|--------|
| 1 | `ALTER TABLE spec_def ADD COLUMN scope_root_item_id text` — backfill by walking each row's old `item_id` to its root ancestor |
| 2 | `ALTER TABLE spec_def DROP COLUMN item_id` (after backfill verified) |
| 3 | `CREATE TABLE item_spec_participation (item_id text, spec_def_id uuid, PRIMARY KEY (item_id, spec_def_id))` |
| 4 | Backfill `item_spec_participation` — for every leaf item `N` (`node_type = 'item'`) and every `spec_def_id` where the **old** `effective(N, D)` algorithm returned true, insert one row |
| 5 | `DROP TABLE item_spec_exclude` |

**Data-preservation note:** step 4 runs the *old* `computeEffectiveSpecDefIds` once, at migration time, purely to seed the new flat table with whatever was previously effective — after that, the two models never mix.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Task:** [37o](../tasks/37o-spec-participation-flatten.md) · **Spec:** [`item.md`](../surface-specs/item.md) (`spec_participation`), [`spec.md`](../surface-specs/spec.md) (new `spec_list` / `spec_detail`), [`part.md`](../surface-specs/part.md) (`part_specs` contextual union, S6).

---

### Decision: part spec lifecycle (2026-07-06)

**Status:** **Locked** (2026-07-06). **Task:** [37k](../tasks/37k-part-spec-lifecycle.md). **Amends:** [`part.md`](../surface-specs/part.md) § K; [`item.md`](../surface-specs/item.md) `spec_definitions` writes.

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **K1** | Prune trigger | On **`item_links` replace** — delete `manufacturer_part_spec` rows whose `spec_def_id` ∉ contextual union for current links |
| **K1b** | Participation-only shrink | **Defer v1** — prune on link replace only |
| **K2** | `spec_option` delete policy | **Protect referenced options** — diff-based upsert; block removal when `manufacturer_part_spec` references the option (`spec_option_in_use`) |
| **K3** | FK documentation | Shipped DDL (`028`) uses **`ON DELETE CASCADE`** on `manufacturer_part_spec.spec_option_id`; DBML aligned; runtime policy is DAL guard, not silent CASCADE reliance |
| **K4** | Prune without part save | Server **always prunes** on `item_links` replace — clients cannot leave orphans via links-only PATCH |
| **K5** | Part UI | **Inform, don't block** — helper/banner when links dirty or saved rows outside union |
| **K6** | Item UI | Surface `spec_option_in_use` with actionable message |
| **K7** | Empty enum on part save | **Unchanged** — `expandPartSpecsForPatch` omits blank rows (37j J7) |

**Rationale:** 37j shipped replace-array authoring but left orphan `manufacturer_part_spec` rows when links shrank without a `part_specs` PATCH, and item enum saves could CASCADE-delete referenced options. Prune + option diff close hygiene gaps without resolver changes.

---

### Decision: manufacturer part discontinued flag (2026-07-13)

**Status:** **Locked** (2026-07-13). **Task:** [41ak](../tasks/41ak-part-discontinued-filter.md). **Amends:** [`part.md`](../surface-specs/part.md) `profile`; estimate part filter — [W2b](./estimate.md#w2b--discontinued-part-filter-locked-2026-07-13).

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **D1** | Column | `manufacturer_part.discontinued BOOLEAN NOT NULL DEFAULT false` |
| **D2** | Authoring | Writable on `part_detail` **`profile`** checkbox |
| **D3** | Estimate filter | Excluded from `filterPartsForItem` unless `estimate_condition.include_discontinued` |
| **D4** | Part list | No list column/badge/filter v1 |

**Rationale:** EOL MPNs stay linked for history but drop out of estimate pick/costing by default; condition toggle is a commercial knob separate from compatibility specs.

---

### Decision: catalog part authoring UI (2026-07-06)

**Status:** **Locked** (2026-07-06). **Task:** [37j](../tasks/37j-catalog-part-authoring.md). **Amends:** [`part.md`](../surface-specs/part.md) deferred `specs`; item assignment omitted on `item_detail` v1. **Amended (2026-07-08):** **J3/J4** → leaf-only + multi TreeSelect — [37u](../tasks/37u-part-leaf-links-specs-ui.md) / [leaf-only + Specs UX](#decision-part-item-links-leaf-only--specs-value-ux-2026-07-08).

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **J1** | Link table | **`part_item`** only — not `item_part_link` (assemblies v2 / D7) |
| **J2** | Authoring Surface | **`part_detail` only** — Field `item_links`; no writable part pool on `item_detail` v1 |
| **J3** | Linkable nodes | **`node_type = item` only** (amended 37u — was any tree node) |
| **J4** | `item_links` UX | Replace-array + **one multi leaf-only TreeSelect** (amended 37u) |
| **J5** | Part specs | **`part_specs`** on `part_detail` (same form) |
| **J6** | Visible spec defs | **Contextual union** — `⋃ participation` of linked **leaves** (37o direct join) |
| **J7** | Enum on part | **One row per `spec_option_id`** per [matching rules](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02) |
| **J8** | `number` / `range` type | **Amended 2026-07-08** — ship in [37p–37r](../tasks/37p-spec-value-types-ddl.md); drop `text`; band polish in [37u](../tasks/37u-part-leaf-links-specs-ui.md) |

**Rationale:** Estimators consume `part_item` + `manufacturer_part_spec` via the existing resolver (37f/37i). Admins maintain both from the part form — assign MPN → items, set compatibility rows — without editing pools on `/items`. Fire-alarm path is enum-heavy; number/range + units land in 37p–37r for HVAC/electrical dims.

---

### Decision: unified item tree — merge `category` + `item`, node-anchored estimate lines (2026-07-05)

**Status:** **Locked** (2026-07-05). Review decisions **D1–D10** locked 2026-07-05 (§ [Locked decisions](#locked-decisions-review-2026-07-05)). **Next:** implement [37i migration plan](../migrations/040a-unified-item-tree-plan.md) ([task](../tasks/37i-unified-item-tree-apply.md)), then **040b**.

**Amended (2026-07-06 — task 37l, leaf-quotable):** Estimate lines anchor to **quotable leaves only** (`item.node_type = 'item'`), not to branches.
- **D1 (amend):** `estimate_line.item_id` FK constrained to `node_type = 'item'`. A stored `item.node_type` (`scope` | `category` | `item`) replaces the "any depth" rule. Not a revival of `item.kind` (D2) — this is structural role, not material shape.
- **D4 (amend):** `resolveRate` drops the **descendant-max** step → `self → ancestry walk-up → neutral`. Because selection is leaf-only, cost (material/labor on the leaf) resolves via `self`, and margin policy (markup/freight/incidental authored high) resolves via ancestry. The mixed-UOM branch-material guard (Q2.2) is retired — no branch material fan-out remains.
- **D8c (reverse):** Item picker offers **quotable leaves only**; scopes + categories render expandable but **non-selectable**.
- **ROM:** rough quoting uses explicit quotable **allowance items** authored under a category (own `fallback_unit_cost` / labor group), not `descendantMax`. Keeps ROM deterministic, auditable, and node+PN reportable (D10).
- **Labor:** resolves as an **atomic group** — the leaf's `item_labor_phase` set, else the first ancestor's whole set. No per-phase merge/override across levels. **Estimate scope/zone** filters which phases count for `unit_labor` and job `scope_phase` seed — see [37n labor phase inclusion](../tasks/37n-labor-phase-inclusion.md). **Superseded (2026-07-12):** labor now merges **per-phase** across the full ancestry walk instead of swapping the whole group — see [per-row labor override](#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12) (37ad).

**On lock, supersedes / amends:**

- Planning [11-categories-scope-model.md](../planning/11-categories-scope-model.md) **C3** (items/parts M:N on a *separate* category tree), **C7** (item picker = leaf items only), **C8/C11** (line `item_id`).
- Task [37g](../tasks/37g-commercial-costing.md) **I1–I5** (single `item.category_id`, drop `item_category`) — **re-scoped**: instead of tightening the `item → category` FK, `item` and `category` become **one table**.
- [commercial costing (2026-07-04)](#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04) — commercial FKs + labor phases anchor on the **node**, not on a separate `item.category_id`.
- Planning **C23** + commercial costing **complexity** — **reversed:** `complexity_factor` is **no longer an item/category property**; it moves to an **estimate `scope` / `zone` choice** (see [Complexity](#complexity--estimatesite-choice-not-item-q3-correction)).
- Retires `item.kind` (`product | labor | assembly | expense`).

---

#### Locked decisions (review 2026-07-05)

| # | Topic | Status | Choice |
|---|--------|--------|--------|
| **D1** | Structural merge — one `item` tree | **Locked** · [amended 37l](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) | Merge `category` + `item` into one self-referential table renamed **`item`**; estimate lines anchor to **quotable leaves** (`item.node_type = 'item'`) via `estimate_line.item_id`; stored `node_type` (`scope` \| `category` \| `item`); drop `item_category`, `item.kind`, `line_kind`. Scope roots excluded from line picker. |
| **D2** | Drop `item.kind` — emergent composition | **Locked** | Remove `item.kind` and `estimate_line.line_kind`. Material + labor derived from what's attached (part pool + specs, `fallback_unit_cost`, `item_labor_phase`) — not a stored enum. Three shapes: discrete device, bulk/consumable, none (labor-only). |
| **D3** | Specs narrow parts (separate from rates) | **Locked** · **amended 2026-07-09** | Spec defs on catalog root. Spec **values** on estimate: **line → condition (leaf→root)** — no `estimate_scope` tier ([Y1–Y3](./estimate.md#decision-condition-only-commercial-tree-2026-07-09)). Was scope → condition → line (37x). Specs filter `part_item` pool only. `estimate_line_spec` UI deferred v1. |
| **D4** | Unified `resolveRate` | **Locked** · [amended 37l](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) | One algorithm for labor, markup, freight, incidental: **`self → ancestry walk-up → neutral`** (descendant-max dropped — leaf-only selection). Complexity + specs excluded. ROM uses explicit quotable allowance leaves with `fallback_unit_cost`. |
| **D5** | Complexity on estimate **condition** | **Locked** · **amended 2026-07-09** | **`complexity_factor_id` on `estimate_condition` only** (every node, incl. roots) — not on site geography; `estimate_scope` retired ([Y1](./estimate.md#decision-condition-only-commercial-tree-2026-07-09)). Null factor → walk ancestors → **100%**. Applies to `unit_labor` only. |
| **D6a** | Estimate `status` — lifecycle freeze | **Locked** | **`sent`** = customer issued → **full structural freeze** (lines, scopes, scope/zone specs, complexity); **no recalc** (snapshots are the record). **`draft`** = fluid recalc per line-lock rules (D6b). **`won`** = immutable (existing); extends freeze to job handoff. Amends [estimate lifecycle](./estimate.md). |
| **D6b** | Line locks (draft only) | **Locked** · **superseded 2026-07-11** | Was `estimate_line.lock`: **`none` \| `sell` \| `line`**. **Now:** [`sales_locked` + `material_locked`](./estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11) — independent; costing always updates in draft; sell sticky vs item/part sticky. Live server preview before Save ([37aa](../tasks/37aa-estimate-line-live-preview.md)). |
| **D6c** | Qty on `lock = line` | **Locked** | **Allow** `quantity` edits — operational, not policy. Unit snapshots stay frozen; ext sell = `qty × unit_price`. Changing item/scope/specs on locked line → block or force unlock (Q4). |
| **D6d** | PN pick + structural edits | **Locked** · **amended 2026-07-11** | Was: PN pick does not set `lock`; `lock = line` blocks item/condition change. **Now:** manual PN → **`material_locked`**; blocks item change; costing still runs. See [dual locks](./estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11). |
| **D6e** | `material_status` | **Locked — drop** | Remove column. UI derives part-resolution hint from `part_id` presence + filtered match count + `lock` — not persisted. |
| **D6f** | Line commercial FK | **Locked** · **amended 2026-07-09** | **`estimate_line.estimate_condition_id` NOT NULL** — every line under a condition; item picker root from condition tree’s `root_item_id`. **Drop `estimate_line.estimate_scope_id`** ([Y2](./estimate.md#decision-condition-only-commercial-tree-2026-07-09)). Block condition change when `lock = line` (D6d). |
| **D6g** | `site_zone_id` | **Locked — keep** · **amended 2026-07-09** | **Nullable** place FK (and/or future allocation rows). **No longer** merges commercial specs/complexity — those live on **condition** ([G1–G3](./estimate.md#decision-estimate-scope-condition-zone-and-line-qty-2026-07-09)). Block change when `lock = line` (D6d). |
| **D6h** | `unit` | **Locked — keep** | Snapshot on line (quote UOM). **Default from `manufacturer_part.unit`** when `part_id` set; else from item node or estimator (`ea`/`lf`/…). Canonical UOM remains on part catalog only. Editable when no part; allow edit when `lock = line` (like qty). |
| **D6i** | `unit_material` | **Locked — keep** | Per-unit material cost snapshot; recalc from part/vendor, filtered max, or `fallback_unit_cost`. Part of M/L/freight/incidental breakdown. Frozen when `lock = line` or `sent`. |
| **D7** | Assemblies | **Locked — defer v2** | **No assembly/kit work in v1** unified-tree pass. **Principle locked now:** tree parent → child = classification only; assemblies (*composed of*) **must not** be tree children (reject Option C). v2 delivers estimate kit lines (Option A) + catalog BOM expand (Option B) together — design D7a–c then. Existing `line_role` / `parent_line_id` columns may remain in DDL; v1 UI/DAL scope = **standalone lines only**. |
| **D8** | Migration split — 040a / 040b | **Locked** · **D8c** [reversed 37l](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) | **040a** = structural merge/rename only (prereq **039**); **040b** = commercial engine — **blocked until 040a green**. **D8a:** `item_category` → single `parent_id` in 040a; **deepest** linked category wins; **fail** if zero links. **D8b:** `lock` enum + drop `part_locked` / `sell_locked` / `material_status` in **040b**. **D8c:** **leaf-only** estimate item picker (**044** / 37l). |
| **D9** | Presets / favorites | **Locked — defer v2** | No saved quote presets or catalog favorites in v1. Ships with catalog assemblies + `item_component` BOM (D7). |
| **D10** | Reporting identity | **Locked** | v1 report/group dimensions = **(a)** item tree **node** (`estimate_line.item_id`) and **(b)** **`manufacturer_part` / PN** when pinned. No curated mid-level house-standard SKU dimension until D9 v2. |

#### Problem

Two blurred concepts and a dead layer:

1. **`category`** (self-referential tree) already owns everything load-bearing: scope roots (`parent_id IS NULL`), spec ownership (`spec_def.category_id`), the part pool (`part_category`), and (37g) commercial policy.
2. **`item`** contributes almost nothing on a product line — the material resolver keys off the item's **category** part pool + specs, not the item itself (see `estimate-part-resolver.ts` `filterPartsForItem`). Two items in one category with the same specs resolve to the **same** parts.
3. Estimators want to quote at **any depth** (ROM at a branch → specific part at a leaf), and many nodes (Test & Inspect, commissioning) have **no material at all** — so a fixed `product | labor | expense` **`kind`** enum is a poor fit across trades.

Multi-trade check (fire alarm, sprinkler, plumbing, HVAC/R, electrical) confirms: material takes **three shapes** — discrete device (part pool + specs), bulk/measured/consumable (flat cost per UOM, e.g. refrigerant/wire/pipe), or none (labor-only) — and labor is always **phase-based**, sometimes the whole line.

#### Choice

**Merge `category` and `item` into one self-referential tree.** Fold the useful `item` columns into `category`, then **rename the table to `item`**. An estimate line **anchors to a node at any depth** (`estimate_line.item_id`) plus an optional pinned `part_id`.

##### Naming (question 1)

**Recommended term: `item`.** Rationale:

- The estimate deliverable is a **line item**; every quotable node is an item.
- **Scope roots** (`parent_id IS NULL`) stay conceptual **scopes / trades** (Fire Alarm) and are **excluded from the line picker** (already true in `item-tree.ts` — the picker returns the root's *descendants*). So "item" never has to describe a root; it describes the quotable subtree, which reads naturally ("pick items from the Fire Alarm scope").
- `csi_code`, `sort_order`, `parent_id`, spec ownership, part pool, commercial FKs all live on the node regardless of altitude.

**Cost:** rename churn — `category` → `item`; `root_category_id` → `root_item_id` on `site_scope` / `estimate_scope`; `spec_def.category_id` → `spec_def.item_id`; `part_category` → `part_item` (or keep name, retarget FK); `category_spec_exclude` → `item_spec_exclude`. Large but mechanical, and this is Phase 0 (docs + dev DB only).

**Alternative (lower churn, rejected):** keep the table named `category` and treat leaves as "items" in UI only. Rejected — it perpetuates the two-word mental model this decision is trying to kill.

##### The cost families (questions 2 & 3)

There are **four** cost families, resolved by **four different mechanisms** — do not conflate:

| Family | Purpose | Inputs | Lookup / direction | Estimator control |
|------|---------|--------|--------|-------------------|
| **Specs → material** (Q2) | **Narrow to the correct `manufacturer_part`** | `spec_def` (owned by node) + spec **values** in the bucket (`estimate_scope_spec` → `zone` → `line`) | Defs inherit **down**; match bucket values against `manufacturer_part_spec`; filter the node's `part_item` pool | Estimator **sets spec values** (scope/zone/line) |
| **Node cost (material + labor)** | Material $ **and** labor (rate type **+** hours together) | `part_item` price / `fallback_unit_cost`; `item_labor_phase` rows (`labor_rate_type_id` + `hours_per_unit`) | **Unified resolve** (below) — authored on leaves, so it resolves **down** | none |
| **Margin policy** (Q3) | Freight, incidental, **markup** | `cost_add_on_type`, `markup_type` (org tables) bound to node via FK | **Unified resolve** (below) — authored high, so it resolves **up** | **None** — estimator can't repoint; only overrides `unit_price` |
| **Complexity** (Q3 correction) | Labor difficulty multiplier | `complexity_factor` (org table) | **Estimate `scope` / `zone` choice** — *not* an item property (see [below](#complexity--estimatesite-choice-not-item-q3-correction)) | Estimator/PM **picks per scope or zone** |

**So yes to Q3:** margin policy and complexity are **separate lookups from specs**. Specs + node cost decide *which part and what it costs to buy + install*. Markup / freight are node policy. **Complexity is neither** — it's a property of the **job**, chosen on the estimate scope/zone. None share a table with specs.

##### Unified rate resolution — one algorithm for every cost rate (Q2 / Q2.1)

**Do not hard-code where a rate lives.** All cost rates — **labor, markup, freight, incidental** — resolve through the **same** order from the picked node `N`:

```text
resolveRate(N, R):
  1. self     — N defines R?                     → use it
  2. descend  — N is a branch? max(descendants)  → worst-case (ROM)
  3. ascend   — walk N → root, first non-null    → inherited policy
  4. neutral  — nothing anywhere                 → 0 / skip
```

Answering Q2 (a)–(d):

- **(a) self** wins first.
- **(b) descendants next, not ancestry** — a branch pick is a ROM ("what could this become?"), so we look at what it *contains*. A **leaf has no descendants**, so it falls straight through to ancestry — the leaf case degrades to self → walk-up automatically.
- **(c) descendants = most expensive (`max`).** Well-defined for **every** rate because they are **monotonic** — a higher labor $, material $, markup %, or freight % always raises the price. "Most expensive" = max raw value.
- **(d) then ancestry walk-up**, then neutral (0 / skip).

**Key property — order rarely matters.** Descendant-first and ancestor-first return the **same value** *unless* a rate is authored in **both** a descendant *and* an ancestor of the picked node. That collision only happens if the same rate is defined twice on one path.

**Why this still yields "cost down, margin up" without assuming direction:** it follows from **where each rate is authored**, not from a hard-coded rule —

- **Material / labor** are authored on **leaves** → step 2 (descend) catches them; ancestry has none.
- **Markup / freight / incidental** are authored on **branch / root** → descendants have none, so step 3 (ascend) catches them.

**Authoring guidance (removes all ambiguity):** author **cost quantities low** (material + labor on leaves) and **margin policy high** (markup/freight on branch or root). Then the two-level collision never arises and resolution is deterministic regardless of traversal order. This is guidance, not a schema constraint — the algorithm is safe either way.

**Excluded from this algorithm:** **complexity** (estimate scope/zone choice, below) and **specs** (definitions inherit down with branch-exclude; values tier on the estimate — a different mechanism entirely).

**Q2.1 answer — "child overrides ancestors":** the phrase applies to **spec *values*** on the estimate (line > zone > scope) and to **complexity** (zone > scope). For **tree rates** there is no "override" — there is one resolution order (self → descend-max → ascend). A deeper node doesn't *override* an ancestor; it simply supplies a value the ancestor may not have. Spec **definitions** likewise inherit additively down with branch-exclude — a child excludes or adds, never replaces.

##### Material — three shapes (emergent, no `kind`)

The node's cost composition is **derived from what's attached**, not from a stored enum:

| Node has… | Material $ | Example |
|-----------|-----------|---------|
| Part pool + specs | resolved part / vendor price (0/1/many per [O1](../tasks/37f-estimate-line-costing.md#decision-o1--ambiguous-part-material-cost-2026-07-04)) | Smoke Detector → MPN |
| Flat node unit cost (bulk/consumable) | node `fallback_unit_cost` per line UOM | Refrigerant (LB), wire (LF) |
| Neither | **0** | Fire Alarm Test & Inspect |

Labor comes from `item_labor_phase` rows on the node (rate type + hours together; leaf-defined, rolls down). `unit_material = 0` is a valid, common outcome. **`item.kind` is dropped.** (A lightweight presentation grouping may be re-derived for the PDF if needed — deferred.)

##### Is the unified rule affordable for the DAL/DB? (Q2.2)

**Yes, with one guard.** Catalog node counts are modest and the tree is shallow, so every step is cheap **except** descendant-max for material, which needs a proxy:

| Step | Cost | Notes |
|------|------|-------|
| Ancestry walk-up | trivial | already implemented (`resolveRootCategoryId` walks `parent_id`); a handful of hops |
| Descendant subtree | cheap | already implemented (`collectSubtreeIds` in `item-tree.ts`) |
| Descendant-max for **labor / % rates** | one aggregate query | `Σ hours × rate` (or the %) per descendant, take `max` — single grouped query per rate |
| Descendant-max for **material** | **guard required** | full spec-filtered part resolution per leaf would fan out (N part-filter passes). **Branch ROM material uses each descendant leaf's `fallback_unit_cost`** (one column, `max` in one query). Full per-part spec resolution runs **only when the estimator drills to a leaf.** |

**Determinism + caching:** resolution is a pure function of catalog state, which changes rarely — resolved rates per node can be **memoized** and invalidated on catalog write. Net: standard shallow-tree walks over a small table plus one aggregate per rate; the only trap (material fan-out) is sidestepped by the `fallback_unit_cost` proxy for ROM.

**Branch ROM outputs:** `material_status = generic`, no `part_id`; mixed-UOM descendants excluded from the material max (comparing $/ft to $/ea is meaningless). Refining the line to a leaf (or pinning a PN) replaces the ROM snapshot on recalc.

##### Complexity — estimate/site choice, not item (Q3 correction)

**Reverses** planning **C23** and the "complexity on category, walk-up, not overridable on estimate" clause of the [commercial costing decision](#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04).

**Rationale:** complexity (occupied building, high ceilings, difficult retrofit, hazardous area) is a property of **where the work happens**, not of the catalog item. A smoke detector is not inherently "complex"; installing it on a 30-ft ceiling in a live facility is. So complexity belongs to the **job geography**, chosen per estimate **scope** and/or **zone**.

| Aspect | Choice |
|--------|--------|
| **Stored on** | `estimate_scope.complexity_factor_id` and/or `estimate_zone.complexity_factor_id` (FK → `complexity_factor`) |
| **Resolution** | **zone value overrides scope value**; if neither set → **100%** (no effect) |
| **Applies to** | `unit_labor` of every line in that scope/zone: `unit_labor = base_labor × (factor_percent / 100)` |
| **Item tree** | Carries **no** `complexity_factor_id` |
| **Estimator control** | **Yes** — this is a deliberate estimator/PM knob (unlike markup/rate types, which stay category policy) |

This makes complexity the **second** estimator-controlled input (alongside spec values and the `unit_price` sell override); rate **types** and **markup** remain non-overridable category/root policy.

##### Estimate `status` and recalc policy (D6a — locked 2026-07-05)

**Amends** 37f O4 and [estimate scope required](./estimate.md#decision-estimate-scope-required--pricing-overrides-2026-07-04).

| `estimate.status` | Edit policy | Recalc on save |
|-------------------|-------------|----------------|
| **`draft`** | Full edit — lines, scopes, scope/zone specs, complexity, profile | **Yes** — per [line locking (D6b)](#estimate-line-locking-d6b--draft-only) |
| **`sent`** | **Frozen** — no PATCH to `line_items`, `scopes`, scope/zone specs, or complexity; profile/stakeholders per manifest (v1: **freeze all** quote inputs) | **No** — snapshots are the issued quote |
| **`won`** | Immutable — lines + scopes blocked (shipped); same snapshot discipline as `sent` | **No** |
| **`lost` / `expired`** | Read-only (v1: same freeze as `sent`) | **No** |

**Q1 answers (locked):** **`sent` = structural freeze** (customer has quote). **Full freeze** on quote-driving fields — not profile-only exceptions in v1. **No recalc** once `sent` — values at send time are the record.

Estimate-level freeze **supersedes** per-line lock — `lock` matters only while `status = draft`.

##### Estimate line locking (D6b — locked 2026-07-05 · **superseded 2026-07-11**)

> **Superseded (2026-07-11):** [dual line locks + live preview](./estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11) — `sales_locked` + `material_locked` booleans; no `lock = line` “skip all costing”; task [37aa](../tasks/37aa-estimate-line-live-preview.md). Text below is historical.

**Replaces** `part_locked`, `sell_locked`, and 37f O4 implicit sell stickiness.

**One column (retired):** `estimate_line.lock` — `none` | `sell` | `line` (CHECK constraint). Hierarchy: **`none` < `sell` < `line`** (`line` is the superset).

| `lock` | Recalc while `draft` | What stays frozen |
|--------|----------------------|-------------------|
| **`none`** | Full fluidity | nothing — costs, target, **and sell** all update from catalog/specs |
| **`sell`** | Partial | **`unit_price` only** — costs + `unit_price_target` still recalc |
| **`line`** | Skip line entirely | item, `part_id`, all cost snapshots, **and** `unit_price` |

```text
if estimate.status !== 'draft':
  skip recalc for all lines

else switch (line.lock):
  line:  skip recalc — preserve all snapshots + item + part_id + unit_price
  sell:  recalc costs + unit_price_target; keep unit_price
  none:  recalc everything; unit_price = unit_price_target
```

**Transitions (draft only):**

| Event | `lock` becomes |
|-------|----------------|
| User edits `unit_price` manually | **`sell`** (auto) |
| User clicks **Lock line** | **`line`** |
| User clicks **Sync sell to target** | **`none`** (if was `sell`; does not unlock `line`) |
| User clicks **Unlock line** | **`none`** |

**UI:** one control — e.g. lock icon cycling `none → sell → line` or a small dropdown; show `sell` state when sell was manually edited even before explicit lock.

**Qty on `lock = line` (D6c — locked):** **`quantity` remains editable** — ext sell recalculates as `qty × unit_price`; unit snapshots (`unit_material`, `unit_labor`, …, `unit_price`) do not. Description edits allowed.

**PN pick (D6d — Q4a):** Selecting a PN does **not** set `lock`. While `lock = none`, recalc may change or clear `part_id` when specs/item change. To freeze PN + costing, user sets **`lock = line`**.

**Structural edits (D6d — Q4b):** When **`lock = line`**, changing **`item_id`**, **`estimate_scope_id`**, or **`site_zone_id`** is **blocked** (UI disabled + DAL rejects). User must unlock (`lock = none`) first.

| Field | Role |
|-------|------|
| `lock` | `none` \| `sell` \| `line` — recalc policy while `draft` |
| ~~`part_locked`~~ | **drop** |
| ~~`sell_locked`~~ | **drop** — use `lock = sell` |

##### Estimate line storage

| Field | Role |
|-------|------|
| `item_id` | node anchor, **any depth**, NOT NULL |
| `part_id` | optional PN pin |
| `lock` | `none` \| `sell` \| `line` — recalc policy while `draft` (D6b); default `none` |
| `estimate_scope_id` | **NOT NULL** — checked scope bucket (D6f); block change when `lock = line` |
| `site_zone_id` | **Nullable** — zone bucket; zone specs + complexity when set (D6g); block change when `lock = line` |
| ~~`material_status`~~ | **dropped** (D6e) — derive in UI from `part_id` + match count + `lock` |
| `unit` | Quote UOM snapshot (D6h); default from `manufacturer_part.unit` when `part_id` set |
| `quantity` | per-line qty; editable when `lock = line` (D6c) |
| cost snapshots | `unit_material` (D6i) + `unit_labor` / `unit_freight` / `unit_incidental` / `unit_cost` / `unit_price_target` / `unit_price` — recalc unless `lock` / `sent` |
| ~~`line_kind`~~ | **removed** |

#### Assemblies (question 4) — **D7: defer v2**

**Locked principle (now):** in the merged tree, a **parent → child** edge means *"is a more specific kind of"* (classification; pick **one**; branch rollup = max). An **assembly** is *"is composed of"* (a **sum** of distinct components). These are **different relationships** — assemblies **must not** be modeled as tree children (**Option C — rejected**).

**Feature scope — deferred v2 (D7):** estimate kit lines, catalog BOM expand, and kit `lock`/recalc rules (D7a–c) are **out of v1**. The unified-tree migration (040a/040b) and line editor work target **standalone** `estimate_line` rows only. Existing `line_role` / `parent_line_id` may stay in DDL from prior spikes; do not extend or regression-test kit paths in v1.

**v2 options (design when we pick up D7):**

| Option | What | Schema |
|--------|------|--------|
| **A — estimate kit lines** | Estimator builds on quote: `kit_header` + `kit_component` (`parent_line_id`) | none (columns exist) |
| **B — catalog assembly (node-BOM)** | Reusable BOM (`item_component`) expands into kit lines on add | new `item_component` |
| **C — tree children as BOM** | Children = components | **Rejected** |

**v2 recommendation (tentative):** ship **A + B** together; reserve `item_component` shape so catalog expand is additive to manual kits.

#### Implementation impact (when locked)

**D8 — two migrations** (split to reduce blast radius):

- **040a — structural merge/rename** (D8a, D8c): fold legacy `item` columns into `category` → rename `category` → `item`; **`item_category` backfill** → each legacy item gets one `parent_id` (deepest linked category wins; fail if zero links); drop `item.kind`, `item_category`; retarget `site_scope.root_item_id`, `estimate_scope.root_item_id`, `spec_def.item_id`, `part_item`, `item_spec_exclude`; `estimate_line.item_id` = node FK at any depth (drop `line_kind`); **branch nodes selectable** in picker. **No costing changes.**
- **040b — commercial engine** (D8b; was monolithic 040): rate tables, `category_labor_phase` → `item_labor_phase`, `cost_add_on_type`, `markup_type`, `resolveRate` recalc, `complexity_factor_id` on **`estimate_scope` / `estimate_zone`** (not item), **`estimate_line.lock`** enum (drops `part_locked` / `sell_locked` / `material_status`). Lands **only after 040a is green.**

**040a stop gate:** app boots; catalog CRUD on unified tree; estimate lines save at branch or leaf; 37f material snapshot paths green (renamed FKs); `codegen:check` clean; no `item_category` / `category` table.

**040b stop gate:** 37g verify — recalc, lock rules, complexity picker, admin rate surfaces.

Other:

- **37g** rate engine re-anchored on the node tree; **one `resolveRate(N, R)`** (self → descendant-max → ancestry → neutral) for labor/markup/freight/incidental; complexity read from estimate scope/zone; picks up 040b.
- **Picker:** branch nodes selectable in **040a** (D8c); full `resolveRate` in **040b** (D4).
- **Estimate scope/zone:** add `complexity_factor_id` picker UI + FK (reverses the O3 "no complexity picker on estimate" clause).
- **`estimate_line_spec`** write/UI still needed for line-level spec override (deferred read-merge exists) — this is the tier that makes Q2.1 "line overrides zone/scope" real at the line.

#### Red-line answers (2026-07-05)

| # | Question | Answer |
|---|----------|--------|
| **1** | Unified term | **`item`.** Table renamed `category` → `item`; roots are scope anchors excluded from the picker. |
| **2** | Rate resolution | **One unified algorithm for all cost rates** (labor, markup, freight, incidental): `self → descendant-max → ancestry walk-up → neutral` (Q2 a–d). No hard-coded direction — cost quantities authored on leaves resolve **down**, margin authored high resolves **up**; order only matters on a two-level collision (discouraged). **Complexity** excluded — an **estimate scope/zone** choice (Q3), zone > scope, else 100%. Spec **defs** inherit down (additive + exclude); spec **values** tier on estimate (line > zone > scope). |
| **2.1** | Same pattern for all rates? | **Yes** — one `resolveRate(N, R)` parameterized per rate; "most expensive" = `max` raw value (monotonic). Complexity + specs excluded. |
| **2.2** | Too complex for DAL/DB? | **No, with one guard** — ancestry walk + subtree already exist; labor/% descendant-max = one aggregate query; **material descendant-max uses `fallback_unit_cost` proxy** (not per-leaf part resolution). Deterministic + cacheable. |
| **3** | Saved preset / favorite in v1 | **Defer to v2** (with catalog assemblies, Option B). |
| **4** | Reporting identity | **Node + PN is sufficient for v1** — see below. |
| **5** | Migration split | **Yes** — 040a structural rename/merge, then 040b commercial engine. |

**Q4 detail — what "node + PN reporting" means, and what it gives up.** Today an `item` row is a durable mid-level **SKU identity** you could group reports by ("we quoted 4,200 of *Item: House-Standard Ceiling Smoke* this year"). After the merge, the durable identities become **(a) the item tree node** (e.g. node *Smoke Detector* — "quantity quoted/sold under this node") and **(b) the `manufacturer_part` / PN** ("units of MPN 12345 sold"). What you lose is the **curated identity in between** — a named house-standard package that is neither a raw PN nor a broad tree node. That curated identity is exactly the **preset/favorite** from Q3. So Q3 and Q4 are the same coin: **deferring presets (Q3) means accepting node + PN as the only v1 report dimensions (Q4)**, and the curated-SKU dimension arrives with presets/assemblies in v2. Confirmed acceptable for v1.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Migration:** [040a plan](../migrations/040a-unified-item-tree-plan.md) · **Task:** [37g](../tasks/37g-commercial-costing.md) (040b).

---

### Decision: commercial costing — org tables, category defaults, estimate overrides (2026-07-04)

**Status:** **Locked.** **Amended (2026-07-05)** by [unified item tree](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05): commercial FKs + `item_labor_phase` anchor on **unified `item` node**; **`resolveRate(N, R)`** (D4) replaces category inherit-walk for labor/markup/freight/incidental; **`complexity_factor_id` on `estimate_scope` / `estimate_zone` only** (D5 — not on item tree; reverses planning C23 and Layer 2 `complexity_factor_id` on category); migration lands in **040b** after **040a** (D8). Line **`lock`** enum + recalc policy (D6b) supersedes 37f O4 sell stickiness. **Supersedes** [C14 in planning 11](../planning/11-categories-scope-model.md) (commercial types primary on scope bucket) and **`labor_context_type`** as a costing input. **Amends** [estimate scope (2026-06-30)](./estimate.md#decision-estimate-scope--category-roots-checkbox-site-tree-item-first-lines-2026-06-30) (no ROM General bucket). **Tasks:** [37f](../tasks/37f-estimate-line-costing.md) (part filter + material snapshot) · [37g](../tasks/37g-commercial-costing.md) (org surfaces + full engine; re-scoped to 040b).

**Choice:**

#### Layer 1 — Org rate tables (list surfaces; no detail pane)

| Table | v1 shape | Notes |
|-------|----------|--------|
| **`labor_rate_type`** | `name`, `rate_cents`, optional `labor_class_id` | Trades: low-voltage installer, FA programmer, pipe fitter, … |
| **`incidental_rate_type`** | `name`, `kind` (`percent_of_material` v1), `percent` | Freight / incidental = **% of material only** v1 |
| **`markup_type`** | `name`, `markup_percent` | % on cost (M+L+I); split material vs labor markup **deferred** |
| **`complexity_factor`** | `name`, `factor_percent` | 100 = normal; 125 = difficult retrofit, … |

**No `sales_commission` table v1** — commission is back-office / analytics, not a line costing input.

**`labor_context_type`** — retained in DDL from `033` but **not** used in costing v1 (may repurpose or drop in migration follow-on).

#### Layer 2 — Category (primary assignment; inherit walk up tree)

**Not** the spec participation exclude model. Walk **node → parent → root**; first non-null FK wins.

| On category | Purpose |
|-------------|---------|
| **`phase_template_id`** | Ordered steps: `phase` + `labor_rate_type_id` + **hours per unit** |
| **`markup_type_id`** | Default margin profile for items in subtree |
| **`incidental_rate_type_id`** | Default freight/incidental profile |
| **`complexity_factor_id`** | Default labor difficulty multiplier for subtree |

**Item commercial override — deferred v1** (revisit when assemblies break category defaults).

#### Layer 3 — Estimate (line sell override only)

**Amended (2026-07-04):** Estimator **cannot** override which org **rate types** apply (`markup_type`, `labor_rate_type`, `incidental_rate_type`, `complexity_factor`) on scope, zone, or line. Those resolve from **category inherit walk** only. Estimator may override the **actual sell rate** — **`unit_price`** on the line (vs system-computed **`unit_price_target`**).

| On estimate | Purpose |
|-------------|---------|
| **`estimate_line.unit_price`** | **Actual sell** — estimator sharpens pencil here |
| **`estimate_line.unit_price_target`** | **Policy sell** snapshot from resolver (audit / manager review) |

**Not on estimate v1:** `estimate_scope.markup_type_id` override UI; `estimate_scope` / `estimate_zone` **`complexity_factor_id`** pickers. Columns from migration `033` on `estimate_scope` are **unused for costing** (may drop in follow-on migration).

**Line snapshots (`estimate_line`):**

```text
unit_material, unit_labor, unit_incidental  ← cost components at save/recalc
unit_cost                                   ← M + L + I
unit_price_target                           ← policy sell from catalog rate types (snapshot)
unit_price                                  ← actual sell (estimator override allowed)
```

#### Resolution (at line save / recalc)

```text
markup_type, incidental_type, complexity, labor_rate_type (per phase)
  ← category.walk_up(...) only — estimator cannot change type selection on quote

unit_price_target ← f(resolved cost components, markup_type from category)
unit_price        ← estimator edit; set to target on **new line** first calc; **never** overwritten on recalc v1 ([sell lock deferred](../tasks/37f-estimate-line-costing.md#decision-o4--sell-lock-deferred-2026-07-04))
```

**Rationale:** Org tables define rate **cards**; category assigns **which card** applies; quote captures **policy vs actual sell** for margin review — not a second rate-card picker on the estimate.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md).

---

### Decision: spec ownership — `spec_def.category_id`, drop `category_spec_def` (2026-07-04)

**Status:** **Locked.** **Supersedes** the **storage** of [assign-once, branch exclude (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03) — the separate `category_spec_def` assignment table. **Retains:** the `effective(N, D)` algorithm, [owner-branch visibility (2026-07-03)](#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03), `category_spec_exclude`, `scopePanelDefs` subtree union, estimate/part consumers (all FK `spec_def.id`, unchanged).

**Problem:** `category_spec_def` had `UNIQUE (spec_def_id)` — a 1:1 join table, which is really a **column**. The split between `spec_def.root_category_id` (namespace) and `category_spec_def` (owner) let a def exist with **no owner row** (visible only at root, invisible on descendants — the "SLC not inherited" bug).

**Choice:**

#### Ownership is a column on `spec_def`

| Concept | Before | After |
|---------|--------|-------|
| **Namespace root** | `spec_def.root_category_id` (flat equality) | Derived — root ancestor of `category_id` |
| **Owner (assignment)** | `category_spec_def` row, `UNIQUE (spec_def_id)` | **`spec_def.category_id`** — the one owning category |
| **Branch cut** | `category_spec_exclude` | `category_spec_exclude` (unchanged) |

**`spec_def.category_id`** is the single owning category. It may be a **root or nested** category — root is not special. Assign-once is now **structural** (one row = one owner; double-assign impossible). No separate assignment step to forget.

#### Storage

| Table | Semantics | Constraint |
|-------|-----------|------------|
| **`spec_def`** | `category_id` = owner; def flows to all descendants of owner | FK `category_id → category` (`delete: cascade`) |
| **`category_spec_exclude`** | Branch cut — def no longer applies at this node **or any descendant** | PK `(category_id, spec_def_id)`; **no re-include** below |

**`category_spec_def` dropped.** `spec_def.root_category_id` dropped (renamed conceptually into `category_id`).

#### Rules (unchanged intent, restated on new storage)

| # | Rule | Enforcement |
|---|------|-------------|
| R1 | A spec is owned by **exactly one** category (root or nested) | Structural — `spec_def.category_id` single column |
| R2 | Owned spec is available on **all descendants** unless excluded; exclude cuts that node **and** its descendants | `effective(N,D)`: `category_id` ancestor-or-self of `N`, no exclude on path |
| R3 | Excluded spec **cannot** be re-included further down | Any exclude on path blocks; nothing re-includes |
| R4 | Editable **only** on the owning category; descendants show a checkbox to **exclude**; nodes below an exclude do **not** render the spec | Owner = `category_id === node`; checkbox writes/removes `category_spec_exclude`; below-exclude filtered out |

#### Effective participation algorithm (unchanged)

```text
owner(D) = spec_def.category_id for D

effective(N, D):
  A = owner(D)
  if A is not an ancestor of N and A ≠ N:            return false
  if ∃ exclude (X, D) where X on path A → N (incl.): return false
  return true
```

**Namespace query change:** "all defs for scope root R" moves from `WHERE root_category_id = R` (flat) to **owner in subtree of R** (defs whose `category_id` is R or a descendant of R). Category counts are modest (C9) — recursive walk is fine.

#### Worked example — Fire Alarm

```text
Fire Alarm          ← spec_def.category_id = Fire Alarm  (SLC protocol)
├── Initiating      ← spec_def.category_id = Initiating   (Spec B)
│   └── test 4
│       └── test 5
├── Test 1
└── Test 3
```

| Def | Owner (`spec_def.category_id`) | `category_spec_exclude` |
|-----|-------------------------------|-------------------------|
| SLC protocol | Fire Alarm (root) | — |
| Spec B | Initiating | — |

**Effective:** SLC on Fire Alarm + all descendants (Initiating, test 4, test 5, Test 1, Test 3). Spec B on Initiating, test 4, test 5. This is the behavior the prior storage failed to deliver for SLC.

**Migration:** [038 plan](../migrations/038-category-spec-owner-column-plan.md) — backfill `category_id` from `category_spec_def` where present, else `root_category_id` (auto-fixes unassigned defs like SLC).

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Spec:** [`category.md`](../surface-specs/category.md).

---

### Decision: numeric specs — drop `range` type; band is part-authored (2026-07-08)

**Status:** **Locked** (2026-07-08). **Task:** [37s](../tasks/37s-spec-defs-ui-drop-range.md). **Amends:** [spec value types, units table, and locks (2026-07-08)](#decision-spec-value-types-units-table-and-locks-2026-07-08) **T1, T2, T8, match table, and defs UI**. **Retains:** `spec_unit`, `decimal_places`, type/unit locks, estimate point bucket, blank-bucket ignore, enum multi-option part rows.

**Problem:** Shipping `number` and `range` as separate `spec_def.value_type`s put “exact vs band” on the **definition**. Smoke + product review showed that is the wrong altitude: a part may already conform to **multiple enum options**; likewise a part may claim a **single rating** or a **capability band** for the same numeric dimension. The def only needs to say “this is numeric,” plus unit and display precision. Estimate narrowing always runs against **part specs** ∩ bucket — so a def-level `range` type is unnecessary and confusing in the Specs table (unit/decimals columns + a fourth type).

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **N1** | Type set | **`enum` \| `boolean` \| `number`** — **drop `range`** from `value_type` |
| **N2** | Def numeric metadata | **`unit_id`** (required) + **`decimal_places`** (optional, display-only) — **no def min/max** (T6 stays deferred) |
| **N3** | Part numeric shape | Part may store **`value_number` only** (exact) **or** **`value_number` + `value_number_max`** (band) — parallel to enum multi-option rows for *labeled* discrete sets |
| **N4** | Estimate bucket | **Amended 2026-07-12** by [threshold presets + numeric bucket ranges](#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12) — bucket may store point **or** range (`value_number` / `value_number_max`); blank = no filter |
| **N5** | Match | **Amended 2026-07-12** — interval overlap on buckets; exact-target = `min = max`. Part side unchanged (exact or band). |
| **N6** | Specs table UI | Columns: **Name · Type · Details** (rename from “Options”). Drop Unit / Decimals columns. Type-aware **popover** on Details |
| **N7** | Details popover | **`enum`:** option list (as today). **`boolean`:** cell blank; no popover. **`number`:** unit picker + decimal places |
| **N8** | Migrate | `UPDATE spec_def SET value_type = 'number' WHERE value_type = 'range'`; tighten CHECK; no part/bucket column drops |
| **N9** | Part UI this round | **Closed by [37u](../tasks/37u-part-leaf-links-specs-ui.md)** — Spec · Value; number min + optional max popover (was deferred polish) |
| **N10** | Resolver this round | Treat all numeric defs as `number`; branch match on whether part row has `value_number_max` |

#### `spec_def.value_type` (amended)

| `value_type` | `spec_option` | `unit_id` | Part storage | Bucket | Match |
|--------------|---------------|-----------|--------------|--------|-------|
| **`enum`** | required | omit | one row per allowed option | one `spec_option_id` | option ∈ part set |
| **`boolean`** | omit | omit | `value_boolean` | `value_boolean` | equality |
| **`number`** | omit | **required** | `value_number` and optional `value_number_max` (canonical) | `value_number` (point) | exact **or** point ∈ band |

#### Specs tab Details cell

| Type | Cell summary | Popover |
|------|--------------|---------|
| `enum` | option names (or “No options”) | editable option list (rename keeps `id`; add; reorder; delete unused) |
| `boolean` | **blank** | none |
| `number` | e.g. `mA · 0 dp` (or “Set unit…”) | unit + `decimal_places` |

**Rationale:** Enum multi-select already models “part allows more than one value.” Numeric bands are the same idea at the part layer. Keeping one `number` type simplifies the def picker and Specs table; unit/decimals belong in the Details popover, not always-visible columns. Def domain min/max remains deferred validation sugar, not matching.

**Out of this decision:** estimate operators (`<`, `≤`, between); wildcard enum. Part Spec · Value UX (N9) closed by [37u](../tasks/37u-part-leaf-links-specs-ui.md).

**Planning / tasks:** [37s](../tasks/37s-spec-defs-ui-drop-range.md) · [37u](../tasks/37u-part-leaf-links-specs-ui.md) (part UI).

---

### Decision: spec value types, units table, and locks (2026-07-08)

**Status:** **Amended** (2026-07-08) by [numeric specs — drop `range` type](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08) (T1/T2/match). **Originally locked** 2026-07-08. **Tasks:** [37p](../tasks/37p-spec-value-types-ddl.md) → [37q](../tasks/37q-spec-units-defs-ui.md) → [37r](../tasks/37r-spec-number-range-consumers.md) → **[37s](../tasks/37s-spec-defs-ui-drop-range.md)**. **Amends:** [`spec_def` value types (2026-07-02)](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02) (supersedes type set, unit columns, range deferral). **Retains:** enum multi-row part semantics, blank-bucket ignore, part-match outcomes (0/1/many), FK-based defs.

**Problem:** v1 shipped `enum` \| `boolean` \| `text` only. HVAC/electrical catalogs need numeric point and band matching with units; free `text` is useless for filtering; tags UI cannot rename enum options; retyping a def with stored values corrupts part/estimate rows.

**Choice (Q1–Q12 locked 2026-07-08):**

| # | Topic | Choice |
|---|--------|--------|
| **T1** | Type set | **Amended [N1](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08):** **`enum` \| `boolean` \| `number`** — drop `text` and `range` |
| **T2** | `range` | **Amended [N1/N3](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08):** not a def type — part may author optional `value_number_max` on `number` |
| **T3** | Type/unit lock | Lock `value_type` + `unit_id` when **value-bearing** rows exist (`manufacturer_part_spec` or any `estimate_*_spec` / job spec row). **Participation alone does not lock.** |
| **T4** | Option delete | Block when parts **or** estimate/job bucket rows reference `spec_option_id` |
| **T5** | `decimal_places` | On `spec_def` — **display-only** (format UI; store full `numeric`; no round-on-write) |
| **T6** | Def domain min/max | **Defer** |
| **T7** | Units | Org table **`spec_unit`** + table Surface `spec_unit_table` (same pattern as rate tables); conversion factors on the unit row |
| **T8** | Def unit | Single **`spec_def.unit_id`** FK → `spec_unit` (required for `number`). May be **non-canonical** (e.g. mA). Author in that unit; **convert to canonical on write**; matcher compares canonical numbers only. No separate `display_unit` column. |
| **T9** | Task split | **37p** DDL → **37q** units Surface + defs UI → **37r** consumers → **37s** drop `range` + Specs Details popover |
| **T10** | Migrate `text` | Migration **fails** if any `value_type = 'text'` rows exist |
| **T11** | Wildcard option | **Defer** (`wildcard_option_id`) |
| **T12** | Consumers | Part + estimate scope/zone + resolver in **37r** (same epic) |
| **T13** | Enum options UI | Cell shows option names; **popover** editable list (rename keeps `id`; add; reorder; delete unused) |
| **T14** | Notes | `manufacturer_part.specs` text remains human notes only — never filters |

#### `spec_def.value_type` (amended — see [N1 table](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08) for current)

| `value_type` | `spec_option` | `unit_id` | Part storage | Bucket storage | Match |
|--------------|---------------|-----------|--------------|----------------|-------|
| **`enum`** | required | omit | one row per allowed option | one `spec_option_id` | option ∈ part set |
| **`boolean`** | omit | omit | `value_boolean` | `value_boolean` | equality |
| **`number`** | omit | **required** | `value_number` + optional `value_number_max` (canonical) | `value_number` | exact **or** point ∈ band |
| ~~`range`~~ | — | — | **Removed as def type** (37s) — band is part-authored on `number` | — | — |

#### `spec_unit` (org catalog)

| Column | Notes |
|--------|--------|
| `id` | PK (`uuid`, default `gen_random_uuid()`) |
| `symbol` | UI suffix — `A`, `mA`, `V`, `ton`, … |
| `name` | Ampere, Milliamp, … |
| `dimension` | `current` \| `voltage` \| `power` \| `pressure` \| `length` \| `refrigeration` \| `count` \| … — convert only within same dimension |
| `canonical_unit_id` | FK → self (`uuid`); **null** when this row **is** the canonical for its dimension |
| `to_canonical_factor` | Multiply into canonical (`mA` → `A` = `0.001`); canonical rows use `1` |
| `sort_order` | |

**Write normalization:** `stored = authored × to_canonical_factor` (relative to the def’s `unit_id` row). Read/display: divide back for the def’s unit; format with `decimal_places` when set.

**Delete unit:** block when any `spec_def.unit_id` references it.

#### Locks & option lifecycle

| Action | Rule |
|--------|------|
| Change `value_type` / `unit_id` | **Reject** if any part or estimate/job spec **value** row exists for the def |
| Rename def / reorder / change `decimal_places` | Allowed |
| Add enum option | Always |
| Rename enum option | Always (same `id`) |
| Delete enum option | Block if part **or** bucket references it (`spec_option_in_use`) |
| Delete def | Unchanged — block on participation or part rows (and value rows) |

#### Part-matching (amended — numeric band is part-shaped; enum/boolean unchanged)

| Bucket | Part | Match |
|--------|------|-------|
| Blank | any | Pass |
| Number point `N` | no row | Fail |
| Number point `N` | `value_number = N` (no max) | Pass |
| Number point `N` | `value_number ≤ N ≤ value_number_max` | Pass |
| Boolean | equality | Pass / Fail |

**Deferred:** wildcard enum; multi-value OR on bucket; def-level domain min/max; fuzzy tolerance; ETIM EU import. Part exact/band authoring UX ([N9](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08)) closed by [37u](../tasks/37u-part-leaf-links-specs-ui.md).

**Rationale (original):** Numeric + units across trades; per-scope namespaces isolate fire vs HVAC vs CCTV. Units as an org table matches rate-table UX; canonical storage keeps the matcher unit-free. **Amended:** drop def-level `range` — see [numeric specs decision](#decision-numeric-specs--drop-range-type-band-is-part-authored-2026-07-08).

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Specs:** [`item.md`](../surface-specs/item.md) (`spec_definitions`), [`part.md`](../surface-specs/part.md) (`part_specs`), estimate scope panel.

---

### Decision: `spec_def` value types and part-matching rules (2026-07-02)

**Status:** **Amended** (2026-07-08) by [spec value types, units table, and locks](#decision-spec-value-types-units-table-and-locks-2026-07-08) — type set, units, range, and locks. **Historical** storage/match notes below retained for trail; **do not implement** `text`, free-text `unit`/`display_unit` columns, or deferred-only range-as-max-on-number.

**Originally:** Locked pending DDL in 37f follow-on. **Amended** [C10 in planning 11](../planning/11-categories-scope-model.md). **Superseded** enum-only assumptions in [system specs C2 (2026-06-27)](#decision-system-specs-and-part-compatibility-c2-locked-2026-06-27) for storage shape only.

#### Historical type table (superseded)

| `value_type` | Notes (2026-07-02) |
|--------------|-------------------|
| `enum` / `boolean` | Unchanged intent — still current |
| `text` | **Dropped** 2026-07-08 |
| `number` + optional `value_number_max` | **Split:** exact `number` vs own `range` type (2026-07-08) |

#### Historical unit columns (superseded)

`spec_def.unit` / `display_unit` text → replaced by **`spec_unit`** table + `spec_def.unit_id` (2026-07-08). Wildcard option still deferred.

#### Estimate bucket UX (still current)

| Level | Table | Cardinality |
|-------|-------|-------------|
| Scope | `estimate_scope_spec` | At most **one row per `spec_def_id`** per scope; value **optional** (blank = no filter) |
| Zone | `estimate_zone_spec` | Same; overrides scope for lines in that zone |
| Line | `estimate_line_spec` | Same; overrides zone |

**Scope panel (37o):** entire `spec_def` namespace for the checked scope root — not a subtree union.

#### Part-match outcomes (still current)

| Matches | Line behavior |
|---------|----------------|
| **0** | `part_id` null; material ← `fallback_unit_cost`; UI alert |
| **1** | Suggest `part_id`; material ← matched vendor |
| **Many** | User picks from filtered set; material ← max filtered or fallback |

See **2026-07-08** decision for current number/range match rows. Enum multi-row + blank-bucket ignore unchanged.

#### Worked example — HVAC evaporator coil (updated types)

| Def | `value_type` | Part rows |
|-----|--------------|-----------|
| `refrigerant` | enum | `R-454B` |
| `tonnage` | number (`unit_id` → ton) | `value_number = 3.0` |
| `voltage` | enum | `208V`, `230V` |
| `phase` | number | `1` |
| `control_type` | enum | `24V`, `Communicating` |
| `trip_band` | range (`unit_id` → A) | e.g. `10`–`20` (illustrative) |

**Rationale (original):** Enum multi-rows model “part supports A or B”; bucket picks one project assumption. Numbers need canonical units. Normalized rows preserve manifest/audit — JSON blobs do not.

---

### Decision: category spec participation — inherit, include, exclude (2026-07-02)

**Status:** **Superseded (algorithm + UI)** by [assign-once, branch exclude (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03). **Retained** for history: table split (`category_spec_def` / `category_spec_exclude`), `scopePanelDefs` union, estimate bucket wiring. **Do not implement** the delta algorithm or Inherited/Include/Exclude UI from this block.

**Choice:**

#### Definitions vs participation (unchanged split)

| Layer | Table / Field | Who | Purpose |
|-------|---------------|-----|---------|
| **Definitions** | `spec_def` + `spec_option` on **root** category only | Catalog admin | Namespace of allowed dimensions (SLC protocol, Color, Series, …) |
| **Participation** | `category_spec_def` + **`category_spec_exclude`** on **any** node | Catalog admin | Which dimensions apply when classifying / quoting under this node |

**`spec_definitions`** on root = CRUD for defs. **`spec_participation`** on root + nested = edit participation deltas (includes + excludes).

#### Storage (migration follow-on)

| Table | Semantics |
|-------|-----------|
| **`category_spec_def`** | **Include** — add `spec_def_id` to this node’s effective set (in addition to inherited) |
| **`category_spec_exclude`** *(new)* | **Exclude** — remove `spec_def_id` from inherited set (opt-out) |

PK `(category_id, spec_def_id)` on both. A def cannot appear in both include and exclude on the same node (DAL rejects).

#### Effective participation algorithm

```text
effective(root R):
  if category_spec_def rows on R:  return those spec_def_ids
  else:                            return ∅   // root with no rows = no inherited base

effective(child C):
  inherited  = effective(parent(C))
  includes   = spec_def_ids in category_spec_def where category_id = C
  excludes   = spec_def_ids in category_spec_exclude where category_id = C
  return (inherited ∪ includes) \ excludes
```

**New child** with no include/exclude rows: `effective(child) = effective(parent)` — full inheritance.

**Item / part with multiple `item_category` / `part_category` links:** `effective(item) = ⋃ effective(category)` across all linked categories.

#### Estimate scope spec panel

When **`estimate_scope`** is checked for root category **R**:

```text
scopePanelDefs(R) = ⋃ effective(C) for all category nodes C in subtree rooted at R
```

Show one control per `spec_def_id` in `scopePanelDefs(R)`; values optional ([bucket rules](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02)). Zone panel shows the **same def list**; values may override scope per def.

**Amends 37e:** scope DAL joins **`scopePanelDefs(R)`** (subtree union of effective participation) — not all root `spec_def` rows. PATCH rejects `spec_def_id` not in panel (`invalid_scope_panel_spec`).

#### Line part filter

Use **`effective(item)`** for the item’s linked categories (not the whole scope subtree). Intersect with bucket values; filter `manufacturer_part_spec` per [matching rules](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02).

#### Category admin UI (37d amend)

| Node | Show |
|------|------|
| **Root** | `spec_definitions` + `spec_participation` (base includes; excludes rare on root) |
| **Nested** | Read-only **Inherited** list + editable **Include** / **Exclude** checklists against root namespace |

Creating a child **does not** copy rows — inheritance is implicit until admin adds include/exclude deltas ([planning 12](../planning/12-master-detail-chrome.md) seeding remains deferred).

#### Migration from 37d flat checkboxes

Existing **`category_spec_def`** rows on nested nodes → reinterpret as **includes only** (additive to inherited parent effective set). **`category_spec_exclude`** starts empty. Admins may need a one-time pass to remove redundant include rows that are now inherited automatically.

#### Worked example — Fire Alarm

**Definitions** on root **Fire Alarm** (`spec_def`): `slc_protocol`, `color`, `series`.

**Participation:**

| Category | Includes (`category_spec_def`) | Excludes (`category_spec_exclude`) | **Effective** |
|----------|-------------------------------|-------------------------------------|---------------|
| Fire Alarm (root) | `slc_protocol` | — | `{ slc_protocol }` |
| Initiating devices | — | — | `{ slc_protocol }` *(inherited)* |
| Modules | — | — | `{ slc_protocol }` |
| Notification appliances | `color`, `series` | `slc_protocol` | `{ color, series }` |

**Estimate** — scope **Fire Alarm** checked:

- **Scope spec panel** defs: `{ slc_protocol, color, series }` *(union across subtree)*
- Estimator may set SLC = LiteSpeed, Color = Red; leave Series blank.

**Line** — item “Horn/strobe” linked to **Notification appliances**, same scope:

- **Filter participation:** `{ color, series }` only — SLC **not** applied to part filter for this item.
- Bucket: Color = Red → filters parts; blank Series → no filter on series.

**Line** — item “Pull station” linked to **Initiating devices**:

- **Filter participation:** `{ slc_protocol }` — bucket SLC value applies; Color on scope does not filter this line’s parts.

**Rationale:** Inheritance matches how admins think about category trees; opt-out covers branches that share most but not all parent specs (notification vs initiating). Union on scope panel collects every dimension needed anywhere in the trade; per-item effective set avoids over-filtering lines. Normalized include/exclude rows stay manifest- and audit-friendly.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Tasks:** [37d](../tasks/37d-category-catalog-dal-surfaces.md) amend · [37f](../tasks/37f-estimate-line-costing.md) *(TBD)* · **Spec:** [`category.md`](../surface-specs/category.md).

---

### Decision: category spec participation — assign-once, branch exclude (2026-07-03)

**Status:** **Locked.** **Supersedes** [inherit / include / exclude (2026-07-02)](#decision-category-spec-participation--inherit-include-exclude-2026-07-02) **algorithm, storage semantics, and category admin UI.** **Retains:** `spec_def` namespace per scope root; `category_spec_def` + `category_spec_exclude` tables; `scopePanelDefs(R)` subtree union; Policy A root participation; estimate/part consumers unchanged at API shape.

**Choice:**

#### Definitions vs participation (unchanged split)

| Layer | Table | Who | Purpose |
|-------|-------|-----|---------|
| **Definitions** | `spec_def` + `spec_option` | **Scope root only** (CRUD) | Namespace of dimensions (SLC, Color, Series, …) — **not** assigned per category |
| **Participation** | `category_spec_def` + `category_spec_exclude` | Any node in root’s tree | Which defs **apply** when classifying / quoting under a node |

**Ancestry rule:** participation flows only along **ancestor → descendant** lines in the **same** scope-root tree. Siblings do not share participation. Different scope roots (`a` vs `b`) never share `spec_def` rows.

#### Storage

| Table | Semantics | Constraint |
|-------|-----------|------------|
| **`category_spec_def`** | **Assignment** — the **one** category where this def is introduced in the tree | **`UNIQUE (spec_def_id)`** — at most one assignment row per def |
| **`category_spec_exclude`** | **Branch cut** — def no longer applies at this node **or any descendant** | PK `(category_id, spec_def_id)`; **no re-include** below an exclude |

A def cannot appear in both tables on the **same** node (DAL rejects).

**Policy A (root):** a def participates at the scope root only when `category_spec_def` assigns it to the root row (no automatic “all defs active at root”).

#### Effective participation algorithm

```text
assign(D) = category_id from category_spec_def where spec_def_id = D
            (null if no row — def exists in namespace but is inactive everywhere)

effective(N, D):
  A = assign(D)
  if A is null:                         return false
  if A is not an ancestor of N
     and A ≠ N:                        return false
  if ∃ exclude row (X, D) where X is on the path
     from A down to N (inclusive):     return false
  return true

effective(N) = { D | effective(N, D) }
```

**No re-include:** an exclude on node `c` removes def `D` for `c` and **all descendants**. A descendant **cannot** restore `D` via `category_spec_def`.

**Item / part with multiple category links:** `effective(item) = ⋃ effective(category)` across `item_category` / `part_category` links (unchanged).

#### Estimate scope spec panel (unchanged intent)

```text
scopePanelDefs(R) = ⋃ effective(C) for all category nodes C in subtree rooted at R
```

PATCH rejects `spec_def_id` not in `scopePanelDefs(R)` (`invalid_scope_panel_spec`).

#### Category admin UI

| Node | Show |
|------|------|
| **Root** | **`spec_definitions`** only — CRUD defs + enum options. **No** separate “base includes” section. |
| **Nested** | **Read-only** `spec_definitions` table (root namespace) + one **Participates** checkbox per def |

**Checkbox → DB (nested):**

| UI state | DB action |
|----------|-----------|
| Participates, def unassigned | `INSERT category_spec_def (this category, def)` — fails if def already assigned elsewhere |
| Participates, assigned at ancestor, inherited | no rows (implicit) |
| Does not participate, would inherit | `INSERT category_spec_exclude (this category, def)` |
| Does not participate, not inherited | no rows |

**Root participation:** optional — same checkbox column if root shows participation; assignment row on root when checked (Policy A).

Creating a child **does not** copy rows — inheritance is implicit until admin assigns or excludes ([planning 12](../planning/12-master-detail-chrome.md) seeding deferred).

#### Migration from 37d2 delta model

| Situation | Action |
|-----------|--------|
| Multiple `category_spec_def` rows per `spec_def_id` | **Data pass** before `UNIQUE` — keep one assignment (shallowest / admin choice); drop redundant rows |
| Nested rows that only duplicated inheritance | Delete — effective set unchanged under assign-once |
| `category_spec_exclude` rows | Keep — semantics tighten (no re-include below) |

DDL follow-on: migration **037** — `UNIQUE (spec_def_id)` on `category_spec_def`. See [037 plan](../migrations/037-category-spec-assign-once-plan.md).

#### Worked example — Fire Alarm

**Definitions** on root **Fire Alarm:** `slc_protocol`, `color`, `series`.

**Assignment + exclude (DB rows):**

| Def | `category_spec_def` (assign) | `category_spec_exclude` |
|-----|------------------------------|-------------------------|
| `slc_protocol` | Fire Alarm (root) | Notification appliances |
| `color` | Notification appliances | — |
| `series` | Notification appliances | — |

**Effective (computed):**

| Category | Effective defs |
|----------|----------------|
| Fire Alarm (root) | `{ slc_protocol }` |
| Initiating devices | `{ slc_protocol }` *(assigned at root, on path)* |
| Modules | `{ slc_protocol }` |
| Notification appliances | `{ color, series }` *(slc cut by exclude)* |

**Estimate** — scope **Fire Alarm** checked: scope panel `{ slc_protocol, color, series }`. Line filter participation per `effective(item)` on linked category — same outcomes as prior Fire Alarm example.

**Rationale:** One assignment per def matches “introduced here, inferred downhill.” Exclude is a branch guillotine — simpler than delta includes + re-include. UI is one checklist on descendants; definitions stay root-editable only.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Tasks:** [37d3](../tasks/37d3-category-spec-participation-simplify.md) · [37f](../tasks/37f-estimate-line-costing.md) · **Spec:** [`category.md`](../surface-specs/category.md).

**UI visibility:** **Superseded (admin per-node visibility)** by [owner-branch knowledge (2026-07-03)](#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03). **Retains:** assign-once storage, branch exclude, `effective()` / `scopePanelDefs` algorithms.

---

### Decision: category spec visibility — owner-branch knowledge (2026-07-03)

**Status:** **Locked.** **Supersedes** [assign-once UI table (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03) **category admin visibility only.** **Retains:** `category_spec_def` assign-once, `category_spec_exclude` branch cut, `effective(N, D)` participation algorithm, `scopePanelDefs` subtree union, estimate/part consumers. **Shipped:** task [37d4](../tasks/37d4-category-spec-visibility.md) (2026-07-04).

**Choice:**

#### Concepts

| Term | Meaning |
|------|---------|
| **Owner** | The single category with `category_spec_def` for def `D` |
| **Knowledge** | Category admin (and DAL read for that node) is aware `D` exists |
| **Use** | `D` is in `effective(N)` — participates for quoting, part matching, etc. |

Knowledge and use can diverge only at an **exclude** node: the node that wrote `category_spec_exclude` **knows** `D` but does **not** use it.

#### Rules

| # | Rule |
|---|------|
| R1 | Each def is **assigned to exactly one** category (owner). |
| R2 | Every **descendant** of the owner **knows** and **uses** `D` unless R2.1 applies. |
| R2.1 | If category `X` on the path owner → `N` **excludes** `D`, then `X` **knows** but does **not** use `D`; every **descendant of `X`** has **no knowledge** of `D` (branch cut for visibility and participation). |
| R3 | Only the **owner** may **edit or delete** the def (display name, type, enum options). All other nodes: read-only at most, or invisible per R2.1. |
| R4 | Any **descendant** of the owner may **exclude** an ancestral assignment (exclude row only — not a second assign). |

**Not inherited upward:** ancestors and siblings of the owner have **no knowledge** of `D`.

**Storage unchanged:** `spec_def` rows remain namespaced by scope root (`root_category_id`); assignment and exclude tables carry owner-branch semantics. Implementation maps owner → edit rights; visibility filter is per-node.

#### Worked example — generic tree

```text
1
└── 1-1          ← assign(D) here (owner)
    ├── 1-1-1    ← exclude(D) here
    │   └── 1-1-1-1
    └── 1-1-2
2
3
├── 3-1
└── 3-2
```

| Category | Knows `D`? | Uses `D`? | Notes |
|----------|------------|-----------|-------|
| `1` | no | no | ancestor of owner — not on owner branch |
| `1-1` | yes | yes | owner; edit/delete |
| `1-1-1` | yes | no | exclude node — toggle exclude only |
| `1-1-1-1` | no | no | below exclude — branch cut |
| `1-1-2` | yes | yes | descendant of owner, no exclude on path |
| `2`, `3-1`, `3-2` | no | no | other branches |

#### Category admin UI (target)

| Node vs def `D` | Show in admin? | Editable? | Participates control |
|-----------------|----------------|-----------|----------------------|
| Owner | yes | yes (def CRUD) | n/a — always uses |
| Descendant, on path, not excluded | yes | no (read-only def) | inherited — no row; uses implicitly |
| Descendant, exclude node | yes | no | exclude toggle (active = false) |
| Below exclude | **no** | — | — |
| Ancestor / sibling / other branch | **no** | — | — |
| Unassigned def (namespace only) | scope **root** only | yes (def CRUD) | assign when first introduced |

**Task:** [37d4](../tasks/37d4-category-spec-visibility.md) — DAL visibility filter + category UI amend.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Spec:** [`category.md`](../surface-specs/category.md).

---

### Decision: category-only scope — roots replace catalog system (2026-06-30)

**Status:** **Locked.** Supersedes [system specs C2 (2026-06-27)](#decision-system-specs-and-part-compatibility-c2-locked-2026-06-27) **as implemented** (`system` table).

**Choice:**

- **Drop catalog `system`.** Scope roots = **`category.parent_id IS NULL`** (Fire Alarm, Intrusion, HVAC, …).
- **`spec_def.root_category_id`** + **`spec_option`**; **`category_spec_def`** on nested categories; **`manufacturer_part_spec.spec_def_id`** unchanged intent.
- Items/parts: M:N **`item_category`**, **`part_category`**; shared category tree.
- Site instances: **`site_scope.root_category_id`**; zones **`site_zone`**.
- Estimate: **`estimate_scope`** + live site checkbox scope; item-first lines + optional **`part_id`** pin.
- **`trade`** retained in DDL but **not** on estimate/site scope path v1.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Tasks:** [37a](../tasks/37a-category-scope-decision-dbml-migration.md) (DDL) · [37d](../tasks/37d-category-catalog-dal-surfaces.md) (surfaces) · **Spec:** [`category.md`](../surface-specs/category.md).

---

### Decision: system specs and part compatibility (C2 locked 2026-06-27)

**Status:** **Superseded (implementation)** by [category-only scope (2026-06-30)](#decision-category-only-scope--roots-replace-catalog-system-2026-06-30). Spec/part FK **semantics** unchanged; **`system_id`** → **`root_category_id`**.

**Choice:**

- **`system`** catalog table (`id`, `name`); **`site_system.system_id`** for instances.
- **`system_spec_def`** (UUID PK) + **`system_spec_option`**; **`manufacturer_part_spec`** FKs to def + option.
- **`manufacturer_party_id`** = catalog/PO only (party FK, manufacturer role); not estimate spec knobs.
- **`manufacturer_part.specs`** text = human notes only.
- Estimate: **`estimate_system`** tabs + **`estimate_system_spec`** / area / line overrides.

**Rationale:** Protocol/spec dimensions filter parts; manufacturer brand is wrong knob; UUID spec defs align part and estimate rows.


### Decision: labor phase inclusion — catalog → estimate → job (2026-07-07)

**Status:** **Locked** (2026-07-07). **Task:** [37n](../tasks/37n-labor-phase-inclusion.md). **Amends:** [37l labor atomic group](#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05); [commercial costing](#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04); [J5 phase templates](#decision-phase-templates--per-root-category-default--item-override-j5-locked-2026-06-27) (**superseded**); legacy [labor phases catalog](#decision-labor-phases--catalog-only-in-v1-2026-06-17) org **`phase`** table. **N2 amended (2026-07-12):** leaf resolution is no longer atomic — see [per-row labor override](#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12) (37ad).

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **N1** | **Single phase catalog** | Org **`labor_phase`** + **`labor_rate_type`** stay as shipped (040b). One id bridges **costing** (`item_labor_phase`) and **progress** (`scope_phase`). Retire org **`phase`**, **`phase_template`**, **`phase_template_step`**, `estimate_line.phase_id`, `scope_phase.phase_template_step_id`. |
| **N2** | **Item matrix** | **`item_labor_phase`**: `labor_phase_id` + `labor_rate_type_id` + `hours_per_unit` per node. **Author on `category` and `item`** (not scope roots). Leaf resolution unchanged (37l): leaf's whole set, else **first ancestor's whole set** — atomic, no per-phase merge across levels. **Superseded (2026-07-12):** resolution now merges per `labor_phase_id` across the full ancestry walk — see [37ad](#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12). |
| **N3** | **Item UI — inherit + override** | Leaf with **no own rows** and ancestor has rows → **read-only** inherited table (phase, rate, hrs) + source label. **Add labor phase** → **override mode** (writable replace-array on leaf). Delete all own rows → revert to inherited display (no leaf rows in DB). |
| **N4** | **Estimate inclusion** | Per **`estimate_scope`** and optional **`estimate_zone`**: pick which **`labor_phase`** ids apply to lines in that bucket (e.g. Parts & Smarts → Program + Test only; omit Install / Prewire). Junction: `estimate_scope_labor_phase`, `estimate_zone_labor_phase`. **Default:** all phases in the resolved item labor group (unset = include all). **Zone overrides scope** when zone has rows (same tier rule as `complexity_factor`). |
| **N5** | **`unit_labor` recalc** | `resolved = resolveLaborGroup(item)` → filter rows where `labor_phase_id ∈ includedPhases(scope, zone)` → `Σ hours × rate` × complexity. Frozen when `lock = line` or `sent` (D6a). |
| **N6** | **Job `scope_phase` seed** | On win / job line create: one **`scope_phase`** per **included** `labor_phase` on the line's resolved group. `scope_phase.labor_phase_id` FK → `labor_phase`; `planned_qty` = line `quantity`; `name` denormalized from catalog. `progress_weight` / `billing_weight` default from matching `hours_per_unit` (J3 tuning deferred). |
| **N7** | **Progress %** | Field progress rolls up on **`scope_phase.completed_qty`** per phase. Scope/zone labor % = weighted rollup across job lines in that geography using included phases only. Billing reads same rollups when auto-generator ships (B4 deferred). |
| **N8** | **Freeze** | Phase inclusion on estimate scope/zone follows estimate lifecycle (D6a): editable in **`draft`**; frozen at **`sent`** / **`won`**. |

**Flow:**

```text
labor_phase (org) ──► item_labor_phase (category/item defaults)
                           │
estimate_scope_labor_phase / estimate_zone_labor_phase (which phases count here)
                           │
              estimate_line.unit_labor (filtered Σ hours × rate × complexity)
                           │
              win ──► scope_phase per included labor_phase (job progress + billing)
```

**Rationale:** Costing and field progress share one phase vocabulary. Estimate scope/zone inclusion models "we're only programming and testing here, not installing" without duplicate labor lines. Category-level defaults + leaf override mirrors margin-policy authoring altitude and 37l ancestry resolution.

**Supersedes:** [phase templates (J5)](#decision-phase-templates--per-root-category-default--item-override-j5-locked-2026-06-27); `default_phase_template_id` on scope roots (040b retired); org **`phase`** table for new work.


### Decision: phase templates — per root category default + item override (J5 locked 2026-06-27)

**Status:** **Superseded** (2026-07-07) by [labor phase inclusion](#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07). `phase_template` / `phase_template_step` dropped in 040b; job seeding now from `item_labor_phase` + estimate phase inclusion.

**Choice:** `item.phase_template_id` when set; else **`category.default_phase_template_id`** on scope root; else org fallback. Job line create / win copies steps → `scope_phase`.

**Amends:** J5 referenced `system.default_phase_template_id` — same rule on root category row.

**Rationale:** Default install/program/test paths differ by scope root; items override when needed.


### Decision: trade, system type, assumptions, and part tags (2026-06-27)

**Superseded by** [system specs C2 (2026-06-27)](#decision-system-specs-and-part-compatibility-c2-locked-2026-06-27).


### Decision: labor phases — catalog only in v1 (2026-06-17)

**Amended (2026-07-07):** org **`labor_phase`** + **`item_labor_phase`** replace legacy **`phase`** for costing and progress — see [labor phase inclusion](#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07). Estimate scope/zone picks which phases apply; `scope_phase` instances reference `labor_phase_id`.

**Amended (2026-06-27):** org **`phase`** evolved toward **`phase_template_step`** — both retired in 040b / 37n.

**Choice:** Org catalog **`phase`** (prewire, installation, programming, testing, …). Attach on **labor** `estimate_line` / `job_line` via `phase_id` and on **`job_work_item`**.

- **Scope subset:** only create labor lines for phases performed; omit lines for GC/existing work.
- **`labor_class`** remains the **rate bucket**; **`phase`** is the work/reporting kind.
- **Scheduling deferred (v2):** no `scheduled_start` / `job_phase` instance table in v1.

**Rationale:** Phasing for field reporting and labor attachment without Gantt complexity in v1.


### Decision: catalog — simplified parts, items, categories (2026-06-16)

**Choice:**

| Area | Schema |
|------|--------|
| **UOM** | On **`manufacturer_part` only** (`unit`, optional `purchase_unit`, `units_per_purchase`). `vendor_part` has no UOM — price is per part's purchase unit when set. |
| **Vendor catalog** | **`vendor_part`** — vendor PN + current `unit_price` (merged for v1). |
| **Item shapes** | One exact part (`default_part_id`), one-of-many (`item_part_link.link_role = alternate`), or group (`kind = assembly`, `link_role = component`). |
| **Item default cost** | `default_part_id` + `default_vendor_part_id` → `vendor_part.unit_price` (DAL handles unit conversion). |
| **Labor** | **`labor_class`** = rate bucket on labor items. Catalog BOM is **`item_part_link` only** (parts). Labor bundles = multiple `estimate_line` rows or standalone labor items — no `item_item_link`. |
| **Categories** | Single **`category`** tree (`parent_id`). Optional **`csi_code`** when org uses CSI MasterFormat — no `classification_system` / parallel commercial taxonomy. |
| **Quote grouping** | `estimate_section.category_id` (and optional `estimate.category_id`) — **not** per line. |
| **Expense / rental** | `item.kind = expense` for travel, per diem; equipment rental may be expense item or `job_party` subcontractor. |

**Rationale:** One category concept covers merchandising and optional CSI alignment. UOM on the manufacturer part avoids vendor/part unit mismatch. `item_part_link` covers all part composition; `labor_class` tags labor items for rates when labor is quoted as its own line.


### Decision: `part_detail` — MPN catalog and vendor pricing (2026-06-19)

**Choice:**

| Area | v1 |
|------|-----|
| **`profile` Field** | `manufacturer_party_id`, `mpn`, `description`, `unit`, `purchase_unit`, `units_per_purchase` only |
| **Deferred on part Surface** | `specs`, `cut_sheet_url`, part **requirements** graph (e.g. part A requires spec B) — revisit at estimate/job + submittal slice |
| **`vendor_pricing` Field** | Separate manifest Field — `vendor_party_id`, `vendor_pn`, `vendor_description`, `unit_price`, `is_preferred` |
| **Currency** | Not on `vendor_part` Surface row; v1 assumes org currency; per-vendor currency if ever needed |
| **Price history** | Deferred — one current row per vendor PN ([simplified catalog](#decision-catalog--simplified-parts-items-categories-2026-06-16)) |
| **`is_preferred`** | At most one `true` per part; DAL clears siblings on write — default buy path when item costing unset |
| **`part_list`** | Org-wide; search `mpn` + `description`; sort manufacturer name then `mpn`; **no** manufacturer filter v1 |
| **Policy** | `profile` and `vendor_pricing` independent Field grants — no sensitive-field tier |

**Rationale:** Wave 3 catalog is the MPN + buy-price anchor. Technical specs and submittal packages belong to estimating/engineering workflows, not catalog housekeeping. Preferred vendor per part gives PO/costing a default without item-level duplication.

**Spec:** [`surface-specs/part.md`](../surface-specs/part.md).
