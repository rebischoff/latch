import {
  createMemoryAuditWriter,
  setAuditWriter,
  type AuditWriter,
} from "@latch/audit";
import type { PermissionContext } from "@latch/contracts";
import { createMemoryPendingStore } from "@latch/approval";
import { PolicyService } from "@latch/policy";

import { SEED_CUSTOMER_ACME, SEED_CUSTOMER_OAK } from "../../db/seed.js";
import { getPilotStore } from "@/lib/pilot-store";
import {
  createCustomersDal,
  type CustomersDal,
} from "./customers/repository.js";
import { createIamDal, type IamDal } from "./iam/repository.js";
import { createJobsDal, type JobsDal } from "./jobs/repository.js";
import { jobPolicyRegistry } from "./policy/registry.js";

import { createPostgresAuditWriter } from "@/lib/audit-db-writer";
import { getPrincipal } from "@/lib/auth/getPrincipal";
import { getDatabaseUrl } from "@/lib/db";

const policyService = new PolicyService({ registry: jobPolicyRegistry });

type LatchPilotGlobal = {
  jobsDal?: JobsDal;
  customersDal?: CustomersDal;
  iamDal?: IamDal;
  auditWriter?: AuditWriter;
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

/** Re-apply writer after HMR can reset the `@latch/audit` module singleton. */
const ensureAuditWriter = (): void => {
  const g = pilotGlobal();
  if (!g.auditWriter) {
    const databaseUrl = getDatabaseUrl();
    g.auditWriter = databaseUrl
      ? createPostgresAuditWriter(databaseUrl).writer
      : createMemoryAuditWriter().writer;
  }
  setAuditWriter(g.auditWriter);
};

/** Recreate when HMR reloads domain modules but the global pilot cache still holds a stale DAL. */
const ensureJobsDal = (): JobsDal => {
  const g = pilotGlobal();
  ensureAuditWriter();
  const store = getPilotStore();
  if (!g.jobsDal || typeof g.jobsDal.list !== "function") {
    g.jobsDal = createJobsDal(store, createMemoryPendingStore());
  }
  return g.jobsDal;
};

export const getJobsDal = (): JobsDal => ensureJobsDal();

const ensureCustomersDal = (): CustomersDal => {
  const g = pilotGlobal();
  const store = getPilotStore();
  if (!g.customersDal) {
    g.customersDal = createCustomersDal(store);
  }
  return g.customersDal;
};

export const getCustomersDal = (): CustomersDal => ensureCustomersDal();

const ensureIamDal = (): IamDal => {
  const g = pilotGlobal();
  ensureAuditWriter();
  const store = getPilotStore();
  if (!g.iamDal) {
    g.iamDal = createIamDal(store);
  }
  return g.iamDal;
};

export const getIamDal = (): IamDal => ensureIamDal();

/** Stable customer ids for manual QA (`/customers?id=`). */
export { SEED_CUSTOMER_ACME, SEED_CUSTOMER_OAK };

export type ResolveContextInput =
  | { surfaceId: "job_detail"; entityId: string }
  | { surfaceId: "job_list" }
  | { surfaceId: "customer_detail"; entityId: string }
  | { surfaceId: "user_roles_detail"; entityId: string };

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
      : input.surfaceId === "customer_detail"
        ? policyService.resolve(principal, {
            surface: "customer_detail",
            entityId: input.entityId,
            mode: "detail",
          })
        : input.surfaceId === "user_roles_detail"
          ? policyService.resolve(principal, {
              surface: "user_roles_detail",
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
