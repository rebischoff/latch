import { describe, expect, it } from "vitest";

import type { Principal } from "@latch/contracts";

import { unionGrants, mergeRowScope } from "./merge.js";
import { PolicyService } from "./policy-service.js";

const principal = (...roles: string[]): Principal => ({ id: "user-1", roles });

describe("merge helpers", () => {
  it("mergeRowScope: all wins over own", () => {
    expect(mergeRowScope(["own", "all"])).toBe("all");
    expect(mergeRowScope(["own", undefined])).toBe("own");
  });

  it("unionGrants: denyWins strips denied actions", () => {
    const fields = unionGrants(
      [
        { field: "financial_terms", actions: ["read", "write"], effect: "deny" },
        { field: "financial_terms", actions: ["read"] },
      ],
      { denyWins: true },
    );
    expect(fields.financial_terms).toEqual([]);
  });
});

describe("PolicyService — job_detail matrix", () => {
  const policy = new PolicyService();

  it("field_tech: financial_terms submit only (no read/write/approve)", () => {
    const manifest = policy.resolve(principal("field_tech"), {
      surface: "job_detail",
      entityId: "job-1",
      mode: "detail",
    });

    expect(manifest.surface).toBe("job_detail");
    expect(manifest.entityId).toBe("job-1");
    expect(manifest.rowScope).toBe("own");
    expect(manifest.fields.financial_terms).toEqual(["submit"]);
    expect(manifest.fields.summary).toContain("read");
    expect(manifest.fields.summary).toContain("write");
    expect(manifest.fields.scope).toEqual(["read", "write"]);
    expect(manifest.fields.assignments).toEqual(["read"]);
    expect(manifest.actions).toContain("read");
    expect(manifest.actions).not.toContain("delete");
  });

  it("office_admin: financial_terms includes read, write, approve", () => {
    const manifest = policy.resolve(principal("office_admin"), {
      surface: "job_detail",
      mode: "detail",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.financial_terms).toEqual(
      expect.arrayContaining(["read", "write", "approve"]),
    );
    expect(manifest.fields.financial_terms).toHaveLength(3);
    expect(manifest.fields.assignments).toContain("write");
    expect(manifest.actions).toContain("delete");
    expect(manifest.actions).toContain("restore");
  });

  it("multi-role union: grants from both roles combine", () => {
    const techOnly = policy.resolve(principal("field_tech"), {
      surface: "job_detail",
    });
    const both = policy.resolve(principal("field_tech", "office_admin"), {
      surface: "job_detail",
    });

    expect(both.rowScope).toBe("all");
    expect(both.fields.summary).toEqual(techOnly.fields.summary);
    expect(both.fields.assignments).toContain("write");
    expect(both.actions).toEqual(
      expect.arrayContaining(["read", "write", "delete", "restore"]),
    );
  });

  it("deny wins on financial for field_tech only", () => {
    const tech = policy.resolve(principal("field_tech"), {
      surface: "job_detail",
    });
    const admin = policy.resolve(principal("office_admin"), {
      surface: "job_detail",
    });

    expect(tech.fields.financial_terms).toEqual(["submit"]);
    expect(admin.fields.financial_terms).toEqual(
      expect.arrayContaining(["read", "write", "approve"]),
    );
  });

  it("denyWins: field_tech deny blocks financial even when office_admin allows", () => {
    const manifest = policy.resolve(principal("field_tech", "office_admin"), {
      surface: "job_detail",
    });
    expect(manifest.fields.financial_terms).toEqual(["submit"]);
  });

  it("unknown role contributes nothing", () => {
    const manifest = policy.resolve(principal("unknown_role"), {
      surface: "job_detail",
    });
    expect(manifest.fields.summary).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(manifest.rowScope).toBeUndefined();
  });

  it("unknown surface throws", () => {
    expect(() =>
      policy.resolve(principal("field_tech"), { surface: "missing_surface" }),
    ).toThrow(/Unknown surface/);
  });
});
