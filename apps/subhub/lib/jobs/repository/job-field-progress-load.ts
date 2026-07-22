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
import {
  buildOrderRows,
  unlockedExcludedCountByCell,
  type JobFieldOrderCell,
  type OrderEligibilityLine,
} from "./job-field-order";
import { listIssuesForJob } from "./job-issue";

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
        purchase_order_number: null,
        purchase_order_status: null,
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
        purchase_order_number: null,
        purchase_order_status: null,
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

  const linesResult = await pool.query<
    LineGeoRow & {
      item_id: string | null;
      material_locked: boolean;
      material_phase_id: string | null;
    }
  >(
    `SELECT
       jl.id,
       jl.description,
       jl.quantity,
       i.name AS item_name,
       jl.part_id,
       mp.mpn AS part_mpn,
       jl.item_id,
       jl.material_locked,
       jl.material_phase_id
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
    material_locked: Boolean(row.material_locked),
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

  const { order_cells, order_rows } = await loadOrderBoard(pool, {
    lines,
    allocations,
    phases,
  });
  const issues = await listIssuesForJob(pool, jobId);

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
    order_cells,
    order_rows,
    zone_orders: [],
    issues,
    scope_phase_index,
    progress_pct: summary.progress_pct,
    lifecycle: summary.lifecycle,
    stale: summary.stale,
  };
};

type LineWithMaterial = LineGeoRow & {
  item_id: string | null;
  material_locked: boolean;
  material_phase_id: string | null;
};

const loadOrderBoard = async (
  pool: Pool | PoolClient,
  input: {
    allocations: AllocRow[];
    lines: LineWithMaterial[];
    phases: ScopePhaseRow[];
  },
): Promise<{
  order_cells: JobFieldOrderCell[];
  order_rows: ReturnType<typeof buildOrderRows>;
}> => {
  const { lines, allocations, phases } = input;
  if (lines.length === 0) {
    return { order_cells: [], order_rows: [] };
  }

  const lineIds = lines.map((row) => row.id);
  const itemIds = [
    ...new Set(
      lines
        .map((row) => row.item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let bomLineIds = new Set<string>();
  if (await tableExists(pool, "job_line_part")) {
    const bomResult = await pool.query<{ job_line_id: string }>(
      `SELECT DISTINCT job_line_id
       FROM job_line_part
       WHERE job_line_id = ANY($1::text[])`,
      [lineIds],
    );
    bomLineIds = new Set(bomResult.rows.map((row) => row.job_line_id));
  }

  const itemMaterialById = new Map<string, string | null>();
  const itemParentById = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const itemResult = await pool.query<{
      id: string;
      material_phase_id: string | null;
      parent_id: string | null;
    }>(
      `WITH RECURSIVE chain AS (
         SELECT id, parent_id, material_phase_id
         FROM item
         WHERE id = ANY($1::text[])
         UNION ALL
         SELECT i.id, i.parent_id, i.material_phase_id
         FROM item i
         INNER JOIN chain c ON i.id = c.parent_id
       )
       SELECT DISTINCT id, parent_id, material_phase_id FROM chain`,
      [itemIds],
    );
    for (const row of itemResult.rows) {
      itemMaterialById.set(row.id, row.material_phase_id);
      itemParentById.set(row.id, row.parent_id);
    }
  }

  const ancestryForItem = (itemId: string | null): Array<string | null> => {
    if (!itemId) {
      return [];
    }
    const chain: Array<string | null> = [];
    let current: string | null = itemId;
    const guard = new Set<string>();
    while (current && !guard.has(current)) {
      guard.add(current);
      chain.push(itemMaterialById.get(current) ?? null);
      current = itemParentById.get(current) ?? null;
    }
    return chain;
  };

  const phasesByLine = new Map<string, ScopePhaseRow[]>();
  for (const phase of phases) {
    const list = phasesByLine.get(phase.job_line_id) ?? [];
    list.push(phase);
    phasesByLine.set(phase.job_line_id, list);
  }

  const allocsByLine = new Map<string, AllocRow[]>();
  for (const alloc of allocations) {
    const list = allocsByLine.get(alloc.job_line_id) ?? [];
    list.push(alloc);
    allocsByLine.set(alloc.job_line_id, list);
  }

  const eligibility: OrderEligibilityLine[] = lines.map((line) => ({
    id: line.id,
    quantity: line.quantity,
    material_locked: line.material_locked,
    lineMaterialPhaseId: line.material_phase_id,
    ancestryMaterialPhaseIds: ancestryForItem(line.item_id),
    has_bom: bomLineIds.has(line.id),
    scopePhases: (phasesByLine.get(line.id) ?? []).map((p) => ({
      id: p.id,
      labor_phase_id: p.labor_phase_id,
      sequence: p.sequence,
    })),
    allocations: (allocsByLine.get(line.id) ?? []).map((a) => ({
      site_zone_id: a.site_zone_id,
      quantity: a.quantity,
    })),
  }));

  const order_rows = buildOrderRows(eligibility);
  const unlockedByCell = unlockedExcludedCountByCell(order_rows);

  let rawCells: Array<{
    requested: boolean;
    scope_phase_id: string;
    site_zone_id: string | null;
  }> = [];

  if (await tableExists(pool, "job_field_order_cell")) {
    const phaseIds = [...new Set(order_rows.map((r) => r.scope_phase_id))];
    if (phaseIds.length > 0) {
      const cellResult = await pool.query<{
        requested: boolean;
        scope_phase_id: string;
        site_zone_id: string | null;
      }>(
        `SELECT scope_phase_id, site_zone_id, requested
         FROM job_field_order_cell
         WHERE scope_phase_id = ANY($1::text[])`,
        [phaseIds],
      );
      rawCells = cellResult.rows.map((row) => ({
        scope_phase_id: row.scope_phase_id,
        site_zone_id: row.site_zone_id,
        requested: Boolean(row.requested),
      }));
    }
  }

  const sliceKeys = new Set(
    order_rows.map((r) =>
      cellKey(r.scope_phase_id, r.zone_key === GENERAL_ZONE_KEY ? null : r.zone_key),
    ),
  );

  const order_cells: JobFieldOrderCell[] = rawCells
    .filter((c) => sliceKeys.has(cellKey(c.scope_phase_id, c.site_zone_id)))
    .map((c) => ({
      ...c,
      unlocked_excluded_count:
        unlockedByCell.get(cellKey(c.scope_phase_id, c.site_zone_id)) ?? 0,
    }));

  // Ensure every orderable slice has a cell entry (requested false) so UI can
  // show unlocked badges even before first check.
  for (const row of order_rows) {
    const key = cellKey(
      row.scope_phase_id,
      row.zone_key === GENERAL_ZONE_KEY ? null : row.zone_key,
    );
    if (order_cells.some((c) => cellKey(c.scope_phase_id, c.site_zone_id) === key)) {
      continue;
    }
    order_cells.push({
      scope_phase_id: row.scope_phase_id,
      site_zone_id:
        row.zone_key === GENERAL_ZONE_KEY ? null : row.zone_key,
      requested: false,
      unlocked_excluded_count: unlockedByCell.get(key) ?? 0,
    });
  }

  return { order_cells, order_rows };
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
