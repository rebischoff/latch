import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  jobDetailDescriptor,
  jobListDescriptor,
  JobListListQuerySchema,
} from "./descriptors";
import { loadJobList } from "./repository";
import { extendJobDetailDal } from "./stores/job-detail-create";
import { createJobDetailStore } from "./stores/job-detail-store";
import { createJobListStore } from "./stores/job-list-store";

export type JobListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type JobDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type JobsDal = {
  jobDetail: JobDetailDal;
  jobList: JobListDal;
};

export type CreateJobsDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createJobsDal = (options: CreateJobsDalOptions): JobsDal => {
  const { pool, getActorId } = options;
  const jobListStore = createJobListStore(pool);
  const jobDetailStore = createJobDetailStore(pool, getActorId);
  const jobListBaseDal = createSurfaceDal(jobListDescriptor, jobListStore);
  const jobDetailBaseDal = createSurfaceDal(jobDetailDescriptor, jobDetailStore);
  const jobDetail = extendJobDetailDal(pool, getActorId, jobDetailBaseDal);

  const jobList: JobListDal = {
    ...jobListBaseDal,
    list: async (ctx, opts) => {
      const parsed = JobListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const query = parsed.data;
      const result = await loadJobList(pool, {
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        rowScope: ctx.manifest.rowScope ?? "all",
      });

      return {
        rows: result.rows.map((row) =>
          jobListDescriptor.projectRow(row, ctx.manifest, undefined),
        ),
        total: result.total,
      };
    },
  };

  return { jobDetail, jobList };
};

let jobsDal: JobsDal | undefined;

export const getJobsDal = (): JobsDal => {
  if (!jobsDal) {
    throw new Error("Jobs DAL not initialized — call initJobsDal() first");
  }
  return jobsDal;
};

export const initJobsDal = (options: CreateJobsDalOptions): JobsDal => {
  jobsDal = createJobsDal(options);
  return jobsDal;
};

export const ensureJobsDal = async (): Promise<JobsDal> => {
  await ensureAuditBootstrap();

  if (!jobsDal) {
    initJobsDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return jobsDal!;
};
