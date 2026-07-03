import { ValidationError, type PermissionContext } from "@latch/contracts";
import { createSurfaceDal, type SurfaceDal } from "@latch/dal";
import type { Pool } from "pg";

import { ensureAuditBootstrap, getPool, getPrincipal } from "../latch";

import {
  categoryDetailDescriptor,
  categoryListDescriptor,
  CategoryListListQuerySchema,
} from "./descriptors";
import { listCategoryTree } from "./repository/category-tree";
import { extendCategoryDetailDal } from "./stores/category-detail-create";
import { createCategoryDetailStore } from "./stores/category-detail-store";
import { createCategoryListStore } from "./stores/category-list-store";

export type CategoryListDal = SurfaceDal & {
  list: (
    ctx: PermissionContext,
    opts?: Record<string, unknown>,
  ) => Promise<{ rows: Record<string, unknown>[]; total: number }>;
};

export type CategoryDetailDal = SurfaceDal & {
  create: (
    ctx: PermissionContext,
    id: string,
    body: unknown,
  ) => Promise<Record<string, unknown>>;
};

export type CatalogDal = {
  categoryDetail: CategoryDetailDal;
  categoryList: CategoryListDal;
};

export type CreateCatalogDalOptions = {
  pool: Pool;
  getActorId: () => Promise<string>;
};

const filterTreeByName = (
  nodes: Awaited<ReturnType<typeof listCategoryTree>>,
  query: string,
): Awaited<ReturnType<typeof listCategoryTree>> => {
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
  const categoryListStore = createCategoryListStore(pool);
  const categoryDetailStore = createCategoryDetailStore(pool, getActorId);
  const categoryListBaseDal = createSurfaceDal(categoryListDescriptor, categoryListStore);
  const categoryDetailBaseDal = createSurfaceDal(
    categoryDetailDescriptor,
    categoryDetailStore,
  );
  const categoryDetail = extendCategoryDetailDal(
    pool,
    getActorId,
    categoryDetailBaseDal,
  );

  const categoryList: CategoryListDal = {
    ...categoryListBaseDal,
    list: async (ctx, opts) => {
      const parsed = CategoryListListQuerySchema.safeParse(opts ?? {});
      if (!parsed.success) {
        throw new ValidationError("Validation failed", parsed.error.flatten());
      }

      let tree = await listCategoryTree(pool);
      if (parsed.data.q) {
        tree = filterTreeByName(tree, parsed.data.q);
      }

      const row = {
        id: "__category_tree__",
        tree,
      };

      return {
        rows: [categoryListDescriptor.projectRow(row, ctx.manifest, undefined)],
        total: tree.length,
      };
    },
  };

  return { categoryList, categoryDetail };
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
