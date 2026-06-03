import { describe, expect, it } from "vitest";

import type { Principal } from "@latch/contracts";
import { PolicyService } from "@latch/policy";

import { jobPolicyRegistry } from "./registry.js";

const principal = (...roles: string[]): Principal => ({ id: "user-1", roles });

describe("PolicyService — job_detail matrix", () => {
  const policy = new PolicyService({ registry: jobPolicyRegistry });

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
    expect(manifest.fields.customer_ref).toEqual(["read"]);
    expect(manifest.actions).toContain("delete");
    expect(manifest.actions).toContain("restore");
  });

  it("field_tech: customer_ref omitted from manifest (cross-link hidden)", () => {
    const manifest = policy.resolve(principal("field_tech"), {
      surface: "job_detail",
      mode: "detail",
    });

    expect(manifest.fields.customer_ref).toEqual([]);
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

describe("PolicyService — customer_detail matrix", () => {
  const policy = new PolicyService({ registry: jobPolicyRegistry });

  it("office_admin: read/write on profile, billing, sites; read-only job_history", () => {
    const manifest = policy.resolve(principal("office_admin"), {
      surface: "customer_detail",
      mode: "detail",
    });

    expect(manifest.surface).toBe("customer_detail");
    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.profile).toEqual(["read", "write"]);
    expect(manifest.fields.billing).toEqual(["read", "write"]);
    expect(manifest.fields.sites).toEqual(["read", "write"]);
    expect(manifest.fields.job_history).toEqual(["read"]);
    expect(manifest.actions).toEqual(["read", "write"]);
    expect(manifest.actions).not.toContain("delete");
  });

  it("field_tech: no binding — empty manifest", () => {
    const manifest = policy.resolve(principal("field_tech"), {
      surface: "customer_detail",
      mode: "detail",
    });

    expect(manifest.fields.profile).toEqual([]);
    expect(manifest.fields.billing).toEqual([]);
    expect(manifest.fields.sites).toEqual([]);
    expect(manifest.fields.job_history).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(manifest.rowScope).toBeUndefined();
  });
});

describe("PolicyService — job_list matrix", () => {
  const policy = new PolicyService({ registry: jobPolicyRegistry });

  it("field_tech: list columns without financial_terms", () => {
    const manifest = policy.resolve(principal("field_tech"), {
      surface: "job_list",
      mode: "list",
    });

    expect(manifest.surface).toBe("job_list");
    expect(manifest.rowScope).toBe("own");
    expect(manifest.fields.financial_terms).toEqual([]);
    expect(manifest.fields.summary).toEqual(["read"]);
    expect(manifest.fields.customer_site).toEqual(["read"]);
    expect(manifest.fields.assignments).toEqual(["read"]);
    expect(manifest.actions).toEqual(["read"]);
    expect(manifest.actions).not.toContain("delete");
  });

  it("office_admin: read all fields, write assignments, bulk surface actions", () => {
    const manifest = policy.resolve(principal("office_admin"), {
      surface: "job_list",
      mode: "list",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.financial_terms).toEqual(["read"]);
    expect(manifest.fields.assignments).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(
      expect.arrayContaining(["read", "write", "delete"]),
    );
    expect(manifest.actions).not.toContain("restore");
  });

  it("multi-role union: admin write on assignments when tech also listed", () => {
    const manifest = policy.resolve(principal("field_tech", "office_admin"), {
      surface: "job_list",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.assignments).toContain("write");
    expect(manifest.fields.financial_terms).toEqual(["read"]);
  });
});

describe("PolicyService — data_master wildcard", () => {
  const policy = new PolicyService({ registry: jobPolicyRegistry });

  it("job_detail: read/write on all business fields without per-Surface YAML", () => {
    const manifest = policy.resolve(principal("data_master"), {
      surface: "job_detail",
      mode: "detail",
    });

    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.summary).toEqual(["read", "write"]);
    expect(manifest.fields.scope).toEqual(["read", "write"]);
    expect(manifest.fields.financial_terms).toEqual(["read", "write"]);
    expect(manifest.fields.customer_ref).toEqual(["read", "write"]);
    expect(manifest.fields.assignments).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("customer_detail: superset of office_admin field reads", () => {
    const admin = policy.resolve(principal("office_admin"), {
      surface: "customer_detail",
      mode: "detail",
    });
    const dataMaster = policy.resolve(principal("data_master"), {
      surface: "customer_detail",
      mode: "detail",
    });

    for (const field of ["profile", "billing", "sites", "job_history"] as const) {
      for (const action of admin.fields[field]) {
        expect(dataMaster.fields[field]).toContain(action);
      }
    }
    expect(dataMaster.fields.profile).toEqual(["read", "write"]);
    expect(dataMaster.fields.job_history).toEqual(["read", "write"]);
  });
});

describe("PolicyService — user_roles_detail matrix", () => {
  const policy = new PolicyService({ registry: jobPolicyRegistry });

  it("iam_master: read profile; read/write role_assignments", () => {
    const manifest = policy.resolve(principal("iam_master"), {
      surface: "user_roles_detail",
      mode: "detail",
    });

    expect(manifest.surface).toBe("user_roles_detail");
    expect(manifest.rowScope).toBe("all");
    expect(manifest.fields.profile).toEqual(["read"]);
    expect(manifest.fields.role_assignments).toEqual(["read", "write"]);
    expect(manifest.actions).toEqual(["read", "write"]);
  });

  it("field_tech: no binding — cannot write role_assignments", () => {
    const manifest = policy.resolve(principal("field_tech"), {
      surface: "user_roles_detail",
      mode: "detail",
    });

    expect(manifest.fields.profile).toEqual([]);
    expect(manifest.fields.role_assignments).toEqual([]);
    expect(manifest.actions).toEqual([]);
    expect(manifest.rowScope).toBeUndefined();
  });

  it("office_admin and data_master: no binding on IAM surface", () => {
    for (const role of ["office_admin", "data_master"] as const) {
      const manifest = policy.resolve(principal(role), {
        surface: "user_roles_detail",
      });
      expect(manifest.fields.role_assignments).toEqual([]);
      expect(manifest.actions).toEqual([]);
    }
  });

  it("data_master + field_tech: job_detail unions data scope; financial denyWins", () => {
    const dataOnly = policy.resolve(principal("data_master"), {
      surface: "job_detail",
      mode: "detail",
    });
    const dual = policy.resolve(principal("data_master", "field_tech"), {
      surface: "job_detail",
      mode: "detail",
    });

    expect(dual.rowScope).toBe("all");
    expect(dual.fields.summary).toEqual(dataOnly.fields.summary);
    expect(dual.fields.financial_terms).toEqual(["submit"]);
  });
});
