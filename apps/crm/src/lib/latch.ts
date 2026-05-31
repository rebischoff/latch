import { createMemoryAuditWriter, setAuditWriter } from "@latch/audit";
import { isNotFoundError, type PermissionContext } from "@latch/contracts";
import {
  createJobsDal,
  createMemoryPendingStore,
  MemoryJobStore,
  SEED_JOB_OTHER,
  SEED_JOB_OWNED,
  seedPilotJobs,
  type JobsDal,
} from "@latch/dal";
import { PolicyService } from "@latch/policy";

import { createPostgresAuditWriter } from "@/lib/audit-db-writer";
import { getPrincipal } from "@/lib/auth/getPrincipal";
import { getDatabaseUrl } from "@/lib/db";

const policyService = new PolicyService();

const SEED_PLACEHOLDER_JOB_IDS = [SEED_JOB_OWNED, SEED_JOB_OTHER] as const;

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
    g.jobsDal = createJobsDal(g.store, createMemoryPendingStore());
  }
  return g.store;
};

export const getJobsDal = (): JobsDal => {
  ensurePilotStore();
  return pilotGlobal().jobsDal!;
};

/** Seed job ids still present in the in-memory store (placeholder list until `job_list`). */
export const listExistingSeedJobIds = (): string[] => {
  const store = ensurePilotStore();
  return SEED_PLACEHOLDER_JOB_IDS.filter((id) => store.getJob(id) !== undefined);
};

/** Seed jobs the current principal may open on `job_detail` (row scope + existence). */
export const listVisibleSeedJobIds = async (): Promise<string[]> => {
  const dal = getJobsDal();
  const visible: string[] = [];

  for (const id of listExistingSeedJobIds()) {
    const ctx = await resolveContext({
      surfaceId: "job_detail",
      entityId: id,
    });
    try {
      dal.get(ctx, id);
      visible.push(id);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  return visible;
};

export type ResolveContextInput = {
  surfaceId: "job_detail";
  entityId: string;
};

export const resolveContext = async (
  input: ResolveContextInput,
): Promise<PermissionContext> => {
  const principal = await getPrincipal();
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
