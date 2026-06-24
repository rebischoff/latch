import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  estimateDetailDescriptor,
  estimateListDescriptor,
  EstimateListListQuerySchema,
  jobPartyRelationTableDescriptor,
} from "./descriptors";
import { loadEstimateList } from "./repository";
import { extendEstimateDetailDal } from "./stores/estimate-detail-create";
import { createEstimateDetailStore } from "./stores/estimate-detail-store";
import { createEstimateListStore } from "./stores/estimate-list-store";
import {
  extendJobPartyRelationTableDal,
  type JobPartyRelationTableDal,
} from "./stores/party-relation-table-dal";
import { createJobPartyRelationTableStore } from "./stores/party-relation-table-store";

export type { JobPartyRelationTableDal } from "./stores/party-relation-table-dal";

export type EstimateListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type EstimateDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type EstimatesDal = {
  estimateDetail: EstimateDetailDal;
  estimateList: EstimateListDal;
  jobPartyRelationTable: JobPartyRelationTableDal;
};

export type CreateEstimatesDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createEstimatesDal = (
  options: CreateEstimatesDalOptions,
): EstimatesDal => {
  const { pool, getActorId } = options;
  const estimateListStore = createEstimateListStore(pool);
  const estimateDetailStore = createEstimateDetailStore(pool, getActorId);
  const jobPartyRelationTableStore = createJobPartyRelationTableStore(
    pool,
    getActorId,
  );
  const estimateListBaseDal = createSurfaceDal(
    estimateListDescriptor,
    estimateListStore,
  );
  const estimateDetailBaseDal = createSurfaceDal(
    estimateDetailDescriptor,
    estimateDetailStore,
  );
  const jobPartyRelationTableBaseDal = createSurfaceDal(
    jobPartyRelationTableDescriptor,
    jobPartyRelationTableStore,
  );
  const estimateDetail = extendEstimateDetailDal(
    pool,
    getActorId,
    estimateDetailBaseDal,
  );
  const jobPartyRelationTable = extendJobPartyRelationTableDal(
    pool,
    getActorId,
    jobPartyRelationTableBaseDal,
  );

  const estimateList: EstimateListDal = {
    ...estimateListBaseDal,
    list: async (ctx, opts) => {
      const parsed = EstimateListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const query = parsed.data;
      const result = await loadEstimateList(pool, {
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        q: query.q,
        rowScope: ctx.manifest.rowScope ?? "all",
      });

      return {
        rows: result.rows.map((row) =>
          estimateListDescriptor.projectRow(row, ctx.manifest, undefined),
        ),
        total: result.total,
      };
    },
  };

  return { estimateDetail, estimateList, jobPartyRelationTable };
};

let estimatesDal: EstimatesDal | undefined;

export const getEstimatesDal = (): EstimatesDal => {
  if (!estimatesDal) {
    throw new Error("Estimates DAL not initialized — call initEstimatesDal() first");
  }
  return estimatesDal;
};

export const initEstimatesDal = (options: CreateEstimatesDalOptions): EstimatesDal => {
  estimatesDal = createEstimatesDal(options);
  return estimatesDal;
};

export const ensureEstimatesDal = async (): Promise<EstimatesDal> => {
  await ensureAuditBootstrap();

  if (!estimatesDal) {
    initEstimatesDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return estimatesDal!;
};
