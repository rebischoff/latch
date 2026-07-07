import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  itemDetailDescriptor,
  itemListDescriptor,
  ItemListListQuerySchema,
} from "./descriptors";
import { listItemTree } from "./repository/item-tree";
import { extendItemDetailDal } from "./stores/item-detail-create";
import { createItemDetailStore } from "./stores/item-detail-store";
import { createItemListStore } from "./stores/item-list-store";
import {
  createCommercialCatalogDals,
  type CommercialCatalogDals,
} from "./stores/commercial-catalog-dals";

export type ItemListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type ItemDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type CatalogDal = CommercialCatalogDals & {
  itemDetail: ItemDetailDal;
  itemList: ItemListDal;
};

export type CreateCatalogDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

const filterTreeByName = (
  nodes: Awaited<ReturnType<typeof listItemTree>>,
  query: string,
): Awaited<ReturnType<typeof listItemTree>> => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return nodes;
  }

  const filterNode = (
    node: (typeof nodes)[number],
  ): (typeof nodes)[number] | undefined => {
    const childMatches = node.children
      .map((child) => filterNode(child))
      .filter((child): child is (typeof nodes)[number] => child !== undefined);
    const selfMatches = node.name.toLowerCase().includes(needle);

    if (!selfMatches && childMatches.length === 0) {
      return undefined;
    }

    return {
      ...node,
      children: childMatches,
    };
  };

  return nodes
    .map((node) => filterNode(node))
    .filter((node): node is (typeof nodes)[number] => node !== undefined);
};

export const createCatalogDal = (options: CreateCatalogDalOptions): CatalogDal => {
  const { pool, getActorId } = options;
  const itemListStore = createItemListStore(pool);
  const itemDetailStore = createItemDetailStore(pool, getActorId);
  const itemListBaseDal = createSurfaceDal(itemListDescriptor, itemListStore);
  const itemDetailBaseDal = createSurfaceDal(
    itemDetailDescriptor,
    itemDetailStore,
  );
  const itemDetail = extendItemDetailDal(
    pool,
    getActorId,
    itemDetailBaseDal,
  );
  const commercialCatalogDals = createCommercialCatalogDals(pool, getActorId);

  const itemList: ItemListDal = {
    ...itemListBaseDal,
    list: async (ctx, opts) => {
      const parsed = ItemListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      let tree = await listItemTree(pool);
      if (parsed.data.q) {
        tree = filterTreeByName(tree, parsed.data.q);
      }

      const row = {
        id: "__item_tree__",
        tree,
      };

      return {
        rows: [itemListDescriptor.projectRow(row, ctx.manifest, undefined)],
        total: tree.length,
      };
    },
  };

  return { ...commercialCatalogDals, itemList, itemDetail };
};

let catalogDal: CatalogDal | undefined;

export const getCatalogDal = (): CatalogDal => {
  if (!catalogDal) {
    throw new Error("Catalog DAL not initialized — call initCatalogDal() first");
  }
  return catalogDal;
};

export const initCatalogDal = (options: CreateCatalogDalOptions): CatalogDal => {
  catalogDal = createCatalogDal(options);
  return catalogDal;
};

export const ensureCatalogDal = async (): Promise<CatalogDal> => {
  await ensureAuditBootstrap();

  if (!catalogDal) {
    initCatalogDal({
      pool: getPool(),
      getActorId: async () => (await getPrincipal()).id,
    });
  }

  return catalogDal!;
};
