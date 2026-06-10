import type { FieldAction, RoleId, RowScope, SurfaceId } from "@latch/contracts";
import type { MemoryRoleGrantBinding } from "@latch/policy";

/** One row from `latch_role_grants` joined to `latch_role_surfaces` for `row_scope`. */
export type RoleGrantRow = {
  roleId: RoleId;
  surfaceId: SurfaceId;
  fieldId: string | null;
  action: string;
  /** Authoritative scope from `latch_role_surfaces` (P1) — not on grant rows. */
  rowScope: string | null;
};

const parseRowScope = (value: string | null): RowScope | undefined => {
  if (value === "own" || value === "scope" || value === "all") {
    return value;
  }
  return undefined;
};

/**
 * Fold sparse grant rows into one {@link MemoryRoleGrantBinding} per role×surface.
 * `row_scope` is taken from the binding join column only (P1).
 */
export const foldRoleGrantRows = (
  rows: RoleGrantRow[],
): MemoryRoleGrantBinding[] => {
  const groups = new Map<
    string,
    {
      roleId: RoleId;
      surface: SurfaceId;
      rowScope?: RowScope;
      fieldActions: Map<string, FieldAction[]>;
      surfaceActions: FieldAction[];
    }
  >();

  for (const row of rows) {
    const key = `${row.roleId}:${row.surfaceId}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        roleId: row.roleId,
        surface: row.surfaceId,
        fieldActions: new Map(),
        surfaceActions: [],
      };
      groups.set(key, group);
    }

    const scope = parseRowScope(row.rowScope);
    if (scope) {
      group.rowScope = scope;
    }

    const action = row.action as FieldAction;
    if (row.fieldId === null) {
      if (!group.surfaceActions.includes(action)) {
        group.surfaceActions.push(action);
      }
      continue;
    }

    const existing = group.fieldActions.get(row.fieldId) ?? [];
    if (!existing.includes(action)) {
      group.fieldActions.set(row.fieldId, [...existing, action]);
    }
  }

  return [...groups.values()].map((group) => ({
    roleId: group.roleId,
    surface: group.surface,
    ...(group.rowScope ? { rowScope: group.rowScope } : {}),
    fields: [...group.fieldActions.entries()].map(([field, actions]) => ({
      field,
      actions,
    })),
    ...(group.surfaceActions.length > 0
      ? { surfaceActions: group.surfaceActions }
      : {}),
  }));
};
