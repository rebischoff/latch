import type {
  FieldAction,
  FieldId,
  FieldPolicyGrant,
  RowScope,
} from "@latch/contracts";

/** v1 merge options (global defaults; see global-options.md). */
export interface MergeOptions {
  denyWins: boolean;
}

const ALL_ACTIONS: FieldAction[] = [
  "read",
  "write",
  "submit",
  "delete",
  "restore",
  "approve",
  "hard_delete",
];

const isDeny = (grant: FieldPolicyGrant): boolean => grant.effect === "deny";

const collectFieldIds = (grants: FieldPolicyGrant[]): FieldId[] => {
  const ids = new Set<FieldId>();
  for (const grant of grants) {
    ids.add(grant.field);
  }
  return [...ids];
};

/**
 * Merge field grants from multiple roles using `union_grants`.
 * Allows are unioned; explicit denies remove actions when `denyWins` is true.
 */
export const unionGrants = (
  grants: FieldPolicyGrant[],
  options: MergeOptions,
): Record<FieldId, FieldAction[]> => {
  const fieldIds = collectFieldIds(grants);
  const result: Record<FieldId, FieldAction[]> = {};

  for (const fieldId of fieldIds) {
    const forField = grants.filter((g) => g.field === fieldId);
    const allowed = new Set<FieldAction>();
    const denied = new Set<FieldAction>();

    for (const grant of forField) {
      const target = isDeny(grant) ? denied : allowed;
      for (const action of grant.actions) {
        target.add(action);
      }
    }

    let actions = [...allowed];
    if (options.denyWins && denied.size > 0) {
      actions = actions.filter((a) => !denied.has(a));
    }

    result[fieldId] = actions;
  }

  return result;
};

/**
 * Row scope for union_grants: `all` beats `own` (most permissive wins).
 */
export const mergeRowScope = (
  scopes: (RowScope | undefined)[],
): RowScope | undefined => {
  const defined = scopes.filter((s): s is RowScope => s !== undefined);
  if (defined.length === 0) {
    return undefined;
  }
  if (defined.includes("all")) {
    return "all";
  }
  return "own";
};

/** Union surface-level actions across roles (deduped, stable order). */
export const unionSurfaceActions = (
  actionLists: FieldAction[][],
): FieldAction[] => {
  const seen = new Set<FieldAction>();
  const ordered: FieldAction[] = [];

  for (const list of actionLists) {
    for (const action of list) {
      if (!seen.has(action)) {
        seen.add(action);
        ordered.push(action);
      }
    }
  }

  return ordered;
};

/** Known fields for a surface — ensures denied fields appear in the manifest. */
export const ensureFieldKeys = (
  fields: Record<FieldId, FieldAction[]>,
  knownFieldIds: FieldId[],
): Record<FieldId, FieldAction[]> => {
  const out = { ...fields };
  for (const id of knownFieldIds) {
    if (!(id in out)) {
      out[id] = [];
    }
  }
  return out;
};

export { ALL_ACTIONS };
