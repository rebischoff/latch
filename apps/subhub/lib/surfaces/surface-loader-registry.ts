import type { PermissionContext } from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";
import { randomUUID } from "node:crypto";

import { ensureContactsDal } from "../contacts/dal";
import { ensureCatalogDal } from "../catalog/dal";
import { ensureEstimatesDal } from "../estimates/dal";
import { ensureIamDal } from "../iam/dal";
import { ensureJobsDal } from "../jobs/dal";
import { ensurePartsDal } from "../parts/dal";
import { ensureJobMaterialRequestsDal } from "../requested-orders/dal";
import { ensurePurchaseOrdersDal } from "../purchase-orders/dal";
import { resolveContextFresh } from "../latch";
import { ensureSitesDal } from "../sites/dal";
import type { SurfaceListRow } from "../surface-api";

import { assertSurfaceRead } from "./assert-surface-read";

/** List surfaces with a shared loader (see surface-form-prefetch.md inventory). */
export type SurfaceListId =
  | "contact_list"
  | "user_list"
  | "role_list"
  | "customer_list"
  | "vendor_list"
  | "manufacturer_list"
  | "employee_list"
  | "site_list"
  | "site_contact_relation_table"
  | "job_party_relation_table"
  | "labor_rate_type_table"
  | "freight_rate_type_table"
  | "incidental_rate_type_table"
  | "markup_type_table"
  | "complexity_factor_table"
  | "labor_phase_table"
  | "spec_unit_table"
  | "estimate_list"
  | "job_list"
  | "job_material_request_list"
  | "purchase_order_list"
  | "part_list"
  | "item_list";

/** Detail surfaces with a shared loader (see surface-form-prefetch.md inventory). */
export type SurfaceDetailId =
  | "contact_detail"
  | "manufacturer_detail"
  | "employee_detail"
  | "site_detail"
  | "user_roles_detail"
  | "role_detail"
  | "estimate_detail"
  | "job_detail"
  | "purchase_order_detail"
  | "part_detail"
  | "item_detail";

type ListLoader = {
  ensureDal: () => Promise<void>;
  list: NonNullable<SurfaceDal["list"]>;
  create?: (
    ctx: PermissionContext,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

type DetailLoader = {
  ensureDal: () => Promise<void>;
  getDal: () => Promise<SurfaceDal>;
};

const createViaDetailDal = async (
  detailSurfaceId: SurfaceDetailId,
  runCreate: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>,
  body: unknown,
): Promise<Record<string, unknown>> => {
  const id = randomUUID();
  const ctx = await resolveContextFresh({ surfaceId: detailSurfaceId, entityId: "new" });
  assertSurfaceRead(ctx);
  return runCreate(ctx, id, body);
};

const listLoaders: Record<SurfaceListId, ListLoader> = {
  contact_list: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.contactList.list!(ctx, query);
    },
  },
  customer_list: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.customerList.list!(ctx, query);
    },
  },
  vendor_list: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.vendorList.list!(ctx, query);
    },
  },
  manufacturer_list: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.manufacturerList.list!(ctx, query);
    },
    create: async (_ctx, body) => {
      const dal = await ensureContactsDal();
      return createViaDetailDal(
        "manufacturer_detail",
        dal.manufacturerDetail.create.bind(dal.manufacturerDetail),
        body,
      );
    },
  },
  employee_list: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureContactsDal();
      return dal.employeeList.list!(ctx, query);
    },
    create: async (_ctx, body) => {
      const dal = await ensureContactsDal();
      return createViaDetailDal(
        "employee_detail",
        dal.employeeDetail.create.bind(dal.employeeDetail),
        body,
      );
    },
  },
  site_list: {
    ensureDal: async () => {
      await ensureSitesDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureSitesDal();
      return dal.siteList.list(ctx, query);
    },
    create: async (_ctx, body) => {
      const dal = await ensureSitesDal();
      return createViaDetailDal("site_detail", dal.siteDetail.create.bind(dal.siteDetail), body);
    },
  },
  user_list: {
    ensureDal: async () => {
      await ensureIamDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureIamDal();
      return dal.userList.list!(ctx, query);
    },
    create: async (ctx, body) => {
      const dal = await ensureIamDal();
      return dal.userList.create(ctx, body);
    },
  },
  role_list: {
    ensureDal: async () => {
      await ensureIamDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureIamDal();
      return dal.roleList.list!(ctx, query);
    },
    create: async (ctx, body) => {
      const dal = await ensureIamDal();
      return dal.roleList.create(ctx, body);
    },
  },
  site_contact_relation_table: {
    ensureDal: async () => {
      await ensureSitesDal();
    },
    list: async (ctx) => {
      const dal = await ensureSitesDal();
      return dal.siteContactRelationTable.listAll(ctx);
    },
  },
  job_party_relation_table: {
    ensureDal: async () => {
      await ensureEstimatesDal();
    },
    list: async (ctx) => {
      const dal = await ensureEstimatesDal();
      return dal.jobPartyRelationTable.listAll(ctx);
    },
  },
  labor_rate_type_table: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx) => {
      const dal = await ensureCatalogDal();
      return dal.laborRateTypeTable.listAll(ctx);
    },
  },
  freight_rate_type_table: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx) => {
      const dal = await ensureCatalogDal();
      return dal.freightRateTypeTable.listAll(ctx);
    },
  },
  incidental_rate_type_table: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx) => {
      const dal = await ensureCatalogDal();
      return dal.incidentalRateTypeTable.listAll(ctx);
    },
  },
  markup_type_table: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx) => {
      const dal = await ensureCatalogDal();
      return dal.markupTypeTable.listAll(ctx);
    },
  },
  complexity_factor_table: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx) => {
      const dal = await ensureCatalogDal();
      return dal.complexityFactorTable.listAll(ctx);
    },
  },
  labor_phase_table: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx) => {
      const dal = await ensureCatalogDal();
      return dal.laborPhaseTable.listAll(ctx);
    },
  },
  spec_unit_table: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx) => {
      const dal = await ensureCatalogDal();
      return dal.specUnitTable.listAll(ctx);
    },
  },
  estimate_list: {
    ensureDal: async () => {
      await ensureEstimatesDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureEstimatesDal();
      return dal.estimateList.list(ctx, query);
    },
    create: async (_ctx, body) => {
      const dal = await ensureEstimatesDal();
      return createViaDetailDal(
        "estimate_detail",
        dal.estimateDetail.create.bind(dal.estimateDetail),
        body,
      );
    },
  },
  job_list: {
    ensureDal: async () => {
      await ensureJobsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureJobsDal();
      return dal.jobList.list(ctx, query);
    },
    create: async (_ctx, body) => {
      const dal = await ensureJobsDal();
      return createViaDetailDal("job_detail", dal.jobDetail.create.bind(dal.jobDetail), body);
    },
  },
  job_material_request_list: {
    ensureDal: async () => {
      await ensureJobMaterialRequestsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureJobMaterialRequestsDal();
      return dal.jobMaterialRequestList.list(ctx, query);
    },
  },
  purchase_order_list: {
    ensureDal: async () => {
      await ensurePurchaseOrdersDal();
    },
    list: async (ctx, query) => {
      const dal = await ensurePurchaseOrdersDal();
      return dal.purchaseOrderList.list(ctx, query);
    },
  },
  part_list: {
    ensureDal: async () => {
      await ensurePartsDal();
    },
    list: async (ctx, query) => {
      const dal = await ensurePartsDal();
      return dal.partList.list(ctx, query);
    },
    create: async (_ctx, body) => {
      const dal = await ensurePartsDal();
      return createViaDetailDal("part_detail", dal.partDetail.create.bind(dal.partDetail), body);
    },
  },
  item_list: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureCatalogDal();
      return dal.itemList.list(ctx, query);
    },
    create: async (_ctx, body) => {
      const dal = await ensureCatalogDal();
      return createViaDetailDal(
        "item_detail",
        dal.itemDetail.create.bind(dal.itemDetail),
        body,
      );
    },
  },
};

const detailLoaders: Record<SurfaceDetailId, DetailLoader> = {
  contact_detail: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    getDal: async () => {
      const dal = await ensureContactsDal();
      return dal.contactDetail;
    },
  },
  manufacturer_detail: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    getDal: async () => {
      const dal = await ensureContactsDal();
      return dal.manufacturerDetail;
    },
  },
  employee_detail: {
    ensureDal: async () => {
      await ensureContactsDal();
    },
    getDal: async () => {
      const dal = await ensureContactsDal();
      return dal.employeeDetail;
    },
  },
  site_detail: {
    ensureDal: async () => {
      await ensureSitesDal();
    },
    getDal: async () => {
      const dal = await ensureSitesDal();
      return dal.siteDetail;
    },
  },
  user_roles_detail: {
    ensureDal: async () => {
      await ensureIamDal();
    },
    getDal: async () => {
      const dal = await ensureIamDal();
      return dal.userRolesDetail;
    },
  },
  role_detail: {
    ensureDal: async () => {
      await ensureIamDal();
    },
    getDal: async () => {
      const dal = await ensureIamDal();
      return dal.roleDetail;
    },
  },
  estimate_detail: {
    ensureDal: async () => {
      await ensureEstimatesDal();
    },
    getDal: async () => {
      const dal = await ensureEstimatesDal();
      return dal.estimateDetail;
    },
  },
  job_detail: {
    ensureDal: async () => {
      await ensureJobsDal();
    },
    getDal: async () => {
      const dal = await ensureJobsDal();
      return dal.jobDetail;
    },
  },
  purchase_order_detail: {
    ensureDal: async () => {
      await ensurePurchaseOrdersDal();
    },
    getDal: async () => {
      const dal = await ensurePurchaseOrdersDal();
      return dal.purchaseOrderDetail;
    },
  },
  part_detail: {
    ensureDal: async () => {
      await ensurePartsDal();
    },
    getDal: async () => {
      const dal = await ensurePartsDal();
      return dal.partDetail;
    },
  },
  item_detail: {
    ensureDal: async () => {
      await ensureCatalogDal();
    },
    getDal: async () => {
      const dal = await ensureCatalogDal();
      return dal.itemDetail;
    },
  },
};

export const loadListFromRegistry = async (
  surfaceId: SurfaceListId,
  ctx: PermissionContext,
  query?: Record<string, unknown>,
): Promise<{ rows: SurfaceListRow[]; total: number }> => {
  const loader = listLoaders[surfaceId];
  await loader.ensureDal();
  const result = await loader.list(ctx, query);
  return {
    rows: result.rows as SurfaceListRow[],
    total: result.total,
  };
};

export const createListFromRegistry = async (
  surfaceId: SurfaceListId,
  ctx: PermissionContext,
  body: unknown,
): Promise<Record<string, unknown>> => {
  const loader = listLoaders[surfaceId];
  if (!loader.create) {
    throw new Error(`No create loader for surface: ${surfaceId}`);
  }
  await loader.ensureDal();
  return loader.create(ctx, body);
};

export const getSurfaceDetailDal = async (
  surfaceId: SurfaceDetailId,
): Promise<SurfaceDal> => {
  const loader = detailLoaders[surfaceId];
  await loader.ensureDal();
  return loader.getDal();
};

export const loadDetailFromRegistry = async (
  surfaceId: SurfaceDetailId,
  ctx: PermissionContext,
  entityId: string,
): Promise<Record<string, unknown> & { id: string }> => {
  const dal = await getSurfaceDetailDal(surfaceId);
  return dal.get(ctx, entityId) as Promise<Record<string, unknown> & { id: string }>;
};
