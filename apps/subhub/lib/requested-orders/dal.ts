import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  JobMaterialRequestListListQuerySchema,
  jobMaterialRequestListDescriptor,
} from "./descriptors";
import { loadJobMaterialRequestList } from "./repository";
import { createJobMaterialRequestListStore } from "./stores/job-material-request-list-store";

export type JobMaterialRequestListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type JobMaterialRequestsDal = {
  jobMaterialRequestList: JobMaterialRequestListDal;
};

export type CreateJobMaterialRequestsDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createJobMaterialRequestsDal = (
  options: CreateJobMaterialRequestsDalOptions,
): JobMaterialRequestsDal => {
  const { pool } = options;
  const listStore = createJobMaterialRequestListStore(pool);

  const listBaseDal = createSurfaceDal(jobMaterialRequestListDescriptor, listStore);

  const jobMaterialRequestList: JobMaterialRequestListDal = {
    ...listBaseDal,
    list: async (ctx, opts) => {
      const parsed = JobMaterialRequestListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const query = parsed.data;
      const result = await loadJobMaterialRequestList(pool, {
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        job_id: query.job_id,
        status: query.status,
        site_zone_id: query.site_zone_id,
        rowScope: ctx.manifest.rowScope ?? "all",
      });

      return {
        rows: result.rows.map((row) =>
          jobMaterialRequestListDescriptor.projectRow(row, ctx.manifest, undefined),
        ),
        total: result.total,
      };
    },
  };

  return { jobMaterialRequestList };
};

/** @deprecated Use JobMaterialRequestsDal — kept for call-site migration. */
export type RequestedOrdersDal = JobMaterialRequestsDal;

let jobMaterialRequestsDal: JobMaterialRequestsDal | undefined;

export const getJobMaterialRequestsDal = (): JobMaterialRequestsDal => {
  if (!jobMaterialRequestsDal) {
    throw new Error(
      "Job material requests DAL not initialized — call initJobMaterialRequestsDal() first",
    );
  }
  return jobMaterialRequestsDal;
};

/** @deprecated Use getJobMaterialRequestsDal */
export const getRequestedOrdersDal = getJobMaterialRequestsDal;

export const initJobMaterialRequestsDal = (
  options: CreateJobMaterialRequestsDalOptions,
): JobMaterialRequestsDal => {
  jobMaterialRequestsDal = createJobMaterialRequestsDal(options);
  return jobMaterialRequestsDal;
};

/** @deprecated Use initJobMaterialRequestsDal */
export const initRequestedOrdersDal = initJobMaterialRequestsDal;

export const ensureJobMaterialRequestsDal = async (): Promise<JobMaterialRequestsDal> => {
  await ensureAuditBootstrap();

  if (!jobMaterialRequestsDal) {
    initJobMaterialRequestsDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return jobMaterialRequestsDal!;
};

/** @deprecated Use ensureJobMaterialRequestsDal */
export const ensureRequestedOrdersDal = ensureJobMaterialRequestsDal;
