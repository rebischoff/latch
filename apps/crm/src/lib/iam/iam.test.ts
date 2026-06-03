import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  fieldAllows,
  type PermissionContext,
} from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { MemoryJobStore } from "../../../db/memory-store.js";
import {
  SEED_ADMIN_ID,
  SEED_IAM_ID,
  SEED_TECH_ID,
  seedPilotJobs,
} from "../../../db/seed.js";
import { jobPolicyRegistry } from "../policy/registry.js";
import { loadRolesForUser } from "./load-roles.js";
import { createIamDal } from "./repository.js";

const policy = new PolicyService({ registry: jobPolicyRegistry });
const audit = createMemoryAuditWriter();

afterEach(() => {
  setAuditWriter(null);
  audit.reset();
});

const buildCtx = (userId: string, roles: string[]): PermissionContext => {
  const principal = { id: userId, roles };
  const manifest = policy.resolve(principal, {
    surface: "user_roles_detail",
    mode: "detail",
  });
  return { principal, manifest, surface: "user_roles_detail" };
};

const manifestReadableFieldKeys = (ctx: PermissionContext): string[] =>
  Object.keys(ctx.manifest.fields).filter((fieldId) =>
    fieldAllows(ctx.manifest, fieldId, "read"),
  );

describe("user_roles_detail — IAM DAL contract tests", () => {
  it("iam_master get — DTO keys match manifest-readable Fields (+ id)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const ctx = buildCtx(SEED_IAM_ID, ["iam_master"]);

    const dto = dal.getUserRoles(ctx, SEED_TECH_ID);

    const expectedKeys = ["id", ...manifestReadableFieldKeys(ctx)].sort();
    expect(Object.keys(dto).sort()).toEqual(expectedKeys);
    expect(dto.role_assignments).toEqual(["field_tech"]);
  });

  it("forbidden Field omission (T2): revoke read on role_assignments → property absent", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);

    const ctx: PermissionContext = {
      principal: { id: SEED_IAM_ID, roles: ["iam_master"] },
      surface: "user_roles_detail",
      manifest: {
        surface: "user_roles_detail",
        actions: ["read"],
        rowScope: "all",
        fields: {
          profile: ["read"],
        },
      },
    };

    const dto = dal.getUserRoles(ctx, SEED_TECH_ID);

    expect(dto.profile).toBeDefined();
    expect(dto).not.toHaveProperty("role_assignments");
    expect(Object.keys(dto).sort()).toEqual(
      ["id", ...manifestReadableFieldKeys(ctx)].sort(),
    );
  });

  it("strict write (T1): patch with extra key rejects with ValidationError", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const ctx = buildCtx(SEED_IAM_ID, ["iam_master"]);
    const before = store.listRolesForUser(SEED_TECH_ID);

    await expect(
      dal.patchUserRoles(ctx, SEED_TECH_ID, {
        role_assignments: [],
        extra: 1,
      }),
    ).rejects.toThrow(ValidationError);

    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });

  it("default deny: field_tech patch throws NotFoundError and does not change roles", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const before = store.listRolesForUser(SEED_TECH_ID);

    await expect(
      dal.patchUserRoles(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_TECH_ID, {
        role_assignments: ["iam_master"],
      }),
    ).rejects.toThrow(NotFoundError);

    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });
});

describe("user_roles_detail DAL get", () => {
  it("iam_master get returns profile + role_assignments for seeded IAM admin", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);

    const dto = dal.getUserRoles(buildCtx(SEED_IAM_ID, ["iam_master"]), SEED_IAM_ID);

    expect(dto.id).toBe(SEED_IAM_ID);
    expect(dto.profile).toEqual({
      id: SEED_IAM_ID,
      display_name: "IAM Admin (seed)",
    });
    expect(dto.role_assignments).toEqual(["iam_master"]);
  });

  it("iam_master can read another user's roles", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);

    const dto = dal.getUserRoles(
      buildCtx(SEED_IAM_ID, ["iam_master"]),
      SEED_TECH_ID,
    );

    expect(dto.profile?.display_name).toBe("Field Tech (seed)");
    expect(dto.role_assignments).toEqual(["field_tech"]);
  });

  it("office_admin and field_tech throw NotFoundError (404 hide)", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);

    expect(() =>
      dal.getUserRoles(buildCtx(SEED_ADMIN_ID, ["office_admin"]), SEED_TECH_ID),
    ).toThrow(NotFoundError);

    expect(() =>
      dal.getUserRoles(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_TECH_ID),
    ).toThrow(NotFoundError);
  });

  it("missing user id throws NotFoundError", () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);

    expect(() =>
      dal.getUserRoles(buildCtx(SEED_IAM_ID, ["iam_master"]), "missing-user"),
    ).toThrow(NotFoundError);
  });
});

describe("user_roles_detail DAL patch", () => {
  it("iam_master can set seed-field-tech roles to field_tech only", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const ctx = buildCtx(SEED_IAM_ID, ["iam_master"]);

    const dto = await dal.patchUserRoles(ctx, SEED_TECH_ID, {
      role_assignments: ["field_tech"],
    });

    expect(dto.role_assignments).toEqual(["field_tech"]);
    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual(["field_tech"]);
  });

  it("PATCH with unknown role id throws ValidationError", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const ctx = buildCtx(SEED_IAM_ID, ["iam_master"]);
    const before = store.listRolesForUser(SEED_TECH_ID);

    await expect(
      dal.patchUserRoles(ctx, SEED_TECH_ID, {
        role_assignments: ["super_admin"],
      }),
    ).rejects.toThrow(ValidationError);

    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });

  it("PATCH with extra JSON key throws ValidationError (T1)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const ctx = buildCtx(SEED_IAM_ID, ["iam_master"]);
    const before = store.listRolesForUser(SEED_TECH_ID);

    await expect(
      dal.patchUserRoles(ctx, SEED_TECH_ID, {
        role_assignments: ["field_tech"],
        extra: true,
      }),
    ).rejects.toThrow(ValidationError);

    expect(store.listRolesForUser(SEED_TECH_ID)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });

  it("successful role change writes audit with before/after role lists", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const ctx = buildCtx(SEED_IAM_ID, ["iam_master"]);

    await dal.patchUserRoles(ctx, SEED_TECH_ID, {
      role_assignments: ["field_tech", "office_admin"],
    });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      actorId: SEED_IAM_ID,
      action: "update",
      tableName: "latch_users",
      recordId: SEED_TECH_ID,
      moduleId: "user_roles_detail",
      fieldIds: ["role_assignments"],
    });
    expect(audit.entries[0]?.before).toMatchObject({
      role_assignments: ["field_tech"],
    });
    expect(audit.entries[0]?.after).toMatchObject({
      role_assignments: ["field_tech", "office_admin"],
    });
    expect(audit.entries[0]?.patch).toEqual({
      role_assignments: ["field_tech", "office_admin"],
    });
  });

  it("self-patch throws ForbiddenError (T8 self-escalation guard)", async () => {
    setAuditWriter(audit.writer);
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createIamDal(store);
    const ctx = buildCtx(SEED_IAM_ID, ["iam_master"]);
    const before = store.listRolesForUser(SEED_IAM_ID);

    await expect(
      dal.patchUserRoles(ctx, SEED_IAM_ID, {
        role_assignments: ["iam_master", "data_master"],
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(store.listRolesForUser(SEED_IAM_ID)).toEqual(before);
    expect(audit.entries).toHaveLength(0);
  });
});

describe("multi-role union_grants from latch_user_roles", () => {
  it("field_tech + office_admin unions job_detail and customer_detail grants", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const userId = "seed-dual-role";
    store.upsertUser({ id: userId, displayName: "Dual role (seed)" });
    store.setUserRoles(userId, ["field_tech", "office_admin"]);

    const roles = await loadRolesForUser(userId, store);
    const principal = { id: userId, roles };

    const techJob = policy.resolve(
      { id: userId, roles: ["field_tech"] },
      { surface: "job_detail", mode: "detail" },
    );
    const adminCustomer = policy.resolve(
      { id: userId, roles: ["office_admin"] },
      { surface: "customer_detail", mode: "detail" },
    );
    const techCustomer = policy.resolve(
      { id: userId, roles: ["field_tech"] },
      { surface: "customer_detail", mode: "detail" },
    );

    const jobManifest = policy.resolve(principal, {
      surface: "job_detail",
      mode: "detail",
    });
    const customerManifest = policy.resolve(principal, {
      surface: "customer_detail",
      mode: "detail",
    });

    expect(roles).toEqual(["field_tech", "office_admin"]);
    expect(techCustomer.fields.profile).toEqual([]);
    expect(adminCustomer.fields.profile).toContain("read");
    expect(customerManifest.fields.profile).toEqual(
      adminCustomer.fields.profile,
    );
    expect(jobManifest.rowScope).toBe("all");
    expect(jobManifest.fields.assignments).toContain("write");
    expect(techJob.rowScope).toBe("own");
    expect(techJob.fields.assignments).not.toContain("write");
  });
});
