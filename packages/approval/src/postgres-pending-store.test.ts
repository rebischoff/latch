import { afterEach, describe, expect, it } from "vitest";

import { createPostgresPendingStore } from "./postgres-pending-store.js";

const pendingDatabaseUrl = (): string | undefined => {
  const appUrl = process.env.LATCH_APP_DATABASE_URL?.trim();
  if (appUrl) {
    return appUrl;
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl?.includes("latch_app")) {
    return databaseUrl;
  }
  return undefined;
};

describe("createPostgresPendingStore", () => {
  const handles: Array<{ close: () => Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(handles.splice(0).map((h) => h.close()));
  });

  it.runIf(Boolean(pendingDatabaseUrl()))(
    "submit and getById survive a new store connection (restart smoke)",
    async () => {
      const url = pendingDatabaseUrl()!;
      const first = createPostgresPendingStore(url);
      handles.push(first);

      const entityId = `pending-smoke-${crypto.randomUUID()}`;
      const submitted = await first.store.submit({
        surfaceId: "job_detail",
        entityId,
        fieldIds: ["financial_terms"],
        patch: { financial_terms: { contract_amount: "100.00" } },
        submittedBy: "pending-smoke-user",
      });

      await first.close();

      const second = createPostgresPendingStore(url);
      handles.push(second);

      const loaded = await second.store.getById(submitted.id);
      expect(loaded).toMatchObject({
        id: submitted.id,
        surfaceId: "job_detail",
        entityId,
        status: "submitted",
        submittedBy: "pending-smoke-user",
        fieldIds: ["financial_terms"],
        patch: { financial_terms: { contract_amount: "100.00" } },
      });

      await second.store.resolve(submitted.id, {
        status: "rejected",
        decidedBy: "pending-smoke-reviewer",
      });

      const terminal = await second.store.getById(submitted.id);
      expect(terminal?.status).toBe("rejected");
      expect(terminal?.decidedBy).toBe("pending-smoke-reviewer");

      await expect(
        second.store.resolve(submitted.id, {
          status: "accepted",
          decidedBy: "pending-smoke-reviewer",
        }),
      ).rejects.toThrow(/not submitted/);
    },
  );
});
