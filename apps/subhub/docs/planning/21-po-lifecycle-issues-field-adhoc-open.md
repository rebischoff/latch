# 21 — PO cancel/retract lifecycle + zone issues + Field ad-hoc — decisions locked

> **Status:** **Locked (2026-07-18).** **Amended 2026-07-20:** §4 **AH1–AH3 superseded** and §3 **ISS3 UI amended** by [FI1–FI12](../decisions/job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20) / task [60](../tasks/60-field-issues-table-revert-adhoc.md). PO lifecycle (§2, §7) and ISS1/2/4/5/6 keep. This is a decision record, not an implementation task.
>
> **Keeps (validated, do not re-litigate):** [L0–L31](./20-field-labor-materials-open.md) (**L9 restored** for plan entry — Scope Line Items), [F1–F9](../decisions/job.md#decision-job-field-progress--boolean-zone-snapshot-5c-2026-07-16), [R1–R8](../decisions/procurement.md#decision-requisition-surfaces-ux-r1r8-2026-07-16).
> **Companion:** [53](../tasks/53-purchase-order-workbench.md), [57](../tasks/57-zone-issues-and-field-adhoc.md) (shipped; partial supersede), [60](../tasks/60-field-issues-table-revert-adhoc.md).

## Why this doc exists

Product asked for a second opinion on job progress, requisitions, POs, issues, and the Field UI — after [55](../tasks/55-field-progress-reports-zone-order.md) had already shipped progress reports and zone `Order` → requisition snapshots. Most of what was asked either **matches what's already built** (validated below, §1) or **extends an already-scoped follow-on** (§§2–4, open forks). One latent **costing bug** turned up during review (§5) — flagged separately since it's a correctness fix, not a product fork.

---

## §1 — Already shipped, validated (no change)

| Your question | What's already built | Verdict |
|---|---|---|
| "Do we really need progress snapshots, and how are they efficiently recorded?" | `job_progress_report` + `job_progress_report_cell` — **diff-aware**, append-only **full-board copy** on Job Save, only when the living board actually changed ([L16/L26](./20-field-labor-materials-open.md), F3) | **Keep.** Full-board snapshots (not a delta/event log) are the right shape for graphing: reading "state as of report N" is a direct query, not a replay. Diff-awareness already avoids empty snapshots on saves with no progress change. |
| "Is a requisition *document* actually useful, or do we just care what's requested per zone + its PO?" | Field ☐ **Order** auto-creates `requested_order` + zone-tagged lines on Save ([L8/L27/L28](./20-field-labor-materials-open.md)); manual `/requisitions/new` demoted to secondary (task 55 step 5) | **Matches your instinct already.** The header is no longer a manually-authored document — it's a lightweight batch/traceability anchor that PO lines link back to. You don't interact with it directly from Field; you interact with the derived ☐ Order checkbox. |

One refinement worth locking alongside these (not a reversal — an addendum):

### PR1 — Freeze the % basis at snapshot time, or always compute live? — **locked + shipped (2026-07-18)**

**F8** says the *living* board's % is always computed on read from current `scope_phase` hours — correct, since the living board reflects "right now." But a **report** is a historical record used for graphing against a projected curve. If a later change-order `revise`s a phase's hours (job costing re-budget), re-deriving an *old* report's % from current `scope_phase` hours would silently rewrite history — the graph line for a past date would move every time costing changes.

| Option | Trade-off |
|---|---|
| **(a) Compute live, always** (implicit today) | Simplest; historical % drifts if scope_phase hours change later via CO/re-budget |
| **(b) Freeze the weight at write time** — add `weight_hours` (or a precomputed `pct_complete` on the report header) to `job_progress_report_cell` / `job_progress_report`, populated from the resolved hours at the moment of the Save | Historical graph point stays stable regardless of later re-budget; small schema add (one numeric column); still boolean-only per cell, so no new UI |

**Recommendation:** **(b)**. It's a one-column addition to a table you already write to on every progress-changing Save, and it's the only option that makes "compare actual vs. projected over time" trustworthy after a CO touches hours. Cheap to add now while `job_progress_report_cell` has no readers yet (no history UI ships this cycle); expensive to retrofit once a graphing UI depends on live-computed history.

**Shipped:** migration **086** adds `job_progress_report_cell.weight_hours` (frozen at write time, one row per `(scope_phase_id, site_zone_id)`, summed from the same per-slice hours the living board already resolves — `lib/jobs/repository/job-field-progress-write.ts`). `lib/jobs/repository/job-progress-report.ts` exports `reportCellWeightKey` (write-side keying) and `computeReportProgressPct` (read-side % helper — same hours-weighted formula as `computeFieldProgressPct`, over frozen `weight_hours` instead of a live `scope_phase` join) for whenever the report-history UI lands. Tests in `job-field-zone-order.test.ts`.

---

## §2 — Locked: PO cancel / retract lifecycle (task 53)

**Status: Locked (2026-07-18).**

Your ask: purchaser sees requested parts per job/zone, picks vendors, batches/revises POs — and **once a PO is sent, requisition withdraw is disabled, but the PO itself can still be cancelled/retracted** if the vendor hasn't shipped or the parts haven't been picked up.

The **schema already anticipates this** — `purchase_order.status` includes `cancelled`, `purchase_order_line.status` includes `cancelled`/`rejected`, and `purchase_order_line_shipment.status` includes `scheduled | shipped | delivered | received | cancelled` (migration 084). None of the DAL/UI for it exists yet (task 53 is still a stub). This is exactly the right next slice.

**Core reframing (drives PO1/PO4):** the app's "cancel" never actually stops a vendor — it *records* a decision already made over phone/email, same whether the PO is `draft` or `sent`. So there's no hard shipment-based block on the cancel action itself; what changes as fulfillment progresses is what cancel *means* and how strongly the UI warns you.

| # | Question | Locked answer |
|---|---|---|
| **PO1** | When is a PO/line cancellable? | **Always, up until fully `received`** — no hard block based on shipment state. Pre-ship: clean cancel, no physical consequence. Post-ship (`shipped`/`delivered`, not yet `received`): cancel still reverses committed cost and the linked request(s) (**PO2**), but doesn't stop a shipment already in motion — it's recording "we told the vendor to stop / we'll refuse this on arrival." Fully `received` isn't a cancel case at all — that's a return/RMA, out of scope this cycle. |
| **PO2** | What happens to the linked request(s) on cancel? | Revert the affected `job_material_request` row(s) from `on_purchase_order` back to `open` (not deleted — the need still exists, just unordered again). With §7's rollup (multiple source rows per PO line), **PO8's FCFS-by-`requested_at` rule already tells you which source rows are still pending** — those are the ones that revert. Already-`fulfilled` source rows (covered by a real receipt) are untouched; cancel can't un-receive material. |
| **PO3** | Cancel granularity | **Three levels: header → line → shipment.** Header cancel cascades the line rule to every not-yet-resolved line (one code path, not two — "cancel all open lines"). **Shipment-level cancel** (new, surfaced via the backorder walkthrough below) lets you cancel just one split portion of a line while leaving the rest untouched — legitimate because shipment splits are *vendor-communicated* (the vendor told you about the split), unlike a zone sub-split, which the vendor never sees and which cancel does **not** operate on (§7 — receiving has no zone concept). |
| **PO4** | Guard | No hard block (see PO1) — escalating **confirm UI** instead: plain confirm while nothing's shipped; strong warning ("vendor may have already sent this — confirm you've contacted them") once any covering shipment is `shipped`/`delivered`; not offered once `received`. |
| **PO5** | Audit | `latch_audit` on the cancel action (invariant #6) — cancel is a real state transition (actor, timestamp, before/after status, affected line/shipment), not a delete. |
| **PO6** | Revise vs. cancel+recreate | **Edit in place only while `draft`.** Once `sent`, always **cancel(-the-affected-portion)+recreate** — no in-place revise-after-send flow, including for quantity reduction or a part-number swap on a still-open portion. One mechanism handles every "sent line needs to change" case, backorder included (below). |

**Backorder walkthrough (confirms PO3's shipment level, needs no new schema):** vendor says "30 of 40 ships now, 10 is backordered" → that's just a normal `purchase_order_line_shipment` split (shipment 1: qty 30, near ETA; shipment 2: qty 10, later/TBD ETA) — `purchase_order_line_shipment` already models this. Purchaser's options on the backordered shipment 2 specifically:

- **Leave as-is** — no action, shipment 2 stays `scheduled`, update its ETA as the vendor gives new dates.
- **Reduce qty, source the remainder elsewhere** — shipment-level cancel on shipment 2 only (shipment 1's 30 untouched); reverts shipment 2's still-pending source `job_material_request` rows to `open` (PO2's FCFS logic, scoped to that shipment's qty); those requests are now free for a fresh line/PO to a different vendor.
- **Different part number** — same mechanism: cancel shipment 2's backordered qty, fresh PO line (new part) covers it via new source links from the same now-`open` requests. No PO6 exception needed — it's cancel(-the-portion)+recreate either way.

**Lock:** PO1–PO6 as amended above (PO3 now three-level, PO1/PO4 reframed as no-hard-block); author full task 53 steps against this (batch create → Send → cancel, at header/line/shipment granularity) instead of Send-only.

---

## §3 — Locked: zone issues (required follow-on, [L4/L31](./20-field-labor-materials-open.md))

**Status: Locked (2026-07-18).**

Your ask: issues reported by zone, resolvable/cancellable, separate from material requests but part of the progress-tracking story, and visible in the same Field UI.

| # | Question | Locked answer |
|---|---|---|
| **ISS1** | Table shape | New `job_issue`: `id`, `job_id`, `site_zone_id` (nullable = General, same convention as progress/req lines), `description`, `status`, `reported_by`, `reported_at`, `resolved_by`, `resolved_at`, `resolution_note`. No line-item children — issues are a flat per-zone log, not a document. **No uniqueness constraint on `(job_id, site_zone_id)`** — a zone can have any number of issue rows open simultaneously, each tracked independently (e.g. "no power" and "door locked" both open at once). |
| **ISS2** | Lifecycle | `open → resolved` (with `resolution_note`) or `open → cancelled`. **Both terminal — no reopen path.** A recurrence of the same problem gets a fresh row, not a reopen of the old one (keeps each row an honest point-in-time record, consistent with ISS6). |
| **ISS3** | Field UI placement | Same zone-detail panel as Phases/Order, as a third stacked block: **Issues**. **Amended 2026-07-20 ([FI9–FI10](../decisions/job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20)):** Stakeholders-like **table** (Description · Status · actions) + Add under table; open-by-default + Show closed — not the original list + “Report issue” form. |
| **ISS4** | Relation to progress | **Decouple** — do **not** block marking a phase complete because a zone has an open issue (explicitly scoped as "related but separate"). An open-issue badge on the zone in the tree (visual only) is enough signal for a PM without adding a hard gate. |
| **ISS5** | Save semantics | **Batched into the whole-job Save**, same as progress/Order — one consistent Save button, not a separate immediate-write path. The Field page's local pending-changes state also holds drafted issue actions (new reports, queued resolve/cancel) alongside pending progress ticks and zone-order checkboxes; all commit together on Save. Trade-off accepted: an unsaved issue report is lost if the tech navigates away before hitting Save, same as an unsaved progress tick today. |
| **ISS6** | History | The row itself *is* the history (create/resolve/cancel timestamps + actor on each) — no separate snapshot table needed, unlike progress (which needs snapshots because a cell's % is overwritten in place; an issue row's own lifecycle timestamps never get overwritten since ISS2 forbids reopen). A live filtered/grouped query (`WHERE status = 'open' GROUP BY site_zone_id`, or grouped by job for a PM) is a direct, always-current report — no `job_issue_report` needed. |
| **ISS7** | Optional `blocking` flag/severity, stronger zone-tree badge for "work can't proceed here" vs. a routine note | **Left out of this pass.** Not requested — flagged only because "blocked zone" came up as an example in the original ask. Add later if plain issues + ISS4's badge aren't visually distinct enough in practice. |

**Lock:** ISS1–ISS7 as above; author as its own task after 53 (per [20](./20-field-labor-materials-open.md) follow-on order) — small surface, no dependency on PO lifecycle.

---

## §4 — Locked: Field-direct ad-hoc (amends L9) — **SUPERSEDED 2026-07-20**

**Status: Superseded (2026-07-20)** by [FI1–FI2 / FI12](../decisions/job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20). Field “+ Add material” is removed; tech material *asks* go on **Issues** (signal only); plan entry is **Scope → Line Items**. Historical lock text below kept for audit.

**Was locked (2026-07-18):**

| # | Question | Locked answer |
|---|---|---|
| **AH1** | Allow ad-hoc directly on Field? | **Yes — amend L9.** UI-wiring change: add a "+ Add material" row under the Field zone's Work table that creates a freeform `job_material_request` row (`job_line_part_id` null, `part_id`/description only) tagged with that zone's `site_zone_id` — no new DAL capability, §6's shape already supports this. **Batched into the whole-job Save**, consistent with progress/Order/issues — queued in Field's pending-changes state, not an immediate write. |
| **AH2** | Does it need to touch the BOM (`job_line_part`)? | **No.** Stays a costless freeform `job_material_request`, same shape as today's ad-hoc requisition lines. Its cost lands in **committed/actual** only (job-cost-summary, §5), never in budget — that's a *feature*, not a gap: an unplanned field pickup showing as a committed/actual variance correctly signals "this wasn't in the plan," rather than silently blending into the BOM as if it always was. Forcing a `job_line_part` write from Field would also reintroduce exactly the scope-attribution friction AH1 is removing (tech would have to pick/create a scope line on the spot). |
| **AH3** | Keep Scope as a path too? | **Yes, both stay.** Scope-first ad-hoc (PM adds a `job_line`/`job_line_part` row pre-emptively) is right for *planned* extras that should affect budget. Field-direct ad-hoc is right for *in-the-moment* unplanned pickups. Different intents, same underlying freeform `job_material_request` shape underneath either entry point — no schema fork. |

**Lock (historical):** AH1–AH3 as above. **Superseded 2026-07-20** — see [FI1–FI12](../decisions/job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20) / task [60](../tasks/60-field-issues-table-revert-adhoc.md).

---

## §5 — Found while reviewing: committed-cost rollup misses ad-hoc PO cost (bug, not a fork) — **fixed 2026-07-18**

`loadJobCostSummary` (`lib/jobs/repository/job-cost-summary.ts`) computes `committed` with:

```sql
SELECT COALESCE(SUM(pol.unit_price * pol.quantity), 0)
FROM purchase_order_line pol
INNER JOIN job_line_part jlp ON jlp.id = pol.job_line_part_id
INNER JOIN job_line jl ON jl.id = jlp.job_line_id
WHERE jl.job_id = $1 AND jl.status = 'active'
```

Two problems, both pre-existing (independent of anything proposed above):

1. **`INNER JOIN job_line_part`** — any `purchase_order_line` with `job_line_part_id IS NULL` (ad-hoc, no BOM link) is silently excluded from `committed`. This already affects today's requisition-level ad-hoc lines (R2), and would get worse the more Field-direct ad-hoc (§4) gets used.
2. **No `status` filter** — cancelled/rejected `purchase_order_line` rows (and cancelled `purchase_order` headers) still count toward `committed`. Harmless today (cancel doesn't exist yet), but **must** be fixed before §2 ships, or every PO cancel will leave stale committed $ on the job.

**Fix applied** (`lib/jobs/repository/job-cost-summary.ts`): query directly off `purchase_order.job_id` (already a column) instead of joining through `job_line_part`, and exclude `cancelled`/`rejected` statuses:

```sql
SELECT COALESCE(SUM(pol.unit_price * pol.quantity), 0)
FROM purchase_order_line pol
INNER JOIN purchase_order po ON po.id = pol.purchase_order_id
WHERE po.job_id = $1
  AND po.status <> 'cancelled'
  AND pol.status NOT IN ('cancelled', 'rejected')
  -- existing receipt filter unchanged
```

This is a small, isolated, non-product-decision fix — flagging here so it lands before §2 (PO cancel) ships, not after.

---

## §6 — Locked: drop `requested_order` + `requested_order_line`, replace with `job_material_request` (amends R4, task 52/55 DDL)

**Status: Locked (2026-07-18).** Not just "collapse the header" — both tables go away outright, replaced by one flat table. Resolved via chat walkthrough; RQ1–RQ4 below record the final shape.

| # | Question | Locked answer |
|---|---|---|
| **RQ1** | Does the header go away? | **Yes, entirely** — `requested_order` is dropped, not just de-duplicated. Its columns (`job_id`, `requested_by`, `requested_at`) move onto the line row directly. |
| **RQ2** | Lifecycle of a row when Order is unchecked/rechecked on Field? | **Hard delete while `status = 'open'`; fresh insert on recheck.** No `withdrawal_note` prompt for the checkbox path (matches **L15**'s "no special redact" philosophy, and removes today's synthetic `"Unchecked on Field Order"` note hack). Once a row is `on_purchase_order`/`fulfilled` it's frozen — uncheck is **blocked** (existing guard, unchanged) until the PO is cancelled (**PO2**, reverts the row to `open`), at which point delete-on-uncheck applies again. **Sub-item closed (2026-07-18):** purchasers have **no delete/decline authority over `job_material_request` at all** — a purchaser "choosing not to order" a line simply means not selecting it for a PO right now; the row stays `open` in the pool untouched, no state change, no note. The *only* removal path is the requester's own uncheck-on-Field, already covered above. No `withdrawn` status, no `withdrawal_note` column — status enum is exactly `open \| on_purchase_order \| fulfilled`. |
| **RQ3** | Manual creation path (old `/requisitions/new`)? | **Gone — no manual "add a material request" UI at all.** The only way a `job_material_request` row gets created is from the **Job → Field** panel (☐ Order against a BOM row, or the AH1 ad-hoc "+ Add material" per zone). Purchasers work the pool/PO side, not creation. |
| **RQ4** | `/requisitions` list impact | Becomes a flat, filterable list Surface only (**no detail Surface/route** — there's no header row to anchor a detail page on). Filterable by **job** (also status/zone) — the Job's own related view / Field tab reuses the same filtered query, not a separate code path. |

**New table shape (working name `job_material_request` — rename if you want something else):**

```text
job_material_request
├── id                 text PK
├── job_id             text NOT NULL   FK → job.id (ON DELETE CASCADE)
├── site_zone_id       text            FK → site_zone.id (ON DELETE RESTRICT) — null = General
├── job_line_part_id   text            FK → job_line_part.id (ON DELETE SET NULL) — null = ad-hoc
├── part_id            text            FK → manufacturer_part.id (ON DELETE SET NULL)
├── description        text NOT NULL DEFAULT ''
├── quantity           numeric NOT NULL DEFAULT 1  CHECK (quantity > 0)
├── unit               text NOT NULL DEFAULT 'ea'
├── status             text NOT NULL DEFAULT 'open'  -- open | on_purchase_order | fulfilled
├── requested_by       text            FK → employee.party_id (ON DELETE SET NULL)
├── requested_at       timestamptz NOT NULL DEFAULT now()
└── updated_at         timestamptz NOT NULL DEFAULT now()
```

Narrowing (part_id) can happen at any point up to PO creation without blocking the request (soft-spec description-only is valid per **L18**) — either the PM/tech sets `part_id` while `open`, or the purchaser sets it only on the **PO line** (`purchase_order_line.part_id`/`vendor_part_id`) and never touches the request row at all. Both paths already work with this shape; no extra column needed.

**Ripple, noted for the eventual task, not decided further here:**

- `purchase_order_line.requested_order_line_id` retargets to `job_material_request.id` (same shape, same `ON DELETE SET NULL`).
- Every DAL join of the form `requested_order_line rol INNER JOIN requested_order ro ON ro.id = rol.requested_order_id WHERE ro.job_id = $1` (in `job-field-zone-order-write.ts`, `remaining.ts` ×2, `detail-load.ts`) collapses to a single-table `WHERE job_material_request.job_id = $1`.
- `requested_order_detail` Surface (anchor-table-with-collection pattern) is dropped; `requested_order_list` becomes the sole Surface, no `/requisitions/[id]` route.
- `lib/requested-orders/*` folder / route naming likely renames to match — mechanical, do at task-authoring time.
- Treat as its own small follow-up task (migration + DAL rewrite + Surface change), authored after this doc's remaining forks are closed, not folded into 53.

---

## §7 — Locked: PO line rollup vs. zone traceability for receiving

**Status: Locked (2026-07-18).**

Your question: does a PO need to know which zone its parts are for (so receiving can record correctly), or is it first-come-first-served — and is a PO line still the rolled-up qty per item × vendor × job?

**Two separate layers, and the existing locked model already answers most of this:**

1. **PO line = rolled-up qty per item × vendor × job.** **Confirmed, correct** — this is the natural read of [R5](../decisions/procurement.md#decision-requisition-surfaces-ux-r1r8-2026-07-16) (one draft PO per job × vendor) and standard purchasing practice: you don't want five PO lines for the same SKU just because five zones asked for it separately — that's noise on the vendor-facing document and complicates pricing.
2. **Receiving does not need zone knowledge.** Per the already-locked [job-site inventory model](../decisions/procurement.md#decision-procurement--requisition-layer-and-job-site-inventory-2026-06-17), on-hand tracking in v1 is a **job × part** ledger, not job × zone × part — material becomes a fungible pool for that job once received. Zone is a *demand-side* concept (which zone asked for it, so the PO gets created); it's not a *supply-side* concept in v1. So: **not first-come-first-served physically** — there's no physical zone allocation at all in v1, by design.

**The bookkeeping gap (zone traceability for rolled-up PO lines):**

| # | Question | Locked answer |
|---|---|---|
| **PO7** | Today's schema (`purchase_order_line.requested_order_line_id`, singular FK) can only close out **one** requisition line per PO line. If a PO line rolls up qty from multiple zone-tagged requests (per #1 above), how do those requests get marked `fulfilled`, and how does the PO line know its zone split? | New join table `purchase_order_line_source (purchase_order_line_id, job_material_request_id, quantity)` — one PO line → many source rows, each pointing at one originating `job_material_request` with the qty portion it contributed. Sum of a PO line's source quantities must equal the PO line's own quantity (validated at write time, app-level — not a DB constraint, same style as the existing "remaining" cap checks). Walking the source rows gives zone attribution: each source row's `job_material_request.site_zone_id` + qty tells you how much of the rolled-up line belongs to each zone. |
| **PO8** | When a receipt partially covers the PO line, which contributing request(s) get marked `fulfilled` first? | **First-come-first-served by `job_material_request.requested_at`** — simplest v1 rule, matches your instinct, and it's pure bookkeeping (which zone's *ask* gets closed out first), not a claim about which physical box went where. |
| **PO9** | Does every PO line need a source row, or can a purchaser add a part straight to a PO with no backing request at all (per your note under RQ3: "purchaser can add parts as needed to any Job PO, it just needs to link to a zone")? | **Every PO line always has ≥1 source row — no direct `site_zone_id` column on `purchase_order_line`, one mechanism only.** When a purchaser adds an ad-hoc part directly on a PO (no existing Field-created request behind it), that action **transparently creates the backing `job_material_request` row** (zone = whatever the purchaser picks, or **General** if they don't specify — "base zone") **and** the source-link row **and** the PO line, all in one step — with the request's status set straight to `on_purchase_order` since it's created already-ordered. This keeps zone attribution derivable purely from `purchase_order_line_source` for every PO line, with no fallback column to keep in sync. |

**Walkthrough (confirms PO9 against your Field-ad-hoc scenario):** Field tech adds an ad-hoc line in a zone with no real part yet (soft-spec, **L18**) → `job_material_request {site_zone_id: <zone>, part_id: null, description: "..."}`→ shows up in the purchaser's open pool → purchaser either narrows the part and orders it (source row + PO line created, request → `on_purchase_order`), or leaves it off the PO until Field/PM corrects the part, then orders it later. That path already had a zone (Field supplied it). PO9 only adds the *purchaser-initiated* mirror of this — same backing-request mechanism, just created by the purchaser instead of the tech, defaulting to General when they don't pick a zone.

**Table shape:**

```text
purchase_order_line_source
├── id                       text PK
├── purchase_order_line_id   text NOT NULL  FK → purchase_order_line.id (ON DELETE CASCADE)
├── job_material_request_id text NOT NULL  FK → job_material_request.id (ON DELETE RESTRICT)
├── quantity                 numeric NOT NULL  CHECK (quantity > 0)
└── UNIQUE (purchase_order_line_id, job_material_request_id)
```

**Recommendation:** PO7–PO9 — needed before task 53's batch-create can honestly support "pool open lines across zones for the same part into one PO line." No `purchase_order_line.site_zone_id` column; no `purchase_order.job_id` nullability change is needed for *this* fork specifically (a job-less PO's lines simply have no source rows tying them to any `job_material_request`, which is fine — job-less POs have no zones to attribute by definition).

---

## §8 — Clarification: "blocked zone"

Not a proposed field or status — just plain-language shorthand for an example issue (e.g. "electrical room locked, waiting on GC," "no power to panel yet"). **ISS7** (§3) considered adding a `blocking` flag/severity for exactly this case and was explicitly left out of this pass — issues are decoupled from progress on purpose (**ISS4**), and no stronger badge ships this cycle.

---

## §9 — Locked: PM approval gate on requested items (explicit v2 deferral)

Your read of current behavior is correct: **every `open` requisition line — BOM-linked, ad-hoc-with-part, or soft-spec description-only — is equally poolable by the purchaser today.** There's no approval gate between "tech/PM requested it" and "purchaser can put it on a PO." (Soft-spec is allowed per **L18**; truly empty TBD — no description and no part — is blocked at write time, so it never becomes visible to the purchaser in the first place.)

| # | Question | Recommendation |
|---|---|---|
| **AP1** | Add a PM-approval step before purchaser visibility? | **Confirmed v2, not now** — matches your call. Record it here so it isn't silently lost, same pattern as [R7 ready-pool deferral](../decisions/procurement.md#decision-ready-pool-ui-deferred-r7-2026-07-16). |
| **AP2** | Shape when it does land | Likely an `approved_by`/`approved_at` pair (or a `pending_approval` status ahead of `open`) on `requested_order_line`, with the PO workbench pool filtering to approved-only. Don't design further now — just noting the likely shape so task 53's line-status enum isn't accidentally built in a way that forecloses it. |

---

## Decision-session agenda — all closed

1. ~~**PR1** — freeze historical % basis on `job_progress_report_cell`~~ — **done** (2026-07-18, migration 086)
2. ~~**RQ1–RQ4** — drop `requested_order`/`requested_order_line`, replace with `job_material_request`~~ — **locked** (2026-07-18, §6), fully closed — RQ2's sub-item resolved: purchasers have no decline/delete authority, so there's no second removal path to design
3. ~~**PO1–PO6** — PO cancel/retract lifecycle~~ — **locked** (2026-07-18, §2): no hard shipment-based block, three-level cancel granularity (header/line/shipment), backorder handled via shipment-level cancel — re-author task 53 around this
4. ~~**PO7–PO9** — PO-line rollup vs. zone traceability~~ — **locked** (2026-07-18, §7): `purchase_order_line_source` join table, no direct zone column, purchaser ad-hoc-on-PO adds transparently create a backing `job_material_request`
5. ~~**§5** — fix committed-cost rollup~~ — **done** (2026-07-18)
6. ~~**ISS1–ISS7** — zone issues shape~~ — **locked** (2026-07-18, §3): multi-issue-per-zone, no reopen, batched Save (like progress/Order), no snapshot table needed, ISS7 `blocking` flag left out; author as its own task
7. ~~**AH1–AH3** — Field-direct ad-hoc~~ — **locked** (2026-07-18, §4): batched Save, no BOM link, Scope-first path stays alongside it
8. ~~**AP1–AP2** — PM approval gate on requested items~~ — **confirmed v2 deferral** (no action now, just recorded)

**Out of this session:** report scheduling (L2), progress notes (L3/L24), report history UI (L17/L25) — still deferred per [20](./20-field-labor-materials-open.md).

**Next step — implementation, not more decisions:** the follow-on tasks this doc unblocks, roughly in dependency order:

1. **`job_material_request` migration** (§6) — drop `requested_order`/`requested_order_line`, add the new table, retarget `purchase_order_line.requested_order_line_id`, add `purchase_order_line_source` (§7), rewrite `lib/requested-orders/*` DAL, collapse `requested_order_detail` Surface into a list-only `requested_order_list`.
2. **Task 53 rewrite** — PO workbench: batch-create against `job_material_request`, Send, and the full cancel lifecycle (§2) at header/line/shipment granularity.
3. **Zone issues task** (§3) — new `job_issue` table + Field UI block, batched into the whole-job Save.
4. **Field ad-hoc UI** (§4) — "+ Add material" on the Field zone panel, batched into the same Save.

---

## Related

- [20 — Field labor + materials (locked)](./20-field-labor-materials-open.md)
- [Decision — Field progress reports + zone Order compose](../decisions/job.md#decision-field--progress-reports--zone-order-compose-2026-07-17)
- [Decision — Field zone Order → requisition snapshots](../decisions/procurement.md#decision-field-zone-order--requisition-snapshots-2026-07-17)
- [Task 55 — Field progress reports + zone Order](../tasks/55-field-progress-reports-zone-order.md) ✅
- [Task 53 — PO workbench (stub)](../tasks/53-purchase-order-workbench.md) ← next
- [15 — job costing + CO/BOM/scope-phase](./15-job-costing-and-change-orders.md)
