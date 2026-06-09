import type { Principal, RoleClass } from "@latch/contracts";
import { ForbiddenError, ValidationError } from "@latch/contracts";

export type RoleCatalogEntry = {
  id: string;
  roleClass: RoleClass;
};

const roleClassesInSet = (
  roleIds: string[],
  catalog: Map<string, RoleCatalogEntry>,
): RoleClass[] =>
  roleIds.map((id) => {
    const row = catalog.get(id);
    if (!row) {
      throw new ValidationError(`Unknown role id: ${id}`);
    }
    return row.roleClass;
  });

const assertKnownRoles = (
  roleIds: string[],
  catalog: Map<string, RoleCatalogEntry>,
): void => {
  for (const id of roleIds) {
    if (!catalog.has(id)) {
      throw new ValidationError(`Unknown role id: ${id}`);
    }
  }
};

const assertExclusivity = (classes: RoleClass[]): void => {
  const hasSystemData = classes.includes("system_data");
  const hasApp = classes.some((c) => c === "app");
  if (hasSystemData && hasApp) {
    throw new ValidationError(
      "system_data cannot be combined with app roles on the same user",
    );
  }
};

const assertActorMayAssign = (
  actor: Principal,
  targetRoleIds: string[],
  catalog: Map<string, RoleCatalogEntry>,
): void => {
  const actorClasses = new Set(
    Object.values(actor.roleClasses ?? {}),
  );
  for (const roleId of targetRoleIds) {
    const entry = catalog.get(roleId);
    if (!entry) {
      continue;
    }
    if (entry.roleClass === "app") {
      continue;
    }
    if (!actorClasses.has(entry.roleClass)) {
      throw new ForbiddenError();
    }
  }
};

const assertLastSystemIamHolder = (
  targetUserId: string,
  nextRoleIds: string[],
  catalog: Map<string, RoleCatalogEntry>,
  listUsersWithRole: (roleId: string) => string[],
): void => {
  for (const [roleId, entry] of catalog) {
    if (entry.roleClass !== "system_iam") {
      continue;
    }
    const holders = listUsersWithRole(roleId);
    const targetHad = holders.includes(targetUserId);
    const targetWillHave = nextRoleIds.includes(roleId);
    if (targetHad && !targetWillHave && holders.length === 1) {
      throw new ForbiddenError("Cannot revoke the last system_iam holder");
    }
  }
};

/** P4a / P4b write-time validation for `role_assignments` replacement. */
export const validateRoleAssignmentsPatch = (opts: {
  actor: Principal;
  targetUserId: string;
  nextRoleIds: string[];
  catalog: Map<string, RoleCatalogEntry>;
  listUsersWithRole: (roleId: string) => string[];
}): void => {
  const { actor, targetUserId, nextRoleIds, catalog, listUsersWithRole } = opts;
  assertKnownRoles(nextRoleIds, catalog);
  const classes = roleClassesInSet(nextRoleIds, catalog);
  assertExclusivity(classes);
  assertActorMayAssign(actor, nextRoleIds, catalog);
  assertLastSystemIamHolder(
    targetUserId,
    nextRoleIds,
    catalog,
    listUsersWithRole,
  );
};
