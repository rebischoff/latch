import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_AUDIT_CONFIG,
  DEFAULT_AUDIT_RETENTION_YEARS,
  getAuditConfig,
  resetAuditConfig,
  setAuditConfig,
} from "./config";

describe("audit config", () => {
  afterEach(() => {
    resetAuditConfig();
  });

  it("defaults retentionYears to 3", () => {
    expect(DEFAULT_AUDIT_RETENTION_YEARS).toBe(3);
    expect(DEFAULT_AUDIT_CONFIG.retentionYears).toBe(3);
    expect(getAuditConfig().retentionYears).toBe(3);
  });

  it("merges partial overrides", () => {
    setAuditConfig({ retentionYears: 7 });
    expect(getAuditConfig().retentionYears).toBe(7);
    resetAuditConfig();
    expect(getAuditConfig().retentionYears).toBe(3);
  });
});
