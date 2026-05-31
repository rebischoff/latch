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
    __latchWebPilot?: LatchPilotGlobal;
  };
  if (!root.__latchWebPilot) {
    root.__latchWebPilot = {};
  }
  return root.__latchWebPilot;
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
    g.jobsDal = createJobsDal(g.store, createMemoryPendingStore());
  }
  return g.store;
};

export const getJobsDal = (): JobsDal => {
  ensurePilotStore();
  return pilotGlobal().jobsDal!;
};

export type ResolveContextInput = {
  surfaceId: "job_detail";
  entityId: string;
};

export const resolveContext = (input: ResolveContextInput): PermissionContext => {
  const principal = getPrincipal();
  const manifest = policyService.resolve(principal, {
    surface: input.surfaceId,
    entityId: input.entityId,
    mode: "detail",
  });

  return {
    principal,
    manifest,
    surface: input.surfaceId,
  };
};
