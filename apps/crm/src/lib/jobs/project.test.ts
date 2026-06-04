import { describe, expect, it } from "vitest";

import type { PendingChange } from "@latch/approval";
import type { Manifest } from "@latch/contracts";

import {
  overlayJobDetailVerificationPending,
  type ProjectedJobDetail,
} from "./project.js";

const baseDto: ProjectedJobDetail = {
  id: "job-1",
  summary: { title: "Test", status: "open", scheduled_at: null },
};

const openPending: PendingChange = {
  id: "pending-1",
  surfaceId: "job_detail",
  entityId: "job-1",
  fieldIds: ["financial_terms"],
  patch: { financial_terms: { contract_amount: "99999.00" } },
  status: "submitted",
  submittedBy: "tech-1",
  submittedAt: new Date(),
};

const techSubmitterManifest: Manifest = {
  surface: "job_detail",
  actions: ["read"],
  fields: {
    summary: ["read", "write"],
    financial_terms: ["submit"],
  },
};

const adminReviewerManifest: Manifest = {
  surface: "job_detail",
  actions: ["read", "write", "delete"],
  fields: {
    summary: ["read", "write"],
    financial_terms: ["read", "write", "approve"],
  },
};

const outsiderManifest: Manifest = {
  surface: "job_detail",
  actions: ["read"],
  fields: {
    summary: ["read"],
    financial_terms: ["read"],
  },
};

describe("overlayJobDetailVerificationPending", () => {
  it("submitter sees proposed contract_amount without live read", () => {
    const result = overlayJobDetailVerificationPending(
      baseDto,
      techSubmitterManifest,
      "tech-1",
      openPending,
    );
    expect(result.financial_terms?.contract_amount).toBe("99999.00");
    expect(result.verification_pending?.id).toBe("pending-1");
  });

  it("reviewer sees live value and verification_pending strip payload", () => {
    const withLive: ProjectedJobDetail = {
      ...baseDto,
      financial_terms: { contract_amount: "12500.00" },
    };
    const result = overlayJobDetailVerificationPending(
      withLive,
      adminReviewerManifest,
      "admin-1",
      openPending,
    );
    expect(result.financial_terms?.contract_amount).toBe("12500.00");
    expect(result.verification_pending?.financial_terms.contract_amount).toBe(
      "99999.00",
    );
  });

  it("submitter overlay reads contract_amount from JSON string patch (Postgres)", () => {
    const stringPatchPending: PendingChange = {
      ...openPending,
      patch: JSON.stringify(openPending.patch),
    };
    const result = overlayJobDetailVerificationPending(
      baseDto,
      techSubmitterManifest,
      "tech-1",
      stringPatchPending,
    );
    expect(result.financial_terms?.contract_amount).toBe("99999.00");
  });

  it("principal without submit or approve sees no pending leakage", () => {
    const withLive: ProjectedJobDetail = {
      ...baseDto,
      financial_terms: { contract_amount: "12500.00" },
    };
    const result = overlayJobDetailVerificationPending(
      withLive,
      outsiderManifest,
      "other-1",
      openPending,
    );
    expect(result).toEqual(withLive);
    expect(result).not.toHaveProperty("verification_pending");
  });
});
