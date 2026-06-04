import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  innerPolicyService,
  resolveContext,
  resolveContextFresh,
} from "./latch.js";
import { runWithManifestRequestScope } from "./manifest-request-scope.js";

vi.mock("@/lib/auth/getPrincipal", () => ({
  getPrincipal: vi.fn(async () => ({
    id: "cache-test-user",
    roles: ["office_admin"],
    policyVersion: 1,
  })),
}));

/** Phase 06 DoD — run: `npm run test -- -t "Phase 06"` */
describe("resolveContext manifest cache (Phase 06 benchmark)", () => {
  const previousMode = process.env.LATCH_MANIFEST_CACHE_MODE;

  beforeEach(() => {
    process.env.LATCH_MANIFEST_CACHE_MODE = "request";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (previousMode === undefined) {
      delete process.env.LATCH_MANIFEST_CACHE_MODE;
    } else {
      process.env.LATCH_MANIFEST_CACHE_MODE = previousMode;
    }
  });

  it("regression: duplicate job_list reads in one request scope hit the cache once", async () => {
    const resolveSpy = vi.spyOn(innerPolicyService, "resolve");

    await runWithManifestRequestScope(async () => {
      await resolveContext({ surfaceId: "job_list" });
      await resolveContext({ surfaceId: "job_list" });
    });

    expect(
      resolveSpy,
      "cache bypassed: expected one inner resolve for two identical resolveContext calls",
    ).toHaveBeenCalledTimes(1);
  });

  it("resolveContextFresh bypasses the read cache", async () => {
    const resolveSpy = vi.spyOn(innerPolicyService, "resolve");

    await runWithManifestRequestScope(async () => {
      await resolveContext({ surfaceId: "job_list" });
      await resolveContextFresh({ surfaceId: "job_list" });
    });

    expect(resolveSpy).toHaveBeenCalledTimes(2);
  });
});
