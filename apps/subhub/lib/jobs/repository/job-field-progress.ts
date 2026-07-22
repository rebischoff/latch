import type { JobFieldOrderCell, JobFieldOrderRow } from "./job-field-order";
import type { JobIssueRow } from "./job-issue";

/**
 * Job Field progress — zone×phase boolean snapshot (task 51 / F1–F9).
 *
 * % and lifecycle (except cancelled) are derived on read — never stored on `job`.
 * Writable Surface Field `field_progress` is a replace-array of cells.
 * Order cells (`order_cells`) are an independent axis (task 62).
 */

export const FIELD_PROGRESS_STALE_DAYS = 30;

export const GENERAL_ZONE_KEY = "general";

export type JobFieldLifecycle =
  | "not_started"
  | "in_progress"
  | "completed"
  | "cancelled";

export type JobFieldProgressCell = {
  complete: boolean;
  scope_phase_id: string;
  /** null = General (unplaced). */
  site_zone_id: string | null;
};

export type JobFieldProgressCellPatch = {
  complete: boolean;
  scope_phase_id: string;
  site_zone_id: string | null;
};

export type JobFieldProgressZoneNode = {
  children?: JobFieldProgressZoneNode[];
  key: string;
  site_zone_id: string | null;
  title: string;
};

export type JobFieldProgressPhaseColumn = {
  labor_phase_id: string;
  name: string;
  sequence: number;
};

export type JobFieldProgressWorkRow = {
  id: string;
  item: string;
  job_line_id: string;
  labor_phase_ids: string[];
  part_mpn: string | null;
  /** PO trail when a requisition line for this zone×part is on a PO (blank until 53). */
  purchase_order_number: string | null;
  purchase_order_status: string | null;
  qty: number;
  zone_key: string;
};

/** Countable hour slice for % (F8/F9). */
export type FieldProgressSlice = {
  complete: boolean;
  hours: number;
  labor_phase_id: string;
  scope_phase_id: string;
  site_zone_id: string | null;
  zone_key: string;
};

/** @deprecated Task 55 zone-level Order — superseded by `order_cells` (task 62). */
export type JobFieldZoneOrderState = {
  locked: boolean;
  ordered: boolean;
  site_zone_id: string | null;
  zone_key: string;
};

/** @deprecated Task 55 zone-level Order patch — superseded by order cell patches (task 62). */
export type JobFieldZoneOrderPatch = {
  ordered: boolean;
  site_zone_id: string | null;
};

export type JobFieldProgressDto = {
  cells: JobFieldProgressCell[];
  /** Persisted issues for the job (open prioritized) — task 57. */
  issues: JobIssueRow[];
  lifecycle: JobFieldLifecycle;
  /**
   * Zone × material-phase Order cells (task 62). Includes derived
   * `unlocked_excluded_count` per cell.
   */
  order_cells: JobFieldOrderCell[];
  /**
   * BOM geography rows for Order cascade (material phase only).
   * Internal to Field UI — not displayed as a Work list (JML8).
   */
  order_rows: JobFieldOrderRow[];
  phases: JobFieldProgressPhaseColumn[];
  progress_pct: number;
  /** Maps job_line × labor_phase → scope_phase ids for Field cascade writes. */
  scope_phase_index: Array<{
    job_line_id: string;
    labor_phase_id: string;
    scope_phase_id: string;
  }>;
  stale: boolean;
  /**
   * Geography × labor-phase rows for Done cascade. No longer rendered as a
   * Field Work/parts table (JML8 / task 62).
   */
  work_rows: JobFieldProgressWorkRow[];
  /** @deprecated Empty after task 62 — use `order_cells`. */
  zone_orders: JobFieldZoneOrderState[];
  zone_tree: JobFieldProgressZoneNode[];
};

export type FieldProgressInputs = {
  cells: JobFieldProgressCell[];
  field_progress_updated_at: Date | string | null;
  job_status: string;
  now?: Date;
  slices: Array<Omit<FieldProgressSlice, "complete">>;
};

export const zoneKeyFor = (siteZoneId: string | null): string =>
  siteZoneId ?? GENERAL_ZONE_KEY;

export const siteZoneIdFromKey = (zoneKey: string): string | null =>
  zoneKey === GENERAL_ZONE_KEY ? null : zoneKey;

/**
 * Hours-weighted progress % (F8/F9).
 * Returns 0 when there are no countable hours.
 */
export const computeFieldProgressPct = (
  slices: Array<Pick<FieldProgressSlice, "hours" | "complete">>,
): number => {
  let total = 0;
  let done = 0;
  for (const slice of slices) {
    const hours = Number(slice.hours);
    if (!(hours > 0)) {
      continue;
    }
    total += hours;
    if (slice.complete) {
      done += hours;
    }
  }
  if (total <= 0) {
    return 0;
  }
  return (done / total) * 100;
};

/**
 * Derived lifecycle + stale overlay (51).
 * Cancelled is stored on `job.status`; everything else from %.
 */
export const deriveFieldLifecycle = (input: {
  field_progress_updated_at: Date | string | null;
  job_status: string;
  now?: Date;
  progress_pct: number;
  stale_days?: number;
}): { lifecycle: JobFieldLifecycle; stale: boolean } => {
  if (input.job_status === "cancelled") {
    return { lifecycle: "cancelled", stale: false };
  }

  const pct = input.progress_pct;
  if (pct <= 0) {
    return { lifecycle: "not_started", stale: false };
  }
  if (pct >= 100) {
    return { lifecycle: "completed", stale: false };
  }

  const staleDays = input.stale_days ?? FIELD_PROGRESS_STALE_DAYS;
  const now = input.now ?? new Date();
  let stale = false;
  if (input.field_progress_updated_at) {
    const updated = new Date(input.field_progress_updated_at);
    const ageMs = now.getTime() - updated.getTime();
    stale = ageMs >= staleDays * 24 * 60 * 60 * 1000;
  } else {
    // In progress with no Field write timestamp — treat as stale once past threshold
    // from "now" would never fire; without a write date we cannot measure quiet time.
    stale = false;
  }

  return { lifecycle: "in_progress", stale };
};

export const buildFieldProgressSummary = (
  input: FieldProgressInputs,
): Pick<JobFieldProgressDto, "lifecycle" | "progress_pct" | "stale"> => {
  const completeByKey = new Map<string, boolean>();
  for (const cell of input.cells) {
    completeByKey.set(
      `${cell.scope_phase_id}:${zoneKeyFor(cell.site_zone_id)}`,
      cell.complete,
    );
  }

  const slices: FieldProgressSlice[] = input.slices.map((slice) => ({
    ...slice,
    complete:
      completeByKey.get(
        `${slice.scope_phase_id}:${zoneKeyFor(slice.site_zone_id)}`,
      ) ?? false,
  }));

  const progress_pct = computeFieldProgressPct(slices);
  const { lifecycle, stale } = deriveFieldLifecycle({
    job_status: input.job_status,
    progress_pct,
    field_progress_updated_at: input.field_progress_updated_at,
    now: input.now,
  });

  return { progress_pct, lifecycle, stale };
};

/** Empty board when the job has no scope phases / allocations yet. */
export const emptyFieldProgressDto = (
  jobStatus: string,
): JobFieldProgressDto => {
  const { lifecycle, stale } = deriveFieldLifecycle({
    job_status: jobStatus,
    progress_pct: 0,
    field_progress_updated_at: null,
  });
  return {
    cells: [],
    zone_tree: [],
    phases: [],
    work_rows: [],
    order_cells: [],
    order_rows: [],
    zone_orders: [],
    issues: [],
    scope_phase_index: [],
    progress_pct: 0,
    lifecycle,
    stale,
  };
};
