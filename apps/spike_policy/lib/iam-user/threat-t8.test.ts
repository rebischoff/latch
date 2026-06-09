import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";
import {
  ForbiddenError,
  NotFoundError,
  type PermissionContext,
  type Principal,
} from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { spikePolicyRegistry } from "../policy-registry.js";
import { resetMemoryPolicyVersion } from "../iam/policy-version.js";
import {
  FIELD_TECH_ID,
  OFFICE_ADMIN_ID,
  SEED_IAM_USER_ID,
  SEED_TECH_USER_ID,
  SYSTEM_IAM_ID,
} from "./fixture-ids.js";
import { MemoryUserStore } from "./memory-user-store.js";
import { createUserRolesDetailDal } from "./repository.js";
import { roleCatalogForHarness, seedPilotUsers } from "./seed.js";

const audit = createMemoryAuditWriter();
const policy = new PolicyService({ registry: spikePolicyRegistry });
const catalog = roleCatalogForHarness();

afterEach(() => {
  setAuditWriter(null);
  audit.reset();
  resetMemoryPolicyVersion();
});

const systemIamPrincipal = (userId = SEED_IAM_USER_ID): Principal => ({
  id: userId,
  roles: [SYSTEM_IAM_ID],
  roleClasses: { [SYSTEM_IAM_ID]: "system_iam" },
});

const fieldTechPrincipal = (userId = SEED_TECH_USER_ID): Principal => ({
  id: userId,
  roles: [FIELD_TECH_ID],
  roleClasses: { [FIELD_TECH_ID]: "app" },
});

const buildCtx = (principal: Principal): PermissionContext => ({
  principal,
  surface: "user_roles_detail",
  manifest: policy.resolve(principal, {
    surface: "user_roles_detail",
    mode: "detail",
  }),
});

describe("threat model — T8 privilege escalation via role assignment (DAL)", () => {
  it("field_tech patch to self-assign system_iam → NotFoundError; assignments unchanged", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const before = store.listRolesForUser(SEED_TECH_USER_ID);

    await expect(
      dal.patchUserRoles(
        buildCtx(fieldTechPrincipal()),
        SEED_TECH_USER_ID,
        { role_assignments: [FIELD_TECH_ID, SYSTEM_IAM_ID] },
      ),
    ).rejects.toThrow(NotFoundError);

    expect(store.listRolesForUser(SEED_TECH_USER_ID)).toEqual(before);
    expect(store.listRolesForUser(SEED_TECH_USER_ID)).not.toContain(SYSTEM_IAM_ID);
    expect(audit.entries).toHaveLength(0);
  });

  it("system_iam patch assigns roles and get reflects the change (T8 positive)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const ctx = buildCtx(systemIamPrincipal());

    const patched = await dal.patchUserRoles(ctx, SEED_TECH_USER_ID, {
      role_assignments: [FIELD_TECH_ID, OFFICE_ADMIN_ID],
    });

    expect(patched.role_assignments).toEqual([FIELD_TECH_ID, OFFICE_ADMIN_ID]);
    expect(store.listRolesForUser(SEED_TECH_USER_ID)).toEqual([
      FIELD_TECH_ID,
      OFFICE_ADMIN_ID,
    ]);

    const readBack = dal.getUserRoles(ctx, SEED_TECH_USER_ID);
    expect(readBack.role_assignments).toEqual([FIELD_TECH_ID, OFFICE_ADMIN_ID]);
  });

  it("self-patch throws ForbiddenError", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const before = store.listRolesForUser(SEED_IAM_USER_ID);

    await expect(
      dal.patchUserRoles(buildCtx(systemIamPrincipal()), SEED_IAM_USER_ID, {
        role_assignments: [SYSTEM_IAM_ID],
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(store.listRolesForUser(SEED_IAM_USER_ID)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });
});
