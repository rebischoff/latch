import { describe, expect, it } from "vitest";

import {
  ForbiddenError,
  principalWithRoles,
  ValidationError,
  type Principal,
} from "@latch/contracts";

import {
  FIELD_TECH_ID,
  OFFICE_ADMIN_ID,
  SEED_IAM_USER_ID,
  SEED_TECH_USER_ID,
  SYSTEM_DATA_ID,
  SYSTEM_IAM_ID,
} from "./fixture-ids.js";
import { roleCatalogForHarness } from "./seed.js";
import { validateRoleAssignmentsPatch } from "./validate-assignments.js";

const catalog = roleCatalogForHarness();

const systemIamActor = (): Principal =>
  principalWithRoles(SEED_IAM_USER_ID, [SYSTEM_IAM_ID], {
    roleClasses: { [SYSTEM_IAM_ID]: "system_iam" },
  });

const fieldTechActor = (): Principal =>
  principalWithRoles(SEED_TECH_USER_ID, [FIELD_TECH_ID], {
    roleClasses: { [FIELD_TECH_ID]: "app" },
  });

describe("validateRoleAssignmentsPatch — P4a / P4b", () => {
  it("rejects system_data combined with app roles (P4a exclusivity)", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: "other-user",
        nextRoleIds: [SYSTEM_DATA_ID, FIELD_TECH_ID],
        catalog,
        listUsersWithRole: () => [],
      }),
    ).toThrow(ValidationError);
  });

  it("rejects assigning system_iam when actor lacks system_iam", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: fieldTechActor(),
        targetUserId: "other-user",
        nextRoleIds: [SYSTEM_IAM_ID],
        catalog,
        listUsersWithRole: () => [],
      }),
    ).toThrow(ForbiddenError);
  });

  it("rejects revoking the last system_iam holder (P4b)", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: SEED_IAM_USER_ID,
        nextRoleIds: [],
        catalog,
        listUsersWithRole: (roleId) =>
          roleId === SYSTEM_IAM_ID ? [SEED_IAM_USER_ID] : [],
      }),
    ).toThrow(/last system_iam holder/);
  });

  it("allows app role assignment by system_iam actor", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: SEED_TECH_USER_ID,
        nextRoleIds: [FIELD_TECH_ID, OFFICE_ADMIN_ID],
        catalog,
        listUsersWithRole: () => [],
      }),
    ).not.toThrow();
  });
});
