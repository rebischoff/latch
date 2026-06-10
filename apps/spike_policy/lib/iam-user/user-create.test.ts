import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type PermissionContext,
  principalWithRoles,
  type Principal,
} from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { getMemoryPolicyVersion, resetMemoryPolicyVersion } from "../iam/policy-version.js";
import { spikePolicyRegistry } from "../policy-registry.js";
import {
  FIELD_TECH_ID,
  SEED_IAM_USER_ID,
  SEED_TECH_USER_ID,
  SYSTEM_DATA_ID,
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

const systemIamPrincipal = (userId = SEED_IAM_USER_ID): Principal =>
  principalWithRoles(userId, [SYSTEM_IAM_ID], {
    roleClasses: { [SYSTEM_IAM_ID]: "system_iam" },
  });

const fieldTechPrincipal = (userId = SEED_TECH_USER_ID): Principal =>
  principalWithRoles(userId, [FIELD_TECH_ID], {
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

describe("user_roles_detail — createUser", () => {
  it("creates a roleless user and writes audit", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const versionBefore = getMemoryPolicyVersion();

    const created = await dal.createUser(buildCtx(systemIamPrincipal()), {
      id: "new-user",
      display_name: "New User",
    });

    expect(created.id).toBe("new-user");
    expect(created.profile?.display_name).toBe("New User");
    expect(created.role_assignments ?? []).toEqual([]);
    expect(store.getUser("new-user")?.displayName).toBe("New User");
    expect(store.listRolesForUser("new-user")).toEqual([]);
    expect(getMemoryPolicyVersion()).toBe(versionBefore);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.action).toBe("insert");
    expect(audit.entries[0]?.tableName).toBe("latch_users");
  });

  it("creates a user with initial field_tech and bumps policy version", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const versionBefore = getMemoryPolicyVersion();

    const created = await dal.createUser(buildCtx(systemIamPrincipal()), {
      id: "tech-new",
      display_name: "Tech New",
      role_assignments: [FIELD_TECH_ID],
    });

    expect(created.role_assignments).toEqual([FIELD_TECH_ID]);
    expect(store.listRolesForUser("tech-new")).toEqual([FIELD_TECH_ID]);
    expect(getMemoryPolicyVersion()).toBe(versionBefore + 1);
  });

  it("rejects duplicate id with ValidationError and leaves store unchanged", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const userCountBefore = store.users.size;

    await expect(
      dal.createUser(buildCtx(systemIamPrincipal()), {
        id: SEED_TECH_USER_ID,
        display_name: "Duplicate",
      }),
    ).rejects.toThrow(ValidationError);

    expect(store.users.size).toBe(userCountBefore);
    expect(audit.entries).toHaveLength(0);
  });

  it("rejects P4a exclusivity before creating the user", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const userCountBefore = store.users.size;

    await expect(
      dal.createUser(buildCtx(systemIamPrincipal()), {
        id: "bad-combo",
        display_name: "Bad Combo",
        role_assignments: [SYSTEM_DATA_ID, FIELD_TECH_ID],
      }),
    ).rejects.toThrow(ValidationError);

    expect(store.getUser("bad-combo")).toBeUndefined();
    expect(store.users.size).toBe(userCountBefore);
    expect(audit.entries).toHaveLength(0);
  });

  it("field_tech actor cannot create users (T8 — NotFoundError)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });
    const userCountBefore = store.users.size;

    await expect(
      dal.createUser(buildCtx(fieldTechPrincipal()), {
        id: "blocked-user",
        display_name: "Blocked",
      }),
    ).rejects.toThrow(NotFoundError);

    expect(store.users.size).toBe(userCountBefore);
    expect(audit.entries).toHaveLength(0);
  });

  it("rejects empty display name", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryUserStore();
    seedPilotUsers(store);
    const dal = createUserRolesDetailDal(store, { catalog });

    await expect(
      dal.createUser(buildCtx(systemIamPrincipal()), {
        id: "empty-name",
        display_name: "   ",
      }),
    ).rejects.toThrow(ValidationError);
  });
});
