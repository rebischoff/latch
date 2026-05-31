import { afterEach, describe, expect, it } from "vitest";

import {
  createMemoryAuditWriter,
  setAuditWriter,
  writeAudit,
} from "./audit-service.js";

describe("writeAudit", () => {
  const memory = createMemoryAuditWriter();

  afterEach(() => {
    memory.reset();
    setAuditWriter(null);
  });

  it("captures entries via the memory writer", async () => {
    setAuditWriter(memory.writer);

    await writeAudit({
      actorId: "user_tech",
      action: "update",
      tableName: "jobs",
      recordId: "job-1",
      before: { title: "Old" },
      after: { title: "New" },
      requestId: "req-abc",
    });

    expect(memory.entries).toHaveLength(1);
    expect(memory.entries[0]).toEqual({
      actorId: "user_tech",
      action: "update",
      tableName: "jobs",
      recordId: "job-1",
      before: { title: "Old" },
      after: { title: "New" },
      requestId: "req-abc",
    });
  });

  it("throws when no writer is configured", async () => {
    await expect(
      writeAudit({
        actorId: "user_tech",
        action: "insert",
        tableName: "jobs",
        recordId: "job-1",
      }),
    ).rejects.toThrow(/Audit writer not configured/);
  });
});
