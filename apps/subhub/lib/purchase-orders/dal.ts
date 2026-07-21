import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal, type SurfaceDescriptor } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  purchaseOrderDetailDescriptor,
  purchaseOrderListDescriptor,
  PurchaseOrderListListQuerySchema,
} from "./descriptors";
import {
  loadPurchaseOrderList,
  type PurchaseOrderDetailRow,
} from "./repository";
import { createPurchaseOrderDetailStore } from "./stores/purchase-order-detail-store";
import { createPurchaseOrderListStore } from "./stores/purchase-order-list-store";

export type PurchaseOrderListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type PurchaseOrdersDal = {
  purchaseOrderList: PurchaseOrderListDal;
  purchaseOrderDetail: SurfaceDal;
};

export type CreatePurchaseOrdersDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createPurchaseOrdersDal = (
  options: CreatePurchaseOrdersDalOptions,
): PurchaseOrdersDal => {
  const { pool, getActorId } = options;
  const listStore = createPurchaseOrderListStore(pool);
  const detailStore = createPurchaseOrderDetailStore(pool, getActorId);

  const listBaseDal = createSurfaceDal(purchaseOrderListDescriptor, listStore);
  const purchaseOrderDetail = createSurfaceDal(
    purchaseOrderDetailDescriptor as SurfaceDescriptor<PurchaseOrderDetailRow>,
    detailStore,
  );

  const purchaseOrderList: PurchaseOrderListDal = {
    ...listBaseDal,
    list: async (ctx, opts) => {
      const parsed = PurchaseOrderListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const query = parsed.data;
      const result = await loadPurchaseOrderList(pool, {
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        job_id: query.job_id,
        status: query.status,
        vendor_party_id: query.vendor_party_id,
        rowScope: ctx.manifest.rowScope ?? "all",
      });

      return {
        rows: result.rows.map((row) =>
          purchaseOrderListDescriptor.projectRow(row, ctx.manifest, undefined),
        ),
        total: result.total,
      };
    },
  };

  return { purchaseOrderList, purchaseOrderDetail };
};

let purchaseOrdersDal: PurchaseOrdersDal | undefined;

export const getPurchaseOrdersDal = (): PurchaseOrdersDal => {
  if (!purchaseOrdersDal) {
    throw new Error(
      "Purchase orders DAL not initialized — call initPurchaseOrdersDal() first",
    );
  }
  return purchaseOrdersDal;
};

export const initPurchaseOrdersDal = (
  options: CreatePurchaseOrdersDalOptions,
): PurchaseOrdersDal => {
  purchaseOrdersDal = createPurchaseOrdersDal(options);
  return purchaseOrdersDal;
};

export const ensurePurchaseOrdersDal = async (): Promise<PurchaseOrdersDal> => {
  await ensureAuditBootstrap();

  if (!purchaseOrdersDal) {
    initPurchaseOrdersDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return purchaseOrdersDal!;
};
