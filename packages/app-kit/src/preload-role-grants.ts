import type { FieldAction, RoleId, RowScope, SurfaceId } from "@latch/contracts";
import {
  createMemoryRoleGrantProvider,
  type MemoryRoleGrantProvider,
  type RoleGrant,
} from "@latch/policy";
import type { Pool } from "pg";

type GrantRow = {
  role_id: string;
  surface_id: string;
  field_id: string | null;
  action: string;
  row_scope: string | null;
};

const GRANTS_SQL = `
  SELECT
    g.role_id::text AS role_id,
    g.surface_id,
    g.field_id,
    g.action,
    rs.row_scope
  FROM latch_role_grants g
  LEFT JOIN latch_role_surfaces rs
    ON rs.role_id = g.role_id AND rs.surface_id = g.surface_id
  WHERE g.role_id = ANY($1::uuid[])
`;

const toRowScope = (raw: string | null): RowScope | undefined => {
  if (raw === "own" || raw === "all" || raw === "scope") {
    return raw;
  }
  return undefined;
};

/** Fold sparse `latch_role_grants` rows into a nested surface → role → grant map. */
export const foldRoleGrantRows = (
  rows: GrantRow[],
): Partial<Record<SurfaceId, Partial<Record<RoleId, RoleGrant>>>> => {
  type Acc = {
    rowScope?: RowScope;
    surfaceActions: Set<FieldAction>;
    fields: Map<string, Set<FieldAction>>;
  };

  const bySurfaceRole = new Map<string, Acc>();

  for (const row of rows) {
    const key = `${row.surface_id}:${row.role_id}`;
    let acc = bySurfaceRole.get(key);
    if (!acc) {
      acc = { surfaceActions: new Set(), fields: new Map() };
      bySurfaceRole.set(key, acc);
    }

    const rowScope = toRowScope(row.row_scope);
    if (rowScope) {
      acc.rowScope = rowScope;
    }

    const action = row.action as FieldAction;
    if (row.field_id == null) {
      acc.surfaceActions.add(action);
      continue;
    }

    let actions = acc.fields.get(row.field_id);
    if (!actions) {
      actions = new Set();
      acc.fields.set(row.field_id, actions);
    }
    actions.add(action);
  }

  const bindings: Partial<Record<SurfaceId, Partial<Record<RoleId, RoleGrant>>>> =
    {};

  for (const [key, acc] of bySurfaceRole) {
    const [surfaceId, roleId] = key.split(":") as [SurfaceId, RoleId];
    bindings[surfaceId] ??= {};
    bindings[surfaceId]![roleId] = {
      fields: [...acc.fields.entries()].map(([field, actions]) => ({
        field,
        actions: [...actions],
      })),
      ...(acc.rowScope ? { rowScope: acc.rowScope } : {}),
      ...(acc.surfaceActions.size > 0
        ? { surfaceActions: [...acc.surfaceActions] }
        : {}),
    };
  }

  return bindings;
};

/** Load runtime grants for catalog role ids into a request-scoped memory snapshot. */
export const preloadRoleGrantsFromDb = async (
  pool: Pool,
  roleIds: RoleId[],
): Promise<MemoryRoleGrantProvider> => {
  if (roleIds.length === 0) {
    return createMemoryRoleGrantProvider({});
  }

  const result = await pool.query<GrantRow>(GRANTS_SQL, [roleIds]);
  return createMemoryRoleGrantProvider(foldRoleGrantRows(result.rows));
};
