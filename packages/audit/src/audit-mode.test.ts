import { afterEach, describe, expect, it } from "vitest";

import {
  auditMutationClass,
  isAuditModeUpgrade,
  parseAuditMode,
  resetAuditMode,
  shapeAuditEntryForMode,
} from "./audit-mode.js";
import type { AuditEntryInput } from "./types.js";

const sampleInsert: AuditEntryInput = {
  actorId: "user-1",
  action: "insert",
  tableName: "jobs",
  recordId: "job-1",
  moduleId: "job_detail",
  fieldIds: ["title"],
  after: { title: "New job" },
};

const sampleUpdate: AuditEntryInput = {
  actorId: "user-1",
  action: "update",
  tableName: "jobs",
  recordId: "job-1",
  moduleId: "job_detail",
  fieldIds: ["title"],
  before: { title: "Old" },
  after: { title: "New" },
  patch: { title: "New" },
};

const sampleDelete: AuditEntryInput = {
  actorId: "user-1",
  action: "delete",
  tableName: "jobs",
  recordId: "job-1",
  moduleId: "job_detail",
  fieldIds: ["summary"],
  before: { title: "Gone", children: [] },
  after: null,
};

describe("parseAuditMode", () => {
  afterEach(() => {
    resetAuditMode();
  });

  it("accepts the three scaffold modes", () => {
    expect(parseAuditMode("full")).toBe("full");
    expect(parseAuditMode("standard")).toBe("standard");
    expect(parseAuditMode("recovery")).toBe("recovery");
  });

  it("rejects unknown values", () => {
    expect(() => parseAuditMode("minimal")).toThrow(/Invalid audit mode/);
  });
});

describe("isAuditModeUpgrade", () => {
  it("allows recovery → standard → full only", () => {
    expect(isAuditModeUpgrade("recovery", "standard")).toBe(true);
    expect(isAuditModeUpgrade("standard", "full")).toBe(true);
    expect(isAuditModeUpgrade("recovery", "full")).toBe(true);
    expect(isAuditModeUpgrade("full", "standard")).toBe(false);
    expect(isAuditModeUpgrade("standard", "recovery")).toBe(false);
  });
});

describe("auditMutationClass", () => {
  it("classifies bulk_summary by underlying operation", () => {
    expect(
      auditMutationClass("bulk_summary", { operation: "delete", succeeded: 1 }),
    ).toBe("delete");
    expect(auditMutationClass("bulk_summary", { succeeded: 1 })).toBe("update");
  });
});

describe("shapeAuditEntryForMode", () => {
  afterEach(() => {
    resetAuditMode();
  });

  describe("full", () => {
    it("passes entries through unchanged", () => {
      expect(shapeAuditEntryForMode(sampleInsert, "full")).toEqual(sampleInsert);
      expect(shapeAuditEntryForMode(sampleUpdate, "full")).toEqual(sampleUpdate);
      expect(shapeAuditEntryForMode(sampleDelete, "full")).toEqual(sampleDelete);
    });
  });

  describe("standard", () => {
    it("insert keeps metadata only (no after/before/patch)", () => {
      expect(shapeAuditEntryForMode(sampleInsert, "standard")).toEqual({
        actorId: "user-1",
        action: "insert",
        tableName: "jobs",
        recordId: "job-1",
        moduleId: "job_detail",
        fieldIds: ["title"],
      });
    });

    it("update and delete keep before/after/patch", () => {
      expect(shapeAuditEntryForMode(sampleUpdate, "standard")).toEqual(sampleUpdate);
      expect(shapeAuditEntryForMode(sampleDelete, "standard")).toEqual(sampleDelete);
    });
  });

  describe("recovery", () => {
    it("suppresses insert and update writes", () => {
      expect(shapeAuditEntryForMode(sampleInsert, "recovery")).toBeNull();
      expect(shapeAuditEntryForMode(sampleUpdate, "recovery")).toBeNull();
    });

    it("delete keeps before only", () => {
      expect(shapeAuditEntryForMode(sampleDelete, "recovery")).toEqual({
        ...sampleDelete,
        after: null,
        patch: null,
      });
    });
  });
});
