import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  siteContactRelationTableDescriptor,
  siteDetailDescriptor,
  siteListDescriptor,
  SiteListListQuerySchema,
} from "./descriptors";
import { loadSiteList } from "./repository";
import {
  extendContactRelationTableDal,
  type SiteContactRelationTableDal,
} from "./stores/contact-relation-table-dal";
import { createSiteContactRelationTableStore } from "./stores/contact-relation-table-store";
import { extendSiteDetailDal } from "./stores/site-detail-create";
import { createSiteDetailStore } from "./stores/site-detail-store";
import { createSiteListStore } from "./stores/site-list-store";

export type { SiteContactRelationTableDal } from "./stores/contact-relation-table-dal";

export type SiteListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type SiteDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type SitesDal = {
  siteList: SiteListDal;
  siteDetail: SiteDetailDal;
  siteContactRelationTable: SiteContactRelationTableDal;
};

export type CreateSitesDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createSitesDal = (options: CreateSitesDalOptions): SitesDal => {
  const { pool, getActorId } = options;
  const siteListStore = createSiteListStore(pool);
  const siteDetailStore = createSiteDetailStore(pool, getActorId);
  const siteContactRelationTableStore = createSiteContactRelationTableStore(
    pool,
    getActorId,
  );
  const siteListBaseDal = createSurfaceDal(siteListDescriptor, siteListStore);
  const siteDetailBaseDal = createSurfaceDal(
    siteDetailDescriptor,
    siteDetailStore,
  );
  const siteContactRelationTableBaseDal = createSurfaceDal(
    siteContactRelationTableDescriptor,
    siteContactRelationTableStore,
  );

  const siteList: SiteListDal = {
    ...siteListBaseDal,
    list: async (ctx, opts) => {
      const parsed = SiteListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const query = parsed.data;
      const result = await loadSiteList(pool, {
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        q: query.q,
        rowScope: ctx.manifest.rowScope ?? "all",
      });

      return {
        rows: result.rows.map((row) =>
          siteListDescriptor.projectRow(row, ctx.manifest, undefined),
        ),
        total: result.total,
      };
    },
  };

  const siteDetail = extendSiteDetailDal(pool, getActorId, siteDetailBaseDal);
  const siteContactRelationTable = extendContactRelationTableDal(
    pool,
    getActorId,
    siteContactRelationTableBaseDal,
  );

  return { siteList, siteDetail, siteContactRelationTable };
};

let sitesDal: SitesDal | undefined;

export const getSitesDal = (): SitesDal => {
  if (!sitesDal) {
    throw new Error("Sites DAL not initialized — call initSitesDal() first");
  }
  return sitesDal;
};

export const initSitesDal = (options: CreateSitesDalOptions): SitesDal => {
  sitesDal = createSitesDal(options);
  return sitesDal;
};

export const ensureSitesDal = async (): Promise<SitesDal> => {
  await ensureAuditBootstrap();

  if (!sitesDal) {
    initSitesDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return sitesDal!;
};
