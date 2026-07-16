import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { loadScopePanelDefIdSet } from "@/lib/catalog/repository/item-effective-specs";
import { tableExists } from "@/lib/sites/repository/sql-utils";
import {
  assertBucketSpecWritable,
  isBucketSpecBlank,
} from "@/lib/estimates/repository/estimate-bucket-spec-write";

import type {
  JobConditionPatchRow,
  JobConditionSpecPatchRow,
  JobLineItemPatchRow,
} from "../descriptors/job-detail";

type FlatCondition = {
  complexity_factor_id: string | null;
  id: string;
  include_discontinued: boolean;
  include_discontinued_explicit: boolean;
  included_labor_phases: Array<{ labor_phase_id: string }>;
  labor_only: boolean;
  labor_only_explicit: boolean;
  labor_phases_explicit: boolean;
  name: string;
  parent_condition_id: string | null;
  site_zone_id: string | null;
  sort_order: number;
  specs: JobConditionSpecPatchRow[];
};

type RootSiteZone = {
  id: string;
  parent_zone_id: string | null;
  root_item_id: string | null;
  site_id: string;
};

const flattenConditions = (
  conditions: JobConditionPatchRow[] | undefined,
  parentId: string | null,
  out: FlatCondition[],
): void => {
  for (const [index, row] of (conditions ?? []).entries()) {
    const id = row.id ?? crypto.randomUUID();
    const isRoot = parentId === null;

    out.push({
      id,
      name: row.name,
      parent_condition_id: parentId,
      site_zone_id: row.site_zone_id ?? null,
      sort_order: row.sort_order ?? index + 1,
      complexity_factor_id: row.complexity_factor_id ?? null,
      include_discontinued: row.include_discontinued ?? false,
      include_discontinued_explicit: isRoot
        ? true
        : Boolean(row.include_discontinued_explicit),
      labor_only: row.labor_only ?? false,
      labor_only_explicit: isRoot ? true : Boolean(row.labor_only_explicit),
      labor_phases_explicit: isRoot ? true : Boolean(row.labor_phases_explicit),
      included_labor_phases: row.included_labor_phases ?? [],
      specs: row.specs ?? [],
    });

    flattenConditions(
      row.conditions as JobConditionPatchRow[] | undefined,
      id,
      out,
    );
  }
};

const assertNoDuplicateSpecDefs = (
  specs: JobConditionSpecPatchRow[],
  context: string,
): void => {
  const seen = new Set<string>();
  for (const spec of specs) {
    if (seen.has(spec.spec_def_id)) {
      throw new ValidationError("Duplicate spec_def_id in specs", {
        field: "conditions",
        code: "duplicate_spec",
        context,
        spec_def_id: spec.spec_def_id,
      });
    }
    seen.add(spec.spec_def_id);
  }
};

const assertConditionOwnedByJob = async (
  client: PoolClient,
  jobId: string,
  conditionId: string,
): Promise<void> => {
  const result = await client.query<{ job_id: string }>(
    `SELECT job_id FROM job_condition WHERE id = $1`,
    [conditionId],
  );
  if (result.rows.length === 0) {
    return;
  }
  if (result.rows[0]?.job_id !== jobId) {
    throw new ValidationError("job_condition id belongs to another job", {
      field: "conditions",
      code: "foreign_block",
      id: conditionId,
    });
  }
};

const loadJobSiteId = async (
  client: PoolClient,
  jobId: string,
): Promise<string> => {
  const result = await client.query<{ site_id: string }>(
    `SELECT site_id FROM job WHERE id = $1`,
    [jobId],
  );
  const siteId = result.rows[0]?.site_id;
  if (!siteId) {
    throw new ValidationError("Unknown job", {
      field: "conditions",
      code: "unknown_job",
      job_id: jobId,
    });
  }
  return siteId;
};

const assertRootSiteZone = async (
  client: PoolClient,
  siteZoneId: string,
  jobSiteId: string,
): Promise<RootSiteZone> => {
  const result = await client.query<RootSiteZone>(
    `SELECT id, site_id, parent_zone_id, root_item_id
     FROM site_zone WHERE id = $1`,
    [siteZoneId],
  );
  const zone = result.rows[0];
  if (!zone) {
    throw new ValidationError("Unknown site_zone_id", {
      field: "conditions",
      code: "unknown_site_zone",
      site_zone_id: siteZoneId,
    });
  }
  if (zone.site_id !== jobSiteId) {
    throw new ValidationError("site_zone_id must belong to the job site", {
      field: "conditions",
      code: "site_zone_wrong_site",
      site_zone_id: siteZoneId,
    });
  }
  if (zone.parent_zone_id !== null) {
    throw new ValidationError("site_zone_id must be a root-level site zone", {
      field: "conditions",
      code: "site_zone_not_root",
      site_zone_id: siteZoneId,
    });
  }
  if (!zone.root_item_id) {
    throw new ValidationError("Root site zone must have root_item_id", {
      field: "conditions",
      code: "site_zone_missing_root_item",
      site_zone_id: siteZoneId,
    });
  }
  return zone;
};

const assertSpecDefInScopePanel = async (
  client: PoolClient,
  rootItemId: string,
  specDefId: string,
): Promise<void> => {
  const panelIds = await loadScopePanelDefIdSet(client as unknown as Pool, rootItemId);
  if (!panelIds.has(specDefId)) {
    throw new ValidationError("spec_def_id is not in scope panel defs for root category", {
      field: "conditions",
      code: "invalid_scope_panel_spec",
      root_item_id: rootItemId,
      spec_def_id: specDefId,
    });
  }
};

const assertSpecOptionBelongsToDef = async (
  client: PoolClient,
  specDefId: string,
  optionId: string,
): Promise<void> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM spec_option WHERE id = $1 AND spec_def_id = $2`,
    [optionId, specDefId],
  );
  if (result.rows.length === 0) {
    throw new ValidationError("spec_option_id does not belong to spec def", {
      field: "conditions",
      code: "invalid_spec_option",
      spec_def_id: specDefId,
      spec_option_id: optionId,
    });
  }
};

const assertLaborPhasesExist = async (
  client: PoolClient,
  laborPhaseIds: string[],
): Promise<void> => {
  if (laborPhaseIds.length === 0) {
    return;
  }
  const result = await client.query<{ id: string }>(
    `SELECT id FROM labor_phase WHERE id = ANY($1::text[])`,
    [laborPhaseIds],
  );
  if (result.rows.length !== laborPhaseIds.length) {
    throw new ValidationError("Unknown labor_phase_id in included_labor_phases", {
      field: "conditions",
      code: "unknown_labor_phase",
    });
  }
};

const assertNoDuplicateLaborPhases = (
  rows: Array<{ labor_phase_id: string }>,
  context: string,
): void => {
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.labor_phase_id)) {
      throw new ValidationError("Duplicate labor_phase_id in included_labor_phases", {
        field: "conditions",
        code: "duplicate_labor_phase",
        context,
      });
    }
    seen.add(row.labor_phase_id);
  }
};

const replaceConditionLaborPhasesTx = async (
  client: PoolClient,
  jobConditionId: string,
  rows: Array<{ labor_phase_id: string }>,
  explicit: boolean,
): Promise<void> => {
  if (!(await tableExists(client, "job_condition_labor_phase"))) {
    return;
  }

  await client.query(
    `DELETE FROM job_condition_labor_phase WHERE job_condition_id = $1`,
    [jobConditionId],
  );

  if (!explicit) {
    return;
  }

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO job_condition_labor_phase (
         job_condition_id, labor_phase_id, sort_order
       ) VALUES ($1, $2, $3)`,
      [jobConditionId, row.labor_phase_id, index + 1],
    );
  }
};

const insertJobConditionBucketSpecTx = async (
  client: PoolClient,
  jobConditionId: string,
  spec: JobConditionSpecPatchRow,
): Promise<void> => {
  await client.query(
    `INSERT INTO job_condition_spec (
       job_condition_id, spec_def_id, spec_option_id, value_boolean,
       value_number, value_number_max
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      jobConditionId,
      spec.spec_def_id,
      spec.spec_option_id ?? null,
      spec.value_boolean ?? null,
      spec.value_number ?? null,
      spec.value_number_max ?? null,
    ],
  );
};

const loadReferencedConditionIds = async (
  client: PoolClient,
  jobId: string,
  lineItems?: JobLineItemPatchRow[],
): Promise<Set<string>> => {
  if (lineItems !== undefined) {
    const conditionIds = new Set<string>();
    for (const line of lineItems) {
      if (line.job_condition_id) {
        conditionIds.add(line.job_condition_id);
      }
    }
    return conditionIds;
  }

  const result = await client.query<{ job_condition_id: string | null }>(
    `SELECT job_condition_id FROM job_line WHERE job_id = $1`,
    [jobId],
  );
  const ids = new Set<string>();
  for (const row of result.rows) {
    if (row.job_condition_id) {
      ids.add(row.job_condition_id);
    }
  }
  return ids;
};

const assertDeleteNotReferenced = async (
  client: PoolClient,
  jobId: string,
  existingConditionIds: Set<string>,
  payloadConditionIds: Set<string>,
  lineItems?: JobLineItemPatchRow[],
): Promise<void> => {
  const referencedConditionIds = await loadReferencedConditionIds(
    client,
    jobId,
    lineItems,
  );

  const toDeleteConditions = [...existingConditionIds].filter(
    (id) => !payloadConditionIds.has(id),
  );
  if (toDeleteConditions.length === 0) {
    return;
  }

  const parentRows = await client.query<{
    id: string;
    parent_condition_id: string | null;
  }>(
    `SELECT id, parent_condition_id FROM job_condition WHERE id = ANY($1::text[])`,
    [[...existingConditionIds]],
  );
  const parentById = new Map(
    parentRows.rows.map((row) => [row.id, row.parent_condition_id]),
  );

  const isAncestorOf = (ancestorId: string, nodeId: string): boolean => {
    let current: string | null | undefined = nodeId;
    const seen = new Set<string>();
    while (current) {
      if (current === ancestorId) {
        return true;
      }
      if (seen.has(current)) {
        return false;
      }
      seen.add(current);
      current = parentById.get(current) ?? null;
    }
    return false;
  };

  for (const deletedId of toDeleteConditions) {
    for (const refId of referencedConditionIds) {
      if (refId === deletedId || isAncestorOf(deletedId, refId)) {
        if (!payloadConditionIds.has(refId) || refId === deletedId) {
          throw new ValidationError(
            "Cannot remove condition while lines reference it or a descendant",
            {
              field: "conditions",
              code: "condition_referenced",
              job_condition_id: deletedId,
              referenced_condition_id: refId,
            },
          );
        }
      }
    }
  }
};

export const loadJobConditionIds = async (
  client: PoolClient,
  jobId: string,
): Promise<Set<string>> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM job_condition WHERE job_id = $1`,
    [jobId],
  );
  return new Set(result.rows.map((row) => row.id));
};

/** All condition ids in a conditions PATCH (for line validation). */
export const collectJobConditionIdsFromPatch = (
  conditions: JobConditionPatchRow[],
): Set<string> => {
  const flat: FlatCondition[] = [];
  flattenConditions(conditions, null, flat);
  return new Set(flat.map((row) => row.id));
};

export const replaceJobConditionsTx = async (
  client: PoolClient,
  jobId: string,
  rows: JobConditionPatchRow[],
  lineItems?: JobLineItemPatchRow[],
): Promise<Set<string>> => {
  const flat: FlatCondition[] = [];
  flattenConditions(rows, null, flat);

  const jobSiteId = await loadJobSiteId(client, jobId);
  const rootItemByConditionId = new Map<string, string>();
  const seenRootZones = new Set<string>();

  for (const row of flat) {
    if (row.parent_condition_id === null) {
      if (!row.site_zone_id) {
        throw new ValidationError("Root condition requires site_zone_id", {
          field: "conditions",
          code: "missing_site_zone",
          id: row.id,
        });
      }
      if (seenRootZones.has(row.site_zone_id)) {
        throw new ValidationError(
          "Only one root condition per site zone is allowed on a job",
          {
            field: "conditions",
            code: "duplicate_site_zone",
            id: row.id,
            site_zone_id: row.site_zone_id,
          },
        );
      }
      seenRootZones.add(row.site_zone_id);
      const zone = await assertRootSiteZone(client, row.site_zone_id, jobSiteId);
      rootItemByConditionId.set(row.id, zone.root_item_id as string);
    }
  }

  const resolveTreeRootItemId = (node: FlatCondition): string => {
    if (node.parent_condition_id === null) {
      return rootItemByConditionId.get(node.id) as string;
    }
    let current: string | null = node.parent_condition_id;
    const seen = new Set<string>();
    while (current) {
      if (seen.has(current)) {
        break;
      }
      seen.add(current);
      const parent = flat.find((c) => c.id === current);
      if (!parent) {
        break;
      }
      if (parent.parent_condition_id === null) {
        const rootItemId = rootItemByConditionId.get(parent.id);
        if (rootItemId) {
          return rootItemId;
        }
      }
      current = parent.parent_condition_id;
    }
    throw new ValidationError("Could not resolve root_item_id for condition", {
      field: "conditions",
      code: "orphan_condition",
      id: node.id,
    });
  };

  const seenIds = new Set<string>();
  for (const condition of flat) {
    if (seenIds.has(condition.id)) {
      throw new ValidationError("Duplicate condition id in conditions", {
        field: "conditions",
        code: "duplicate_condition",
        id: condition.id,
      });
    }
    seenIds.add(condition.id);

    if (!condition.name?.trim()) {
      throw new ValidationError("Condition requires name", {
        field: "conditions",
        code: "missing_condition_name",
        id: condition.id,
      });
    }

    if (condition.parent_condition_id !== null && condition.site_zone_id !== null) {
      throw new ValidationError("Child condition must not set site_zone_id", {
        field: "conditions",
        code: "child_site_zone",
        id: condition.id,
      });
    }

    const treeRootItemId = resolveTreeRootItemId(condition);
    assertNoDuplicateSpecDefs(condition.specs, condition.id);
    assertNoDuplicateLaborPhases(condition.included_labor_phases, condition.id);

    if (condition.labor_phases_explicit) {
      await assertLaborPhasesExist(
        client,
        condition.included_labor_phases.map((phase) => phase.labor_phase_id),
      );
    }

    for (const spec of condition.specs) {
      await assertSpecDefInScopePanel(client, treeRootItemId, spec.spec_def_id);
      await assertBucketSpecWritable(client, spec, "conditions", condition.id);
      if (spec.spec_option_id !== null && spec.spec_option_id !== undefined) {
        await assertSpecOptionBelongsToDef(client, spec.spec_def_id, spec.spec_option_id);
      }
    }
  }

  for (const condition of flat) {
    await assertConditionOwnedByJob(client, jobId, condition.id);
  }

  const existingConditions = await client.query<{ id: string }>(
    `SELECT id FROM job_condition WHERE job_id = $1`,
    [jobId],
  );
  const existingConditionIds = new Set(existingConditions.rows.map((row) => row.id));
  const payloadConditionIds = new Set(flat.map((row) => row.id));

  await assertDeleteNotReferenced(
    client,
    jobId,
    existingConditionIds,
    payloadConditionIds,
    lineItems,
  );

  const toDelete = [...existingConditionIds].filter(
    (id) => !payloadConditionIds.has(id),
  );
  if (toDelete.length > 0) {
    await client.query(
      `DELETE FROM job_condition WHERE job_id = $1 AND id = ANY($2::text[])`,
      [jobId, toDelete],
    );
  }

  const ordered = [...flat].sort((a, b) => {
    const depth = (node: FlatCondition): number => {
      let d = 0;
      let current: string | null = node.parent_condition_id;
      const seen = new Set<string>();
      while (current) {
        d += 1;
        if (seen.has(current)) {
          break;
        }
        seen.add(current);
        current = flat.find((c) => c.id === current)?.parent_condition_id ?? null;
      }
      return d;
    };
    return depth(a) - depth(b) || a.sort_order - b.sort_order;
  });

  for (const condition of ordered) {
    await client.query(
      `INSERT INTO job_condition (
         id, job_id, parent_condition_id, site_zone_id, name,
         complexity_factor_id, labor_phases_explicit, labor_only, labor_only_explicit,
         include_discontinued, include_discontinued_explicit, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         parent_condition_id = EXCLUDED.parent_condition_id,
         site_zone_id = EXCLUDED.site_zone_id,
         name = EXCLUDED.name,
         complexity_factor_id = EXCLUDED.complexity_factor_id,
         labor_phases_explicit = EXCLUDED.labor_phases_explicit,
         labor_only = EXCLUDED.labor_only,
         labor_only_explicit = EXCLUDED.labor_only_explicit,
         include_discontinued = EXCLUDED.include_discontinued,
         include_discontinued_explicit = EXCLUDED.include_discontinued_explicit,
         sort_order = EXCLUDED.sort_order,
         job_id = EXCLUDED.job_id`,
      [
        condition.id,
        jobId,
        condition.parent_condition_id,
        condition.site_zone_id,
        condition.name,
        condition.complexity_factor_id,
        condition.labor_phases_explicit,
        condition.labor_only,
        condition.labor_only_explicit,
        condition.include_discontinued,
        condition.include_discontinued_explicit,
        condition.sort_order,
      ],
    );

    await client.query(
      `DELETE FROM job_condition_spec WHERE job_condition_id = $1`,
      [condition.id],
    );

    for (const spec of condition.specs) {
      if (isBucketSpecBlank(spec)) {
        continue;
      }
      await insertJobConditionBucketSpecTx(client, condition.id, spec);
    }

    await replaceConditionLaborPhasesTx(
      client,
      condition.id,
      condition.included_labor_phases,
      condition.labor_phases_explicit,
    );
  }

  return payloadConditionIds;
};

export const replaceJobConditions = async (
  pool: Pool,
  actorId: string,
  jobId: string,
  rows: JobConditionPatchRow[],
  lineItems?: JobLineItemPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceJobConditionsTx(client, jobId, rows, lineItems);
  });
};
