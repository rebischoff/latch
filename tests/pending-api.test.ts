import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAuditWriter, createMemoryAuditWriter } from "@latch/audit";
import {
  SEED_ADMIN_ID,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  SEED_TECH_ID,
  seedPilotJobs,
} from "@latch/crm/test-utils";

import { GET as pendingListGet } from "@/app/api/pending/route";
import { POST as pendingAcceptPost } from "@/app/api/pending/[id]/accept/route";
import { POST as pendingRejectPost } from "@/app/api/pending/[id]/reject/route";
import { POST as pendingWithdrawPost } from "@/app/api/pending/[id]/withdraw/route";
import * as providerSession from "@/lib/auth/provider-session.js";
import {
  getJobsDal,
  getPendingForEntity,
  getPendingStore,
  resetLatchPilotCachesForTests,
  resolveContext,
} from "@/lib/latch";
import { getPilotStore } from "@/lib/pilot-store";

vi.mock("@/lib/auth/provider-session.js", () => ({
  readProviderSession: vi.fn(),
}));

const readProviderSession = vi.mocked(providerSession.readProviderSession);

const audit = createMemoryAuditWriter();

const listPending = (entityId: string, status = "submitted"): Promise<Response> =>
  pendingListGet(
    new Request(
      `http://localhost/api/pending?surface=job_detail&entity_id=${entityId}&status=${status}`,
    ),
  );

const acceptPending = (id: string): Promise<Response> =>
  pendingAcceptPost(new Request(`http://localhost/api/pending/${id}/accept`, {
    method: "POST",
  }), { params: Promise.resolve({ id }) });

const rejectPending = (id: string, comment?: string): Promise<Response> =>
  pendingRejectPost(
    new Request(`http://localhost/api/pending/${id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(comment !== undefined ? { comment } : {}),
    }),
    { params: Promise.resolve({ id }) },
  );

const withdrawPending = (id: string): Promise<Response> =>
  pendingWithdrawPost(
    new Request(`http://localhost/api/pending/${id}/withdraw`, {
      method: "POST",
    }),
    { params: Promise.resolve({ id }) },
  );

describe("pending HTTP API — job_detail", () => {
  beforeEach(() => {
    setAuditWriter(audit.writer);
    resetLatchPilotCachesForTests();
    seedPilotJobs(getPilotStore());
    audit.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    setAuditWriter(null);
  });

  it("list submitted → accept / reject / withdraw", async () => {
    readProviderSession.mockResolvedValue({
      userId: SEED_TECH_ID,
      label: "tech@demo.local",
    });

    await getJobsDal().patch(
      await resolveContext({
        surfaceId: "job_detail",
        entityId: SEED_JOB_OWNED,
      }),
      SEED_JOB_OWNED,
      { financial_terms: { contract_amount: "20000.00" } },
    );

    const submitted = await getPendingForEntity(SEED_JOB_OWNED, {
      surfaceId: "job_detail",
      status: "submitted",
    });
    expect(submitted).toHaveLength(1);
    const pendingId = submitted[0]!.id;

    readProviderSession.mockResolvedValue({
      userId: SEED_ADMIN_ID,
      label: "admin@demo.local",
    });

    const listRes = await listPending(SEED_JOB_OWNED);
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      data: { id: string; status: string }[];
    };
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]?.id).toBe(pendingId);

    const acceptRes = await acceptPending(pendingId);
    expect(acceptRes.status).toBe(200);
    const acceptBody = (await acceptRes.json()) as {
      data: { financial_terms?: { contract_amount?: string } };
    };
    expect(acceptBody.data.financial_terms?.contract_amount).toBe("20000.00");

    readProviderSession.mockResolvedValue({
      userId: SEED_TECH_ID,
      label: "tech@demo.local",
    });
    await getJobsDal().patch(
      await resolveContext({
        surfaceId: "job_detail",
        entityId: SEED_JOB_OWNED,
      }),
      SEED_JOB_OWNED,
      { financial_terms: { contract_amount: "21000.00" } },
    );

    const second = await getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(second).toHaveLength(1);

    readProviderSession.mockResolvedValue({
      userId: SEED_ADMIN_ID,
      label: "admin@demo.local",
    });

    const rejectRes = await rejectPending(second[0]!.id, "Not approved");
    expect(rejectRes.status).toBe(200);

    readProviderSession.mockResolvedValue({
      userId: SEED_TECH_ID,
      label: "tech@demo.local",
    });
    await getJobsDal().patch(
      await resolveContext({
        surfaceId: "job_detail",
        entityId: SEED_JOB_OWNED,
      }),
      SEED_JOB_OWNED,
      { financial_terms: { contract_amount: "22000.00" } },
    );

    const third = await getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(third).toHaveLength(1);

    const withdrawRes = await withdrawPending(third[0]!.id);
    expect(withdrawRes.status).toBe(200);

    const afterWithdraw = await getPendingForEntity(SEED_JOB_OWNED, {
      status: "submitted",
    });
    expect(afterWithdraw).toHaveLength(0);
  });

  it("field_tech GET pending on another user's job → 404 hide", async () => {
    await getPendingStore().submit({
      surfaceId: "job_detail",
      entityId: SEED_JOB_OTHER,
      fieldIds: ["financial_terms"],
      patch: { financial_terms: { contract_amount: "30000.00" } },
      submittedBy: SEED_ADMIN_ID,
    });

    readProviderSession.mockResolvedValue({
      userId: SEED_TECH_ID,
      label: "tech@demo.local",
    });

    const listRes = await listPending(SEED_JOB_OTHER);
    expect(listRes.status).toBe(404);
  });
});
