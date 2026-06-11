import type { Principal, RoleClass } from "@latch/contracts";
import { ForbiddenError, ValidationError } from "@latch/contracts";

import {
  actorDelegatorScopes,
  actorHoldsSystemIam,
  type DelegationContext,
} from "./delegation-context.js";
import type { RoleAssignmentDto } from "./role-assignment.js";
import { roleIdsFromDtos } from "./role-assignment.js";

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
  bindings: RoleAssignmentDto[],
  catalog: Map<string, RoleCatalogEntry>,
): void => {
  for (const binding of bindings) {
    if (!catalog.has(binding.role_id)) {
      throw new ValidationError(`Unknown role id: ${binding.role_id}`);
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

const assertSystemClassesUnscoped = (
  bindings: RoleAssignmentDto[],
  catalog: Map<string, RoleCatalogEntry>,
): void => {
  for (const binding of bindings) {
    const entry = catalog.get(binding.role_id);
    if (!entry) {
      continue;
    }
    if (entry.roleClass !== "app" && binding.scope_id !== null) {
      throw new ValidationError("System roles cannot carry a scope");
    }
  }
};

const assertActorMayAssignSystemClasses = (
  actor: Principal,
  bindings: RoleAssignmentDto[],
  catalog: Map<string, RoleCatalogEntry>,
): void => {
  const actorClasses = new Set(Object.values(actor.roleClasses ?? {}));
  for (const binding of bindings) {
    const entry = catalog.get(binding.role_id);
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

const assertScopedDelegation = (
  actor: Principal,
  bindings: RoleAssignmentDto[],
  catalog: Map<string, RoleCatalogEntry>,
  delegation: DelegationContext,
): void => {
  if (actorHoldsSystemIam(actor)) {
    return;
  }

  for (const binding of bindings) {
    const entry = catalog.get(binding.role_id);
    if (entry && entry.roleClass !== "app") {
      throw new ForbiddenError(
        "Delegated assigners cannot assign system roles",
      );
    }
  }

  const delegatorBindings = actor.bindings.filter((b) =>
    delegation.delegatorRoleIds.has(b.roleId),
  );

  const appBindings = bindings.filter((b) => {
    const entry = catalog.get(b.role_id);
    return entry?.roleClass === "app";
  });

  if (appBindings.length === 0) {
    return;
  }

  if (delegatorBindings.length === 0) {
    throw new ForbiddenError("No delegation capability for role assignments");
  }

  const allowedRoles = new Set<string>();
  for (const binding of delegatorBindings) {
    const list = delegation.allowListByDelegator.get(binding.roleId);
    if (list) {
      for (const roleId of list) {
        allowedRoles.add(roleId);
      }
    }
  }

  const scopesByDelegator = actorDelegatorScopes(
    actor,
    delegation.delegatorRoleIds,
  );
  const allowedScopes = new Set<string | null>();
  for (const scopes of scopesByDelegator.values()) {
    for (const scopeId of scopes) {
      allowedScopes.add(scopeId);
    }
  }
  const companyWide = allowedScopes.has(null);

  for (const binding of appBindings) {
    const entry = catalog.get(binding.role_id);
    if (!entry) {
      continue;
    }

    if (!allowedRoles.has(binding.role_id)) {
      throw new ForbiddenError("Role is not on your delegation allow-list");
    }

    if (!companyWide && !allowedScopes.has(binding.scope_id)) {
      throw new ForbiddenError(
        "Assignment scope is outside your delegator boundary",
      );
    }
  }
};

const assertLastSystemIamHolder = (
  targetUserId: string,
  nextBindings: RoleAssignmentDto[],
  catalog: Map<string, RoleCatalogEntry>,
  listUsersWithRole: (roleId: string) => string[],
): void => {
  const nextRoleIds = roleIdsFromDtos(nextBindings);
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

/** P4a / P4b + scoped delegation write-time validation for `role_assignments`. */
export const validateRoleAssignmentsPatch = (opts: {
  actor: Principal;
  targetUserId: string;
  nextBindings: RoleAssignmentDto[];
  catalog: Map<string, RoleCatalogEntry>;
  delegation: DelegationContext;
  listUsersWithRole: (roleId: string) => string[];
}): void => {
  const {
    actor,
    targetUserId,
    nextBindings,
    catalog,
    delegation,
    listUsersWithRole,
  } = opts;
  assertKnownRoles(nextBindings, catalog);
  const classes = roleClassesInSet(roleIdsFromDtos(nextBindings), catalog);
  assertExclusivity(classes);
  assertSystemClassesUnscoped(nextBindings, catalog);
  assertScopedDelegation(actor, nextBindings, catalog, delegation);
  assertActorMayAssignSystemClasses(actor, nextBindings, catalog);
  assertLastSystemIamHolder(
    targetUserId,
    nextBindings,
    catalog,
    listUsersWithRole,
  );
};
