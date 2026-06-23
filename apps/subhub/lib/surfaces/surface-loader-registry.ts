import type { PermissionContext } from "@latch/contracts";
import type { SurfaceDal } from "@latch/dal";

import { ensureContactsDal } from "../contacts/dal";
import { ensureIamDal } from "../iam/dal";
import { ensureSitesDal } from "../sites/dal";
import type { SurfaceListRow } from "../surface-api";

/** List surfaces with a shared loader (see surface-form-prefetch.md inventory). */
export type SurfaceListId =
  | "contact_list"
  | "user_list"
  | "role_list"
  | "customer_list"
  | "vendor_list"
  | "manufacturer_list"
  | "site_list"
  | "site_contact_relation_table";

/** Detail surfaces with a shared loader (see surface-form-prefetch.md inventory). */
export type SurfaceDetailId =
  | "contact_detail"
  | "site_detail"
  | "user_roles_detail"
  | "role_detail";

type ListLoader = {
  ensureDal: () => Promise<void>;
  list: NonNullable<SurfaceDal["list"]>;
};

type DetailLoader = {
  ensureDal: () => Promise<void>;
  getDal: () => Promise<SurfaceDal>;
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
  },
  site_list: {
    ensureDal: async () => {
      await ensureSitesDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureSitesDal();
      return dal.siteList.list(ctx, query);
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
  },
  role_list: {
    ensureDal: async () => {
      await ensureIamDal();
    },
    list: async (ctx, query) => {
      const dal = await ensureIamDal();
      return dal.roleList.list!(ctx, query);
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
