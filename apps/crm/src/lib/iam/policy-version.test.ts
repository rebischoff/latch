import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  setAuditWriter,
} from "@latch/audit";

import { getDatabaseUrl } from "@/lib/db";

import { SEED_IAM_ID, SEED_TECH_ID, seedPilotJobs } from "../../../db/seed.js";
import { MemoryJobStore } from "../../../db/memory-store.js";
import { createIamDal } from "./repository.js";
import {
  bumpPolicyVersion,
  closePolicyVersionPool,
  getPolicyVersion,
} from "./policy-version.js";
import { PolicyService } from "@latch/policy";
import type { PermissionContext } from "@latch/contracts";

import { jobPolicyRegistry } from "../policy/registry.js";

const databaseUrl = (): string | undefined => getDatabaseUrl()?.trim();

const policy = new PolicyService({ registry: jobPolicyRegistry });

const iamMasterCtx = (): PermissionContext => ({
  principal: { id: SEED_IAM_ID, roles: ["iam_master"] },
  manifest: policy.resolve(
    { id: SEED_IAM_ID, roles: ["iam_master"] },
    { surface: "user_roles_detail", mode: "detail" },
  ),
  surface: "user_roles_detail",
});

describe("policyVersion — Postgres counter", () => {
  afterEach(async () => {
    await closePolicyVersionPool();
  });

  it.runIf(Boolean(databaseUrl()))(
    "bumpPolicyVersion increments; consecutive reads return the new version",
    async () => {
      const before = await getPolicyVersion(SEED_IAM_ID);
      expect(before).toBeTypeOf("number");

      const afterBump = await bumpPolicyVersion(SEED_IAM_ID);
      expect(afterBump).toBe((before ?? 0) + 1);

      const readAgain = await getPolicyVersion(SEED_IAM_ID);
      expect(readAgain).toBe(afterBump);
    },
  );

  it.runIf(Boolean(databaseUrl()))(
    "IAM role patch bumps policyVersion",
    async () => {
      setAuditWriter(createMemoryAuditWriter().writer);
      const store = new MemoryJobStore();
      seedPilotJobs(store);
      const dal = createIamDal(store);
      const before = await getPolicyVersion(SEED_IAM_ID);

      await dal.patchUserRoles(iamMasterCtx(), SEED_TECH_ID, {
        role_assignments: ["field_tech"],
      });

      const after = await getPolicyVersion(SEED_IAM_ID);
      expect(after).toBe((before ?? 0) + 1);
    },
  );
});
