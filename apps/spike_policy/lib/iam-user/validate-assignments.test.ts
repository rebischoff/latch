import { describe, expect, it } from "vitest";

import {
  ForbiddenError,
  principalWithRoles,
  ValidationError,
  type Principal,
} from "@latch/contracts";

import {
  BRANCH_A_SCOPE_ID,
  BRANCH_B_SCOPE_ID,
  BRANCH_ADMIN_ID,
  FIELD_TECH_ID,
  OFFICE_ADMIN_ID,
  SEED_IAM_USER_ID,
  SEED_TECH_USER_ID,
  SYSTEM_DATA_ID,
  SYSTEM_IAM_ID,
  UNION_DEMO_A_ID,
} from "./fixture-ids.js";
import { roleAssignmentDto } from "./role-assignment.js";
import {
  delegationContextForHarness,
  roleCatalogForHarness,
} from "./seed.js";
import { validateRoleAssignmentsPatch } from "./validate-assignments.js";

const catalog = roleCatalogForHarness();
const delegation = delegationContextForHarness();

const systemIamActor = (): Principal =>
  principalWithRoles(SEED_IAM_USER_ID, [SYSTEM_IAM_ID], {
    roleClasses: { [SYSTEM_IAM_ID]: "system_iam" },
  });

const fieldTechActor = (): Principal =>
  principalWithRoles(SEED_TECH_USER_ID, [FIELD_TECH_ID], {
    roleClasses: { [FIELD_TECH_ID]: "app" },
  });

const mariaPrincipal = (): Principal => ({
  id: "maria",
  bindings: [{ roleId: BRANCH_ADMIN_ID, scopeId: BRANCH_B_SCOPE_ID }],
  roleClasses: { [BRANCH_ADMIN_ID]: "app" },
});

describe("validateRoleAssignmentsPatch — P4a / P4b", () => {
  it("rejects system_data combined with app roles (P4a exclusivity)", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: "other-user",
        nextBindings: [
          roleAssignmentDto(SYSTEM_DATA_ID),
          roleAssignmentDto(FIELD_TECH_ID),
        ],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).toThrow(ValidationError);
  });

  it("rejects assigning system_iam when actor lacks system_iam", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: fieldTechActor(),
        targetUserId: "other-user",
        nextBindings: [roleAssignmentDto(SYSTEM_IAM_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).toThrow(ForbiddenError);
  });

  it("rejects revoking the last system_iam holder (P4b)", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: SEED_IAM_USER_ID,
        nextBindings: [],
        catalog,
        delegation,
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
        nextBindings: [
          roleAssignmentDto(FIELD_TECH_ID),
          roleAssignmentDto(OFFICE_ADMIN_ID),
        ],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).not.toThrow();
  });

  it("rejects system_iam with a non-null scope_id", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: "other-user",
        nextBindings: [roleAssignmentDto(SYSTEM_IAM_ID, BRANCH_B_SCOPE_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).toThrow(/System roles cannot carry a scope/);
  });

  it("rejects system_data with a non-null scope_id", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: "other-user",
        nextBindings: [roleAssignmentDto(SYSTEM_DATA_ID, BRANCH_B_SCOPE_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).toThrow(/System roles cannot carry a scope/);
  });
});

describe("validateRoleAssignmentsPatch — scoped delegation", () => {
  it("Maria assigns allow-listed app role into her scope", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: mariaPrincipal(),
        targetUserId: "new-tech",
        nextBindings: [roleAssignmentDto(FIELD_TECH_ID, BRANCH_B_SCOPE_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).not.toThrow();
  });

  it("Maria blocked on out-of-scope target (scope fence)", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: mariaPrincipal(),
        targetUserId: "new-tech",
        nextBindings: [roleAssignmentDto(FIELD_TECH_ID, BRANCH_A_SCOPE_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).toThrow(/outside your delegator boundary/);
  });

  it("Maria blocked on non-allow-listed app role", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: mariaPrincipal(),
        targetUserId: "new-tech",
        nextBindings: [roleAssignmentDto(UNION_DEMO_A_ID, BRANCH_B_SCOPE_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).toThrow(/delegation allow-list/);
  });

  it("Maria blocked on system_iam assignment", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: mariaPrincipal(),
        targetUserId: "new-tech",
        nextBindings: [roleAssignmentDto(SYSTEM_IAM_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).toThrow(/cannot assign system roles/);
  });

  it("system_iam assigns app role to any scope", () => {
    expect(() =>
      validateRoleAssignmentsPatch({
        actor: systemIamActor(),
        targetUserId: "new-tech",
        nextBindings: [roleAssignmentDto(FIELD_TECH_ID, BRANCH_A_SCOPE_ID)],
        catalog,
        delegation,
        listUsersWithRole: () => [],
      }),
    ).not.toThrow();
  });
});
