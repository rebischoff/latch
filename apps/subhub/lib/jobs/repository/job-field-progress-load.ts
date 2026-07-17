import type { Pool, PoolClient } from "pg";

import { tableExists } from "@/lib/sites/repository/sql-utils";

import {
  buildFieldProgressSummary,
  emptyFieldProgressDto,
  GENERAL_ZONE_KEY,
  zoneKeyFor,
  type FieldProgressSlice,
  type JobFieldProgressCell,
  type JobFieldProgressDto,
  type JobFieldProgressPhaseColumn,
  type JobFieldProgressWorkRow,
  type JobFieldProgressZoneNode,
} from "./job-field-progress";

type ScopePhaseRow = {
  hours_per_unit: number;
  id: string;
  job_line_id: string;
  labor_phase_id: string | null;
  name: string;
  sequence: number;
  sort_order: number;
};

type LineGeoRow = {
  description: string;
  id: string;
  item_name: string | null;
  part_id: string | null;
  part_mpn: string | null;
  quantity: number;
};

type AllocRow = {
  job_line_id: string;
  quantity: number;
  site_zone_id: string;
  site_zone_name: string | null;
};

type ZoneFlatRow = {
  id: string;
  name: string;
  parent_zone_id: string | null;
  sort_order: number;
};

const num = (value: unknown): number => Number(value ?? 0);

const cellKey = (scopePhaseId: string, siteZoneId: string | null): string =>
  `${scopePhaseId}:${zoneKeyFor(siteZoneId)}`;

/**
 * Build countable slices for active lines: one per (scope_phase × allocation)
 * plus General for unplaced qty (line.quantity − Σ alloc qty).
 */
export const buildFieldProgressSlices = (input: {
  allocations: AllocRow[];
  lines: LineGeoRow[];
  phases: ScopePhaseRow[];
}): Array<Omit<FieldProgressSlice, "complete">> => {
  const allocsByLine = new Map<string, AllocRow[]>();
  for (const alloc of input.allocations) {
    const rows = allocsByLine.get(alloc.job_line_id) ?? [];
    rows.push(alloc);
    allocsByLine.set(alloc.job_line_id, rows);
  }

  const phasesByLine = new Map<string, ScopePhaseRow[]>();
  for (const phase of input.phases) {
    if (!phase.labor_phase_id) {
      continue;
    }
    const rows = phasesByLine.get(phase.job_line_id) ?? [];
    rows.push(phase);
    phasesByLine.set(phase.job_line_id, rows);
  }

  const slices: Array<Omit<FieldProgressSlice, "complete">> = [];

  for (const line of input.lines) {
    const phases = phasesByLine.get(line.id) ?? [];
    if (phases.length === 0) {
      continue;
    }

    const allocs = allocsByLine.get(line.id) ?? [];
    let placedQty = 0;
    for (const alloc of allocs) {
      placedQty += num(alloc.quantity);
      for (const phase of phases) {
        slices.push({
          scope_phase_id: phase.id,
          labor_phase_id: phase.labor_phase_id as string,
          site_zone_id: alloc.site_zone_id,
          zone_key: zoneKeyFor(alloc.site_zone_id),
          hours: num(phase.hours_per_unit) * num(alloc.quantity),
        });
      }
    }

    const generalQty = num(line.quantity) - placedQty;
    if (generalQty > 0) {
      for (const phase of phases) {
        slices.push({
          scope_phase_id: phase.id,
          labor_phase_id: phase.labor_phase_id as string,
          site_zone_id: null,
          zone_key: GENERAL_ZONE_KEY,
          hours: num(phase.hours_per_unit) * generalQty,
        });
      }
    }
  }

  return slices;
};

const pruneZoneTree = (
  flat: ZoneFlatRow[],
  allocatedIds: Set<string>,
): JobFieldProgressZoneNode[] => {
  if (allocatedIds.size === 0) {
    return [];
  }

  const byId = new Map(flat.map((row) => [row.id, row]));
  const keep = new Set<string>();
  for (const id of allocatedIds) {
    let current: string | null = id;
    while (current) {
      keep.add(current);
      current = byId.get(current)?.parent_zone_id ?? null;
    }
  }

  const nest = (parentId: string | null): JobFieldProgressZoneNode[] => {
    const children = flat
      .filter(
        (row) =>
          keep.has(row.id) && (row.parent_zone_id ?? null) === parentId,
      )
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      );

    return children.map((row) => {
      const nested = nest(row.id);
      return {
        key: row.id,
        title: row.name,
        site_zone_id: row.id,
        ...(nested.length > 0 ? { children: nested } : {}),
      };
    });
  };

  // Roots present in the pruned set (parent missing or outside keep path).
  const roots = flat.filter((row) => {
    if (!keep.has(row.id)) {
      return false;
    }
    const parent = row.parent_zone_id;
    return parent === null || !keep.has(parent);
  });

  // Prefer nesting under real parents when those parents are kept.
  const topLevel = roots.filter((row) => {
    const parent = row.parent_zone_id;
    return parent === null || !keep.has(parent);
  });

  return topLevel
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    )
    .map((row) => {
      const nested = nest(row.id);
      return {
        key: row.id,
        title: row.name,
        site_zone_id: row.id,
        ...(nested.length > 0 ? { children: nested } : {}),
      };
    });
};

const buildWorkRows = (input: {
  allocations: AllocRow[];
  lines: LineGeoRow[];
  phases: ScopePhaseRow[];
  slices: Array<Omit<FieldProgressSlice, "complete">>;
}): JobFieldProgressWorkRow[] => {
  const laborByLine = new Map<string, string[]>();
  for (const phase of input.phases) {
    if (!phase.labor_phase_id) {
      continue;
    }
    const ids = laborByLine.get(phase.job_line_id) ?? [];
    if (!ids.includes(phase.labor_phase_id)) {
      ids.push(phase.labor_phase_id);
    }
    laborByLine.set(phase.job_line_id, ids);
  }

  const rows: JobFieldProgressWorkRow[] = [];
  const allocsByLine = new Map<string, AllocRow[]>();
  for (const alloc of input.allocations) {
    const list = allocsByLine.get(alloc.job_line_id) ?? [];
    list.push(alloc);
    allocsByLine.set(alloc.job_line_id, list);
  }

  for (const line of input.lines) {
    const laborIds = laborByLine.get(line.id) ?? [];
    // Lines with no labor phases still appear in the Field items table
    // (informational — no phase checkboxes / % contribution).
    const allocs = allocsByLine.get(line.id) ?? [];
    let placed = 0;
    for (const alloc of allocs) {
      placed += num(alloc.quantity);
      rows.push({
        id: `${line.id}:${alloc.site_zone_id}`,
        job_line_id: line.id,
        zone_key: zoneKeyFor(alloc.site_zone_id),
        item: line.item_name ?? line.description,
        part_mpn: line.part_mpn,
        qty: num(alloc.quantity),
        labor_phase_ids: laborIds,
      });
    }
    const generalQty = num(line.quantity) - placed;
    if (generalQty > 0) {
      rows.push({
        id: `${line.id}:${GENERAL_ZONE_KEY}`,
        job_line_id: line.id,
        zone_key: GENERAL_ZONE_KEY,
        item: line.item_name ?? line.description,
        part_mpn: line.part_mpn,
        qty: generalQty,
        labor_phase_ids: laborIds,
      });
    }
  }

  return rows;
};

const buildPhaseColumns = (
  phases: ScopePhaseRow[],
  slices: Array<Omit<FieldProgressSlice, "complete">>,
): JobFieldProgressPhaseColumn[] => {
  const used = new Set(slices.map((s) => s.labor_phase_id));
  const byLabor = new Map<string, JobFieldProgressPhaseColumn>();
  for (const phase of phases) {
    if (!phase.labor_phase_id || !used.has(phase.labor_phase_id)) {
      continue;
    }
    const existing = byLabor.get(phase.labor_phase_id);
    if (!existing || phase.sequence < existing.sequence) {
      byLabor.set(phase.labor_phase_id, {
        labor_phase_id: phase.labor_phase_id,
        name: phase.name,
        sequence: phase.sequence,
      });
    }
  }
  return [...byLabor.values()].sort(
    (a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name),
  );
};

const buildZoneTree = (input: {
  allocations: AllocRow[];
  catalog_scope_name: string | null;
  has_general: boolean;
  zones: ZoneFlatRow[];
}): JobFieldProgressZoneNode[] => {
  const allocatedIds = new Set(input.allocations.map((a) => a.site_zone_id));
  const pruned = pruneZoneTree(input.zones, allocatedIds);
  const generalNode: JobFieldProgressZoneNode | null = input.has_general
    ? {
        key: GENERAL_ZONE_KEY,
        title: "General",
        site_zone_id: null,
      }
    : null;

  const rootTitle = input.catalog_scope_name?.trim() || "Scope";

  // Avoid Fire Alarm → Fire Alarm when the site category root only exists as an
  // ancestor of allocated leaves and shares the catalog scope display name.
  let zoneNodes = pruned;
  if (pruned.length === 1) {
    const only = pruned[0]!;
    const titlesMatch =
      only.title.trim().toLowerCase() === rootTitle.trim().toLowerCase();
    const rootAllocated =
      only.site_zone_id !== null && allocatedIds.has(only.site_zone_id);
    if (titlesMatch && !rootAllocated) {
      zoneNodes = only.children ?? [];
    }
  }

  const children = [...zoneNodes, ...(generalNode ? [generalNode] : [])];
  if (children.length === 0) {
    return [];
  }

  return [
    {
      key: "scope-root",
      title: rootTitle,
      site_zone_id: null,
      children,
    },
  ];
};

export const loadJobFieldProgress = async (
  pool: Pool | PoolClient,
  jobId: string,
): Promise<JobFieldProgressDto> => {
  const jobResult = await pool.query<{
    catalog_scope_display_name: string | null;
    field_progress_updated_at: Date | null;
    site_id: string;
    status: string;
  }>(
    `SELECT
       j.status,
       j.site_id,
       j.field_progress_updated_at,
       i.name AS catalog_scope_display_name
     FROM job j
     LEFT JOIN item i ON i.id = j.catalog_scope_item_id
     WHERE j.id = $1`,
    [jobId],
  );
  const job = jobResult.rows[0];
  if (!job) {
    return emptyFieldProgressDto("planned");
  }

  if (!(await tableExists(pool, "scope_phase"))) {
    return emptyFieldProgressDto(job.status);
  }

  const linesResult = await pool.query<LineGeoRow>(
    `SELECT
       jl.id,
       jl.description,
       jl.quantity,
       i.name AS item_name,
       jl.part_id,
       mp.mpn AS part_mpn
     FROM job_line jl
     LEFT JOIN item i ON i.id = jl.item_id
     LEFT JOIN manufacturer_part mp ON mp.id = jl.part_id
     WHERE jl.job_id = $1
       AND jl.status = 'active'
     ORDER BY jl.sort_order ASC, jl.line_number ASC, jl.id ASC`,
    [jobId],
  );
  const lines = linesResult.rows.map((row) => ({
    ...row,
    quantity: num(row.quantity),
  }));

  if (lines.length === 0) {
    return emptyFieldProgressDto(job.status);
  }

  const lineIds = lines.map((row) => row.id);

  const phasesResult = await pool.query<ScopePhaseRow>(
    `SELECT
       sp.id,
       sp.job_line_id,
       sp.labor_phase_id,
       sp.name,
       sp.sequence,
       sp.sort_order,
       sp.progress_weight AS hours_per_unit
     FROM scope_phase sp
     WHERE sp.job_line_id = ANY($1::text[])
     ORDER BY sp.sort_order ASC, sp.sequence ASC, sp.id ASC`,
    [lineIds],
  );
  const phases = phasesResult.rows.map((row) => ({
    ...row,
    hours_per_unit: num(row.hours_per_unit),
  }));

  let allocations: AllocRow[] = [];
  if (await tableExists(pool, "job_line_allocation")) {
    const allocResult = await pool.query<AllocRow>(
      `SELECT
         jla.job_line_id,
         jla.site_zone_id,
         jla.quantity,
         sz.name AS site_zone_name
       FROM job_line_allocation jla
       LEFT JOIN site_zone sz ON sz.id = jla.site_zone_id
       WHERE jla.job_line_id = ANY($1::text[])
       ORDER BY jla.site_zone_id ASC`,
      [lineIds],
    );
    allocations = allocResult.rows.map((row) => ({
      ...row,
      quantity: num(row.quantity),
    }));
  }

  const slices = buildFieldProgressSlices({ lines, allocations, phases });
  if (slices.length === 0) {
    return emptyFieldProgressDto(job.status);
  }

  let cells: JobFieldProgressCell[] = [];
  if (await tableExists(pool, "job_field_progress_cell")) {
    const phaseIds = [...new Set(phases.map((p) => p.id))];
    const cellResult = await pool.query<{
      complete: boolean;
      scope_phase_id: string;
      site_zone_id: string | null;
    }>(
      `SELECT scope_phase_id, site_zone_id, complete
       FROM job_field_progress_cell
       WHERE scope_phase_id = ANY($1::text[])`,
      [phaseIds],
    );
    cells = cellResult.rows.map((row) => ({
      scope_phase_id: row.scope_phase_id,
      site_zone_id: row.site_zone_id,
      complete: Boolean(row.complete),
    }));
  }

  // Only expose cells that match countable slices (drop orphans after CO).
  const sliceKeys = new Set(
    slices.map((s) => cellKey(s.scope_phase_id, s.site_zone_id)),
  );
  cells = cells.filter((c) =>
    sliceKeys.has(cellKey(c.scope_phase_id, c.site_zone_id)),
  );

  const summary = buildFieldProgressSummary({
    slices,
    cells,
    job_status: job.status,
    field_progress_updated_at: job.field_progress_updated_at,
  });

  const allocatedZoneIds = [...new Set(allocations.map((a) => a.site_zone_id))];
  let zones: ZoneFlatRow[] = [];
  if (allocatedZoneIds.length > 0) {
    const zoneResult = await pool.query<ZoneFlatRow>(
      `SELECT id, parent_zone_id, name, sort_order
       FROM site_zone
       WHERE site_id = $1`,
      [job.site_id],
    );
    zones = zoneResult.rows;
  }

  const hasGeneral = slices.some((s) => s.site_zone_id === null);

  const scope_phase_index = phases
    .filter((p) => p.labor_phase_id)
    .map((p) => ({
      job_line_id: p.job_line_id,
      labor_phase_id: p.labor_phase_id as string,
      scope_phase_id: p.id,
    }));

  const work_rows = buildWorkRows({ lines, allocations, phases, slices });

  return {
    cells,
    zone_tree: buildZoneTree({
      allocations,
      zones,
      has_general: hasGeneral,
      catalog_scope_name: job.catalog_scope_display_name,
    }),
    phases: buildPhaseColumns(phases, slices),
    work_rows,
    scope_phase_index,
    progress_pct: summary.progress_pct,
    lifecycle: summary.lifecycle,
    stale: summary.stale,
  };
};

/** Lightweight list projection — % + lifecycle only. */
export const loadJobFieldProgressSummaries = async (
  pool: Pool,
  jobIds: string[],
): Promise<
  Map<
    string,
    Pick<JobFieldProgressDto, "lifecycle" | "progress_pct" | "stale">
  >
> => {
  const out = new Map<
    string,
    Pick<JobFieldProgressDto, "lifecycle" | "progress_pct" | "stale">
  >();
  if (jobIds.length === 0) {
    return out;
  }

  for (const jobId of jobIds) {
    const dto = await loadJobFieldProgress(pool, jobId);
    out.set(jobId, {
      progress_pct: dto.progress_pct,
      lifecycle: dto.lifecycle,
      stale: dto.stale,
    });
  }
  return out;
};
