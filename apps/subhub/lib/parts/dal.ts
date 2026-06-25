import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  partDetailDescriptor,
  partListDescriptor,
  PartListListQuerySchema,
} from "./descriptors";
import { loadPartList } from "./repository";
import { extendPartDetailDal } from "./stores/part-detail-create";
import { createPartDetailStore } from "./stores/part-detail-store";
import { createPartListStore } from "./stores/part-list-store";

export type PartDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type PartListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type PartsDal = {
  partDetail: PartDetailDal;
  partList: PartListDal;
};

export type CreatePartsDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

export const createPartsDal = (options: CreatePartsDalOptions): PartsDal => {
  const { pool, getActorId } = options;
  const partListStore = createPartListStore(pool);
  const partDetailStore = createPartDetailStore(pool, getActorId);
  const partListBaseDal = createSurfaceDal(partListDescriptor, partListStore);
  const partDetailBaseDal = createSurfaceDal(partDetailDescriptor, partDetailStore);
  const partDetail = extendPartDetailDal(pool, getActorId, partDetailBaseDal);

  const partList: PartListDal = {
    ...partListBaseDal,
    list: async (ctx, opts) => {
      const parsed = PartListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      const query = parsed.data;
      const result = await loadPartList(pool, {
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        q: query.q,
        rowScope: ctx.manifest.rowScope ?? "all",
      });

      return {
        rows: result.rows.map((row) =>
          partListDescriptor.projectRow(row, ctx.manifest, undefined),
        ),
        total: result.total,
      };
    },
  };

  return { partDetail, partList };
};

let partsDal: PartsDal | undefined;

export const getPartsDal = (): PartsDal => {
  if (!partsDal) {
    throw new Error("Parts DAL not initialized — call initPartsDal() first");
  }
  return partsDal;
};

export const initPartsDal = (options: CreatePartsDalOptions): PartsDal => {
  partsDal = createPartsDal(options);
  return partsDal;
};

export const ensurePartsDal = async (): Promise<PartsDal> => {
  await ensureAuditBootstrap();

  if (!partsDal) {
    initPartsDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return partsDal!;
};
