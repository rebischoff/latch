import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  RequestedOrderListListQuerySchema,
  requestedOrderDetailDescriptor,
  requestedOrderListDescriptor,
} from "./descriptors";
import { loadRequestedOrderList } from "./repository";
import { extendRequestedOrderDetailDal } from "./stores/requested-order-detail-create";
import { createRequestedOrderDetailStore } from "./stores/requested-order-detail-store";
import { createRequestedOrderListStore } from "./stores/requested-order-list-store";

export type RequestedOrderListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type RequestedOrderDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type RequestedOrdersDal = {
  requestedOrderDetail: RequestedOrderDetailDal;
  requestedOrderList: RequestedOrderListDal;
};

export type CreateRequestedOrdersDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createRequestedOrdersDal = (
  options: CreateRequestedOrdersDalOptions,
): RequestedOrdersDal => {
  const { pool, getActorId } = options;
  const requestedOrderListStore = createRequestedOrderListStore(pool);
  const requestedOrderDetailStore = createRequestedOrderDetailStore(pool, getActorId);

  const requestedOrderListBaseDal = createSurfaceDal(
    requestedOrderListDescriptor,
    requestedOrderListStore,
  );
  const requestedOrderDetailBaseDal = createSurfaceDal(
    requestedOrderDetailDescriptor,
    requestedOrderDetailStore,
  );

  const requestedOrderDetail = extendRequestedOrderDetailDal(
    pool,
    getActorId,
    requestedOrderDetailBaseDal,
  );

  const requestedOrderList: RequestedOrderListDal = {
    ...requestedOrderListBaseDal,
    list: async (ctx, opts) => {
      const parsed = RequestedOrderListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const query = parsed.data;
      const result = await loadRequestedOrderList(pool, {
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        job_id: query.job_id,
        rowScope: ctx.manifest.rowScope ?? "all",
      });

      return {
        rows: result.rows.map((row) =>
          requestedOrderListDescriptor.projectRow(row, ctx.manifest, undefined),
        ),
        total: result.total,
      };
    },
  };

  return { requestedOrderDetail, requestedOrderList };
};

let requestedOrdersDal: RequestedOrdersDal | undefined;

export const getRequestedOrdersDal = (): RequestedOrdersDal => {
  if (!requestedOrdersDal) {
    throw new Error("Requested orders DAL not initialized — call initRequestedOrdersDal() first");
  }
  return requestedOrdersDal;
};

export const initRequestedOrdersDal = (
  options: CreateRequestedOrdersDalOptions,
): RequestedOrdersDal => {
  requestedOrdersDal = createRequestedOrdersDal(options);
  return requestedOrdersDal;
};

export const ensureRequestedOrdersDal = async (): Promise<RequestedOrdersDal> => {
  await ensureAuditBootstrap();

  if (!requestedOrdersDal) {
    initRequestedOrdersDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return requestedOrdersDal!;
};
