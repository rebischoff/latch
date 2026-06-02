import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import type { PermissionContext } from "@latch/contracts";
import {
  createJobsDal,
  createMemoryPendingStore,
  MemoryJobStore,
  seedPilotJobs,
  type JobsDal,
} from "@latch/dal";
import { PolicyService } from "@latch/policy";

import { createPostgresAuditWriter } from "@/lib/audit-db-writer";
import { getPrincipal } from "@/lib/auth/getPrincipal";
import { getDatabaseUrl } from "@/lib/db";

const policyService = new PolicyService();

type LatchPilotGlobal = {
  store?: MemoryJobStore;
  jobsDal?: JobsDal;
  auditWriterReady?: boolean;
};

const pilotGlobal = (): LatchPilotGlobal => {
  const root = globalThis as typeof globalThis & {
    __latchCrmPilot?: LatchPilotGlobal;
  };
  if (!root.__latchCrmPilot) {
    root.__latchCrmPilot = {};
  }
  return root.__latchCrmPilot;
};

const ensureAuditWriter = (): void => {
  const g = pilotGlobal();
  if (g.auditWriterReady) {
    return;
  }
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    setAuditWriter(createPostgresAuditWriter(databaseUrl).writer);
  } else {
    setAuditWriter(createMemoryAuditWriter().writer);
  }
  g.auditWriterReady = true;
};

const ensurePilotStore = (): MemoryJobStore => {
  const g = pilotGlobal();
  if (!g.store) {
    ensureAuditWriter();
    g.store = new MemoryJobStore();
    seedPilotJobs(g.store);
  }
  return g.store;
};

/** Recreate when HMR reloads `@latch/dal` but the global pilot cache still holds a pre-list DAL. */
const ensureJobsDal = (): JobsDal => {
  const g = pilotGlobal();
  const store = ensurePilotStore();
  if (!g.jobsDal || typeof g.jobsDal.list !== "function") {
    g.jobsDal = createJobsDal(store, createMemoryPendingStore());
  }
  return g.jobsDal;
};

export const getJobsDal = (): JobsDal => ensureJobsDal();

export type ResolveContextInput =
  | { surfaceId: "job_detail"; entityId: string }
  | { surfaceId: "job_list" };

export const resolveContext = async (
  input: ResolveContextInput,
): Promise<PermissionContext> => {
  const principal = await getPrincipal();
  const manifest =
    input.surfaceId === "job_detail"
      ? policyService.resolve(principal, {
          surface: "job_detail",
          entityId: input.entityId,
          mode: "detail",
        })
      : policyService.resolve(principal, {
          surface: "job_list",
          mode: "list",
        });

  return {
    principal,
    manifest,
    surface: input.surfaceId,
  };
};
