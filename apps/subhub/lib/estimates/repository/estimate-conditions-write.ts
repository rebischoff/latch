import { ValidationError } from "@latch/contracts";
import { withPermissionDb } from "@latch/pg-session";
import type { Pool, PoolClient } from "pg";

import { loadScopePanelDefIdSet } from "@/lib/catalog/repository/item-effective-specs";
import { tableExists } from "@/lib/sites/repository/sql-utils";

import type {
  EstimateConditionPatchRow,
  EstimateConditionSpecPatchRow,
  EstimateLineItemPatchRow,
} from "../descriptors/estimate-detail";
import {
  assertBucketSpecWritable,
  insertConditionBucketSpecTx,
  isBucketSpecBlank,
} from "./estimate-bucket-spec-write";

type FlatCondition = {
  complexity_factor_id: string | null;
  id: string;
  include_discontinued: boolean;
  included_labor_phases: Array<{ labor_phase_id: string }>;
  labor_phases_explicit: boolean;
  name: string;
  parent_condition_id: string | null;
  root_item_id: string | null;
  sort_order: number;
  specs: EstimateConditionSpecPatchRow[];
};

const flattenConditions = (
  conditions: EstimateConditionPatchRow[] | undefined,
  parentId: string | null,
  rootItemId: string | null,
  out: FlatCondition[],
): void => {
  for (const [index, row] of (conditions ?? []).entries()) {
    const id = row.id ?? crypto.randomUUID();
    const isRoot = parentId === null;
    const resolvedRootItemId = isRoot
      ? (row.root_item_id ?? null)
      : null;

    out.push({
      id,
      name: row.name,
      parent_condition_id: parentId,
      root_item_id: resolvedRootItemId,
      sort_order: row.sort_order ?? index + 1,
      complexity_factor_id: row.complexity_factor_id ?? null,
      include_discontinued: row.include_discontinued ?? false,
      labor_phases_explicit: isRoot
        ? true
        : Boolean(row.labor_phases_explicit),
      included_labor_phases: row.included_labor_phases ?? [],
      specs: row.specs ?? [],
    });

    flattenConditions(
      row.conditions as EstimateConditionPatchRow[] | undefined,
      id,
      isRoot ? resolvedRootItemId : rootItemId,
      out,
    );
  }
};

const assertNoDuplicateSpecDefs = (
  specs: EstimateConditionSpecPatchRow[],
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

const assertConditionOwnedByEstimate = async (
  client: PoolClient,
  estimateId: string,
  conditionId: string,
): Promise<void> => {
  const result = await client.query<{ estimate_id: string }>(
    `SELECT estimate_id FROM estimate_condition WHERE id = $1`,
    [conditionId],
  );

  if (result.rows.length === 0) {
    return;
  }

  if (result.rows[0]?.estimate_id !== estimateId) {
    throw new ValidationError("estimate_condition id belongs to another estimate", {
      field: "conditions",
      code: "foreign_block",
      id: conditionId,
    });
  }
};

const assertRootItemExists = async (
  client: PoolClient,
  rootItemId: string,
): Promise<void> => {
  const result = await client.query<{ id: string; parent_id: string | null }>(
    `SELECT id, parent_id FROM item WHERE id = $1`,
    [rootItemId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError("Unknown root_item_id", {
      field: "conditions",
      code: "unknown_root_item",
      root_item_id: rootItemId,
    });
  }

  if (result.rows[0]?.parent_id !== null) {
    throw new ValidationError("root_item_id must be a catalog root", {
      field: "conditions",
      code: "root_not_root",
      root_item_id: rootItemId,
    });
  }
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
  estimateConditionId: string,
  rows: Array<{ labor_phase_id: string }>,
  explicit: boolean,
): Promise<void> => {
  if (!(await tableExists(client, "estimate_condition_labor_phase"))) {
    return;
  }

  await client.query(
    `DELETE FROM estimate_condition_labor_phase WHERE estimate_condition_id = $1`,
    [estimateConditionId],
  );

  if (!explicit) {
    return;
  }

  for (const [index, row] of rows.entries()) {
    await client.query(
      `INSERT INTO estimate_condition_labor_phase (
         estimate_condition_id, labor_phase_id, sort_order
       ) VALUES ($1, $2, $3)`,
      [estimateConditionId, row.labor_phase_id, index + 1],
    );
  }
};

const loadReferencedConditionIds = async (
  client: PoolClient,
  estimateId: string,
  lineItems?: EstimateLineItemPatchRow[],
): Promise<Set<string>> => {
  if (lineItems !== undefined) {
    const conditionIds = new Set<string>();
    for (const line of lineItems) {
      if (line.estimate_condition_id) {
        conditionIds.add(line.estimate_condition_id);
      }
    }
    return conditionIds;
  }

  const result = await client.query<{ estimate_condition_id: string }>(
    `SELECT estimate_condition_id
     FROM estimate_line
     WHERE estimate_id = $1`,
    [estimateId],
  );

  return new Set(result.rows.map((row) => row.estimate_condition_id));
};

const assertDeleteNotReferenced = async (
  client: PoolClient,
  estimateId: string,
  existingConditionIds: Set<string>,
  payloadConditionIds: Set<string>,
  lineItems?: EstimateLineItemPatchRow[],
): Promise<void> => {
  const referencedConditionIds = await loadReferencedConditionIds(
    client,
    estimateId,
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
    `SELECT id, parent_condition_id FROM estimate_condition WHERE id = ANY($1::text[])`,
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
              estimate_condition_id: deletedId,
              referenced_condition_id: refId,
            },
          );
        }
      }
    }
  }
};

export const loadEstimateConditionIds = async (
  client: PoolClient,
  estimateId: string,
): Promise<Set<string>> => {
  const result = await client.query<{ id: string }>(
    `SELECT id FROM estimate_condition WHERE estimate_id = $1`,
    [estimateId],
  );

  return new Set(result.rows.map((row) => row.id));
};

/** All condition ids in a conditions PATCH (for line validation). */
export const collectConditionIdsFromPatch = (
  conditions: EstimateConditionPatchRow[],
): Set<string> => {
  const flat: FlatCondition[] = [];
  flattenConditions(conditions, null, null, flat);
  return new Set(flat.map((row) => row.id));
};

export const replaceEstimateConditionsTx = async (
  client: PoolClient,
  estimateId: string,
  rows: EstimateConditionPatchRow[],
  lineItems?: EstimateLineItemPatchRow[],
): Promise<Set<string>> => {
  const flat: FlatCondition[] = [];
  flattenConditions(rows, null, null, flat);

  const rootItemByConditionId = new Map<string, string>();
  for (const row of flat) {
    if (row.parent_condition_id === null) {
      if (!row.root_item_id) {
        throw new ValidationError("Root condition requires root_item_id", {
          field: "conditions",
          code: "missing_root_item",
          id: row.id,
        });
      }
      rootItemByConditionId.set(row.id, row.root_item_id);
    }
  }

  const resolveTreeRootItemId = (node: FlatCondition): string => {
    if (node.parent_condition_id === null) {
      return node.root_item_id as string;
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
      if (parent.parent_condition_id === null && parent.root_item_id) {
        return parent.root_item_id;
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

    if (condition.parent_condition_id === null) {
      await assertRootItemExists(client, condition.root_item_id as string);
    } else if (condition.root_item_id !== null) {
      throw new ValidationError("Child condition must not set root_item_id", {
        field: "conditions",
        code: "child_root_item",
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
    await assertConditionOwnedByEstimate(client, estimateId, condition.id);
  }

  const existingConditions = await client.query<{ id: string }>(
    `SELECT id FROM estimate_condition WHERE estimate_id = $1`,
    [estimateId],
  );
  const existingConditionIds = new Set(existingConditions.rows.map((row) => row.id));
  const payloadConditionIds = new Set(flat.map((row) => row.id));

  await assertDeleteNotReferenced(
    client,
    estimateId,
    existingConditionIds,
    payloadConditionIds,
    lineItems,
  );

  const toDelete = [...existingConditionIds].filter((id) => !payloadConditionIds.has(id));
  if (toDelete.length > 0) {
    await client.query(
      `DELETE FROM estimate_condition
       WHERE estimate_id = $1
         AND id = ANY($2::text[])`,
      [estimateId, toDelete],
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
      `INSERT INTO estimate_condition (
         id, estimate_id, parent_condition_id, root_item_id, name,
         complexity_factor_id, labor_phases_explicit, include_discontinued, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         parent_condition_id = EXCLUDED.parent_condition_id,
         root_item_id = EXCLUDED.root_item_id,
         name = EXCLUDED.name,
         complexity_factor_id = EXCLUDED.complexity_factor_id,
         labor_phases_explicit = EXCLUDED.labor_phases_explicit,
         include_discontinued = EXCLUDED.include_discontinued,
         sort_order = EXCLUDED.sort_order,
         estimate_id = EXCLUDED.estimate_id`,
      [
        condition.id,
        estimateId,
        condition.parent_condition_id,
        condition.root_item_id,
        condition.name,
        condition.complexity_factor_id,
        condition.labor_phases_explicit,
        condition.include_discontinued,
        condition.sort_order,
      ],
    );

    await client.query(
      `DELETE FROM estimate_condition_spec WHERE estimate_condition_id = $1`,
      [condition.id],
    );

    for (const spec of condition.specs) {
      if (isBucketSpecBlank(spec)) {
        continue;
      }

      await insertConditionBucketSpecTx(client, condition.id, spec);
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

export const replaceEstimateConditions = async (
  pool: Pool,
  actorId: string,
  estimateId: string,
  rows: EstimateConditionPatchRow[],
  lineItems?: EstimateLineItemPatchRow[],
): Promise<void> => {
  await withPermissionDb(pool, actorId, async (client) => {
    await replaceEstimateConditionsTx(client, estimateId, rows, lineItems);
  });
};

/** @deprecated Use replaceEstimateConditionsTx. */
export const replaceEstimateScopesTx = replaceEstimateConditionsTx;
/** @deprecated Use loadEstimateConditionIds. */
export const loadEstimateScopeBlockIds = loadEstimateConditionIds;
