import { describe, expect, it } from "vitest";

import { createMemoryPendingStore } from "@latch/approval";
import {
  NotFoundError,
  ValidationError,
  type PermissionContext,
} from "@latch/contracts";
import {
  createJobsDal,
  MemoryJobStore,
  SEED_ADMIN_ID,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "@latch/dal";
import { PolicyService } from "@latch/policy";

const policy = new PolicyService();

const buildCtx = (
  userId: string,
  roles: string[],
  entityId?: string,
): PermissionContext => {
  const principal = { id: userId, roles };
  const manifest = policy.resolve(principal, {
    surface: "job_detail",
    entityId,
    mode: "detail",
  });
  return { principal, manifest, surface: "job_detail" };
};

describe("job_detail — policy → DAL → DTO (e2e)", () => {
  it("S1 manifests differ by role; S4 hides other jobs; strict PATCH rejects unknown keys", async () => {
    const store = new MemoryJobStore();
    seedPilotJobs(store);
    const dal = createJobsDal(store, createMemoryPendingStore());

    const techCtx = buildCtx(SEED_TECH_ID, ["field_tech"], SEED_JOB_OWNED);
    const adminCtx = buildCtx(SEED_ADMIN_ID, ["office_admin"], SEED_JOB_OWNED);

    expect(techCtx.manifest.rowScope).toBe("own");
    expect(adminCtx.manifest.rowScope).toBe("all");
    expect(techCtx.manifest.fields.financial_terms).toEqual(["submit"]);
    expect(adminCtx.manifest.fields.financial_terms).toEqual(
      expect.arrayContaining(["read", "write", "approve"]),
    );

    const techDto = dal.get(techCtx, SEED_JOB_OWNED);
    const adminDto = dal.get(adminCtx, SEED_JOB_OWNED);

    expect(techDto.id).toBe(SEED_JOB_OWNED);
    expect(adminDto.id).toBe(SEED_JOB_OWNED);
    expect(techDto.summary?.title).toContain("Panel upgrade");
    expect(techDto).not.toHaveProperty("financial_terms");
    expect(adminDto.financial_terms?.contract_amount).toBe("12500.00");

    expect(() =>
      dal.get(buildCtx(SEED_TECH_ID, ["field_tech"]), SEED_JOB_OTHER),
    ).toThrow(NotFoundError);

    await expect(
      dal.patch(techCtx, SEED_JOB_OWNED, {
        summary: { title: "Ok" },
        evil: true,
      }),
    ).rejects.toThrow(ValidationError);
  });
});
