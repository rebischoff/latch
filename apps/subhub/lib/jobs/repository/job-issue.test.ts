import { ConflictError, ValidationError } from "@latch/contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyFieldIssuesTx,
  cancelIssueTx,
  countOpenIssuesByJob,
  countOpenIssuesByZone,
  createIssueTx,
  resolveIssueTx,
  updateIssueDescriptionTx,
} from "./job-issue";

vi.mock("@latch/audit", () => ({
  writeAudit: vi.fn(async () => undefined),
}));

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount?: number }>;

const createClient = (query: QueryFn): PoolClient =>
  ({ query } as unknown as PoolClient);

const openRow = {
  id: "iss-1",
  site_zone_id: "zone-a",
  description: "No power",
  status: "open",
  reported_by: "emp-1",
  reported_at: new Date("2026-07-01T00:00:00Z"),
  resolved_by: null,
  resolved_at: null,
  resolution_note: "",
};

describe("job_issue lifecycle (tasks 57 / 60)", () => {
  let calls: Array<{ sql: string; params?: unknown[] }>;

  beforeEach(() => {
    calls = [];
  });

  it("creates an open issue and writes audit", async () => {
    const { writeAudit } = await import("@latch/audit");
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("INSERT INTO job_issue")) {
        return {
          rows: [
            {
              ...openRow,
              id: "iss-new",
              description: "Door locked",
              site_zone_id: null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const row = await createIssueTx(client, {
      actorId: "user-1",
      jobId: "job-1",
      siteZoneId: null,
      description: "Door locked",
      reportedBy: "emp-1",
    });

    expect(row.status).toBe("open");
    expect(row.site_zone_id).toBeNull();
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "insert",
        tableName: "job_issue",
        fieldIds: ["field_issues"],
      }),
    );
  });

  it("rejects empty description on create", async () => {
    const client = createClient(async () => ({ rows: [] }));
    await expect(
      createIssueTx(client, {
        actorId: "user-1",
        jobId: "job-1",
        siteZoneId: null,
        description: "   ",
        reportedBy: null,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates description while open and audits", async () => {
    const { writeAudit } = await import("@latch/audit");
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM job_issue WHERE id") && !sql.includes("UPDATE")) {
        return { rows: [openRow] };
      }
      if (sql.includes("UPDATE job_issue") && sql.includes("description")) {
        return {
          rows: [{ ...openRow, description: "Power restored partially" }],
        };
      }
      return { rows: [] };
    });

    const updated = await updateIssueDescriptionTx(client, {
      actorId: "user-1",
      issueId: "iss-1",
      description: "Power restored partially",
    });
    expect(updated.description).toBe("Power restored partially");
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        tableName: "job_issue",
        after: { description: "Power restored partially" },
      }),
    );
  });

  it("rejects description edit after resolve/cancel", async () => {
    const client = createClient(async (sql) => {
      if (sql.includes("FROM job_issue WHERE id")) {
        return { rows: [{ ...openRow, status: "resolved" }] };
      }
      return { rows: [] };
    });

    await expect(
      updateIssueDescriptionTx(client, {
        actorId: "user-1",
        issueId: "iss-1",
        description: "late edit",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("resolves with resolution_note and rejects without one", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM job_issue WHERE id") && !sql.includes("UPDATE")) {
        return { rows: [openRow] };
      }
      if (sql.includes("UPDATE job_issue") && sql.includes("resolved")) {
        return {
          rows: [
            {
              ...openRow,
              status: "resolved",
              resolution_note: "Power restored",
              resolved_by: "emp-2",
              resolved_at: new Date("2026-07-02T00:00:00Z"),
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      resolveIssueTx(client, {
        actorId: "user-1",
        issueId: "iss-1",
        resolutionNote: "  ",
        resolvedBy: "emp-2",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    const resolved = await resolveIssueTx(client, {
      actorId: "user-1",
      issueId: "iss-1",
      resolutionNote: "Power restored",
      resolvedBy: "emp-2",
    });
    expect(resolved.status).toBe("resolved");
    expect(resolved.resolution_note).toBe("Power restored");
  });

  it("cancels with optional note (empty OK) and blocks second terminal write", async () => {
    let status = "open";
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("FROM job_issue WHERE id") && !sql.includes("UPDATE")) {
        return {
          rows: [{ ...openRow, status }],
        };
      }
      if (sql.includes("UPDATE job_issue") && sql.includes("cancelled")) {
        status = "cancelled";
        return {
          rows: [
            {
              ...openRow,
              status: "cancelled",
              resolution_note: String(params?.[1] ?? ""),
              resolved_by: "emp-2",
              resolved_at: new Date("2026-07-02T00:00:00Z"),
            },
          ],
        };
      }
      return { rows: [] };
    });

    const cancelled = await cancelIssueTx(client, {
      actorId: "user-1",
      issueId: "iss-1",
      resolvedBy: "emp-2",
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.resolution_note).toBe("");

    await expect(
      cancelIssueTx(client, {
        actorId: "user-1",
        issueId: "iss-1",
        resolvedBy: "emp-2",
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      resolveIssueTx(client, {
        actorId: "user-1",
        issueId: "iss-1",
        resolutionNote: "late note",
        resolvedBy: "emp-2",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows multiple open issues per zone (no uniqueness)", async () => {
    const inserts: unknown[][] = [];
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("INSERT INTO job_issue")) {
        inserts.push(params ?? []);
        return {
          rows: [
            {
              ...openRow,
              id: `iss-${inserts.length}`,
              description: String(params?.[3]),
              site_zone_id: params?.[2] ?? null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    await createIssueTx(client, {
      actorId: "u",
      jobId: "job-1",
      siteZoneId: "zone-a",
      description: "No power",
      reportedBy: null,
    });
    await createIssueTx(client, {
      actorId: "u",
      jobId: "job-1",
      siteZoneId: "zone-a",
      description: "Door locked",
      reportedBy: null,
    });

    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.[2]).toBe("zone-a");
    expect(inserts[1]?.[2]).toBe("zone-a");
  });

  it("grouped open-issue rollups by zone and by job", async () => {
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("to_regclass")) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes("GROUP BY site_zone_id")) {
        return {
          rows: [
            { site_zone_id: "zone-a", count: 2 },
            { site_zone_id: null, count: 1 },
          ],
        };
      }
      if (sql.includes("GROUP BY job_id")) {
        return {
          rows: [
            { job_id: "job-1", count: 3 },
            { job_id: "job-2", count: 1 },
          ],
        };
      }
      return { rows: [] };
    });

    const byZone = await countOpenIssuesByZone(client, "job-1");
    expect(byZone).toEqual([
      { site_zone_id: "zone-a", zone_key: "zone-a", count: 2 },
      { site_zone_id: null, zone_key: "general", count: 1 },
    ]);

    const byJob = await countOpenIssuesByJob(client, ["job-1", "job-2"]);
    expect(byJob).toEqual([
      { job_id: "job-1", count: 3 },
      { job_id: "job-2", count: 1 },
    ]);
  });

  it("applyFieldIssuesTx rejects persisted delete and runs create/update/resolve/cancel", async () => {
    const statuses = new Map<string, string>([
      ["iss-1", "open"],
      ["iss-2", "open"],
      ["iss-3", "open"],
    ]);
    const descriptions = new Map<string, string>([["iss-3", "Old text"]]);
    const client = createClient(async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("to_regclass")) {
        return { rows: [{ exists: true }] };
      }
      if (sql.includes("INSERT INTO job_issue")) {
        return {
          rows: [
            {
              ...openRow,
              id: "iss-new",
              description: String(params?.[3]),
              site_zone_id: params?.[2] ?? null,
            },
          ],
        };
      }
      if (sql.includes("FROM job_issue WHERE id")) {
        const id = String(params?.[0]);
        return {
          rows: [
            {
              ...openRow,
              id,
              status: statuses.get(id) ?? "open",
              description: descriptions.get(id) ?? openRow.description,
            },
          ],
        };
      }
      if (sql.includes("UPDATE job_issue") && sql.includes("description = $2")) {
        const id = String(params?.[0]);
        descriptions.set(id, String(params?.[1]));
        return {
          rows: [
            {
              ...openRow,
              id,
              description: String(params?.[1]),
              status: statuses.get(id) ?? "open",
            },
          ],
        };
      }
      if (sql.includes("UPDATE job_issue") && sql.includes("'resolved'")) {
        statuses.set(String(params?.[0]), "resolved");
        return {
          rows: [
            {
              ...openRow,
              id: String(params?.[0]),
              status: "resolved",
              resolution_note: String(params?.[1]),
              resolved_by: params?.[2] ?? null,
              resolved_at: new Date(),
            },
          ],
        };
      }
      if (sql.includes("UPDATE job_issue") && sql.includes("'cancelled'")) {
        statuses.set(String(params?.[0]), "cancelled");
        return {
          rows: [
            {
              ...openRow,
              id: String(params?.[0]),
              status: "cancelled",
              resolution_note: String(params?.[1] ?? ""),
              resolved_by: params?.[2] ?? null,
              resolved_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      applyFieldIssuesTx(client, {
        actorId: "user-1",
        employeeId: "emp-1",
        jobId: "job-1",
        patches: [{ op: "delete", id: "iss-1" }],
      }),
    ).rejects.toMatchObject({
      details: expect.objectContaining({ code: "issue_delete_forbidden" }),
    });

    const result = await applyFieldIssuesTx(client, {
      actorId: "user-1",
      employeeId: "emp-1",
      jobId: "job-1",
      patches: [
        {
          op: "create",
          temp_id: "tmp_1",
          site_zone_id: "zone-a",
          description: "New issue",
        },
        { op: "update", id: "iss-3", description: "Edited while open" },
        { op: "resolve", id: "iss-1", resolution_note: "Fixed" },
        { op: "cancel", id: "iss-2", resolution_note: "Duplicate" },
      ],
    });

    expect(result).toEqual({
      created: 1,
      updated: 1,
      resolved: 1,
      cancelled: 1,
    });
  });
});
